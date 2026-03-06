// simulator/src/data/mods.ts

import { StatType, FlagType, WeaponSlot, ArmorSlot, ModKey } from '../types/enums';
import { ModData, Mod } from '../models/equipment';
import { Substat, SubstatTier } from '../models/substat';
import { IncreaseStatEffect, SetFlagEffect, ConditionalEffect, DynamicStatEffect } from '../models/effect';
import {
    WORK_OF_PROFICIENCY_TRIGGERS,
    FIRST_MOVE_ADVANTAGE_TRIGGERS,
    PRECISE_STRIKE_TRIGGERS,
} from './trigger-definitions';

export const MOD_DATA: Record<ModKey, ModData> = {
    [ModKey.FatefulStrike]: new ModData(
        ModKey.FatefulStrike,
        'Fateful Strike',
        ArmorSlot.Mask,  // ADR-007: was ArmorSlot.Helmet
        'Cannot deal Weakspot DMG. Crit rate +10% and Crit DMG +30%',
        [
            new SetFlagEffect(FlagType.CannotDealWeakspotDamage, true),
            new IncreaseStatEffect(StatType.CritRatePercent, 10),    // ADR-007: was missing (was in applyCustomLogic)
            new IncreaseStatEffect(StatType.CritDamagePercent, 30),  // ADR-007: was missing (was in applyCustomLogic)
        ],
        []
    ),
    [ModKey.DeviationExpert]: new ModData(
        ModKey.DeviationExpert,
        'Deviation Expert',
        WeaponSlot.Main,  // ADR-007: was ArmorSlot.Helmet
        'Range -25%, Fire Rate +10%, Status DMG +20%',
        [
            new IncreaseStatEffect(StatType.FireRate, 10),
            new IncreaseStatEffect(StatType.StatusDamagePercent, 20)
        ],
        []
    ),
    [ModKey.MomentumUp]: new ModData(
        ModKey.MomentumUp,
        'Momentum Up',
        ArmorSlot.Top,  // ADR-007: was ArmorSlot.Helmet
        'Fire Rate +10% for first 50% of mag, Weapon DMG +30% for second half.',
        [
            // ADR-007: Both conditions use applyWithContext → real ammoPercent.
            // With applyStatic (legacy path), ammoPercent is 1.0 and second condition never fires.
            new ConditionalEffect(
                (ctx) => ctx.ammoPercent > 0.5,
                [new IncreaseStatEffect(StatType.FireRate, 10)]
            ),
            new ConditionalEffect(
                (ctx) => ctx.ammoPercent <= 0.5,
                [new IncreaseStatEffect(StatType.WeaponDamagePercent, 30)]
            ),
        ],
        []
    ),
    [ModKey.PreciseStrike]: new ModData(
        ModKey.PreciseStrike,
        'Precise Strike',
        ArmorSlot.Helmet,  // Correct: Helmet slot
        'Hitting Weakspots grants +12.0% Weakspot DMG for 3s, up to 3 stacks',
        [],
        PRECISE_STRIKE_TRIGGERS
    ),
    [ModKey.ElementalResonance]: new ModData(
        ModKey.ElementalResonance,
        'Elemental Resonance',
        ArmorSlot.Pants,  // Correct: already was Pants
        'Elemental DMG +20% (Simplified snapshot)',
        [new IncreaseStatEffect(StatType.ElementalDamagePercent, 20)],
        []
    ),
    [ModKey.RushHour]: new ModData(
        ModKey.RushHour,
        'Rush Hour',
        ArmorSlot.Boots,  // Correct: already was Boots
        'Every 10% HP loss grants +4% Melee, Weapon, and Status DMG.',
        [
            // ADR-007: Pure data. valueFn reads conditions.playerHpPercent via ctx.
            new DynamicStatEffect(
                StatType.WeaponDamagePercent,
                (ctx) => Math.floor((100 - ctx.conditions.playerHpPercent) / 10) * 4
            ),
            new DynamicStatEffect(
                StatType.StatusDamagePercent,
                (ctx) => Math.floor((100 - ctx.conditions.playerHpPercent) / 10) * 4
            ),
        ],
        []
    ),
    [ModKey.FlameResonance]: new ModData(
        ModKey.FlameResonance,
        'Flame Resonance',
        WeaponSlot.Main,  // Correct: already was WeaponSlot.Main
        'Max Burn stack +2, Burn duration -20.0%',
        [
            new IncreaseStatEffect(StatType.MaxBurnStacks, 2),
            new IncreaseStatEffect(StatType.BurnDurationPercent, -20)
        ],
        []
    ),
    [ModKey.Embers]: new ModData(
        ModKey.Embers,
        'Embers',
        WeaponSlot.Main,  // Correct: already was WeaponSlot.Main
        'When Burn is removed, stacks only -50%',
        [],
        []
    ),
    [ModKey.WorkOfProficiency]: new ModData(
        ModKey.WorkOfProficiency,
        'Work Of Proficiency',
        ArmorSlot.Gloves,  // ADR-007: was ArmorSlot.Helmet
        'Reloading empty magazine: Reload Speed +10% and Elemental DMG +20% for 5s.',
        [],
        WORK_OF_PROFICIENCY_TRIGGERS
    ),
    [ModKey.FirstMoveAdvantage]: new ModData(
        ModKey.FirstMoveAdvantage,
        'First-Move Advantage',
        ArmorSlot.Gloves,  // ADR-007: was ArmorSlot.Helmet
        'For 2s after reloading: Crit Rate +10% and Crit DMG +20%.',
        [],
        FIRST_MOVE_ADVANTAGE_TRIGGERS
    ),
    [ModKey.MagExpansion]: new ModData(
        ModKey.MagExpansion,
        'Mag Expansion',
        ArmorSlot.Helmet,  // Correct: already was Helmet
        'Reloading empty magazine increases capacity by 30%.',
        [new IncreaseStatEffect(StatType.MagazineCapacity, 30)],
        []
    ),
    [ModKey.ElementalHavoc]: new ModData(
        ModKey.ElementalHavoc,
        'Elemental Havoc',
        ArmorSlot.Top,  // ADR-007: was ArmorSlot.Helmet
        'Elemental DMG +10%. When HP above 90%, additional +10% Elemental DMG.',
        [
            new IncreaseStatEffect(StatType.ElementalDamagePercent, 10),
            new ConditionalEffect(
                (ctx) => ctx.conditions.playerHpPercent >= 90,
                [new IncreaseStatEffect(StatType.ElementalDamagePercent, 10)]
            )
        ],
        []
    )
};

/**
 * ADR-007: All mods are now pure data. No custom subclasses remain.
 * createModInstance is a simple factory with no dispatch logic.
 */
export function createModInstance(
    modKey: ModKey,
    substats: [Substat, Substat, Substat, Substat]
): Mod {
    const data = MOD_DATA[modKey];
    if (!data) throw new Error(`Mod ${modKey} not found`);
    return new Mod(data, substats);
}

export const MODS = MOD_DATA; // Backwards compatibility for UI

export const DEFAULT_SUBSTATS: [Substat, Substat, Substat, Substat] = [
    new Substat(StatType.CritDamagePercent, SubstatTier.None),
    new Substat(StatType.CritDamagePercent, SubstatTier.None),
    new Substat(StatType.CritDamagePercent, SubstatTier.None),
    new Substat(StatType.CritDamagePercent, SubstatTier.None),
];