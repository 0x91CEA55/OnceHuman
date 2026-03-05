import { StatType, DamageTrait } from './enums';
import { DoTId, BuffId } from './keys';

/**
 * Immutable definition for a Damage-over-Time effect.
 * Pure data — no methods, no class instances.
 * Lives in the status registry; referenced by DoTInstance.definitionId.
 */
export interface DoTDefinition {
    readonly id: DoTId;
    readonly name: string;
    readonly baseTickIntervalSeconds: number;
    readonly baseDurationSeconds: number;
    readonly baseMaxStacks: number;
    readonly scalingFactor: number;
    readonly scalingStat: StatType;
    readonly traits: readonly DamageTrait[];
    /** If set, max stacks is read from this stat at application time (e.g. MaxBurnStacks). */
    readonly maxStacksStatOverride?: StatType;
    /** If set, duration is multiplied by (statValue / 100) at application time (e.g. BurnDurationPercent). */
    readonly durationStatOverride?: StatType;
    /** If set, tick interval is divided by (1 + statValue / 100) at each tick (e.g. BurnFrequencyPercent). */
    readonly tickFrequencyStatMultiplier?: StatType;
}

/**
 * Immutable definition for a temporary Buff.
 * Pure data — stat contributions applied each re-aggregation pass.
 */
export interface BuffDefinition {
    readonly id: BuffId;
    readonly name: string;
    readonly baseDurationSeconds: number;
    readonly baseMaxStacks: number;
    /** Each entry contributes (valuePerStack × currentStacks) to the named stat during aggregation. */
    readonly statContributions: readonly { readonly stat: StatType; readonly valuePerStack: number }[];
}

/**
 * Live runtime state for an active DoT on a target.
 * Mutable fields are intentionally non-readonly — they change each tick.
 */
export interface DoTInstance {
    readonly definitionId: DoTId;
    currentStacks: number;
    remainingDurationSeconds: number;
    nextTickTimeSeconds: number;
    /** Resolved at application time from definition + stat overrides. */
    maxStacks: number;
    durationSeconds: number;
}

/**
 * Live runtime state for an active Buff on an entity.
 */
export interface BuffInstance {
    readonly definitionId: BuffId;
    currentStacks: number;
    remainingDurationSeconds: number;
    /** Resolved at application time from definition. */
    maxStacks: number;
}
