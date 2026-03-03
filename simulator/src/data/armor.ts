import { ArmorSlot, Rarity, StatType, ArmorKey, ArmorSetKey, FlagType } from '../types/enums';
import { SetArmor, KeyArmor, ArmorStats, ArmorSetDefinition, Armor, Mod } from '../models/equipment';
import { BaseEffect, IncreaseStatEffect, SetFlagEffect } from '../models/effect';

export interface ArmorData {
    id: ArmorKey;
    name: string;
    slot: ArmorSlot;
    rarity: Rarity;
    setKey?: ArmorSetKey;
    intrinsicEffects?: (() => BaseEffect)[]; // Use factory functions to avoid circular init issues
}

export interface ArmorSetData {
    id: ArmorSetKey;
    name: string;
    bonuses: { requiredPieces: number; effects: (() => BaseEffect)[] }[];
}

export const ARMOR_SETS: Record<ArmorSetKey, ArmorSetData> = {
    [ArmorSetKey.Lonewolf]: {
        id: ArmorSetKey.Lonewolf,
        name: 'Lonewolf Set',
        bonuses: [
            { requiredPieces: 1, effects: [() => new IncreaseStatEffect(StatType.MagazineCapacity, 10)] },
            { requiredPieces: 2, effects: [() => new IncreaseStatEffect(StatType.CritRatePercent, 5)] },
            { requiredPieces: 3, effects: [() => new IncreaseStatEffect(StatType.CritDamagePercent, 12)] },
            { requiredPieces: 4, effects: [() => new IncreaseStatEffect(StatType.CritRatePercent, 8)] }, 
        ]
    },
    [ArmorSetKey.Bastille]: {
        id: ArmorSetKey.Bastille,
        name: 'Bastille Set',
        bonuses: [
            { requiredPieces: 1, effects: [() => new IncreaseStatEffect(StatType.WeaponDamagePercent, 10)] },
            { requiredPieces: 2, effects: [() => new IncreaseStatEffect(StatType.AttackPercent, 5)] },
            { requiredPieces: 3, effects: [() => new IncreaseStatEffect(StatType.CritDamagePercent, 10)] },
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
        intrinsicEffects: [() => new IncreaseStatEffect(StatType.ShrapnelDamagePercent, 10)] 
    },
    [ArmorKey.OasisMask]: { 
        id: ArmorKey.OasisMask, 
        name: 'Oasis Mask', 
        slot: ArmorSlot.Mask, 
        rarity: Rarity.Legendary, 
        intrinsicEffects: [() => new IncreaseStatEffect(StatType.AttackPercent, 10)] 
    },
    [ArmorKey.GildedGloves]: {
        id: ArmorKey.GildedGloves,
        name: 'Gilded Gloves',
        slot: ArmorSlot.Gloves,
        rarity: Rarity.Legendary,
        intrinsicEffects: [
            () => new SetFlagEffect(FlagType.KeywordCanCrit, true),
            () => new IncreaseStatEffect(StatType.KeywordCritDamagePercent, 20)
        ]
    },
    [ArmorKey.BBQGloves]: {
        id: ArmorKey.BBQGloves,
        name: 'BBQ Gloves',
        slot: ArmorSlot.Gloves,
        rarity: Rarity.Epic,
        intrinsicEffects: [
            () => new IncreaseStatEffect(StatType.BurnFrequencyPercent, 100)
        ]
    },
};

const BASE_PSI_MAP: Record<ArmorSlot, number> = {
    [ArmorSlot.Mask]: 115,
    [ArmorSlot.Helmet]: 92,
    [ArmorSlot.Gloves]: 97,
    [ArmorSlot.Top]: 64,
    [ArmorSlot.Pants]: 64,
    [ArmorSlot.Boots]: 46
};

const ARMOR_TIER_MULTIPLIERS: Record<number, number> = {
    1: 0.172,
    2: 0.35,
    3: 0.55,
    4: 0.75,
    5: 1.00
};

export function createArmor(key: ArmorKey, star: number = 1, level: number = 1, calibration: number = 0, mod?: Mod): Armor {
    const data = ARMOR[key];
    if (!data) throw new Error(`Armor ${key} not found`);

    const stats = new ArmorStats();
    
    // 1. Get Slot Base
    const slotBase = BASE_PSI_MAP[data.slot] || 0;
    
    // 2. Apply Tier Scaling
    const tierMult = ARMOR_TIER_MULTIPLIERS[level] || 1.0;
    
    // 3. Apply Star Scaling (+5% per star)
    const starMult = 1 + (star - 1) * 0.05;
    
    stats.psiIntensity.value = Math.round(slotBase * tierMult * starMult);

    if (data.setKey && ARMOR_SETS[data.setKey]) {
        const setData = ARMOR_SETS[data.setKey];
        const instantiatedBonuses = setData.bonuses.map(b => ({
            requiredPieces: b.requiredPieces,
            effects: b.effects.map(f => f())
        }));
        const setDef = new ArmorSetDefinition(setData.id, setData.name, instantiatedBonuses);
        return new SetArmor(data.id, data.name, data.rarity, star, level, calibration, mod, data.slot, stats, setDef);
    } else {
        const effects = (data.intrinsicEffects || []).map(f => f());
        return new KeyArmor(data.id, data.name, data.rarity, star, level, calibration, mod, data.slot, stats, effects);
    }
}
