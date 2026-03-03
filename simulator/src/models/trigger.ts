import { EventTrigger, EnemyType } from '../types/enums';
import { BaseEffect, CombatContext } from './effect';
import { CombatEvent } from '../engine/event-bus';

export abstract class Condition {
    abstract evaluate(ctx: CombatContext, eventData?: CombatEvent): boolean;
}

export class EnemyTypeCondition extends Condition {
    constructor(private readonly allowedTypes: EnemyType[]) { super(); }
    evaluate(ctx: CombatContext): boolean {
        return this.allowedTypes.includes(ctx.conditions.enemyType);
    }
}

export class DistanceCondition extends Condition {
    constructor(private readonly maxDistance: number) { super(); }
    evaluate(ctx: CombatContext): boolean {
        return ctx.conditions.targetDistanceMeters <= this.maxDistance;
    }
}

export class ChanceCondition extends Condition {
    constructor(private readonly probability: number) { super(); }
    evaluate(_ctx: CombatContext, eventData?: any): boolean {
        const coeff = eventData?.intent?.procCoefficient ?? 1.0;
        return Math.random() < (this.probability * coeff);
    }
}

/**
 * Specifically for weapons like Jaws/Last Valor that count hits toward a proc.
 * Stores counter in the CombatState to ensure persistence across simulation steps.
 */
export class HitCounterCondition extends Condition {
    constructor(
        private readonly targetHits: number,
        private readonly critsCountAsTwo: boolean = false
    ) {
        super();
    }

    evaluate(ctx: CombatContext, eventData?: CombatEvent): boolean {
        const key = `hit-counter-${this.targetHits}`;
        // If it's a crit and we count crits as two, we increment by 2.
        // Otherwise, it's a standard hit increment of 1.
        const increment = (this.critsCountAsTwo && eventData?.isCrit) ? 2 : 1;
        
        ctx.state.incrementCounter(key, increment);
        
        if (ctx.state.getCounter(key) >= this.targetHits) {
            ctx.state.setCounter(key, 0); // Reset
            return true;
        }
        return false;
    }
}

export class TargetAtMaxStatusStacksCondition extends Condition {
    constructor(private readonly statusId: string) { super(); }
    evaluate(ctx: CombatContext, eventData?: any): boolean {
        const target = eventData?.target || ctx.statusManager.owner;
        const status = target.statusManager.getActiveDoTs().find((d: any) => d.definition.id === this.statusId) 
                    || target.statusManager.getActiveBuffs().find((b: any) => b.definition.id === this.statusId);
        
        if (!status) return false;
        return status.currentStacks >= status.definition.maxStacks;
    }
}

export abstract class BaseTrigger {
    constructor(public readonly type: EventTrigger) {}
    abstract shouldFire(eventData?: CombatEvent): boolean;
}

export class OnHitTrigger extends BaseTrigger {
    constructor() { super(EventTrigger.OnHit); }
    shouldFire(): boolean { return true; }
}

export class OnCritTrigger extends BaseTrigger {
    constructor() { super(EventTrigger.OnCrit); }
    shouldFire(): boolean { return true; }
}

export class OnKillTrigger extends BaseTrigger {
    constructor() { super(EventTrigger.OnKill); }
    shouldFire(): boolean { return true; }
}

export class OnReloadTrigger extends BaseTrigger {
    constructor() { super(EventTrigger.OnReload); }
    shouldFire(): boolean { return true; }
}

export class EveryNShotsTrigger extends BaseTrigger {
    private counter = 0;
    constructor(private readonly n: number) { super(EventTrigger.OnHit); }
    shouldFire(): boolean {
        this.counter++;
        if (this.counter >= this.n) {
            this.counter = 0;
            return true;
        }
        return false;
    }
}

export class TriggeredEffect {
    constructor(
        public readonly trigger: BaseTrigger,
        public readonly effects: BaseEffect[],
        public readonly conditions: Condition[] = []
    ) {}

    evaluate(ctx: CombatContext, eventData?: CombatEvent): boolean {
        if (this.trigger.type !== eventData?.type) return false;
        if (!this.trigger.shouldFire(eventData)) return false;
        
        for (const condition of this.conditions) {
            if (!condition.evaluate(ctx, eventData)) return false;
        }

        return true;
    }

    execute(ctx: CombatContext, eventData?: CombatEvent): void {
        for (const effect of this.effects) {
            effect.executeDynamic(ctx, eventData);
        }
    }
}
