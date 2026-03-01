import { EventTrigger, EnemyType } from '../types/enums';
import { BaseEffect, CombatContext } from './effect';
import { CombatEvent } from '../types/common';

export abstract class Condition {
    abstract evaluate(ctx: CombatContext, eventData?: CombatEvent): boolean;
}
//... existing conditions
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
        // Safe access to procCoefficient on new event format, defaulting to 1
        const coeff = eventData?.intent?.procCoefficient ?? 1.0;
        return Math.random() < (this.probability * coeff);
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
