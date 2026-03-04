/**
 * ADR-003: Trigger & Effect Execution Model — Type Definitions
 *
 * All trigger, condition, and effect types as pure-data discriminated unions.
 * No methods, no class instances, no mutable state on definitions.
 * See: simulator/docs/designs/ADR-003-trigger-effect-execution-model.md
 */

import { StatType, DamageTrait, EnemyType, FlagType } from './enums';
import { TriggerCounterKey, CooldownKey, DoTId, BuffId } from './keys';

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export enum TriggerType {
    OnHit         = 'on_hit',
    OnCrit        = 'on_crit',
    OnWeakspotHit = 'on_weakspot_hit',
    OnKill        = 'on_kill',
    OnReload      = 'on_reload',
    /** Counter-gated: fires every N hits. Replaces EveryNShotsTrigger class. */
    EveryNHits    = 'every_n_hits',
}

export enum TriggerConditionType {
    Chance             = 'chance',
    TargetType         = 'target_type',
    MaxDistance        = 'max_distance',
    TargetAtMaxStacks  = 'target_at_max_stacks',
    NotOnCooldown      = 'not_on_cooldown',
    And                = 'and',
    Or                 = 'or',
    Not                = 'not',
}

/** Effect types for the dynamic (event-driven) system. */
export enum DynEffectType {
    DamageInstance = 'damage_instance',
    ApplyDoT       = 'apply_dot',
    ApplyBuff      = 'apply_buff',
    SetFlag        = 'set_flag',
    SetCooldown    = 'set_cooldown',
    ResetCounter   = 'reset_counter',
}

export enum EffectTargetType {
    Self          = 'self',
    PrimaryTarget = 'primary_target',
    NearbyTargets = 'nearby_targets',
}

// ─────────────────────────────────────────────────────────────────────────────
// Trigger Definitions (pure data, no mutable state)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trigger definition — pure data.
 * EveryNHits stores counter state in the engine's Map<TriggerCounterKey,number>,
 * NOT on this object. Fixes the EveryNShotsTrigger shared-state bug.
 */
export type TriggerDef =
    | { readonly type: TriggerType.OnHit }
    | { readonly type: TriggerType.OnCrit }
    | { readonly type: TriggerType.OnWeakspotHit }
    | { readonly type: TriggerType.OnKill }
    | { readonly type: TriggerType.OnReload }
    | {
        readonly type: TriggerType.EveryNHits;
        readonly n: number;
        readonly critsCountDouble: boolean;
        /** Typed key scoped to this trigger; stored in engine counters map. */
        readonly counterKey: TriggerCounterKey;
      };

export type TriggerConditionDef =
    | { readonly type: TriggerConditionType.Chance;            readonly probability: number }
    | { readonly type: TriggerConditionType.TargetType;        readonly targetType: EnemyType }
    | { readonly type: TriggerConditionType.MaxDistance;       readonly maxMeters: number }
    | { readonly type: TriggerConditionType.TargetAtMaxStacks; readonly statusId: string }
    | { readonly type: TriggerConditionType.NotOnCooldown;     readonly cooldownKey: CooldownKey }
    | { readonly type: TriggerConditionType.And;               readonly conditions: readonly TriggerConditionDef[] }
    | { readonly type: TriggerConditionType.Or;                readonly conditions: readonly TriggerConditionDef[] }
    | { readonly type: TriggerConditionType.Not;               readonly condition: TriggerConditionDef };

// ─────────────────────────────────────────────────────────────────────────────
// Effect Definitions (pure data)
// ─────────────────────────────────────────────────────────────────────────────

/** Declares effect targeting — replaces (event as any)?.target fallbacks. */
export type EffectTarget =
    | { readonly type: EffectTargetType.Self }
    | { readonly type: EffectTargetType.PrimaryTarget }
    | { readonly type: EffectTargetType.NearbyTargets; readonly radiusMeters: number };

/**
 * Effect definition — pure data discriminated union.
 * All DamageInstance effects pass through the ADR-002 UNIVERSAL_BUCKETS resolver.
 * No embedded DamageProcessor instances.
 */
export type EffectDef =
    | {
        readonly type: DynEffectType.DamageInstance;
        readonly scalingFactor: number;
        readonly scalingStat: StatType;
        readonly traits: readonly DamageTrait[];
        readonly target: EffectTarget;
        readonly label: string;
        readonly cooldown?: {
            readonly key: CooldownKey;
            readonly durationSeconds: number;
        };
      }
    | {
        readonly type: DynEffectType.ApplyDoT;
        readonly dotId: DoTId;
        readonly target: EffectTarget;
      }
    | {
        readonly type: DynEffectType.ApplyBuff;
        readonly buffId: BuffId;
        readonly target: EffectTarget;
      }
    | {
        readonly type: DynEffectType.SetFlag;
        readonly flag: FlagType;
        readonly value: boolean;
        readonly target: EffectTarget;
      }
    | {
        readonly type: DynEffectType.SetCooldown;
        readonly key: CooldownKey;
        readonly durationSeconds: number;
      }
    | {
        readonly type: DynEffectType.ResetCounter;
        readonly key: TriggerCounterKey;
      };

// ─────────────────────────────────────────────────────────────────────────────
// Composite
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A complete trigger-effect pairing — pure data.
 * Replaces TriggeredEffect class and all its mutable state.
 */
export interface TriggerDefinition {
    readonly id: string;
    readonly trigger: TriggerDef;
    readonly conditions: readonly TriggerConditionDef[];
    readonly effects: readonly EffectDef[];
}
