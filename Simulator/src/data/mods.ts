import { StatType, FlagType, WeaponSlot, ArmorSlot, ModKey } from '../types/enums';
import { ModData, Mod } from '../models/equipment';
import { AggregationContext } from '../types/common';
import { Substat, SubstatTier } from '../models/substat';
import { IncreaseStatEffect, SetFlagEffect, BuffEffect, ConditionalEffect } from '../models/effect';
import { TriggeredEffect, OnHitTrigger, OnReloadTrigger } from '../models/trigger';

/**
 * Momentum Up: Fire Rate +10% for first 50% of mag, Weapon DMG +30% for second half.
 */
class MomentumUpMod extends Mod {
    protected override applyCustomLogic(ctx: AggregationContext): void {
        if (ctx.ammoPercent > 0.5) {
            ctx.player.stats.add(StatType.FireRate, 10);
        } else {
            ctx.player.stats.add(StatType.WeaponDamagePercent, 30);
        }
    }
}

/**
 * Fateful Strike: Cannot deal Weakspot DMG. Crit rate +10% and Crit DMG +30%
 */
class FatefulStrikeMod extends Mod {
    protected override applyCustomLogic(ctx: AggregationContext): void {
        ctx.player.stats.add(StatType.CritRatePercent, 10);
        ctx.player.stats.add(StatType.CritDamagePercent, 30);
        // We set flag via Player object usually, but for strategy we can do it here:
        ctx.loadout.weapon?.intrinsicEffects.push(new SetFlagEffect(FlagType.CannotDealWeakspotDamage, true));
        // Actually, better to just use the permanentEffects list in ModData for flags
    }
}

export const MOD_DATA: Record<ModKey, ModData> = {
    [ModKey.FatefulStrike]: new ModData(
        ModKey.FatefulStrike,
        'Fateful Strike',
        ArmorSlot.Helmet,
        'Cannot deal Weakspot DMG. Crit rate +10% and Crit DMG +30%',
        [new SetFlagEffect(FlagType.CannotDealWeakspotDamage, true)],
        []
    ),
    [ModKey.DeviationExpert]: new ModData(
        ModKey.DeviationExpert,
        'Deviation Expert',
        ArmorSlot.Helmet,
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
        ArmorSlot.Helmet,
        'Fire Rate +10% for first 50% of mag, Weapon DMG +30% for second half.',
        [],
        []
    ),
    [ModKey.WorkOfProficiency]: new ModData(
        ModKey.WorkOfProficiency,
        'Work Of Proficiency',
        ArmorSlot.Helmet,
        'Reloading empty magazine: Reload Speed +10% and Elemental DMG +20% for 5s.',
        [],
        [
            // Simplified: Always triggers on reload for now
            new TriggeredEffect(
                new OnReloadTrigger(),
                [
                    new BuffEffect(
                        'buff-proficiency',
                        'Proficiency',
                        5,
                        1,
                        [
                            new IncreaseStatEffect(StatType.ReloadSpeedPercent, 10),
                            new IncreaseStatEffect(StatType.ElementalDamagePercent, 20)
                        ]
                    )
                ]
            )
        ]
    ),
    [ModKey.FirstMoveAdvantage]: new ModData(
        ModKey.FirstMoveAdvantage,
        'First-Move Advantage',
        ArmorSlot.Helmet,
        'For 2s after reloading: Crit Rate +10% and Crit DMG +20%.',
        [],
        [
            new TriggeredEffect(
                new OnReloadTrigger(),
                [
                    new BuffEffect(
                        'buff-first-move',
                        'First-Move',
                        2,
                        1,
                        [
                            new IncreaseStatEffect(StatType.CritRatePercent, 10),
                            new IncreaseStatEffect(StatType.CritDamagePercent, 20)
                        ]
                    )
                ]
            )
        ]
    ),
    [ModKey.MagExpansion]: new ModData(
        ModKey.MagExpansion,
        'Mag Expansion',
        ArmorSlot.Helmet,
        'Reloading empty magazine increases capacity by 30%.',
        [new IncreaseStatEffect(StatType.MagazineCapacity, 30)], // Simplified to static for now
        []
    ),
    [ModKey.ElementalHavoc]: new ModData(
        ModKey.ElementalHavoc,
        'Elemental Havoc',
        ArmorSlot.Helmet,
        'Elemental DMG +10%. When HP above 90%, additional +10% Elemental DMG.',
        [
            new IncreaseStatEffect(StatType.ElementalDamagePercent, 10),
            new ConditionalEffect(
                (ctx: AggregationContext) => ctx.conditions.playerHpPercent >= 90,
                [new IncreaseStatEffect(StatType.ElementalDamagePercent, 10)]
            )
        ],
        []
    ),
    [ModKey.PreciseStrike]: new ModData(
        ModKey.PreciseStrike,
        'Precise Strike',
        ArmorSlot.Helmet,
        'Hitting Weakspots grants +12.0% Weakspot DMG for 3s, up to 3 stacks',
        [],
        [
            new TriggeredEffect(
                new OnHitTrigger(), 
                [
                    new BuffEffect(
                        'buff-precise-strike',
                        'Precise Strike',
                        3,
                        3,
                        [new IncreaseStatEffect(StatType.WeakspotDamagePercent, 12)]
                    )
                ]
            )
        ]
    ),
    [ModKey.FlameResonance]: new ModData(
        ModKey.FlameResonance,
        'Flame Resonance',
        WeaponSlot.Main,
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
        WeaponSlot.Main,
        'When Burn is removed, stacks only -50%',
        [],
        [] 
    )
};

export function createModInstance(
    modKey: ModKey, 
    substats: [Substat, Substat, Substat, Substat]
): Mod {
    const data = MOD_DATA[modKey];
    if (!data) throw new Error(`Mod ${modKey} not found`);

    if (modKey === ModKey.MomentumUp) return new MomentumUpMod(data, substats);
    if (modKey === ModKey.FatefulStrike) return new FatefulStrikeMod(data, substats);

    return new Mod(data, substats);
}

export const MODS = MOD_DATA; // Backwards compatibility for UI

export const DEFAULT_SUBSTATS: [Substat, Substat, Substat, Substat] = [
    new Substat(StatType.CritDamagePercent, SubstatTier.None),
    new Substat(StatType.CritDamagePercent, SubstatTier.None),
    new Substat(StatType.CritDamagePercent, SubstatTier.None),
    new Substat(StatType.CritDamagePercent, SubstatTier.None),
];
