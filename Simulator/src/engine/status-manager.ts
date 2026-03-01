import { ActiveBuff, ActiveDoT, CombatContext, BuffEffect, DoTEffect } from '../models/effect';
import { Entity } from '../models/entity';
import { DamageIntent } from '../models/damage';
import { DamageTrait, StatType } from '../types/enums';
import { DamageProcessor } from './damage-processor';

export class StatusManager {
    private activeDoTs: ActiveDoT[] = [];
    private activeBuffs: ActiveBuff[] = [];
    private processor = new DamageProcessor(); // Should ideally be injected, but keeping it simple for now

    constructor(public readonly owner: Entity) {}

    addBuff(effect: BuffEffect, ctx: CombatContext): void {
        let existing = this.activeBuffs.find((b: ActiveBuff) => b.definition.id === effect.id);
        if (existing) {
            existing.addStack();
            ctx.logEvent('Buff Stack', `${effect.name} (${existing.currentStacks}x)`);
        } else {
            const newBuff = new ActiveBuff(
                effect,
                false
            );
            this.activeBuffs.push(newBuff);
            ctx.logEvent('Buff Gained', effect.name);
        }
    }

    addDoT(effect: DoTEffect, ctx: CombatContext, maxStacks: number, duration: number): void {
        let existing = this.activeDoTs.find(d => d.definition.id === effect.id);
        if (existing) {
            existing.addStack(maxStacks, duration);
            ctx.logEvent('DoT Stack', `${effect.name} (${existing.currentStacks}x)`);
        } else {
            const newDoT = new ActiveDoT(
                effect,
                ctx.currentTime,
                maxStacks,
                duration
            );
            this.activeDoTs.push(newDoT);
            ctx.logEvent('DoT Gained', effect.name);
        }
    }

    tick(dt: number, ctx: CombatContext): void {
        // 1. Tick Buffs
        for (let i = this.activeBuffs.length - 1; i >= 0; i--) {
            const buff = this.activeBuffs[i];
            buff.tick(dt);
            if (buff.isExpired()) {
                ctx.logEvent('Buff Expired', buff.definition.name);
                this.activeBuffs.splice(i, 1);
            }
        }

        // 2. Tick DoTs
        for (let i = this.activeDoTs.length - 1; i >= 0; i--) {
            const dot = this.activeDoTs[i];
            const shouldDamage = dot.tick(ctx.currentTime, dt);
            
            if (shouldDamage) {
                // Determine base damage and traits dynamically
                // DoTs scale from player stats at time of tick (live-scaling, can be snapshot later if needed)
                let baseDmg = 0;
                let trait = DamageTrait.Status;

                if (dot.definition.id === 'status-burn') {
                    // Burn: 12% Psi
                    baseDmg = (ctx.player.stats.get(StatType.PsiIntensity)?.value ?? 0) * 0.12;
                    trait = DamageTrait.Burn;
                } else if (dot.definition.id === 'status-vortex') {
                    // Frost Vortex: 50% Psi
                    baseDmg = (ctx.player.stats.get(StatType.PsiIntensity)?.value ?? 0) * 0.50;
                    trait = DamageTrait.FrostVortex;
                }

                const intent = new DamageIntent(baseDmg, ctx.player, this.owner, true, 1.0, `${dot.definition.name} Tick`)
                    .addTrait(DamageTrait.Status)
                    .addTrait(DamageTrait.Elemental)
                    .addTrait(trait);

                const finalTickDmg = this.processor.resolve(intent) * dot.currentStacks;
                ctx.recordDamage(finalTickDmg, `${dot.definition.name} Tick`);
            }

            if (dot.isExpired()) {
                ctx.logEvent('DoT Expired', dot.definition.name);
                this.activeDoTs.splice(i, 1);
            }
        }
    }

    clear(): void {
        this.activeDoTs = [];
        this.activeBuffs = [];
    }

    hasActiveStatus(): boolean {
        return this.activeDoTs.length > 0;
    }
    
    getActiveBuffs(): ActiveBuff[] {
        return this.activeBuffs;
    }

    getActiveDoTs(): ActiveDoT[] {
        return this.activeDoTs;
    }
}
