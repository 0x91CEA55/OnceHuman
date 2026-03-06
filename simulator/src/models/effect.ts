// simulator/src/models/effect.ts

import { StatType, FlagType } from '../types/enums';
import { Player } from './player';
import { EncounterConditions, AggregationContext } from '../types/common';

/**
 * Legacy compatibility shim — executeDynamic no longer called by the engine.
 * @deprecated Use TriggerDefinition / EffectDef (ADR-003) for all dynamic effects.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LegacyCombatContext = any;

export abstract class BaseEffect {
    constructor(public source?: string) {}

    abstract applyStatic(player: Player, conditions: EncounterConditions, multiplier: number): void;

    /**
     * ADR-007: Context-aware application path.
     * Default delegates to applyStatic for backward compat.
     * Override in effects that require ctx.ammoPercent or other context fields.
     */
    applyWithContext(ctx: AggregationContext, multiplier: number = 1): void {
        this.applyStatic(ctx.player, ctx.conditions, multiplier);
    }

    /** @deprecated Not called by the ADR-003 engine. Stub implementations are acceptable. */
    executeDynamic(_ctx: LegacyCombatContext, _event?: unknown): void {}
    abstract getDescription(): string;
    abstract clone(newSource?: string): BaseEffect;
}

export class ConditionalEffect extends BaseEffect {
    constructor(
        public readonly predicate: (ctx: AggregationContext) => boolean,
        public readonly effects: BaseEffect[],
        source?: string
    ) {
        super(source);
    }

    applyStatic(player: Player, conditions: EncounterConditions, multiplier: number = 1): void {
        // Legacy path: builds context with hardcoded ammoPercent=1.0.
        // Use applyWithContext for ammo-sensitive predicates.
        const ctx: AggregationContext = {
            player,
            conditions,
            ammoPercent: 1.0,
            loadout: player.loadout
        };
        if (this.predicate(ctx)) {
            for (const effect of this.effects) {
                effect.applyStatic(player, conditions, multiplier);
            }
        }
    }

    /**
     * ADR-007: Override to propagate real ammoPercent from the outer context.
     * This is the correct path for ammo-sensitive conditionals (e.g. MomentumUp).
     */
    override applyWithContext(ctx: AggregationContext, multiplier: number = 1): void {
        if (this.predicate(ctx)) {
            for (const effect of this.effects) {
                effect.applyWithContext(ctx, multiplier);
            }
        }
    }

    getDescription(): string {
        return `Conditional: ${this.effects.map(e => e.getDescription()).join(', ')}`;
    }

    clone(newSource?: string): ConditionalEffect {
        return new ConditionalEffect(this.predicate, this.effects.map(e => e.clone()), newSource ?? this.source);
    }
}

/**
 * ADR-006 §2.1 / ADR-007: Effect whose stat contribution is computed at aggregation time.
 * Supports stack-dependent, position-dependent, or condition-derived bonuses.
 * Uses applyWithContext exclusively — applyStatic delegates but loses ammoPercent precision.
 */
export class DynamicStatEffect extends BaseEffect {
    constructor(
        public readonly stat: StatType,
        public readonly valueFn: (ctx: AggregationContext) => number,
        source?: string
    ) {
        super(source);
    }

    applyStatic(player: Player, conditions: EncounterConditions, multiplier: number = 1): void {
        // Fallback: ammoPercent is 1.0. Correct for HP/Sanity-dependent mods,
        // incorrect for ammo-position-dependent mods. Prefer applyWithContext.
        const ctx: AggregationContext = {
            player,
            conditions,
            ammoPercent: 1.0,
            loadout: player.loadout
        };
        const dynamicValue = this.valueFn(ctx);
        player.stats.add(this.stat, dynamicValue * multiplier, this.source || 'Dynamic Calculation');
    }

    /**
     * ADR-007: Override for full-fidelity context access.
     */
    override applyWithContext(ctx: AggregationContext, multiplier: number = 1): void {
        const dynamicValue = this.valueFn(ctx);
        ctx.player.stats.add(this.stat, dynamicValue * multiplier, this.source || 'Dynamic Calculation');
    }

    getDescription(): string {
        return `Dynamic calculation for ${this.stat}`;
    }

    clone(newSource?: string): DynamicStatEffect {
        return new DynamicStatEffect(this.stat, this.valueFn, newSource ?? this.source);
    }
}

export class IncreaseStatEffect extends BaseEffect {
    constructor(
        public readonly stat: StatType,
        public readonly value: number,
        source?: string
    ) {
        super(source);
    }

    applyStatic(player: Player, _conditions: EncounterConditions, multiplier: number = 1): void {
        player.stats.add(this.stat, this.value * multiplier, this.source || 'Bonus');
    }

    getDescription(): string {
        return `Increase ${this.stat} by ${this.value}`;
    }

    clone(newSource?: string): IncreaseStatEffect {
        return new IncreaseStatEffect(this.stat, this.value, newSource ?? this.source);
    }
}

export class SetFlagEffect extends BaseEffect {
    constructor(
        public readonly flag: FlagType,
        public readonly value: boolean,
        source?: string
    ) {
        super(source);
    }

    applyStatic(player: Player, _conditions: EncounterConditions, _multiplier: number = 1): void {
        player.setFlag(this.flag, this.value);
    }

    getDescription(): string {
        return `Set flag ${this.flag} to ${this.value}`;
    }

    clone(newSource?: string): SetFlagEffect {
        return new SetFlagEffect(this.flag, this.value, newSource ?? this.source);
    }
}

export class StaticAttributeEffect extends BaseEffect {
    constructor(
        public readonly stat: StatType,
        public readonly value: number,
        source?: string
    ) {
        super(source);
    }

    applyStatic(player: Player, _conditions: EncounterConditions, multiplier: number = 1): void {
        player.stats.add(this.stat, this.value * multiplier, this.source || 'Static Attribute');
    }

    getDescription(): string {
        return `${this.stat.replace(/_/g, ' ')}: +${this.value}`;
    }

    clone(newSource?: string): StaticAttributeEffect {
        return new StaticAttributeEffect(this.stat, this.value, newSource ?? this.source);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy effect class shells — kept for BuildBreakdown.tsx instanceof checks.
// executeDynamic is a no-op stub; the ADR-003 engine uses EffectDef instead.
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated ADR-003: replaced by DynEffectType.DamageInstance in trigger-definitions.ts */
export class ShrapnelEffect extends BaseEffect {
    constructor(source?: string) { super(source || 'Shrapnel'); }
    applyStatic(_player: Player, _conditions: EncounterConditions, _multiplier: number = 1): void {}
    getDescription(): string { return `Trigger Shrapnel (50% Attack)`; }
    clone(newSource?: string): ShrapnelEffect { return new ShrapnelEffect(newSource ?? this.source); }
}

/** @deprecated ADR-003: replaced by DynEffectType.DamageInstance in trigger-definitions.ts */
export class ExplosionEffect extends BaseEffect {
    constructor(
        public readonly scalingFactor: number,
        public readonly statType: StatType,
        public readonly cooldownSeconds: number = 0,
        source?: string
    ) { super(source); }
    applyStatic(_player: Player, _conditions: EncounterConditions, _multiplier: number = 1): void {}
    getDescription(): string { return `Trigger explosion scaling ${this.scalingFactor}x off ${this.statType}`; }
    clone(newSource?: string): ExplosionEffect {
        return new ExplosionEffect(this.scalingFactor, this.statType, this.cooldownSeconds, newSource ?? this.source);
    }
}

/** @deprecated ADR-003: replaced by DynEffectType.ApplyBuff + BuffDefinition in status-registry.ts */
export class BuffEffect extends BaseEffect {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly durationSeconds: number,
        public readonly maxStacks: number,
        public readonly effects: BaseEffect[],
        source?: string
    ) { super(source); }
    applyStatic(_player: Player, _conditions: EncounterConditions, _multiplier: number = 1): void {}
    getDescription(): string { return `Grants ${this.name} buff for ${this.durationSeconds}s`; }
    clone(newSource?: string): BuffEffect {
        return new BuffEffect(this.id, this.name, this.durationSeconds, this.maxStacks, this.effects.map(e => e.clone()), newSource ?? this.source);
    }
}

/** @deprecated ADR-003: replaced by DynEffectType.ApplyDoT + DoTDefinition in status-registry.ts */
export class DoTEffect extends BaseEffect {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly tickInterval: number,
        public readonly durationSeconds: number,
        public readonly maxStacks: number,
        public readonly scalingFactor: number,
        public readonly baseStatType: StatType,
        public readonly trait: string,
        public readonly maxStacksStat?: StatType,
        public readonly durationStat?: StatType,
        source?: string
    ) { super(source); }
    applyStatic(_player: Player, _conditions: EncounterConditions, _multiplier: number = 1): void {}
    getDescription(): string { return `Inflicts ${this.name} DoT for ${this.durationSeconds}s`; }
    clone(newSource?: string): DoTEffect {
        return new DoTEffect(this.id, this.name, this.tickInterval, this.durationSeconds, this.maxStacks, this.scalingFactor, this.baseStatType, this.trait, this.maxStacksStat, this.durationStat, newSource ?? this.source);
    }
}
