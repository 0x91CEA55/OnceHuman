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

import { BucketDef, BucketId, ConditionType, ContributorDef, RollDefinition, ContextFlag } from '../types/resolution';
import { StatType, KeywordType, EnemyType, FlagType, DamageTrait } from '../types/enums';

const ALWAYS = { type: ConditionType.Always } as const;
const trait = (trait: DamageTrait) => ({ type: ConditionType.TraitMatches, trait } as const);
const kw = (keyword: KeywordType) => ({ type: ConditionType.KeywordMatches, keyword } as const);
const target = (targetType: EnemyType) => ({ type: ConditionType.TargetTypeMatches, targetType } as const);
const flag = (flag: ContextFlag) => ({ type: ConditionType.FlagActive, flag } as const);

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
                        { type: ConditionType.Not, condition: { type: ConditionType.FlagActive, flag: FlagType.CannotDealWeakspotDamage } }
                    ]
                }
            },
            // ADR-013: Keyword-specific crit DMG (e.g. Burn Crit DMG from Gilded Gloves)
            { 
                stat: StatType.KeywordCritDamagePercent, 
                condition: {
                    type: ConditionType.And,
                    conditions: [
                        {
                            type: ConditionType.Or,
                            conditions: [
                                flag('wasBurnCrit'),
                                // Add generic keyword crits if we ever roll them
                                {
                                    type: ConditionType.And,
                                    conditions: [
                                        flag('wasCrit'),
                                        { type: ConditionType.FlagActive, flag: FlagType.KeywordCanCrit }
                                    ]
                                }
                            ]
                        },
                        // MANDATORY: Must be a keyword-eligible intent
                        {
                            type: ConditionType.Or,
                            conditions: [
                                kw(KeywordType.Burn),
                                kw(KeywordType.PowerSurge),
                                kw(KeywordType.FrostVortex),
                                kw(KeywordType.UnstableBomber)
                            ]
                        }
                    ]
                }
            }
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
        id: BucketId.BurnFactor,
        contributors: [{ stat: StatType.BurnDamageFactor, condition: kw(KeywordType.Burn) }],
    },
    {
        id: BucketId.FrostVortexFactor,
        contributors: [{ stat: StatType.FrostVortexDamageFactor, condition: kw(KeywordType.FrostVortex) }],
    },
    {
        id: BucketId.PowerSurgeFactor,
        contributors: [{ stat: StatType.PowerSurgeDamageFactor, condition: kw(KeywordType.PowerSurge) }],
    },
    {
        id: BucketId.ShrapnelFactor,
        contributors: [{ stat: StatType.ShrapnelDamageFactor, condition: kw(KeywordType.Shrapnel) }],
    },
    {
        id: BucketId.UnstableBomberFactor,
        contributors: [{ stat: StatType.UnstableBomberDamageFactor, condition: kw(KeywordType.UnstableBomber) }],
    },
    {
        id: BucketId.BounceFactor,
        contributors: [{ stat: StatType.BounceDamageFactor, condition: kw(KeywordType.Bounce) }],
    },

    // ── Keyword-Specific FINAL Buckets (Post-all multipliers) ─────────────
    {
        id: BucketId.BurnFinal,
        contributors: [{ stat: StatType.BurnFinalDamage, condition: kw(KeywordType.Burn) }],
    },
    {
        id: BucketId.FrostVortexFinal,
        contributors: [{ stat: StatType.FrostVortexFinalDamage, condition: kw(KeywordType.FrostVortex) }],
    },
    {
        id: BucketId.PowerSurgeFinal,
        contributors: [{ stat: StatType.PowerSurgeFinalDamage, condition: kw(KeywordType.PowerSurge) }],
    },
    {
        id: BucketId.ShrapnelFinal,
        contributors: [{ stat: StatType.ShrapnelFinalDamage, condition: kw(KeywordType.Shrapnel) }],
    },
    {
        id: BucketId.UnstableBomberFinal,
        contributors: [{ stat: StatType.UnstableBomberFinalDamage, condition: kw(KeywordType.UnstableBomber) }],
    },
    {
        id: BucketId.BounceFinal,
        contributors: [{ stat: StatType.BounceFinalDamage, condition: kw(KeywordType.Bounce) }],
    },
];

/** Crit rate contributors — same pure-data pattern as bucket contributors. */
export const CRIT_RATE_CONTRIBUTORS: readonly ContributorDef[] = [
    { stat: StatType.CritRatePercent, condition: ALWAYS },
];

/** Weakspot roll contributors. ADR-013: checks CannotDealWeakspotDamage flag. */
export const WEAKSPOT_RATE_CONTRIBUTORS: readonly ContributorDef[] = [
    { 
        stat: StatType.WeakspotHitRatePercent, 
        condition: { type: ConditionType.Not, condition: flag(FlagType.CannotDealWeakspotDamage) } 
    },
];

/** ADR-013: Keyword crit roll contributors. */
export const KEYWORD_CRIT_RATE_CONTRIBUTORS: readonly ContributorDef[] = [
    // Global crit rate always applies to keyword crits
    { stat: StatType.CritRatePercent, condition: flag(FlagType.KeywordCanCrit) },
    // Keyword-specific crit rate only applies IF a keyword is active
    { 
        stat: StatType.KeywordCritRatePercent, 
        condition: {
            type: ConditionType.And,
            conditions: [
                flag(FlagType.KeywordCanCrit),
                {
                    type: ConditionType.Or,
                    conditions: [
                        kw(KeywordType.Burn),
                        kw(KeywordType.PowerSurge),
                        kw(KeywordType.FrostVortex),
                        kw(KeywordType.UnstableBomber)
                    ]
                }
            ]
        }
    },
];

/** Registry of all probabilistic "Rolls" in the engine. */
export const ROLL_REGISTRY: readonly RollDefinition[] = [
    {
        id: 'crit',
        rateContributors: CRIT_RATE_CONTRIBUTORS,
        resultFlag: 'wasCrit'
    },
    {
        id: 'weakspot',
        rateContributors: WEAKSPOT_RATE_CONTRIBUTORS,
        resultFlag: 'wasWeakspot'
    },
    {
        id: 'burn-crit',
        rateContributors: KEYWORD_CRIT_RATE_CONTRIBUTORS,
        resultFlag: 'wasBurnCrit'
    }
];
