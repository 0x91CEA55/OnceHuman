import { ActiveBuff, ActiveDoT, CombatContext, BuffEffect, DoTEffect } from '../models/effect';
import { Entity } from '../models/entity';

export class StatusManager {
    private activeDoTs: ActiveDoT[] = [];
    private activeBuffs: ActiveBuff[] = [];

    constructor(public readonly owner: Entity) {}

    addBuff(effect: BuffEffect, ctx: CombatContext): void {
        const incoming = new ActiveBuff(effect);
        let existing = this.activeBuffs.find(b => b.canStackWith(incoming));
        
        if (existing) {
            existing.onStackAdded(incoming, ctx);
        } else {
            this.activeBuffs.push(incoming);
            incoming.onApply(ctx);
        }
    }

    addDoT(effect: DoTEffect, ctx: CombatContext, maxStacks: number, duration: number): void {
        const incoming = new ActiveDoT(effect, ctx.currentTime, maxStacks, duration);
        let existing = this.activeDoTs.find(d => d.canStackWith(incoming));
        
        if (existing) {
            existing.onStackAdded(incoming, ctx);
        } else {
            this.activeDoTs.push(incoming);
            incoming.onApply(ctx);
        }
    }

    tick(dt: number, ctx: CombatContext): void {
        // 1. Tick Buffs
        for (let i = this.activeBuffs.length - 1; i >= 0; i--) {
            const buff = this.activeBuffs[i];
            buff.tick(dt);
            buff.onTick(ctx);
            if (buff.isExpired()) {
                buff.onExpire(ctx);
                this.activeBuffs.splice(i, 1);
            }
        }

        // 2. Tick DoTs
        for (let i = this.activeDoTs.length - 1; i >= 0; i--) {
            const dot = this.activeDoTs[i];
            const isTickTime = dot.tickWithDamage(ctx.currentTime, dt);
            
            if (isTickTime) {
                // Delegation: Let the DoT instance resolve its own damage math
                dot.onTick(ctx);
            }

            if (dot.isExpired()) {
                dot.onExpire(ctx);
                this.activeDoTs.splice(i, 1);
            }
        }
    }

    clear(): void {
        this.activeDoTs = [];
        this.activeBuffs = [];
    }

    hasActiveStatus(): boolean {
        return this.activeDoTs.length > 0 || this.activeBuffs.length > 0;
    }
    
    getActiveBuffs(): ActiveBuff[] {
        return this.activeBuffs;
    }

    getActiveDoTs(): ActiveDoT[] {
        return this.activeDoTs;
    }
}
