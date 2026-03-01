import { ArmorSlot, Rarity, StatType, EffectType } from '../types/enums';
import { SetArmor, KeyArmor, ArmorStats, ArmorSetDefinition, Armor } from '../models/equipment';
import { Effect } from '../models/effect';

export interface ArmorData {
    id: string;
    name: string;
    slot: ArmorSlot;
    rarity: Rarity;
    setId?: string;
    intrinsicEffects?: Effect[];
}

export interface ArmorSetData {
    id: string;
    name: string;
    bonuses: { requiredPieces: number; effects: Effect[] }[];
}

export const ARMOR_SETS: Record<string, ArmorSetData> = {
    'lonewolf_set': {
        id: 'lonewolf_set',
        name: 'Lonewolf Set',
        bonuses: [
            { requiredPieces: 1, effects: [{ type: EffectType.IncreaseStat, stat: StatType.MagazineCapacity, value: 10 } as any] },
            { requiredPieces: 2, effects: [{ type: EffectType.IncreaseStat, stat: StatType.CritRatePercent, value: 5 } as any] },
            { requiredPieces: 3, effects: [{ type: EffectType.IncreaseStat, stat: StatType.CritDamagePercent, value: 12 } as any] },
            { requiredPieces: 4, effects: [{ type: EffectType.IncreaseStat, stat: StatType.CritRatePercent, value: 8 } as any] }, // Simplified 4pc
        ]
    },
    'bastille_set': {
        id: 'bastille_set',
        name: 'Bastille Set',
        bonuses: [
            { requiredPieces: 1, effects: [{ type: EffectType.IncreaseStat, stat: StatType.WeaponDamagePercent, value: 10 } as any] },
            { requiredPieces: 2, effects: [{ type: EffectType.IncreaseStat, stat: StatType.AttackPercent, value: 5 } as any] },
            { requiredPieces: 3, effects: [{ type: EffectType.IncreaseStat, stat: StatType.CritDamagePercent, value: 10 } as any] },
        ]
    }
};

export const ARMOR_DB: ArmorData[] = [
    { id: 'lonewolf_hood', name: 'Lonewolf Hood', slot: ArmorSlot.Helmet, rarity: Rarity.Legendary, setId: 'lonewolf_set' },
    { id: 'lonewolf_mask', name: 'Lonewolf Mask', slot: ArmorSlot.Mask, rarity: Rarity.Legendary, setId: 'lonewolf_set' },
    { id: 'lonewolf_jacket', name: 'Lonewolf Jacket', slot: ArmorSlot.Top, rarity: Rarity.Legendary, setId: 'lonewolf_set' },
    { id: 'lonewolf_gloves', name: 'Lonewolf Gloves', slot: ArmorSlot.Gloves, rarity: Rarity.Legendary, setId: 'lonewolf_set' },
    { id: 'lonewolf_pants', name: 'Lonewolf Pants', slot: ArmorSlot.Pants, rarity: Rarity.Legendary, setId: 'lonewolf_set' },
    { id: 'lonewolf_shoes', name: 'Lonewolf Shoes', slot: ArmorSlot.Boots, rarity: Rarity.Legendary, setId: 'lonewolf_set' },
    
    { 
        id: 'beret', 
        name: 'Beret', 
        slot: ArmorSlot.Helmet, 
        rarity: Rarity.Legendary, 
        intrinsicEffects: [{ type: EffectType.IncreaseStat, stat: StatType.ShrapnelDamagePercent, value: 10 } as any] 
    },
    { 
        id: 'oasis_mask', 
        name: 'Oasis Mask', 
        slot: ArmorSlot.Mask, 
        rarity: Rarity.Legendary, 
        intrinsicEffects: [{ type: EffectType.IncreaseStat, stat: StatType.AttackPercent, value: 10 } as any] 
    },
];

export function createArmorFromDb(data: ArmorData, star: number = 1, level: number = 1, calibration: number = 0): Armor {
    const stats = new ArmorStats();
    // Default Psi Intensity based on level/rarity mapping from reference
    stats.psiIntensity.value = 16 * level; 

    if (data.setId && ARMOR_SETS[data.setId]) {
        const setData = ARMOR_SETS[data.setId];
        const setDef = new ArmorSetDefinition(setData.id, setData.name, setData.bonuses);
        return new SetArmor(data.id, data.name, data.rarity, star, level, calibration, undefined, data.slot, stats, setDef);
    } else {
        return new KeyArmor(data.id, data.name, data.rarity, star, level, calibration, undefined, data.slot, stats, data.intrinsicEffects || []);
    }
}
