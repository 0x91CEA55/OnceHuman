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
} from '../types/resolution';
import { StatType, DamageTrait, KeywordType, EnemyType } from '../types/enums';

/**
 * Evaluates a ContributionCondition against the current ResolutionContext.
 * Pure function — no side effects, no mutation.
 */
export function evaluate(condition: ContributionCondition, ctx: ResolutionContext): boolean {
    switch (condition.type) {
        case ConditionType.Always:
            return true;
        case ConditionType.KeywordMatches:
            return ctx.keywords.has(condition.keyword);
        case ConditionType.ElementMatches:
            return ctx.elements.has(condition.element);
        case ConditionType.TargetTypeMatches:
            return ctx.targetType === condition.targetType;
        case ConditionType.WasCrit:
            return ctx.wasCrit;
        case ConditionType.WasWeakspot:
            return ctx.wasWeakspot;
        case ConditionType.KeywordCritUnlocked:
            return ctx.unlockedKeywordCrits.has(condition.keyword);
        case ConditionType.And:
            return condition.conditions.every(c => evaluate(c, ctx));
        case ConditionType.Or:
            return condition.conditions.some(c => evaluate(c, ctx));
        case ConditionType.Not:
            return !evaluate(condition.condition, ctx);
    }
}

/**
 * Resolves final damage by multiplying through all universal buckets.
 * Non-applicable buckets contribute (1 + 0/100) = 1.0 and vanish.
 *
 * @param baseDamage  Absolute base damage before any buckets apply
 * @param buckets     Universal bucket registry (always UNIVERSAL_BUCKETS)
 * @param ctx         Resolution context for this damage event
 * @returns           Final damage value + per-bucket audit trail
 */
export function resolve(
    baseDamage: number,
    buckets: readonly BucketDef[],
    ctx: ResolutionContext,
): { finalDamage: number; audit: Map<BucketId, number> } {
    let result = baseDamage;
    const audit = new Map<BucketId, number>();

    for (const bucket of buckets) {
        let sum = 0;
        for (const contributor of bucket.contributors) {
            if (evaluate(contributor.condition, ctx)) {
                sum += ctx.statValues.get(contributor.stat) ?? 0;
            }
        }
        const multiplier = 1 + sum / 100;
        audit.set(bucket.id, multiplier);
        result *= multiplier;
    }

    return { finalDamage: result, audit };
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
    wasCrit: boolean,
    wasWeakspot: boolean,
    statValues: ReadonlyMap<StatType, number>,
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
        wasCrit,
        wasWeakspot,
        unlockedKeywordCrits,
        statValues,
    };
}

/** Extracts a ReadonlyMap<StatType, number> from a PlayerStats snapshot object. */
export function statValuesFromSnapshot(snapshot: Record<string, number>): ReadonlyMap<StatType, number> {
    return new Map(Object.entries(snapshot) as [StatType, number][]);
}
