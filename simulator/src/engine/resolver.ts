/**
 * ADR-002: Universal Bucket Topology — Pure Resolver
 *
 * Two pure functions, ~40 lines of logic, zero game knowledge.
 * All damage relationships are expressed as data in bucket-registry.ts.
 *
 * FinalDMG = BaseDMG × PRODUCT(BucketMultiplier_i)
 * BucketMultiplier_i = 1 + SUM(applicable_contributor_values) / 100
 *
 * See: simulator/docs/designs/ADR-002-universal-bucket-topology.md
 */

import {
    ResolutionContext,
    ContributionCondition,
    ContributorDef,
    BucketDef,
    BucketId,
    ConditionType,
    RollDefinition,
    ContextFlag,
} from '../types/resolution';
import { StatType, DamageTrait, KeywordType, EnemyType } from '../types/enums';
import { RngService } from './rng';
import { UNIVERSAL_BUCKETS } from './bucket-registry';
import { Player } from '../models/player';
import { telemetry } from './audit-log';
import { TraceNode, TraceContributor } from '../types/telemetry';

/**
 * Evaluates a ContributionCondition against the current ResolutionContext.
 * Pure function — no side effects, no mutation.
 */
export function evaluate(condition: ContributionCondition, ctx: ResolutionContext): boolean {
    switch (condition.type) {
        case ConditionType.Always:
            return true;
        case ConditionType.TraitMatches:
            return ctx.traits.has(condition.trait);
        case ConditionType.KeywordMatches:
            return ctx.keywords.has(condition.keyword);
        case ConditionType.ElementMatches:
            return ctx.elements.has(condition.element);
        case ConditionType.TargetTypeMatches:
            return ctx.targetType === condition.targetType;
        case ConditionType.KeywordCritUnlocked:
            return ctx.unlockedKeywordCrits.has(condition.keyword);
        case ConditionType.FlagActive:
            return ctx.flags.get(condition.flag) ?? false;
        case ConditionType.Comparison: {
            const statVal = ctx.statValues.get(condition.stat) ?? 0;
            switch (condition.operator) {
                case '>': return statVal > condition.value;
                case '<': return statVal < condition.value;
                case '>=': return statVal >= condition.value;
                case '<=': return statVal <= condition.value;
                case '==': return statVal === condition.value;
                default: return false;
            }
        }
        case ConditionType.And:
            return condition.conditions.every(c => evaluate(c, ctx));
        case ConditionType.Or:
            return condition.conditions.some(c => evaluate(c, ctx));
        case ConditionType.Not:
            return !evaluate(condition.condition, ctx);
        default:
            return false;
    }
}

/**
 * Resolves final damage by multiplying through all universal buckets.
 * Non-applicable buckets contribute (1 + 0/100) = 1.0 and vanish.
 *
 * @param baseDamage  Absolute base damage before any buckets apply
 * @param buckets     Universal bucket registry (always UNIVERSAL_BUCKETS)
 * @param ctx         Resolution context for this damage event
 * @param recordToTelemetry  If true, records the trace to the global telemetry manager.
 * @returns           Final damage value + per-bucket audit trail + calculation trace
 */
export function resolve(
    baseDamage: number,
    buckets: readonly BucketDef[],
    ctx: ResolutionContext,
    recordToTelemetry: boolean = false
): { finalDamage: number; audit: Map<BucketId, number>; trace: TraceNode } {
    let result = baseDamage;
    const audit = new Map<BucketId, number>();
    const traceContributors: TraceContributor[] = [];

    for (const bucket of buckets) {
        let sum = 0;
        const bucketContributors: TraceContributor[] = [];
        for (const contributor of bucket.contributors) {
            if (evaluate(contributor.condition, ctx)) {
                const val = ctx.statValues.get(contributor.stat) ?? 0;
                if (val !== 0) {
                    sum += val;
                    bucketContributors.push({
                        label: contributor.stat,
                        value: val,
                        type: 'stat',
                        isPercentage: true
                    });
                }
            }
        }
        const multiplier = 1 + sum / 100;
        audit.set(bucket.id, multiplier);
        result *= multiplier;

        if (multiplier !== 1) {
            traceContributors.push({
                label: `Bucket: ${bucket.id}`,
                value: multiplier,
                type: 'multiplier',
                childTrace: {
                    id: `${bucket.id}:${Date.now()}`,
                    label: `Multiplier Bucket: ${bucket.id}`,
                    finalValue: multiplier,
                    operation: 'sum',
                    contributors: bucketContributors,
                    timestamp: Date.now()
                }
            });
        }
    }

    const finalTrace: TraceNode = {
        id: `damage_resolution:${Date.now()}`,
        label: 'Damage Resolution',
        baseValue: baseDamage,
        finalValue: result,
        operation: 'product',
        contributors: [
            { label: 'Base Damage', value: baseDamage, type: 'constant' },
            ...traceContributors
        ],
        timestamp: Date.now()
    };

    if (recordToTelemetry) {
        telemetry.record(finalTrace);
    }

    return { finalDamage: result, audit, trace: finalTrace };
}

/**
 * Executes a set of probabilistic rolls (e.g., Crit, Weakspot) and updates the context's flags.
 * This makes rolls data-driven and deterministic via the injected RNG.
 */
export function evaluateRolls(
    rolls: readonly RollDefinition[],
    ctx: ResolutionContext,
    rng: RngService,
): void {
    for (const roll of rolls) {
        let sum = 0;
        for (const contributor of roll.rateContributors) {
            if (evaluate(contributor.condition, ctx)) {
                sum += ctx.statValues.get(contributor.stat) ?? 0;
            }
        }
        const rate = Math.min(sum / 100, 1);
        const result = rng.next() < rate;
        ctx.flags.set(roll.resultFlag, result);
    }
}

interface ScenarioFlags {
    wasCrit: boolean;
    wasWeakspot: boolean;
    wasBurnCrit: boolean;
    [key: string]: boolean;
}

/**
 * ADR-012: Unified Scenario Scan Result.
 */
export interface ScenarioScanResult {
    noCritNoWs: number;
    critNoWs: number;
    noCritWs: number;
    critWs: number;
    expected: number;
    masterTrace: TraceNode;
}

/**
 * Executes a static damage scan across common combat scenarios.
 * ADR-010: Used for UI previews without running a full timeseries simulation.
 * ADR-013: respects canCrit and canWeakspot flags for keyword-specific restrictions.
 */
export function resolveScenarioScan(
    baseDamage: number,
    player: Player,
    targetType: EnemyType,
    traits: ReadonlySet<DamageTrait>,
    unlockedKeywordCrits: ReadonlySet<KeywordType> = new Set(),
    logLabel?: string,
    canCrit: boolean = true,
    canWeakspot: boolean = true
): ScenarioScanResult {
    const statValues = statValuesFromSnapshot(player.stats.snapshot());
    
    const runScenario = (flags: ScenarioFlags) => {
        const initialFlags = new Map<ContextFlag, boolean>();
        Object.entries(flags).forEach(([k, v]) => {
            // Apply restrictions: if scenario wants a crit but keyword can't, force false.
            let finalVal = v;
            if (k === 'wasCrit' && !canCrit) finalVal = false;
            if (k === 'wasWeakspot' && !canWeakspot) finalVal = false;
            if (k === 'wasBurnCrit' && !canCrit) finalVal = false;
            
            initialFlags.set(k as ContextFlag, finalVal);
        });
        
        // Merge player permanent flags
        player.flags.forEach((v, k) => { if (!initialFlags.has(k as ContextFlag)) initialFlags.set(k as ContextFlag, v); });

        const ctx = buildResolutionContext(traits, targetType, statValues, initialFlags, unlockedKeywordCrits);
        return resolve(baseDamage, UNIVERSAL_BUCKETS, ctx, false);
    };

    const resNormal = runScenario({ wasCrit: false, wasWeakspot: false, wasBurnCrit: false });
    const resCrit   = runScenario({ wasCrit: true,  wasWeakspot: false, wasBurnCrit: true });
    const resWs     = runScenario({ wasCrit: false, wasWeakspot: true,  wasBurnCrit: false });
    const resBoth   = runScenario({ wasCrit: true,  wasWeakspot: true,  wasBurnCrit: true });

    // Expected Value Calculation
    const critRate = canCrit ? (player.stats.get(StatType.CritRatePercent)?.value ?? 0) / 100 : 0;
    const wsRate   = canWeakspot ? (player.stats.get(StatType.WeakspotHitRatePercent)?.value ?? 0) / 100 : 0;

    const expected = 
        resNormal.finalDamage * (1 - critRate) * (1 - wsRate) +
        resCrit.finalDamage   * critRate       * (1 - wsRate) +
        resWs.finalDamage     * (1 - critRate) * wsRate +
        resBoth.finalDamage   * critRate       * wsRate;

    const masterTrace: TraceNode = {
        id: `scenario_scan:${Date.now()}`,
        label: logLabel || 'Scenario Scan',
        finalValue: expected,
        operation: 'sum',
        contributors: [
            { label: 'Normal Hit',   value: resNormal.finalDamage, type: 'stat', childTrace: resNormal.trace },
            { label: 'Critical Hit', value: resCrit.finalDamage,   type: 'stat', childTrace: resCrit.trace },
            { label: 'Weakspot Hit', value: resWs.finalDamage,     type: 'stat', childTrace: resWs.trace },
            { label: 'Crit + WS',    value: resBoth.finalDamage,   type: 'stat', childTrace: resBoth.trace },
            { label: 'Crit Probability', value: critRate, type: 'constant', isPercentage: true },
            { label: 'WS Probability',   value: wsRate,   type: 'constant', isPercentage: true }
        ],
        timestamp: Date.now()
    };

    return { 
        noCritNoWs: resNormal.finalDamage, 
        critNoWs: resCrit.finalDamage, 
        noCritWs: resWs.finalDamage, 
        critWs: resBoth.finalDamage, 
        expected,
        masterTrace 
    };
}

/**
 * Aggregates crit rate from a set of contributors.
 * Uses the same evaluate() function — same pure-data pattern as bucket resolution.
 * Returns probability in [0, 1].
 */
export function resolveCritRate(
    contributors: readonly ContributorDef[],
    ctx: ResolutionContext,
): number {
    let sum = 0;
    for (const contributor of contributors) {
        if (evaluate(contributor.condition, ctx)) {
            sum += ctx.statValues.get(contributor.stat) ?? 0;
        }
    }
    return Math.min(sum / 100, 1);
}

/**
 * Builds a ResolutionContext from a player's current stat snapshot.
 * Derives keyword set from DamageTraits (Burn trait → Burn keyword, etc.).
 */
export function buildResolutionContext(
    traits: ReadonlySet<DamageTrait>,
    targetType: EnemyType,
    statValues: ReadonlyMap<StatType, number>,
    initialFlags: Map<ContextFlag, boolean> = new Map(),
    unlockedKeywordCrits: ReadonlySet<KeywordType> = new Set(),
): ResolutionContext {
    // Derive active keywords from trait set
    const keywords = new Set<KeywordType>();
    const traitToKeyword: Partial<Record<DamageTrait, KeywordType>> = {
        [DamageTrait.Burn]: KeywordType.Burn,
        [DamageTrait.FrostVortex]: KeywordType.FrostVortex,
        [DamageTrait.PowerSurge]: KeywordType.PowerSurge,
        [DamageTrait.Shrapnel]: KeywordType.Shrapnel,
        [DamageTrait.UnstableBomber]: KeywordType.UnstableBomber,
        [DamageTrait.Bounce]: KeywordType.Bounce,
        [DamageTrait.FastGunner]: KeywordType.FastGunner,
        [DamageTrait.BullsEye]: KeywordType.BullsEye,
    };
    for (const trait of traits) {
        const kw = traitToKeyword[trait];
        if (kw) keywords.add(kw);
    }

    return {
        traits,
        keywords,
        elements: new Set(), // Per-element stat granularity: open question (ADR-002 §Open Questions)
        targetType,
        flags: initialFlags,
        unlockedKeywordCrits,
        statValues,
    };
}

export const KEYWORD_TRAIT_MAP: Record<KeywordType, DamageTrait[]> = {
    [KeywordType.Burn]: [DamageTrait.Burn, DamageTrait.Status, DamageTrait.Elemental],
    [KeywordType.FrostVortex]: [DamageTrait.FrostVortex, DamageTrait.Status, DamageTrait.Elemental],
    [KeywordType.PowerSurge]: [DamageTrait.PowerSurge, DamageTrait.Elemental],
    [KeywordType.Shrapnel]: [DamageTrait.Shrapnel, DamageTrait.Weapon],
    [KeywordType.UnstableBomber]: [DamageTrait.UnstableBomber, DamageTrait.Status, DamageTrait.Elemental, DamageTrait.Explosive],
    [KeywordType.Bounce]: [DamageTrait.Bounce, DamageTrait.Weapon],
    [KeywordType.FastGunner]: [DamageTrait.FastGunner, DamageTrait.Weapon],
    [KeywordType.BullsEye]: [DamageTrait.BullsEye, DamageTrait.Weapon],
    [KeywordType.FortressWarfare]: [DamageTrait.Weapon],
};

/** Extracts a ReadonlyMap<StatType, number> from a PlayerStats snapshot object. */
export function statValuesFromSnapshot(snapshot: Record<string, number>): ReadonlyMap<StatType, number> {
    return new Map(Object.entries(snapshot) as [StatType, number][]);
}
