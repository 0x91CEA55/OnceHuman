import { DamageIntent } from './damage';
import { DamageTrait, EventTrigger } from '../types/enums';
import { DamageProcessor } from '../engine/damage-processor';
import { StatType, FlagType } from '../types/enums';
import { Player } from './player';
import { EncounterConditions, CombatEvent } from '../types/common';
import { StatusManager } from '../engine/status-manager';

/**
 * CombatState tracks transient, dynamic state during a simulation.
 */
export class CombatState {
    private counters: Map<string, number> = new Map();
    private flags: Map<string, boolean> = new Map();
    private cooldowns: Map<string, number> = new Map();

    getCounter(key: string): number { return this.counters.get(key) || 0; }
    setCounter(key: string, value: number) { this.counters.set(key, value); }
    incrementCounter(key: string, delta: number = 1) { this.setCounter(key, this.getCounter(key) + delta); }

    getFlag(key: string): boolean { return this.flags.get(key) || false; }
    setFlag(key: string, value: boolean) { this.flags.set(key, value); }

    isOnCooldown(key: string, currentTime: number): boolean {
        return (this.cooldowns.get(key) || 0) > currentTime;
    }
    setCooldown(key: string, currentTime: number, duration: number) {
        this.cooldowns.set(key, currentTime + duration);
    }
}

export interface CombatContext {
    player: Player;
    conditions: EncounterConditions;
    currentTime: number;
    recordDamage: (amount: number, source: string) => void;
    logEvent: (event: string, description: string) => void;
    statusManager: StatusManager;
    state: CombatState;
    eventBus: any; // Using any to avoid circular dependency for now, or import type
}

export abstract class BaseEffect {
    constructor(public source?: string) {}

    abstract applyStatic(player: Player, conditions: EncounterConditions, multiplier: number): void;
    abstract executeDynamic(ctx: CombatContext, event?: CombatEvent): void;
    abstract getDescription(): string;
    abstract clone(newSource?: string): BaseEffect;
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

    executeDynamic(_ctx: CombatContext, _event?: CombatEvent): void {}

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

    executeDynamic(_ctx: CombatContext, _event?: CombatEvent): void {}

    getDescription(): string {
        return `Set flag ${this.flag} to ${this.value}`;
    }

    clone(newSource?: string): SetFlagEffect {
        return new SetFlagEffect(this.flag, this.value, newSource ?? this.source);
    }
}

/**
 * Specifically for visualizing attribute changes that aren't tied to a complex logic effect.
 */
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

    executeDynamic(_ctx: CombatContext, _event?: CombatEvent): void {}

    getDescription(): string {
        return `${this.stat.replace(/_/g, ' ')}: +${this.value}`;
    }

    clone(newSource?: string): StaticAttributeEffect {
        return new StaticAttributeEffect(this.stat, this.value, newSource ?? this.source);
    }
}

export class ExplosionEffect extends BaseEffect {
    private processor = new DamageProcessor();

    constructor(
        public readonly scalingFactor: number,
        public readonly statType: StatType,
        public readonly cooldownSeconds: number = 0,
        source?: string
    ) {
        super(source); 
    }

    applyStatic(_player: Player, _conditions: EncounterConditions, _multiplier: number = 1): void {}

    executeDynamic(ctx: CombatContext, event?: CombatEvent): void {
        const cooldownKey = `explosion-${this.source || 'Generic'}`;
        if (this.cooldownSeconds > 0 && ctx.state.isOnCooldown(cooldownKey, ctx.currentTime)) {
            return;
        }

        const baseStat = ctx.player.stats.get(this.statType)?.value ?? 0;
        const rawDamage = baseStat * this.scalingFactor;
        
        // Use DamageIntent for explosions
        const target = event?.targetEntityId ? { id: event.targetEntityId, hp: 99999, takeDamage: () => {}, isDead: () => false, statusManager: ctx.statusManager } as any : { id: 'unknown', hp: 99999, takeDamage: () => {}, isDead: () => false, statusManager: ctx.statusManager } as any;

        const intent = new DamageIntent(rawDamage, ctx.player, target, true, 0.0, this.source || 'Explosion')
            .addTrait(DamageTrait.Explosive)
            .addTrait(DamageTrait.Status)
            .addTrait(DamageTrait.Elemental);

        const damage = this.processor.resolve(intent);

        ctx.recordDamage(damage, this.source || 'Explosion');
        
        // We emit to eventBus if we have access to it, for proc gating
        if (ctx.eventBus) {
            ctx.eventBus.emit({
                type: EventTrigger.OnHit,
                source: ctx.player,
                target: target,
                intent: intent,
                damage: damage,
                depth: 0 // Should be derived from original event, but keep simple for now
            });
        }

        if (this.cooldownSeconds > 0) {
            ctx.state.setCooldown(cooldownKey, ctx.currentTime, this.cooldownSeconds);
        }
    }

    getDescription(): string {
        return `Trigger explosion scaling ${this.scalingFactor}x off ${this.statType}`;
    }

    clone(newSource?: string): ExplosionEffect {
        return new ExplosionEffect(this.scalingFactor, this.statType, this.cooldownSeconds, newSource ?? this.source);
    }
}

export class BuffEffect extends BaseEffect {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly durationSeconds: number,
        public readonly maxStacks: number,
        public readonly effects: BaseEffect[],
        source?: string
    ) {
        super(source);
    }

    applyStatic(_player: Player, _conditions: EncounterConditions, _multiplier: number = 1): void {}

    executeDynamic(ctx: CombatContext, event?: CombatEvent): void {
        const targetManager = (event as any)?.source?.statusManager || ctx.statusManager;
        targetManager.addBuff(this, ctx);
    }

    getDescription(): string {
        return `Grants ${this.name} buff for ${this.durationSeconds}s`;
    }

    clone(newSource?: string): BuffEffect {
        return new BuffEffect(this.id, this.name, this.durationSeconds, this.maxStacks, this.effects.map(e => e.clone()), newSource ?? this.source);
    }
}

export class DoTEffect extends BaseEffect {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly tickInterval: number,
        public readonly durationSeconds: number,
        public readonly maxStacks: number,
        public readonly maxStacksStat?: StatType,
        public readonly durationStat?: StatType,
        source?: string
    ) {
        super(source);
    }

    applyStatic(_player: Player, _conditions: EncounterConditions, _multiplier: number = 1): void {}

    executeDynamic(ctx: CombatContext, event?: CombatEvent): void {
        let finalMaxStacks = this.maxStacks;
        let finalDuration = this.durationSeconds;

        if (this.maxStacksStat) {
            finalMaxStacks = ctx.player.stats.get(this.maxStacksStat)?.value ?? this.maxStacks;
        }

        if (this.durationStat) {
            const durationMult = (ctx.player.stats.get(this.durationStat)?.value ?? 100) / 100;
            finalDuration *= durationMult;
        }

        const targetManager = (event as any)?.target?.statusManager || ctx.statusManager;
        targetManager.addDoT(this, ctx, finalMaxStacks, finalDuration);
    }

    getDescription(): string {
        return `Inflicts ${this.name} DoT for ${this.durationSeconds}s`;
    }

    clone(newSource?: string): DoTEffect {
        return new DoTEffect(this.id, this.name, this.tickInterval, this.durationSeconds, this.maxStacks, this.maxStacksStat, this.durationStat, newSource ?? this.source);
    }
}

export class ActiveBuff {
    public currentStacks: number = 1;
    public remainingDuration: number;

    constructor(
        public readonly definition: BuffEffect,
        public readonly isPermanent: boolean = false
    ) {
        this.remainingDuration = definition.durationSeconds;
    }

    tick(deltaTime: number): void {
        if (!this.isPermanent) this.remainingDuration -= deltaTime;
    }

    isExpired(): boolean {
        return !this.isPermanent && this.remainingDuration <= 0;
    }

    addStack(): void {
        this.currentStacks = Math.min(this.definition.maxStacks, this.currentStacks + 1);
        this.remainingDuration = this.definition.durationSeconds; 
    }
}

export class ActiveDoT {
    public currentStacks: number = 1;
    public remainingDuration: number;
    public nextTickTime: number;

    constructor(
        public readonly definition: DoTEffect,
        startTime: number,
        public maxStacks: number,
        public duration: number
    ) {
        this.remainingDuration = duration;
        this.nextTickTime = startTime + definition.tickInterval;
    }

    tick(currentTime: number, dt: number): boolean {
        this.remainingDuration -= dt;
        if (currentTime >= this.nextTickTime) {
            this.nextTickTime += this.definition.tickInterval;
            return true;
        }
        return false;
    }

    isExpired(): boolean {
        return this.remainingDuration <= 0;
    }

    addStack(maxStacks: number, duration: number): void {
        this.maxStacks = maxStacks;
        this.duration = duration;
        this.currentStacks = Math.min(this.maxStacks, this.currentStacks + 1);
        this.remainingDuration = this.duration;
    }
}
