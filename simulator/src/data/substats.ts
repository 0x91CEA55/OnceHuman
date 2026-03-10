import { StatType } from '../types/enums';

export enum SubstatTier {
    None = 0,
    White = 1,
    Green = 2,
    Blue = 3,
    Purple = 4,
    Gold = 5
}

/**
 * Authoritative lookup for substat values based on type and tier.
 * These are fixed associated values.
 */
export const SUBSTAT_VALUE_LOOKUP: Partial<Record<StatType, Partial<Record<SubstatTier, number>>>> = {
    [StatType.CritDamagePercent]: {
        [SubstatTier.White]: 3.0,
        [SubstatTier.Green]: 6.0,
        [SubstatTier.Blue]: 9.0,
        [SubstatTier.Purple]: 12.0,
        [SubstatTier.Gold]: 15.0
    },
    [StatType.WeaponDamagePercent]: {
        [SubstatTier.White]: 2.0,
        [SubstatTier.Green]: 4.0,
        [SubstatTier.Blue]: 6.0,
        [SubstatTier.Purple]: 8.0,
        [SubstatTier.Gold]: 10.0
    },
    [StatType.ElementalDamagePercent]: {
        [SubstatTier.White]: 2.0,
        [SubstatTier.Green]: 4.0,
        [SubstatTier.Blue]: 6.0,
        [SubstatTier.Purple]: 8.0,
        [SubstatTier.Gold]: 10.0
    },
    [StatType.StatusDamagePercent]: {
        [SubstatTier.White]: 2.0,
        [SubstatTier.Green]: 4.0,
        [SubstatTier.Blue]: 6.0,
        [SubstatTier.Purple]: 8.0,
        [SubstatTier.Gold]: 10.0
    },
    [StatType.AttackPercent]: {
        [SubstatTier.White]: 1.0,
        [SubstatTier.Green]: 2.0,
        [SubstatTier.Blue]: 3.0,
        [SubstatTier.Purple]: 4.0,
        [SubstatTier.Gold]: 5.0
    },
    [StatType.DamageBonusBoss]: {
        [SubstatTier.White]: 1.5,
        [SubstatTier.Green]: 3.0,
        [SubstatTier.Blue]: 4.5,
        [SubstatTier.Purple]: 6.0,
        [SubstatTier.Gold]: 8.0
    },
    [StatType.DamageBonusElite]: {
        [SubstatTier.White]: 1.5,
        [SubstatTier.Green]: 3.0,
        [SubstatTier.Blue]: 4.5,
        [SubstatTier.Purple]: 6.0,
        [SubstatTier.Gold]: 8.0
    },
    [StatType.DamageBonusNormal]: {
        [SubstatTier.White]: 1.5,
        [SubstatTier.Green]: 3.0,
        [SubstatTier.Blue]: 4.5,
        [SubstatTier.Purple]: 6.0,
        [SubstatTier.Gold]: 8.0
    },
};

export function getSubstatValue(type: StatType, tier: SubstatTier): number {
    const typeValues = SUBSTAT_VALUE_LOOKUP[type];
    if (!typeValues) return 0;
    return typeValues[tier] || 0;
}

export interface SubstatData {
    type: StatType;
    tier: SubstatTier;
}
