import { DamageIntent } from '../models/damage';
import { Player } from '../models/player';
import { DamageTrait, StatType } from '../types/enums';

// Mapping Trait -> { FactorStat, FinalStat }
interface TraitStatMapping {
    factor: StatType;
    final?: StatType;
}

const TRAIT_MULTIPLIER_MAP: Partial<Record<DamageTrait, TraitStatMapping>> = {
    [DamageTrait.Status]: { factor: StatType.StatusDamagePercent },
    [DamageTrait.Elemental]: { factor: StatType.ElementalDamagePercent },
    [DamageTrait.Weapon]: { factor: StatType.WeaponDamagePercent },
    [DamageTrait.Attack]: { factor: StatType.AttackPercent },
    
    [DamageTrait.Burn]: { factor: StatType.BurnDamageFactor, final: StatType.BurnFinalDamage },
    [DamageTrait.FrostVortex]: { factor: StatType.FrostVortexDamageFactor, final: StatType.FrostVortexFinalDamage },
    [DamageTrait.PowerSurge]: { factor: StatType.PowerSurgeDamageFactor, final: StatType.PowerSurgeFinalDamage },
    [DamageTrait.Shrapnel]: { factor: StatType.ShrapnelDamageFactor, final: StatType.ShrapnelFinalDamage },
    [DamageTrait.UnstableBomber]: { factor: StatType.UnstableBomberDamageFactor, final: StatType.UnstableBomberFinalDamage },
    [DamageTrait.Bounce]: { factor: StatType.BounceDamageFactor, final: StatType.BounceFinalDamage },
};

export class DamageProcessor {
    constructor() {}

    resolve(intent: DamageIntent): number {
        const source = intent.source;
        const target = intent.target;

        if (source instanceof Player) {
            // 1. Resolve Multipliers via Traits
            for (const trait of intent.getTraits()) {
                const mapping = TRAIT_MULTIPLIER_MAP[trait];
                if (mapping) {
                    // Factor Bucket (Additive within, Multiplicative across)
                    const factorVal = source.stats.get(mapping.factor)?.value ?? 0;
                    if (factorVal !== 0) {
                        intent.addMultiplier(1 + (factorVal / 100), `${trait}_factor`);
                    }

                    // Final Bucket (Multiplicative with Factor)
                    if (mapping.final) {
                        const finalVal = source.stats.get(mapping.final)?.value ?? 0;
                        if (finalVal !== 0) {
                            intent.addMultiplier(1 + (finalVal / 100), `${trait}_final`);
                        }
                    }
                }
            }

            // 2. Resolve Crit
            if (intent.behavior.canCrit) {
                const finalCritRate = ((source.stats.get(StatType.CritRatePercent)?.value ?? 0) + intent.behavior.critRateBonus) / 100;
                if (Math.random() < finalCritRate) {
                    const critDmg = 1 + ((source.stats.get(StatType.CritDamagePercent)?.value ?? 0) + intent.behavior.critDamageBonus) / 100;
                    intent.addMultiplier(critDmg, 'crit');
                }
            }

            // 3. Resolve Weakspot
            if (intent.behavior.canWeakspot) {
                if (Math.random() < 0.5) {
                    const wsDmg = 1 + ((source.stats.get(StatType.WeakspotDamagePercent)?.value ?? 0) + intent.behavior.weakspotDamageBonus) / 100;
                    intent.addMultiplier(wsDmg, 'weakspot');
                }
            }

            const finalDamage = intent.resolve();
            target.takeDamage(intent, finalDamage, false, false); 
            
            return finalDamage;
        }
        
        return intent.resolve();
    }
}
