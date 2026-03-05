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

import { EffectDef, DynEffectType, EffectTarget, EffectTargetType } from '../types/trigger-types';
import { DoTInstance, BuffInstance } from '../types/status-types';
import { DamageTrait, StatType, EnemyType } from '../types/enums';
import { CooldownKey } from '../types/keys';
import { DoTDefinition, BuffDefinition } from '../types/status-types';
import { resolve, buildResolutionContext } from './resolver';
import { UNIVERSAL_BUCKETS } from './bucket-registry';

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
    readonly encounterEnemyType: EnemyType;
    readonly currentTimeSeconds: number;
    readonly cooldowns: Map<CooldownKey, number>;
    /** Target's active DoTs (mutated by ApplyDoT effects). */
    readonly targetDoTs: DoTInstance[];
    /** Target's active Buffs (mutated by ApplyBuff effects). */
    readonly targetBuffs: BuffInstance[];
    /** Player's active Buffs (mutated by ApplyBuff-to-Self effects). */
    readonly playerBuffs: BuffInstance[];
    readonly dotRegistry: (id: string) => DoTDefinition | undefined;
    readonly buffRegistry: (id: string) => BuffDefinition | undefined;
    /** Record secondary damage event for logs + accumulated total. */
    readonly recordDamage: (amount: number, label: string, traits: readonly DamageTrait[]) => void;
    readonly logEvent: (event: string, description: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Effect Execution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves EffectTarget to the correct DoT/Buff list.
 * Only Self and PrimaryTarget are semantically distinct in the current single-target sim.
 * NearbyTargets resolves to the same primary target list until multi-target is implemented.
 */
function resolveDoTList(target: EffectTarget, ctx: EffectExecutionContext): DoTInstance[] {
    // In current single-target simulation, all targets resolve to the primary target's state
    switch (target.type) {
        case EffectTargetType.Self:          return ctx.targetDoTs; // Player has no DoTs to receive (placeholder)
        case EffectTargetType.PrimaryTarget: return ctx.targetDoTs;
        case EffectTargetType.NearbyTargets: return ctx.targetDoTs;
    }
}

function resolveBuffList(target: EffectTarget, ctx: EffectExecutionContext): BuffInstance[] {
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
            const baseDamage = baseStatValue * effect.scalingFactor;

            // Build ResolutionContext and pass through UNIVERSAL_BUCKETS
            const resCtx = buildResolutionContext(
                new Set(effect.traits),
                ctx.encounterEnemyType,
                ctx.statValues,
                new Map([['wasCrit', false], ['wasWeakspot', false]]) // Secondary damage defaults
            );
            const { finalDamage } = resolve(baseDamage, UNIVERSAL_BUCKETS, resCtx);

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

            applyDoTInstance(def.id, maxStacks, durationSeconds, def.baseTickIntervalSeconds, ctx.currentTimeSeconds, resolveDoTList(effect.target, ctx), ctx);
            ctx.logEvent('DoT Applied', def.name);
            break;
        }

        case DynEffectType.ApplyBuff: {
            const def = ctx.buffRegistry(effect.buffId);
            if (!def) return;

            applyBuffInstance(def.id, def.baseMaxStacks, def.baseDurationSeconds, resolveBuffList(effect.target, ctx), ctx);
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
function applyDoTInstance(
    definitionId: string,
    maxStacks: number,
    durationSeconds: number,
    tickIntervalSeconds: number,
    currentTime: number,
    activeDoTs: DoTInstance[],
    ctx: EffectExecutionContext,
): void {
    const existing = activeDoTs.find(d => d.definitionId === definitionId);
    if (existing) {
        // Stack: add one, cap at maxStacks, refresh duration
        existing.currentStacks = Math.min(existing.maxStacks, existing.currentStacks + 1);
        existing.remainingDurationSeconds = existing.durationSeconds;
        ctx.logEvent('DoT Stack', `${definitionId} (${existing.currentStacks}×)`);
    } else {
        const instance: DoTInstance = {
            definitionId: definitionId as any,
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
function applyBuffInstance(
    definitionId: string,
    maxStacks: number,
    durationSeconds: number,
    activeBuffs: BuffInstance[],
    ctx: EffectExecutionContext,
): void {
    const existing = activeBuffs.find(b => b.definitionId === definitionId);
    if (existing) {
        existing.currentStacks = Math.min(existing.maxStacks, existing.currentStacks + 1);
        existing.remainingDurationSeconds = durationSeconds;
        ctx.logEvent('Buff Stack', `${definitionId} (${existing.currentStacks}×)`);
    } else {
        activeBuffs.push({
            definitionId: definitionId as any,
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
    readonly encounterEnemyType: EnemyType;
    readonly recordDamage: (amount: number, label: string) => void;
    readonly logEvent: (event: string, description: string) => void;
    readonly dotRegistry: (id: string) => DoTDefinition | undefined;
    readonly buffRegistry: (id: string) => BuffDefinition | undefined;
}

/**
 * Advances all DoTs by dt seconds. Fires tick damage when due.
 * Removes expired DoTs. Returns true if any DoT fired.
 *
 * DoT tick damage passes through UNIVERSAL_BUCKETS — fixing the embedded
 * DamageProcessor(LegacyResolutionStrategy) bug from the old ActiveDoT class.
 */
export function tickDoTs(
    activeDoTs: DoTInstance[],
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
                const baseDamage = baseStatValue * def.scalingFactor;
                const resCtx = buildResolutionContext(
                    new Set(def.traits),
                    ctx.encounterEnemyType,
                    ctx.statValues,
                    new Map([['wasCrit', false], ['wasWeakspot', false]])
                );
                const { finalDamage } = resolve(baseDamage, UNIVERSAL_BUCKETS, resCtx);
                const totalDamage = finalDamage * dot.currentStacks;

                ctx.recordDamage(totalDamage, `${def.name} Tick`);
            }
        }

        if (dot.remainingDurationSeconds <= 0) {
            const def = ctx.dotRegistry(dot.definitionId);
            ctx.logEvent('DoT Expired', def?.name ?? dot.definitionId);
            activeDoTs.splice(i, 1);
        }
    }
}

/**
 * Advances all Buffs by dt seconds. Removes expired Buffs.
 */
export function tickBuffs(
    activeBuffs: BuffInstance[],
    dt: number,
    ctx: StatusTickContext,
): void {
    for (let i = activeBuffs.length - 1; i >= 0; i--) {
        const buff = activeBuffs[i];
        buff.remainingDurationSeconds -= dt;

        if (buff.remainingDurationSeconds <= 0) {
            const def = ctx.buffRegistry(buff.definitionId);
            ctx.logEvent('Buff Expired', def?.name ?? buff.definitionId);
            activeBuffs.splice(i, 1);
        }
    }
}
