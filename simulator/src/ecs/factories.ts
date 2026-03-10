import { 
    WeaponComponent, 
    ArmorComponent, 
    ModComponent 
} from './types';
import { 
    WeaponKey, 
    ArmorKey, 
    ModKey, 
    StatType, 
    ArmorSlot, 
    CalibrationStyle 
} from '../types/enums';
import { getWeaponBlueprint } from '../data/generated/registry';
import { ARMOR, ARMOR_SETS } from '../data/armor';
import { MOD_DATA } from '../data/mods';
import { SubstatData, getSubstatValue } from '../data/substats';

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

export function createWeaponComponent(
    key: WeaponKey, 
    star: number = 1, 
    level: number = 5, 
    calibration: number = 0,
    calibrationStyle: CalibrationStyle = CalibrationStyle.None,
    weaponDamageBonus: number = 0,
    secondaryStatType: StatType = StatType.CritDamagePercent,
    secondaryStatValue: number = 0,
    mod?: ModComponent
): WeaponComponent {
    const blueprint = getWeaponBlueprint(key);
    if (!blueprint) throw new Error(`Blueprint ${key} not found`);

    return {
        id: blueprint.key,
        name: blueprint.name,
        type: blueprint.type,
        rarity: blueprint.rarity,
        keyword: blueprint.keyword,
        star,
        level,
        calibration,
        calibrationMatrix: {
            style: calibrationStyle,
            weaponDamageBonus,
            secondaryStatType,
            secondaryStatValue
        },
        baseStats: { ...blueprint.baseStats },
        intrinsicEffects: [...blueprint.intrinsicEffects],
        triggerDefinitions: [...blueprint.triggerDefinitions],
        overridesKeywordTriggers: blueprint.overridesKeywordTriggers,
        mod
    };
}

export function createArmorComponent(
    key: ArmorKey, 
    star: number = 1, 
    level: number = 5, 
    calibration: number = 0,
    mod?: ModComponent
): ArmorComponent {
    const data = ARMOR[key];
    if (!data) throw new Error(`Armor ${key} not found`);

    // 1. Get Slot Base
    const slotBase = BASE_PSI_MAP[data.slot] || 0;
    // 2. Apply Tier Scaling
    const tierMult = ARMOR_TIER_MULTIPLIERS[level] || 1.0;
    // 3. Apply Star Scaling (+5% per star)
    const starMult = 1 + (star - 1) * 0.05;
    const psiIntensity = Math.round(slotBase * tierMult * starMult);

    let setDefinition: ArmorComponent['setDefinition'] = undefined;
    if (data.setKey && ARMOR_SETS[data.setKey]) {
        const setData = ARMOR_SETS[data.setKey];
        setDefinition = {
            id: setData.id,
            name: setData.name,
            bonuses: setData.bonuses.map(b => ({
                requiredPieces: b.requiredPieces,
                effects: b.effects.map(e => e.clone()),
                triggerDefinitions: b.triggerDefinitions ? [...b.triggerDefinitions] : undefined
            }))
        };
    }

    return {
        id: data.id,
        name: data.name,
        slot: data.slot,
        rarity: data.rarity,
        star,
        level,
        calibration,
        psiIntensity,
        intrinsicEffects: (data.intrinsicEffects || []).map(e => e.clone()),
        triggerDefinitions: data.triggerDefinitions ? [...data.triggerDefinitions] : [],
        setDefinition,
        mod
    };
}

export function createModComponent(
    modKey: ModKey,
    substats: [SubstatData, SubstatData, SubstatData, SubstatData]
): ModComponent {
    const data = MOD_DATA[modKey];
    if (!data) throw new Error(`Mod ${modKey} not found`);

    return {
        id: data.id,
        name: data.name,
        description: data.description,
        substats: substats.map(s => ({
            type: s.type,
            value: getSubstatValue(s.type, s.tier)
        })),
        permanentEffects: [...data.permanentEffects],
        triggerDefinitions: [...data.triggerDefinitions]
    };
}
