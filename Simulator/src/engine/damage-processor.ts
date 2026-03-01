import { DamageIntent } from '../models/damage';
import { Player } from '../models/player';
import { DamageTrait, StatType } from '../types/enums';

export class DamageProcessor {
    constructor() {}

    resolve(intent: DamageIntent): number {
        const source = intent.source;
        const target = intent.target;

        if (source instanceof Player) {
            // Apply Player Multipliers based on Traits
            let multiplier = 1.0;

            if (intent.hasTrait(DamageTrait.Status)) {
                const statusMult = 1 + (source.stats.get(StatType.StatusDamagePercent)?.value ?? 0) / 100;
                multiplier *= statusMult;
            }

            if (intent.hasTrait(DamageTrait.Elemental)) {
                const elementalMult = 1 + (source.stats.get(StatType.ElementalDamagePercent)?.value ?? 0) / 100;
                multiplier *= elementalMult;
            }

            if (intent.hasTrait(DamageTrait.Weapon)) {
                const weaponMult = 1 + (source.stats.get(StatType.WeaponDamagePercent)?.value ?? 0) / 100;
                multiplier *= weaponMult;
            }
            
            if (intent.hasTrait(DamageTrait.Physical) || intent.hasTrait(DamageTrait.Weapon)) {
                const attackMult = 1 + (source.stats.get(StatType.AttackPercent)?.value ?? 0) / 100;
                multiplier *= attackMult;
            }

            // Keyword specific multiplier based on traits (e.g. Burn, FrostVortex)
            if (intent.hasTrait(DamageTrait.Burn)) {
                multiplier *= 1 + (source.stats.get(StatType.BurnDamagePercent)?.value ?? 0) / 100;
            } else if (intent.hasTrait(DamageTrait.FrostVortex)) {
                multiplier *= 1 + (source.stats.get(StatType.FrostVortexDamagePercent)?.value ?? 0) / 100;
            } else if (intent.hasTrait(DamageTrait.PowerSurge)) {
                multiplier *= 1 + (source.stats.get(StatType.PowerSurgeDamagePercent)?.value ?? 0) / 100;
            } else if (intent.hasTrait(DamageTrait.Shrapnel)) {
                multiplier *= 1 + (source.stats.get(StatType.ShrapnelDamagePercent)?.value ?? 0) / 100;
            } else if (intent.hasTrait(DamageTrait.UnstableBomber)) {
                multiplier *= 1 + (source.stats.get(StatType.UnstableBomberDamagePercent)?.value ?? 0) / 100;
            } else if (intent.hasTrait(DamageTrait.Bounce)) {
                multiplier *= 1 + (source.stats.get(StatType.BounceDamagePercent)?.value ?? 0) / 100;
            } else if (intent.hasTrait(DamageTrait.BullsEye)) {
                multiplier *= 1 + (source.stats.get(StatType.BullsEyeDamagePercent)?.value ?? 0) / 100;
            }

            intent.addMultiplier(multiplier);

            // Calculate Crit and Weakspot
            let finalCritRate = 0;
            let finalCritDmg = 1.0;
            let isCrit = false;

            if (intent.behavior.canCrit) {
                finalCritRate = ((source.stats.get(StatType.CritRatePercent)?.value ?? 0) + intent.behavior.critRateBonus) / 100;
                if (Math.random() < finalCritRate) {
                    isCrit = true;
                    finalCritDmg = 1 + ((source.stats.get(StatType.CritDamagePercent)?.value ?? 0) + intent.behavior.critDamageBonus) / 100;
                    intent.addMultiplier(finalCritDmg);
                }
            }

            let isWeakspot = false;
            if (intent.behavior.canWeakspot) {
                // In a real sim we'd have hit rate, for now just use intent config or 50%
                if (Math.random() < 0.5) { // Assuming 50% hit rate for now
                    isWeakspot = true;
                    const wsDmg = 1 + ((source.stats.get(StatType.WeakspotDamagePercent)?.value ?? 0) + intent.behavior.weakspotDamageBonus) / 100;
                    intent.addMultiplier(wsDmg);
                }
            }

            const finalDamage = intent.resolve();
            target.takeDamage(intent, finalDamage, isCrit, isWeakspot);
            
            // Return final damage to the engine/logger
            return finalDamage;
        }
        
        return intent.resolve();
    }
}
