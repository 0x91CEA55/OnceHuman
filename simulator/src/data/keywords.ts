import { StatType, KeywordType, FlagType } from '../types/enums';

export interface KeywordMetadata {
    readonly type: KeywordType;
    readonly scalingFactor: number | undefined;
    readonly baseStatType: StatType | undefined;
    readonly baseTriggerChance: number;
    readonly canCrit: boolean;
    readonly canWeakspot: boolean;
}

export const KEYWORD_METADATA: Record<KeywordType, KeywordMetadata> = {
    [KeywordType.Burn]: {
        type: KeywordType.Burn,
        scalingFactor: 0.12,
        baseStatType: StatType.PsiIntensity,
        baseTriggerChance: 0.18,
        canCrit: false,
        canWeakspot: false
    },
    [KeywordType.Shrapnel]: {
        type: KeywordType.Shrapnel,
        scalingFactor: 0.6,
        baseStatType: StatType.DamagePerProjectile,
        baseTriggerChance: 0.04,
        canCrit: true,
        canWeakspot: true
    },
    [KeywordType.FrostVortex]: {
        type: KeywordType.FrostVortex,
        scalingFactor: 0.5,
        baseStatType: StatType.PsiIntensity,
        baseTriggerChance: 0.10,
        canCrit: false,
        canWeakspot: false
    },
    [KeywordType.PowerSurge]: {
        type: KeywordType.PowerSurge,
        scalingFactor: 1.0,
        baseStatType: StatType.PsiIntensity,
        baseTriggerChance: 0.15,
        canCrit: false,
        canWeakspot: false
    },
    [KeywordType.UnstableBomber]: {
        type: KeywordType.UnstableBomber,
        scalingFactor: 0.7,
        baseStatType: StatType.PsiIntensity,
        baseTriggerChance: 1.0,
        canCrit: true,
        canWeakspot: false
    },
    [KeywordType.Bounce]: {
        type: KeywordType.Bounce,
        scalingFactor: 0.6,
        baseStatType: StatType.DamagePerProjectile,
        baseTriggerChance: 0.30,
        canCrit: true,
        canWeakspot: true
    },
    [KeywordType.FortressWarfare]: {
        type: KeywordType.FortressWarfare,
        scalingFactor: undefined,
        baseStatType: undefined,
        baseTriggerChance: 0,
        canCrit: false,
        canWeakspot: false
    },
    [KeywordType.FastGunner]: {
        type: KeywordType.FastGunner,
        scalingFactor: undefined,
        baseStatType: undefined,
        baseTriggerChance: 0.35,
        canCrit: false,
        canWeakspot: false
    },
    [KeywordType.BullsEye]: {
        type: KeywordType.BullsEye,
        scalingFactor: undefined,
        baseStatType: undefined,
        baseTriggerChance: 0.70,
        canCrit: false,
        canWeakspot: false
    }
};

export function getKeywordMetadata(type: KeywordType): KeywordMetadata {
    return KEYWORD_METADATA[type] || KEYWORD_METADATA[KeywordType.Shrapnel];
}

/** 
 * ADR-014: Dynamic check for capability (e.g. Gilded Gloves unlocking Burn Crit)
 */
export function canKeywordCrit(type: KeywordType, hasFlag: (flag: FlagType) => boolean): boolean {
    const meta = getKeywordMetadata(type);
    return meta.canCrit || hasFlag(FlagType.KeywordCanCrit);
}

export function canKeywordWeakspot(type: KeywordType, hasFlag: (flag: FlagType) => boolean): boolean {
    const meta = getKeywordMetadata(type);
    return meta.canWeakspot || hasFlag(FlagType.KeywordCanWeakspot);
}
