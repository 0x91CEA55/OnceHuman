/**
 * ADR-002: UNIVERSAL_BUCKETS — The canonical bucket registry.
 *
 * Every damage event passes through all 21+ buckets.
 * Non-applicable buckets resolve to (1 + 0/100) = 1.0.
 *
 * Key invariants:
 * - Factor + Coefficient logic is handled by grouping contributors into buckets.
 * - Condition logic (ALWAYS, flag('wasCrit')) determines applicability.
 */

import { BucketDef, BucketId, ConditionType } from '../types/resolution';
import { StatType, KeywordType, EnemyType, FlagType, DamageTrait } from '../types/enums';

const ALWAYS = { type: ConditionType.Always } as const;
const trait = (trait: DamageTrait) => ({ type: ConditionType.TraitMatches, trait } as const);
const kw = (keyword: KeywordType) => ({ type: ConditionType.KeywordMatches, keyword } as const);
const target = (targetType: EnemyType) => ({ type: ConditionType.TargetTypeMatches, targetType } as const);
const flag = (flag: string) => ({ type: ConditionType.FlagActive, flag: flag as any } as const);

export const UNIVERSAL_BUCKETS: readonly BucketDef[] = [

    // ── Broad Damage Category Buckets ──────────────────────────────────────
    {
        id: BucketId.WeaponDamage,
        contributors: [
            { stat: StatType.WeaponDamagePercent, condition: trait(DamageTrait.Weapon) },
        ],
    },
    {
        id: BucketId.ElementalDamage,
        contributors: [
            { stat: StatType.ElementalDamagePercent, condition: trait(DamageTrait.Elemental) },
        ],
    },
    {
        id: BucketId.StatusDamage,
        contributors: [
            { stat: StatType.StatusDamagePercent, condition: trait(DamageTrait.Status) },
        ],
    },
    {
        id: BucketId.AttackPercent,
        contributors: [
            { stat: StatType.AttackPercent, condition: trait(DamageTrait.Attack) },
        ],
    },
    {
        id: BucketId.PsiIncrease,
        contributors: [
            { stat: StatType.PsiIntensity, condition: ALWAYS },
        ],
    },

    // ── Crit Buckets ──────────────────────────────────────────────────────
    {
        id: BucketId.CritMultiplier,
        contributors: [
            { stat: StatType.CritDamagePercent, condition: flag('wasCrit') },
        ],
    },

    // ── Weakspot Buckets ──────────────────────────────────────────────────
    {
        id: BucketId.WeakspotMultiplier,
        contributors: [
            { stat: StatType.WeakspotDamagePercent, condition: flag('wasWeakspot') },
        ],
    },

    // ── Hit Amplifier (Crit DMG + Weakspot DMG are ADDITIVE here) ──────────
    {
        id: BucketId.HitAmplifier,
        contributors: [
            { stat: StatType.CritDamagePercent,    condition: flag('wasCrit') },
            { 
                stat: StatType.WeakspotDamagePercent, 
                condition: {
                    type: ConditionType.And,
                    conditions: [
                        flag('wasWeakspot'),
                        { type: ConditionType.Not, condition: { type: ConditionType.FlagActive, flag: FlagType.CannotDealWeakspotDamage as any } }
                    ]
                }
            },
        ],
    },

    // ── Target Type Buckets ───────────────────────────────────────────────
    {
        id: BucketId.TargetNormal,
        contributors: [{ stat: StatType.DamageBonusNormal, condition: target(EnemyType.Normal) }],
    },
    {
        id: BucketId.TargetElite,
        contributors: [{ stat: StatType.DamageBonusElite, condition: target(EnemyType.Elite) }],
    },
    {
        id: BucketId.TargetBoss,
        contributors: [{ stat: StatType.DamageBonusBoss, condition: target(EnemyType.Boss) }],
    },

    // ── Vulnerability ─────────────────────────────────────────────────────
    {
        id: BucketId.Vulnerability,
        contributors: [{ stat: StatType.VulnerabilityPercent, condition: ALWAYS }],
    },

    // ── Keyword-Specific FACTOR Buckets (Scales Base) ──────────────────────
    {
        id: BucketId.KeywordFactor,
        contributors: [
            { stat: StatType.BurnDamageFactor,           condition: kw(KeywordType.Burn) },
            { stat: StatType.FrostVortexDamageFactor,    condition: kw(KeywordType.FrostVortex) },
            { stat: StatType.PowerSurgeDamageFactor,     condition: kw(KeywordType.PowerSurge) },
            { stat: StatType.ShrapnelDamageFactor,       condition: kw(KeywordType.Shrapnel) },
            { stat: StatType.UnstableBomberDamageFactor, condition: kw(KeywordType.UnstableBomber) },
            { stat: StatType.BounceDamageFactor,         condition: kw(KeywordType.Bounce) },
        ],
    },

    // ── Keyword-Specific FINAL Buckets (Post-all multipliers) ─────────────
    {
        id: BucketId.KeywordFinal,
        contributors: [
            { stat: StatType.BurnFinalDamage,           condition: kw(KeywordType.Burn) },
            { stat: StatType.FrostVortexFinalDamage,    condition: kw(KeywordType.FrostVortex) },
            { stat: StatType.PowerSurgeFinalDamage,     condition: kw(KeywordType.PowerSurge) },
            { stat: StatType.ShrapnelFinalDamage,       condition: kw(KeywordType.Shrapnel) },
            { stat: StatType.UnstableBomberFinalDamage, condition: kw(KeywordType.UnstableBomber) },
            { stat: StatType.BounceFinalDamage,         condition: kw(KeywordType.Bounce) },
        ],
    },
];

/** Crit rate contributors — same pure-data pattern as bucket contributors. */
export const CRIT_RATE_CONTRIBUTORS: readonly any[] = [
    { stat: StatType.CritRatePercent, condition: ALWAYS },
];

/** Weakspot roll contributors. ADR-013: checks CannotDealWeakspotDamage flag. */
export const WEAKSPOT_RATE_CONTRIBUTORS: readonly any[] = [
    { 
        stat: StatType.WeakspotHitRatePercent, 
        condition: { type: ConditionType.Not, condition: flag(FlagType.CannotDealWeakspotDamage) } 
    },
];

/** Registry of all probabilistic "Rolls" in the engine. */
export const ROLL_REGISTRY: readonly any[] = [
    {
        id: 'crit',
        rateContributors: CRIT_RATE_CONTRIBUTORS,
        resultFlag: 'wasCrit'
    },
    {
        id: 'weakspot',
        rateContributors: WEAKSPOT_RATE_CONTRIBUTORS,
        resultFlag: 'wasWeakspot'
    }
];
