import { DamageIntent } from './damage';
import { DamageTrait, EventTrigger } from '../types/enums';
import { DamageProcessor } from '../engine/damage-processor';
import { StatType, FlagType } from '../types/enums';
import { Player } from './player';
import { EncounterConditions, CombatEvent, AggregationContext } from '../types/common';
import { StatusManager } from '../engine/status-manager';
import { LegacyResolutionStrategy } from '../engine/damage-resolution-strategy';
import { Entity } from './entity';

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
    recordDamage: (amount: number, source: string, intent?: DamageIntent) => void;
    logEvent: (event: string, description: string) => void;
    statusManager: StatusManager;
    state: CombatState;
    eventBus: any; // Using any to avoid circular dependency for now, or import type
    getNearbyTargets: (target: Entity, radius: number) => Entity[];
}

export abstract class BaseEffect {
    constructor(public source?: string) {}

    abstract applyStatic(player: Player, conditions: EncounterConditions, multiplier: number): void;
    abstract executeDynamic(ctx: CombatContext, event?: CombatEvent): void;
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

    executeDynamic(_ctx: CombatContext, _event?: CombatEvent): void {}

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

export class ShrapnelEffect extends BaseEffect {
    private processor = new DamageProcessor(new LegacyResolutionStrategy());

    constructor(source?: string) {
        super(source || 'Shrapnel');
    }

    applyStatic(_player: Player, _conditions: EncounterConditions, _multiplier: number = 1): void {}

    executeDynamic(ctx: CombatContext, event?: CombatEvent): void {
        const attack = (ctx.player.stats.get(StatType.AttackPercent) || { value: 0 }).value;
        const baseDmg = attack * 0.50; 
        
        const target = (event as any)?.target || ctx.statusManager.owner;
        const intent = new DamageIntent(baseDmg, ctx.player, target, true, 0.0, this.source)
            .addTrait(DamageTrait.Weapon)
            .addTrait(DamageTrait.Shrapnel);

        const damage = this.processor.resolve(intent);
        ctx.recordDamage(damage, this.source || 'Shrapnel', intent);
    }

    getDescription(): string {
        return `Trigger Shrapnel (50% Attack)`;
    }

    clone(newSource?: string): ShrapnelEffect {
        return new ShrapnelEffect(newSource ?? this.source);
    }
}

export class ExplosionEffect extends BaseEffect {
    private processor = new DamageProcessor(new LegacyResolutionStrategy());

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
        
        const mainTarget = (event as any)?.target || { id: 'unknown', hp: 99999, takeDamage: () => {}, isDead: () => false, statusManager: ctx.statusManager };
        const otherTargets = ctx.getNearbyTargets(mainTarget, 5); 
        
        const allTargets = [mainTarget, ...otherTargets];

        for (const target of allTargets) {
            const intent = new DamageIntent(rawDamage, ctx.player, target, true, 0.0, this.source || 'Explosion')
                .addTrait(DamageTrait.Explosive)
                .addTrait(DamageTrait.Status)
                .addTrait(DamageTrait.Elemental);

            const damage = this.processor.resolve(intent);
            ctx.recordDamage(damage, this.source || 'Explosion', intent);
            
            if (ctx.eventBus) {
                ctx.eventBus.emit({
                    type: EventTrigger.OnHit,
                    source: ctx.player,
                    target: target,
                    intent: intent,
                    damage: damage,
                    depth: 0 
                });
            }
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
        public readonly scalingFactor: number,
        public readonly baseStatType: StatType,
        public readonly trait: DamageTrait,
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
        return new DoTEffect(this.id, this.name, this.tickInterval, this.durationSeconds, this.maxStacks, this.scalingFactor, this.baseStatType, this.trait, this.maxStacksStat, this.durationStat, newSource ?? this.source);
    }
}

export abstract class StatusInstance {
    public currentStacks: number = 1;
    public remainingDuration: number;

    constructor(
        public readonly definition: BaseEffect & { id: string, name: string, durationSeconds: number, maxStacks: number },
        public readonly isPermanent: boolean = false
    ) {
        this.remainingDuration = definition.durationSeconds;
    }

    abstract onApply(ctx: CombatContext): void;
    abstract onTick(ctx: CombatContext): void;
    abstract onExpire(ctx: CombatContext): void;
    abstract onRemoved(ctx: CombatContext): void;

    canStackWith(other: StatusInstance): boolean {
        return this.definition.id === other.definition.id;
    }

    onStackAdded(incoming: StatusInstance, ctx: CombatContext): void {
        this.currentStacks = Math.min(this.definition.maxStacks, this.currentStacks + incoming.currentStacks);
        this.remainingDuration = this.definition.durationSeconds;
        ctx.logEvent('Status Stack', `${this.definition.name} (${this.currentStacks}x)`);
    }

    tick(deltaTime: number): void {
        if (!this.isPermanent) this.remainingDuration -= deltaTime;
    }

    isExpired(): boolean {
        return !this.isPermanent && this.remainingDuration <= 0;
    }
}

export class ActiveBuff extends StatusInstance {
    constructor(
        public readonly definition: BuffEffect,
        isPermanent: boolean = false
    ) {
        super(definition, isPermanent);
    }

    onApply(ctx: CombatContext): void {
        ctx.logEvent('Buff Gained', this.definition.name);
    }

    onTick(_ctx: CombatContext): void {}

    onExpire(ctx: CombatContext): void {
        ctx.logEvent('Buff Expired', this.definition.name);
    }

    onRemoved(ctx: CombatContext): void {
        ctx.logEvent('Buff Removed', this.definition.name);
    }
}

export class ActiveDoT extends StatusInstance {
    public nextTickTime: number;
    public maxStacks: number;
    public duration: number;
    private processor = new DamageProcessor(new LegacyResolutionStrategy());

    constructor(
        public readonly definition: DoTEffect,
        startTime: number,
        maxStacks: number,
        duration: number
    ) {
        super(definition, false);
        this.maxStacks = maxStacks;
        this.duration = duration;
        this.remainingDuration = duration;
        this.nextTickTime = startTime + definition.tickInterval;
    }

    onApply(ctx: CombatContext): void {
        ctx.logEvent('DoT Gained', this.definition.name);
    }

    onTick(ctx: CombatContext): void {
        const baseVal = (ctx.player.stats.get(this.definition.baseStatType)?.value ?? 0) * this.definition.scalingFactor;
        
        const intent = new DamageIntent(baseVal, ctx.player, ctx.statusManager.owner, true, 1.0, `${this.definition.name} Tick`)
            .addTrait(DamageTrait.Status)
            .addTrait(DamageTrait.Elemental)
            .addTrait(this.definition.trait);

        const finalDamage = this.processor.resolve(intent) * this.currentStacks;
        ctx.recordDamage(finalDamage, `${this.definition.name} Tick`, intent);
    }

    onExpire(ctx: CombatContext): void {
        ctx.logEvent('DoT Expired', this.definition.name);
    }

    onRemoved(ctx: CombatContext): void {
        ctx.logEvent('DoT Removed', this.definition.name);
    }

    override onStackAdded(incoming: ActiveDoT, ctx: CombatContext): void {
        this.maxStacks = incoming.maxStacks;
        this.duration = incoming.duration;
        this.currentStacks = Math.min(this.maxStacks, this.currentStacks + incoming.currentStacks);
        this.remainingDuration = this.duration;
        ctx.logEvent('DoT Stack', `${this.definition.name} (${this.currentStacks}x)`);
    }

    tickWithDamage(currentTime: number, dt: number, ctx: CombatContext): boolean {
        super.tick(dt);
        
        if (currentTime >= this.nextTickTime) {
            // Calculate dynamic interval based on Frequency stat (e.g. BBQ Gloves)
            let frequencyBonus = 0;
            if (this.definition.id === 'status-burn') {
                frequencyBonus = ctx.player.stats.get(StatType.BurnFrequencyPercent)?.value || 0;
            }
            
            const dynamicInterval = this.definition.tickInterval / (1 + frequencyBonus / 100);
            this.nextTickTime += dynamicInterval;
            return true;
        }
        return false;
    }
}
