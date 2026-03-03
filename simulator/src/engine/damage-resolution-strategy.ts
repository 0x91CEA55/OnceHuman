import { DamageIntent } from '../models/damage';
import { Player } from '../models/player';
import { DamageTrait, StatType } from '../types/enums';

export interface DamageResolutionStrategy {
    resolve(intent: DamageIntent): number;
}

/**
 * LegacyResolutionStrategy (Pure Multiplicative)
 * 
 * Each trait-based factor is its own multiplicative bucket.
 * This matches the original DamageProcessor behavior.
 */
export class LegacyResolutionStrategy implements DamageResolutionStrategy {
    private traitMultiplierMap: Partial<Record<DamageTrait, { factor: StatType; final?: StatType }>> = {
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

    resolve(intent: DamageIntent): number {
        const source = intent.source;

        if (source instanceof Player) {
            // 1. Resolve Multipliers via Traits
            for (const trait of intent.getTraits()) {
                const mapping = this.traitMultiplierMap[trait];
                if (mapping) {
                    const factorVal = source.stats.get(mapping.factor)?.value ?? 0;
                    if (factorVal !== 0) {
                        intent.addMultiplier(1 + (factorVal / 100), `${trait}_factor`);
                    }

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
                const critRate = ((source.stats.get(StatType.CritRatePercent)?.value ?? 0) + intent.behavior.critRateBonus) / 100;
                if (Math.random() < critRate) {
                    intent.isCrit = true;
                    const critDmg = 1 + ((source.stats.get(StatType.CritDamagePercent)?.value ?? 0) + intent.behavior.critDamageBonus) / 100;
                    intent.addMultiplier(critDmg, 'crit');
                }
            }

            // 3. Resolve Weakspot
            if (intent.behavior.canWeakspot) {
                // Simplifying weakspot hit chance for strategy demo
                if (Math.random() < 0.5) {
                    intent.isWeakspot = true;
                    const wsDmg = 1 + ((source.stats.get(StatType.WeakspotDamagePercent)?.value ?? 0) + intent.behavior.weakspotDamageBonus) / 100;
                    intent.addMultiplier(wsDmg, 'weakspot');
                }
            }
        }

        return intent.resolve();
    }
}

/**
 * RefinedResolutionStrategy (Bucket-Aware)
 */
export class RefinedResolutionStrategy implements DamageResolutionStrategy {
    resolve(intent: DamageIntent): number {
        const source = intent.source;

        if (source instanceof Player) {
            // Bucket 1: Damage Bonus (Additive)
            let damageBonusSum = 0;
            
            for (const trait of intent.getTraits()) {
                if (trait === DamageTrait.Weapon) damageBonusSum += source.stats.get(StatType.WeaponDamagePercent)?.value ?? 0;
                if (trait === DamageTrait.Elemental) damageBonusSum += source.stats.get(StatType.ElementalDamagePercent)?.value ?? 0;
                if (trait === DamageTrait.Status) damageBonusSum += source.stats.get(StatType.StatusDamagePercent)?.value ?? 0;
                if (trait === DamageTrait.Attack) damageBonusSum += source.stats.get(StatType.AttackPercent)?.value ?? 0;

                if (trait === DamageTrait.Burn) damageBonusSum += source.stats.get(StatType.BurnDamageFactor)?.value ?? 0;
                if (trait === DamageTrait.FrostVortex) damageBonusSum += source.stats.get(StatType.FrostVortexDamageFactor)?.value ?? 0;
                if (trait === DamageTrait.PowerSurge) damageBonusSum += source.stats.get(StatType.PowerSurgeDamageFactor)?.value ?? 0;
                if (trait === DamageTrait.Shrapnel) damageBonusSum += source.stats.get(StatType.ShrapnelDamageFactor)?.value ?? 0;
                if (trait === DamageTrait.UnstableBomber) damageBonusSum += source.stats.get(StatType.UnstableBomberDamageFactor)?.value ?? 0;
                if (trait === DamageTrait.Bounce) damageBonusSum += source.stats.get(StatType.BounceDamageFactor)?.value ?? 0;
            }

            intent.addMultiplier(1 + (damageBonusSum / 100), 'damage_bonus_bucket');

            // Bucket 2: Crit (Multiplicative)
            if (intent.behavior.canCrit) {
                const critRate = ((source.stats.get(StatType.CritRatePercent)?.value ?? 0) + intent.behavior.critRateBonus) / 100;
                if (Math.random() < critRate) {
                    intent.isCrit = true;
                    const critDmg = 1 + ((source.stats.get(StatType.CritDamagePercent)?.value ?? 0) + intent.behavior.critDamageBonus) / 100;
                    intent.addMultiplier(critDmg, 'crit');
                }
            }

            // Bucket 3: Weakspot (Multiplicative)
            if (intent.behavior.canWeakspot) {
                if (Math.random() < 0.5) {
                    intent.isWeakspot = true;
                    const wsDmg = 1 + ((source.stats.get(StatType.WeakspotDamagePercent)?.value ?? 0) + intent.behavior.weakspotDamageBonus) / 100;
                    intent.addMultiplier(wsDmg, 'weakspot');
                }
            }

            // Bucket 4: Final Damage (Multiplicative)
            for (const trait of intent.getTraits()) {
                let finalStat: StatType | undefined;
                if (trait === DamageTrait.Burn) finalStat = StatType.BurnFinalDamage;
                if (trait === DamageTrait.FrostVortex) finalStat = StatType.FrostVortexFinalDamage;
                if (trait === DamageTrait.PowerSurge) finalStat = StatType.PowerSurgeFinalDamage;
                if (trait === DamageTrait.Shrapnel) finalStat = StatType.ShrapnelFinalDamage;
                if (trait === DamageTrait.UnstableBomber) finalStat = StatType.UnstableBomberFinalDamage;
                if (trait === DamageTrait.Bounce) finalStat = StatType.BounceFinalDamage;

                if (finalStat) {
                    const finalVal = source.stats.get(finalStat)?.value ?? 0;
                    if (finalVal !== 0) {
                        intent.addMultiplier(1 + (finalVal / 100), `${trait}_final`);
                    }
                }
            }
            
            const vuln = source.stats.get(StatType.VulnerabilityPercent)?.value ?? 0;
            if (vuln !== 0) {
                intent.addMultiplier(1 + (vuln / 100), 'vulnerability');
            }
        }

        return intent.resolve();
    }
}
