/**
 * ADR-003: Effect Execution System
 *
 * Executes EffectDef discriminated union items against the current simulation state.
 * Replaces: ShrapnelEffect, ExplosionEffect, BuffEffect, DoTEffect class execute() methods.
 *
 * Key properties:
 * - All DamageInstance effects use the ADR-002 UNIVERSAL_BUCKETS resolver
 * - Explicit EffectTarget — no (event as any)?.target fallbacks
 * - Cooldown arming is explicit (SetCooldown effect or inline cooldown field)
 * - DoT/Buff application resolves max stacks & duration from player stats at apply time
 *
 * See: simulator/docs/designs/ADR-003-trigger-effect-execution-model.md
 */

import { EffectDef, DynEffectType, EffectTarget, EffectTargetType } from '../../types/trigger-types';
import { ActiveDoT, ActiveBuff } from '../../types/status-types';
import { DamageTrait, StatType, EnemyType, KeywordType, FlagType } from '../../types/enums';
import { CooldownKey, dotId, buffId } from '../../types/keys';
import { DoTDefinition, BuffDefinition } from '../../types/status-types';
import { resolve, buildResolutionContext, evaluateRolls, TRAIT_TO_KEYWORD } from '../../engine/resolver';
import { UNIVERSAL_BUCKETS, ROLL_REGISTRY } from '../../engine/bucket-registry';
import { RngService } from '../../engine/rng';
import { ContextFlag } from '../../types/resolution';
import { getKeywordMetadata } from '../../data/keywords';
import { StatContribution } from '../../types/telemetry';

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Everything the effect executor needs — typed, no 'any'.
 * Provided by DamageEngine for each effect execution pass.
 */
export interface EffectExecutionContext {
    /** Current player stats snapshot (for damage scaling + stat overrides). */
    readonly statValues: ReadonlyMap<StatType, number>;
    readonly statContributions: ReadonlyMap<StatType, StatContribution[]>;
    readonly encounterEnemyType: EnemyType;
    readonly currentTimeSeconds: number;
    readonly cooldowns: Map<CooldownKey, number>;
    /** Target's active DoTs (mutated by ApplyDoT effects). */
    readonly targetDoTs: ActiveDoT[];
    /** Target's active Buffs (mutated by ApplyBuff effects). */
    readonly targetBuffs: ActiveBuff[];
    /** Player's active Buffs (mutated by ApplyBuff-to-Self effects). */
    readonly playerBuffs: ActiveBuff[];
    readonly dotRegistry: (id: string) => DoTDefinition | undefined;
    readonly buffRegistry: (id: string) => BuffDefinition | undefined;
    /** Record secondary damage event for logs + accumulated total. */
    readonly recordDamage: (amount: number, label: string, traits: readonly DamageTrait[]) => void;
    readonly logEvent: (event: string, description: string) => void;
    
    /** ADR-013: Simulation support for keyword rolls. */
    readonly rng: RngService;
    readonly playerFlags: Map<ContextFlag, boolean>;
    readonly unlockedKeywordCrits: ReadonlySet<KeywordType>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Effect Execution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves EffectTarget to the correct DoT/Buff list.
 * Only Self and PrimaryTarget are semantically distinct in the current single-target sim.
 * NearbyTargets resolves to the same primary target list until multi-target is implemented.
 */
function resolveDoTList(target: EffectTarget, ctx: EffectExecutionContext): ActiveDoT[] {
    // In current single-target simulation, all targets resolve to the primary target's state
    switch (target.type) {
        case EffectTargetType.Self:          return ctx.targetDoTs; // Player has no DoTs to receive (placeholder)
        case EffectTargetType.PrimaryTarget: return ctx.targetDoTs;
        case EffectTargetType.NearbyTargets: return ctx.targetDoTs;
    }
}

function resolveBuffList(target: EffectTarget, ctx: EffectExecutionContext): ActiveBuff[] {
    switch (target.type) {
        case EffectTargetType.Self:          return ctx.playerBuffs;
        case EffectTargetType.PrimaryTarget: return ctx.targetBuffs;
        case EffectTargetType.NearbyTargets: return ctx.targetBuffs;
    }
}

/**
 * Executes a single EffectDef against the current context.
 * DamageInstance effects pass through UNIVERSAL_BUCKETS (ADR-002 resolver).
 */
export function executeEffectDef(effect: EffectDef, ctx: EffectExecutionContext): void {
    switch (effect.type) {

        case DynEffectType.DamageInstance: {
            // Check cooldown gate
            if (effect.cooldown) {
                const expiry = ctx.cooldowns.get(effect.cooldown.key) ?? 0;
                if (ctx.currentTimeSeconds < expiry) return;
            }

            const baseStatValue = ctx.statValues.get(effect.scalingStat) ?? 0;

            // ADR-013: Derive keyword restrictions for secondary damage
            let canCrit = false;
            let canWeakspot = false;
            for (const trait of effect.traits) {
                const kwType = TRAIT_TO_KEYWORD[trait];
                if (kwType) {
                    const kw = getKeywordMetadata(kwType);
                    canCrit = kw.canCrit || ctx.unlockedKeywordCrits.has(kwType);
                    canWeakspot = kw.canWeakspot;
                    break;
                }
            }

            // Build initial flags from player state
            const initialFlags = new Map<ContextFlag, boolean>();
            ctx.playerFlags.forEach((v, k) => initialFlags.set(k, v));

            // Build ResolutionContext
            const resCtx = buildResolutionContext(
                new Set(effect.traits),
                ctx.encounterEnemyType,
                ctx.statValues,
                initialFlags,
                ctx.unlockedKeywordCrits,
                ctx.statContributions
            );

            // Execute rolls if allowed
            evaluateRolls(ROLL_REGISTRY, resCtx, ctx.rng);

            // Apply restrictions (same logic as resolveScenarioScan)
            if (!canCrit) {
                resCtx.flags.set('wasCrit', false);
                resCtx.flags.set('wasBurnCrit', false);
            }
            if (!canWeakspot) {
                resCtx.flags.set('wasWeakspot', false);
                resCtx.flags.set(FlagType.CannotDealWeakspotDamage, true);
            }

            const { finalDamage } = resolve(baseStatValue, UNIVERSAL_BUCKETS, resCtx, false, effect.scalingFactor);

            ctx.recordDamage(finalDamage, effect.label, effect.traits);

            // Arm cooldown
            if (effect.cooldown) {
                ctx.cooldowns.set(effect.cooldown.key, ctx.currentTimeSeconds + effect.cooldown.durationSeconds);
            }
            break;
        }

        case DynEffectType.ApplyDoT: {
            const def = ctx.dotRegistry(effect.dotId);
            if (!def) return;

            // Resolve max stacks and duration from player stats at application time
            let maxStacks = def.baseMaxStacks;
            if (def.maxStacksStatOverride) {
                maxStacks = Math.floor(ctx.statValues.get(def.maxStacksStatOverride) ?? def.baseMaxStacks);
            }

            let durationSeconds = def.baseDurationSeconds;
            if (def.durationStatOverride) {
                const durationMult = (ctx.statValues.get(def.durationStatOverride) ?? 100) / 100;
                durationSeconds = def.baseDurationSeconds * durationMult;
            }

            applyActiveDoT(def.id, maxStacks, durationSeconds, def.baseTickIntervalSeconds, ctx.currentTimeSeconds, resolveDoTList(effect.target, ctx), ctx);
            ctx.logEvent('DoT Applied', def.name);
            break;
        }

        case DynEffectType.ApplyBuff: {
            const def = ctx.buffRegistry(effect.buffId);
            if (!def) return;

            applyActiveBuff(def.id, def.baseMaxStacks, def.baseDurationSeconds, resolveBuffList(effect.target, ctx), ctx);
            ctx.logEvent('Buff Applied', def.name);
            break;
        }

        case DynEffectType.SetFlag:
            // Flag mutations are handled by the aggregation system in the current architecture
            ctx.logEvent('Flag Set', `${effect.flag} = ${effect.value}`);
            break;

        case DynEffectType.SetCooldown:
            ctx.cooldowns.set(effect.key, ctx.currentTimeSeconds + effect.durationSeconds);
            break;

        case DynEffectType.ResetCounter:
            // Counter reset is handled inline by EveryNHits trigger matching
            break;
    }
}

/**
 * Applies or stacks a DoT instance on the target's active DoTs list.
 */
function applyActiveDoT(
    definitionId: string,
    maxStacks: number,
    durationSeconds: number,
    tickIntervalSeconds: number,
    currentTime: number,
    activeDoTs: ActiveDoT[],
    ctx: EffectExecutionContext,
): void {
    const existing = activeDoTs.find(d => d.definitionId === definitionId);
    if (existing) {
        // Stack: add one, cap at maxStacks, refresh duration
        existing.currentStacks = Math.min(existing.maxStacks, existing.currentStacks + 1);
        existing.remainingDurationSeconds = existing.durationSeconds;
        ctx.logEvent('DoT Stack', `${definitionId} (${existing.currentStacks}×)`);
    } else {
        const instance: ActiveDoT = {
            definitionId: dotId(definitionId),
            currentStacks: 1,
            remainingDurationSeconds: durationSeconds,
            nextTickTimeSeconds: currentTime + tickIntervalSeconds,
            maxStacks,
            durationSeconds,
        };
        activeDoTs.push(instance);
    }
}

/**
 * Applies or stacks a Buff instance.
 */
function applyActiveBuff(
    definitionId: string,
    maxStacks: number,
    durationSeconds: number,
    activeBuffs: ActiveBuff[],
    ctx: EffectExecutionContext,
): void {
    const existing = activeBuffs.find(b => b.definitionId === definitionId);
    if (existing) {
        existing.currentStacks = Math.min(existing.maxStacks, existing.currentStacks + 1);
        existing.remainingDurationSeconds = durationSeconds;
        ctx.logEvent('Buff Stack', `${definitionId} (${existing.currentStacks}×)`);
    } else {
        activeBuffs.push({
            definitionId: buffId(definitionId),
            currentStacks: 1,
            remainingDurationSeconds: durationSeconds,
            maxStacks,
        });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch Execution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executes a batch of EffectDefs from a single fired trigger.
 */
export function runEffectExecution(effects: readonly EffectDef[], ctx: EffectExecutionContext): void {
    for (const effect of effects) {
        executeEffectDef(effect, ctx);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DoT Tick System
// ─────────────────────────────────────────────────────────────────────────────

export interface StatusTickContext {
    readonly currentTimeSeconds: number;
    readonly statValues: ReadonlyMap<StatType, number>;
    readonly statContributions: ReadonlyMap<StatType, StatContribution[]>;
    readonly encounterEnemyType: EnemyType;
    readonly recordDamage: (amount: number, label: string, time: number) => void;
    readonly logEvent: (event: string, description: string, time: number) => void;
    readonly dotRegistry: (id: string) => DoTDefinition | undefined;
    readonly buffRegistry: (id: string) => BuffDefinition | undefined;

    /** ADR-013: Simulation support for keyword rolls during ticks. */
    readonly rng: RngService;
    readonly playerFlags: Map<ContextFlag, boolean>;
    readonly unlockedKeywordCrits: ReadonlySet<KeywordType>;
}

/**
 * Advances all DoTs by dt seconds. Fires tick damage when due.
 * Removes expired DoTs. Returns true if any DoT fired.
 *
 * DoT tick damage passes through UNIVERSAL_BUCKETS — fixing the embedded
 * DamageProcessor(LegacyResolutionStrategy) bug from the old ActiveDoT class.
 */
export function tickDoTs(
    activeDoTs: ActiveDoT[],
    dt: number,
    ctx: StatusTickContext,
): void {
    for (let i = activeDoTs.length - 1; i >= 0; i--) {
        const dot = activeDoTs[i];
        dot.remainingDurationSeconds -= dt;

        if (ctx.currentTimeSeconds >= dot.nextTickTimeSeconds) {
            const def = ctx.dotRegistry(dot.definitionId);
            if (def) {
                // Compute dynamic tick interval (e.g. BurnFrequencyPercent)
                let interval = def.baseTickIntervalSeconds;
                if (def.tickFrequencyStatMultiplier) {
                    const bonus = ctx.statValues.get(def.tickFrequencyStatMultiplier) ?? 0;
                    interval = def.baseTickIntervalSeconds / (1 + bonus / 100);
                }
                dot.nextTickTimeSeconds += interval;

                // Compute tick damage through UNIVERSAL_BUCKETS
                const baseStatValue = ctx.statValues.get(def.scalingStat) ?? 0;

                // ADR-013: Derive keyword restrictions for DoT ticks
                let canCrit = false;
                let canWeakspot = false;
                for (const trait of def.traits) {
                    const kwType = TRAIT_TO_KEYWORD[trait];
                    if (kwType) {
                        const kw = getKeywordMetadata(kwType);
                        canCrit = kw.canCrit || ctx.unlockedKeywordCrits.has(kwType);
                        canWeakspot = kw.canWeakspot;
                        break;
                    }
                }

                // Build initial flags from player state
                const initialFlags = new Map<ContextFlag, boolean>();
                ctx.playerFlags.forEach((v, k) => initialFlags.set(k, v));

                // Build ResolutionContext
                const resCtx = buildResolutionContext(
                    new Set(def.traits),
                    ctx.encounterEnemyType,
                    ctx.statValues,
                    initialFlags,
                    ctx.unlockedKeywordCrits,
                    ctx.statContributions
                );

                // Execute rolls if allowed
                // For DoTs, we only roll if it's a keyword that can crit/weakspot
                if (canCrit || canWeakspot) {
                    evaluateRolls(ROLL_REGISTRY, resCtx, ctx.rng);
                    
                    // Apply restrictions (same logic as executeEffectDef)
                    if (!canCrit) {
                        resCtx.flags.set('wasCrit', false);
                        resCtx.flags.set('wasBurnCrit', false);
                    }
                    if (!canWeakspot) {
                        resCtx.flags.set('wasWeakspot', false);
                        resCtx.flags.set(FlagType.CannotDealWeakspotDamage, true);
                    }
                } else {
                    resCtx.flags.set('wasCrit', false);
                    resCtx.flags.set('wasWeakspot', false);
                    resCtx.flags.set('wasBurnCrit', false);
                    resCtx.flags.set(FlagType.CannotDealWeakspotDamage, true);
                }

                const { finalDamage } = resolve(baseStatValue, UNIVERSAL_BUCKETS, resCtx, false, def.scalingFactor);
                const totalDamage = finalDamage * dot.currentStacks;

                ctx.recordDamage(totalDamage, `${def.name} Tick`, ctx.currentTimeSeconds);
            }
        }

        if (dot.remainingDurationSeconds <= 0) {
            const def = ctx.dotRegistry(dot.definitionId);
            ctx.logEvent('DoT Expired', def?.name ?? dot.definitionId, ctx.currentTimeSeconds);
            activeDoTs.splice(i, 1);
        }
    }
}

/**
 * Advances all Buffs by dt seconds. Removes expired Buffs.
 */
export function tickBuffs(
    activeBuffs: ActiveBuff[],
    dt: number,
    ctx: StatusTickContext,
): void {
    for (let i = activeBuffs.length - 1; i >= 0; i--) {
        const buff = activeBuffs[i];
        buff.remainingDurationSeconds -= dt;

        if (buff.remainingDurationSeconds <= 0) {
            const def = ctx.buffRegistry(buff.definitionId);
            ctx.logEvent('Buff Expired', def?.name ?? buff.definitionId, ctx.currentTimeSeconds);
            activeBuffs.splice(i, 1);
        }
    }
}
