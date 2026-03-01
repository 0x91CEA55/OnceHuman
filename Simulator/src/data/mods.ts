import { GearSlot, StatType, EffectType, FlagType } from '../types/enums';
import { Mod } from '../models/equipment';

export interface ModData {
    id: string;
    name: string;
    slot: GearSlot;
    description: string;
    effects: any[];
}

export const MOD_DB: ModData[] = [
    {
        id: 'mod-violent',
        name: 'Violent',
        slot: 'weapon_main' as any,
        description: 'Crit DMG +15%',
        effects: [{ type: EffectType.IncreaseStat, stat: StatType.CritDamagePercent, value: 15 }]
    },
    {
        id: 'mod-precision',
        name: 'Precision',
        slot: 'weapon_main' as any,
        description: 'Weakspot DMG +15%',
        effects: [{ type: EffectType.IncreaseStat, stat: StatType.WeakspotDamagePercent, value: 15 }]
    },
    {
        id: 'mod-fateful-strike',
        name: 'Fateful Strike',
        slot: 'helmet' as any,
        description: 'Cannot deal Weakspot DMG. Crit rate +10% and Crit DMG +30%',
        effects: [
            { type: EffectType.SetFlag, flag: FlagType.CannotDealWeakspotDamage, value: true },
            { type: EffectType.IncreaseStat, stat: StatType.CritRatePercent, value: 10 },
            { type: EffectType.IncreaseStat, stat: StatType.CritDamagePercent, value: 30 }
        ]
    },
    {
        id: 'mod-deviation-expert',
        name: 'Deviation Expert',
        slot: 'helmet' as any,
        description: 'Fire Rate +10%, Status DMG +20%',
        effects: [
            { type: EffectType.IncreaseStat, stat: StatType.FireRate, value: 10 }, // Simplified fire rate
            { type: EffectType.IncreaseStat, stat: StatType.StatusDamagePercent, value: 20 }
        ]
    }
];

export function createModFromDb(data: ModData, subStats: any[] = []): Mod {
    return {
        id: data.id,
        name: data.name,
        slot: data.slot,
        description: data.description,
        effects: data.effects as any,
        subStats: subStats
    };
}
