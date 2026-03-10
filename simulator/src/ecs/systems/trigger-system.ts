/**
 * ADR-003: Trigger Evaluation System
 *
 * Pure functions that evaluate TriggerDefinition[] against a combat event.
 * Replaces: CombatEventBus, TriggeredEffect.evaluate(), all Condition classes.
 *
 * Key properties:
 * - All RNG consumed from injected RngService — no Math.random() calls
 * - EveryNHits counter state lives in the provided Map — not on the definition
 * - Fully typed — no (event as any)?.field accesses
 * - Observable depth limiting replaces silent MAX_DEPTH=5 suppression
 *
 * See: simulator/docs/designs/ADR-003-trigger-effect-execution-model.md
 */

import {
    TriggerDefinition,
    TriggerDef,
    TriggerConditionDef,
    TriggerType,
    TriggerConditionType,
    EffectDef,
} from '../../types/trigger-types';
import { TriggerCounterKey, CooldownKey } from '../../types/keys';
import { ActiveDoT, ActiveBuff } from '../../types/status-types';
import { EnemyType } from '../../types/enums';
import { RngService } from '../../engine/rng';

/** Maximum secondary-effect pass depth before truncation (replaces CombatEventBus.MAX_DEPTH). */
export const MAX_EFFECT_PASS_DEPTH = 3;

/**
 * Context describing the combat event that fired — all typed, no 'any'.
 */
export interface TriggerEvent {
    readonly triggerType: TriggerType;
    readonly isCrit: boolean;
    readonly isWeakspot: boolean;
    readonly passDepth: number;
}

/**
 * Environmental context for condition evaluation.
 */
export interface TriggerEvalContext {
    readonly encounterEnemyType: EnemyType;
    readonly targetDistanceMeters: number;
    readonly currentTimeSeconds: number;
    /** Active DoTs on the primary target (for TargetAtMaxStacks condition). */
    readonly targetActiveDoTs: readonly ActiveDoT[];
    readonly targetActiveBuffs: readonly ActiveBuff[];
    /** Counter state — mutable, owned by the engine/simulation run. */
    readonly counters: Map<TriggerCounterKey, number>;
    /** Cooldown expiry times — mutable, owned by the engine/simulation run. */
    readonly cooldowns: Map<CooldownKey, number>;
    readonly rng: RngService;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Evaluation Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks if a TriggerDef matches the incoming event.
 * For EveryNHits: increments the counter in ctx.counters — this is the ONLY place
 * that mutates counter state, and it's scoped to the typed counterKey.
 */
export function triggerMatches(
    trigger: TriggerDef,
    event: TriggerEvent,
    ctx: TriggerEvalContext,
): boolean {
    switch (trigger.type) {
        case TriggerType.OnHit:
            return event.triggerType === TriggerType.OnHit;

        case TriggerType.OnCrit:
            return event.triggerType === TriggerType.OnHit && event.isCrit;

        case TriggerType.OnWeakspotHit:
            return event.triggerType === TriggerType.OnHit && event.isWeakspot;

        case TriggerType.OnKill:
            return event.triggerType === TriggerType.OnKill;

        case TriggerType.OnReload:
            return event.triggerType === TriggerType.OnReload;

        case TriggerType.EveryNHits: {
            if (event.triggerType !== TriggerType.OnHit) return false;
            const increment = (trigger.critsCountDouble && event.isCrit) ? 2 : 1;
            const current = (ctx.counters.get(trigger.counterKey) ?? 0) + increment;
            ctx.counters.set(trigger.counterKey, current);
            if (current >= trigger.n) {
                ctx.counters.set(trigger.counterKey, 0);
                return true;
            }
            return false;
        }

        case TriggerType.EveryNCrits: {
            if (event.triggerType !== TriggerType.OnHit || !event.isCrit) return false;
            const current = (ctx.counters.get(trigger.counterKey) ?? 0) + 1;
            ctx.counters.set(trigger.counterKey, current);
            if (current >= trigger.n) {
                ctx.counters.set(trigger.counterKey, 0);
                return true;
            }
            return false;
        }

        case TriggerType.EveryNWeakspotHits: {
            if (event.triggerType !== TriggerType.OnHit || !event.isWeakspot) return false;
            const current = (ctx.counters.get(trigger.counterKey) ?? 0) + 1;
            ctx.counters.set(trigger.counterKey, current);
            if (current >= trigger.n) {
                ctx.counters.set(trigger.counterKey, 0);
                return true;
            }
            return false;
        }

        default:
            return false;
    }
}

/**
 * Evaluates a TriggerConditionDef against the event + environment.
 * RNG consumed from ctx.rng — deterministic when SeededRng is provided.
 */
export function evaluateTriggerCondition(
    condition: TriggerConditionDef,
    event: TriggerEvent,
    ctx: TriggerEvalContext,
): boolean {
    switch (condition.type) {
        case TriggerConditionType.Chance:
            return ctx.rng.next() < condition.probability;

        case TriggerConditionType.TargetType:
            return ctx.encounterEnemyType === condition.targetType;

        case TriggerConditionType.MaxDistance:
            return ctx.targetDistanceMeters <= condition.maxMeters;

        case TriggerConditionType.TargetAtMaxStacks: {
            const dot = ctx.targetActiveDoTs.find(d => d.definitionId === condition.statusId);
            const buff = ctx.targetActiveBuffs.find(b => b.definitionId === condition.statusId);
            const instance = dot ?? buff;
            return instance ? instance.currentStacks >= instance.maxStacks : false;
        }

        case TriggerConditionType.NotOnCooldown: {
            const expiry = ctx.cooldowns.get(condition.cooldownKey) ?? 0;
            return ctx.currentTimeSeconds >= expiry;
        }

        case TriggerConditionType.And:
            return condition.conditions.every((c: TriggerConditionDef) => evaluateTriggerCondition(c, event, ctx));

        case TriggerConditionType.Or:
            return condition.conditions.some((c: TriggerConditionDef) => evaluateTriggerCondition(c, event, ctx));

        case TriggerConditionType.Not:
            return !evaluateTriggerCondition(condition.condition, event, ctx);
        default:
            return false;
    }
}

function allConditionsMet(
    conditions: readonly TriggerConditionDef[],
    event: TriggerEvent,
    ctx: TriggerEvalContext,
): boolean {
    return conditions.every(c => evaluateTriggerCondition(c, event, ctx));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────────────────────

export interface FiredTrigger {
    readonly triggerId: string;
    readonly effects: readonly EffectDef[];
}

/**
 * Evaluates all TriggerDefinitions against an event.
 * Returns the list of triggers that fired, each with their pending effects.
 *
 * Depth check: events with passDepth >= MAX_EFFECT_PASS_DEPTH are skipped with
 * an audit log warning — never silently dropped.
 */
export function runTriggerEvaluation(
    triggerDefs: readonly TriggerDefinition[],
    event: TriggerEvent,
    ctx: TriggerEvalContext,
    onDepthExceeded?: (triggerId: string, depth: number) => void,
): FiredTrigger[] {
    if (event.passDepth >= MAX_EFFECT_PASS_DEPTH) {
        for (const def of triggerDefs) {
            onDepthExceeded?.(def.id, event.passDepth);
        }
        return [];
    }

    const fired: FiredTrigger[] = [];

    for (const def of triggerDefs) {
        if (!triggerMatches(def.trigger, event, ctx)) continue;
        if (!allConditionsMet(def.conditions, event, ctx)) continue;

        fired.push({ triggerId: def.id, effects: def.effects });
    }

    return fired;
}
