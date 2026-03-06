import { AmmunitionType } from '../types/enums';

export interface AmmunitionData {
    type: AmmunitionType;
    name: string;
    /** Percentage bonus to Weapon Damage bucket (e.g. 15 for +15%) */
    weaponDamageBonus: number;
    /** Percentage bonus to Psi Intensity bucket (e.g. 15 for +15%) */
    psiIntensityBonus: number;
}

/**
 * ADR-008 Source Truth for Ammunition bonuses.
 * Based on user-verified game mechanics:
 * Copper: Base, Copper AP: +4%, Steel: +5%, Steel AP: +8%, Tungsten: +10%, Tungsten AP: +15%.
 */
export const AMMUNITION: Record<AmmunitionType, AmmunitionData> = {
    [AmmunitionType.Copper]: { 
        type: AmmunitionType.Copper, 
        name: 'Copper Ammo', 
        weaponDamageBonus: 0, 
        psiIntensityBonus: 0 
    },
    [AmmunitionType.CopperAP]: { 
        type: AmmunitionType.CopperAP, 
        name: 'Advanced Copper Ammo', 
        weaponDamageBonus: 4, 
        psiIntensityBonus: 4 
    },
    [AmmunitionType.Steel]: { 
        type: AmmunitionType.Steel, 
        name: 'Steel Ammo', 
        weaponDamageBonus: 5, 
        psiIntensityBonus: 5 
    },
    [AmmunitionType.SteelAP]: { 
        type: AmmunitionType.SteelAP, 
        name: 'Advanced Steel Ammo', 
        weaponDamageBonus: 8, 
        psiIntensityBonus: 8 
    },
    [AmmunitionType.Tungsten]: { 
        type: AmmunitionType.Tungsten, 
        name: 'Tungsten Ammo', 
        weaponDamageBonus: 10, 
        psiIntensityBonus: 10 
    },
    [AmmunitionType.TungstenAP]: { 
        type: AmmunitionType.TungstenAP, 
        name: 'Advanced Tungsten Ammo', 
        weaponDamageBonus: 15, 
        psiIntensityBonus: 15 
    },
};
