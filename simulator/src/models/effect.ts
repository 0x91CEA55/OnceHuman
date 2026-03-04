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

    getDescription(): string {
        return `Conditional: ${this.effects.map(e => e.getDescription()).join(', ')}`;
    }

    clone(newSource?: string): ConditionalEffect {
        return new ConditionalEffect(this.predicate, this.effects.map(e => e.clone()), newSource ?? this.source);
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
        player.stats.add(this.stat, this.value * multiplier);
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
        player.stats.add(this.stat, this.value * multiplier);
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
