import { ArmorSlot, Rarity, StatType, ArmorKey, ArmorSetKey } from '../types/enums';
import { SetArmor, KeyArmor, ArmorStats, ArmorSetDefinition, Armor, Mod } from '../models/equipment';
import { BaseEffect, IncreaseStatEffect } from '../models/effect';

export interface ArmorData {
    id: ArmorKey;
    name: string;
    slot: ArmorSlot;
    rarity: Rarity;
    setKey?: ArmorSetKey;
    intrinsicEffects?: BaseEffect[];
}

export interface ArmorSetData {
    id: ArmorSetKey;
    name: string;
    bonuses: { requiredPieces: number; effects: BaseEffect[] }[];
}

export const ARMOR_SETS: Record<ArmorSetKey, ArmorSetData> = {
    [ArmorSetKey.Lonewolf]: {
        id: ArmorSetKey.Lonewolf,
        name: 'Lonewolf Set',
        bonuses: [
            { requiredPieces: 1, effects: [new IncreaseStatEffect(StatType.MagazineCapacity, 10)] },
            { requiredPieces: 2, effects: [new IncreaseStatEffect(StatType.CritRatePercent, 5)] },
            { requiredPieces: 3, effects: [new IncreaseStatEffect(StatType.CritDamagePercent, 12)] },
            { requiredPieces: 4, effects: [new IncreaseStatEffect(StatType.CritRatePercent, 8)] }, 
        ]
    },
    [ArmorSetKey.Bastille]: {
        id: ArmorSetKey.Bastille,
        name: 'Bastille Set',
        bonuses: [
            { requiredPieces: 1, effects: [new IncreaseStatEffect(StatType.WeaponDamagePercent, 10)] },
            { requiredPieces: 2, effects: [new IncreaseStatEffect(StatType.AttackPercent, 5)] },
            { requiredPieces: 3, effects: [new IncreaseStatEffect(StatType.CritDamagePercent, 10)] },
        ]
    }
};

export const ARMOR: Record<ArmorKey, ArmorData> = {
    [ArmorKey.LonewolfHood]: { id: ArmorKey.LonewolfHood, name: 'Lonewolf Hood', slot: ArmorSlot.Helmet, rarity: Rarity.Legendary, setKey: ArmorSetKey.Lonewolf },
    [ArmorKey.LonewolfMask]: { id: ArmorKey.LonewolfMask, name: 'Lonewolf Mask', slot: ArmorSlot.Mask, rarity: Rarity.Legendary, setKey: ArmorSetKey.Lonewolf },
    [ArmorKey.LonewolfJacket]: { id: ArmorKey.LonewolfJacket, name: 'Lonewolf Jacket', slot: ArmorSlot.Top, rarity: Rarity.Legendary, setKey: ArmorSetKey.Lonewolf },
    [ArmorKey.LonewolfGloves]: { id: ArmorKey.LonewolfGloves, name: 'Lonewolf Gloves', slot: ArmorSlot.Gloves, rarity: Rarity.Legendary, setKey: ArmorSetKey.Lonewolf },
    [ArmorKey.LonewolfPants]: { id: ArmorKey.LonewolfPants, name: 'Lonewolf Pants', slot: ArmorSlot.Pants, rarity: Rarity.Legendary, setKey: ArmorSetKey.Lonewolf },
    [ArmorKey.LonewolfShoes]: { id: ArmorKey.LonewolfShoes, name: 'Lonewolf Shoes', slot: ArmorSlot.Boots, rarity: Rarity.Legendary, setKey: ArmorSetKey.Lonewolf },
    
    [ArmorKey.Beret]: { 
        id: ArmorKey.Beret, 
        name: 'Beret', 
        slot: ArmorSlot.Helmet, 
        rarity: Rarity.Legendary, 
        intrinsicEffects: [new IncreaseStatEffect(StatType.ShrapnelDamagePercent, 10)] 
    },
    [ArmorKey.OasisMask]: { 
        id: ArmorKey.OasisMask, 
        name: 'Oasis Mask', 
        slot: ArmorSlot.Mask, 
        rarity: Rarity.Legendary, 
        intrinsicEffects: [new IncreaseStatEffect(StatType.AttackPercent, 10)] 
    },
};

export function createArmor(key: ArmorKey, star: number = 1, level: number = 1, calibration: number = 0, mod?: Mod): Armor {
    const data = ARMOR[key];
    if (!data) throw new Error(`Armor ${key} not found`);

    const stats = new ArmorStats();
    stats.psiIntensity.value = 16 * level; 

    if (data.setKey && ARMOR_SETS[data.setKey]) {
        const setData = ARMOR_SETS[data.setKey];
        const setDef = new ArmorSetDefinition(setData.id, setData.name, setData.bonuses);
        return new SetArmor(data.id, data.name, data.rarity, star, level, calibration, mod, data.slot, stats, setDef);
    } else {
        return new KeyArmor(data.id, data.name, data.rarity, star, level, calibration, mod, data.slot, stats, data.intrinsicEffects || []);
    }
}
