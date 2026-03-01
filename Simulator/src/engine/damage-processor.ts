import { DamageIntent } from '../models/damage';
import { Player } from '../models/player';
import { DamageTrait, StatType } from '../types/enums';

const TRAIT_MULTIPLIER_MAP: Partial<Record<DamageTrait, StatType>> = {
    [DamageTrait.Status]: StatType.StatusDamagePercent,
    [DamageTrait.Elemental]: StatType.ElementalDamagePercent,
    [DamageTrait.Weapon]: StatType.WeaponDamagePercent,
    [DamageTrait.Attack]: StatType.AttackPercent,
    [DamageTrait.Burn]: StatType.BurnDamagePercent,
    [DamageTrait.FrostVortex]: StatType.FrostVortexDamagePercent,
    [DamageTrait.PowerSurge]: StatType.PowerSurgeDamagePercent,
    [DamageTrait.Shrapnel]: StatType.ShrapnelDamagePercent,
    [DamageTrait.UnstableBomber]: StatType.UnstableBomberDamagePercent,
    [DamageTrait.Bounce]: StatType.BounceDamagePercent,
    [DamageTrait.BullsEye]: StatType.BullsEyeDamagePercent,
};

export class DamageProcessor {
    constructor() {}

    resolve(intent: DamageIntent): number {
        const source = intent.source;
        const target = intent.target;

        if (source instanceof Player) {
            // 1. Iterate through Traits and apply corresponding Stat Multipliers to Buckets
            for (const trait of intent.getTraits()) {
                const statType = TRAIT_MULTIPLIER_MAP[trait];
                if (statType) {
                    const statValue = source.stats.get(statType)?.value ?? 0;
                    const multiplier = 1 + (statValue / 100);
                    
                    // Determine bucket name
                    let bucket = 'generic';
                    if (trait === DamageTrait.Status) bucket = 'status';
                    else if (trait === DamageTrait.Elemental) bucket = 'elemental';
                    else if (trait === DamageTrait.Weapon || trait === DamageTrait.Attack) bucket = 'attack';
                    else if (trait === DamageTrait.Burn || trait === DamageTrait.FrostVortex || 
                             trait === DamageTrait.PowerSurge || trait === DamageTrait.Shrapnel ||
                             trait === DamageTrait.UnstableBomber || trait === DamageTrait.Bounce ||
                             trait === DamageTrait.BullsEye) bucket = 'keyword';

                    intent.addMultiplier(multiplier, bucket);
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
