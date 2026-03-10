// simulator/src/data/mods.ts

import { StatType, FlagType, WeaponSlot, ArmorSlot, ModKey } from '../types/enums';
import { SubstatTier, SubstatData } from './substats';
import { IncreaseStatEffect, SetFlagEffect, ConditionalEffect, DynamicStatEffect } from '../ecs/effects';
import { IModData } from '../types/domain-interfaces';
import {
    WORK_OF_PROFICIENCY_TRIGGERS,
    FIRST_MOVE_ADVANTAGE_TRIGGERS,
    PRECISE_STRIKE_TRIGGERS,
} from './trigger-definitions';

export const MOD_DATA: Record<ModKey, IModData> = {
    [ModKey.FatefulStrike]: {
        id: ModKey.FatefulStrike,
        name: 'Fateful Strike',
        slot: ArmorSlot.Mask,
        description: 'Cannot deal Weakspot DMG. Crit rate +10% and Crit DMG +30%',
        permanentEffects: [
            new SetFlagEffect(FlagType.CannotDealWeakspotDamage, true),
            new IncreaseStatEffect(StatType.CritRatePercent, 10),
            new IncreaseStatEffect(StatType.CritDamagePercent, 30),
        ],
        triggerDefinitions: []
    },
    [ModKey.DeviationExpert]: {
        id: ModKey.DeviationExpert,
        name: 'Deviation Expert',
        slot: WeaponSlot.Main,
        description: 'Range -25%, Fire Rate +10%, Status DMG +20%',
        permanentEffects: [
            new IncreaseStatEffect(StatType.FireRate, 10),
            new IncreaseStatEffect(StatType.StatusDamagePercent, 20)
        ],
        triggerDefinitions: []
    },
    [ModKey.MomentumUp]: {
        id: ModKey.MomentumUp,
        name: 'Momentum Up',
        slot: ArmorSlot.Top,
        description: 'Fire Rate +10% for first 50% of mag, Weapon DMG +30% for second half.',
        permanentEffects: [
            new ConditionalEffect(
                (ctx) => ctx.ammoPercent > 0.5,
                [new IncreaseStatEffect(StatType.FireRate, 10)]
            ),
            new ConditionalEffect(
                (ctx) => ctx.ammoPercent <= 0.5,
                [new IncreaseStatEffect(StatType.WeaponDamagePercent, 30)]
            ),
        ],
        triggerDefinitions: []
    },
    [ModKey.PreciseStrike]: {
        id: ModKey.PreciseStrike,
        name: 'Precise Strike',
        slot: ArmorSlot.Helmet,
        description: 'Hitting Weakspots grants +12.0% Weakspot DMG for 3s, up to 3 stacks',
        permanentEffects: [],
        triggerDefinitions: PRECISE_STRIKE_TRIGGERS
    },
    [ModKey.ElementalResonance]: {
        id: ModKey.ElementalResonance,
        name: 'Elemental Resonance',
        slot: ArmorSlot.Pants,
        description: 'Elemental DMG +20% (Simplified snapshot)',
        permanentEffects: [new IncreaseStatEffect(StatType.ElementalDamagePercent, 20)],
        triggerDefinitions: []
    },
    [ModKey.RushHour]: {
        id: ModKey.RushHour,
        name: 'Rush Hour',
        slot: ArmorSlot.Boots,
        description: 'Every 10% HP loss grants +4% Melee, Weapon, and Status DMG.',
        permanentEffects: [
            new DynamicStatEffect(
                StatType.WeaponDamagePercent,
                (ctx) => Math.floor((100 - ctx.conditions.playerHpPercent) / 10) * 4
            ),
            new DynamicStatEffect(
                StatType.StatusDamagePercent,
                (ctx) => Math.floor((100 - ctx.conditions.playerHpPercent) / 10) * 4
            ),
        ],
        triggerDefinitions: []
    },
    [ModKey.FlameResonance]: {
        id: ModKey.FlameResonance,
        name: 'Flame Resonance',
        slot: WeaponSlot.Main,
        description: 'Max Burn stack +2, Burn duration -20.0%',
        permanentEffects: [
            new IncreaseStatEffect(StatType.MaxBurnStacks, 2),
            new IncreaseStatEffect(StatType.BurnDurationPercent, -20)
        ],
        triggerDefinitions: []
    },
    [ModKey.Embers]: {
        id: ModKey.Embers,
        name: 'Embers',
        slot: WeaponSlot.Main,
        description: 'When Burn is removed, stacks only -50%',
        permanentEffects: [],
        triggerDefinitions: []
    },
    [ModKey.WorkOfProficiency]: {
        id: ModKey.WorkOfProficiency,
        name: 'Work Of Proficiency',
        slot: ArmorSlot.Gloves,
        description: 'Reloading empty magazine: Reload Speed +10% and Elemental DMG +20% for 5s.',
        permanentEffects: [],
        triggerDefinitions: WORK_OF_PROFICIENCY_TRIGGERS
    },
    [ModKey.FirstMoveAdvantage]: {
        id: ModKey.FirstMoveAdvantage,
        name: 'First-Move Advantage',
        slot: ArmorSlot.Gloves,
        description: 'For 2s after reloading: Crit Rate +10% and Crit DMG +20%.',
        permanentEffects: [],
        triggerDefinitions: FIRST_MOVE_ADVANTAGE_TRIGGERS
    },
    [ModKey.MagExpansion]: {
        id: ModKey.MagExpansion,
        name: 'Mag Expansion',
        slot: ArmorSlot.Helmet,
        description: 'Reloading empty magazine increases capacity by 30%.',
        permanentEffects: [new IncreaseStatEffect(StatType.MagazineCapacity, 30)],
        triggerDefinitions: []
    },
    [ModKey.ElementalHavoc]: {
        id: ModKey.ElementalHavoc,
        name: 'Elemental Havoc',
        slot: ArmorSlot.Top,
        description: 'Elemental DMG +10%. When HP above 90%, additional +10% Elemental DMG.',
        permanentEffects: [
            new IncreaseStatEffect(StatType.ElementalDamagePercent, 10),
            new ConditionalEffect(
                (ctx) => ctx.conditions.playerHpPercent >= 90,
                [new IncreaseStatEffect(StatType.ElementalDamagePercent, 10)]
            )
        ],
        triggerDefinitions: []
    }
};

export const MODS: Record<string, IModData> = MOD_DATA;

export const DEFAULT_SUBSTATS: [SubstatData, SubstatData, SubstatData, SubstatData] = [
    { type: StatType.CritDamagePercent, tier: SubstatTier.None },
    { type: StatType.CritDamagePercent, tier: SubstatTier.None },
    { type: StatType.CritDamagePercent, tier: SubstatTier.None },
    { type: StatType.CritDamagePercent, tier: SubstatTier.None },
];