/**
 * ADR-002: UNIVERSAL_BUCKETS — The canonical bucket registry.
 *
 * Every damage event passes through all 21+ buckets.
 * Non-applicable buckets resolve to (1 + 0/100) = 1.0.
 *
 * Key invariants:
 * - Factor + Coefficient are ADDITIVE within the same bucket (The 113 Test)
 * - Crit DMG + Weakspot DMG are ADDITIVE in HitAmplifier (not separate multipliers)
 * - Each keyword has its own Factor bucket AND its own Final bucket
 *
 * See: simulator/docs/designs/ADR-002-universal-bucket-topology.md
 */

import { BucketDef, BucketId, ContributorDef, ConditionType, RollDefinition } from '../types/resolution';
import { StatType, KeywordType, EnemyType } from '../types/enums';

const ALWAYS = { type: ConditionType.Always } as const;
const kw = (keyword: KeywordType) => ({ type: ConditionType.KeywordMatches, keyword } as const);
const target = (targetType: EnemyType) => ({ type: ConditionType.TargetTypeMatches, targetType } as const);
const flag = (flag: string) => ({ type: ConditionType.FlagActive, flag } as const);

/**
 * Registry of all probabilistic "Rolls" in the engine.
 * Decouples the decision (did it crit?) from the effect (+100% DMG).
 */
export const ROLL_REGISTRY: readonly RollDefinition[] = [
    {
        id: 'crit',
        rateContributors: [
            { stat: StatType.CritRatePercent, condition: ALWAYS },
        ],
        resultFlag: 'wasCrit'
    },
    {
        id: 'weakspot',
        rateContributors: [
            { stat: StatType.WeakspotHitRatePercent, condition: ALWAYS },
        ],
        resultFlag: 'wasWeakspot'
    }
];

export const UNIVERSAL_BUCKETS: readonly BucketDef[] = [

    // ── Broad Damage Category Buckets ──────────────────────────────────────
    {
        id: BucketId.WeaponDamage,
        contributors: [
            { stat: StatType.WeaponDamagePercent, condition: ALWAYS },
        ],
    },
    {
        id: BucketId.ElementalDamage,
        contributors: [
            { stat: StatType.ElementalDamagePercent, condition: ALWAYS },
        ],
    },
    {
        id: BucketId.StatusDamage,
        contributors: [
            { stat: StatType.StatusDamagePercent, condition: ALWAYS },
        ],
    },
    {
        id: BucketId.AttackPercent,
        contributors: [
            { stat: StatType.AttackPercent, condition: ALWAYS },
        ],
    },
    {
        id: BucketId.PsiIncrease,
        contributors: [
            // Dynamic contributors added during aggregation
        ],
    },

    // ── Keyword Factor Buckets (Factor + Coefficient are ADDITIVE within each) ─
    {
        id: BucketId.BurnFactor,
        contributors: [
            { stat: StatType.BurnDamageFactor, condition: kw(KeywordType.Burn) },
        ],
    },
    {
        id: BucketId.FrostVortexFactor,
        contributors: [
            { stat: StatType.FrostVortexDamageFactor, condition: kw(KeywordType.FrostVortex) },
        ],
    },
    {
        id: BucketId.PowerSurgeFactor,
        contributors: [
            { stat: StatType.PowerSurgeDamageFactor, condition: kw(KeywordType.PowerSurge) },
        ],
    },
    {
        id: BucketId.ShrapnelFactor,
        contributors: [
            { stat: StatType.ShrapnelDamageFactor, condition: kw(KeywordType.Shrapnel) },
        ],
    },
    {
        id: BucketId.UnstableBomberFactor,
        contributors: [
            { stat: StatType.UnstableBomberDamageFactor, condition: kw(KeywordType.UnstableBomber) },
        ],
    },
    {
        id: BucketId.BounceFactor,
        contributors: [
            { stat: StatType.BounceDamageFactor, condition: kw(KeywordType.Bounce) },
        ],
    },

    // ── Keyword Final DMG Buckets (each is its own multiplicative factor) ──
    {
        id: BucketId.BurnFinal,
        contributors: [
            { stat: StatType.BurnFinalDamage, condition: kw(KeywordType.Burn) },
        ],
    },
    {
        id: BucketId.FrostVortexFinal,
        contributors: [
            { stat: StatType.FrostVortexFinalDamage, condition: kw(KeywordType.FrostVortex) },
        ],
    },
    {
        id: BucketId.PowerSurgeFinal,
        contributors: [
            { stat: StatType.PowerSurgeFinalDamage, condition: kw(KeywordType.PowerSurge) },
        ],
    },
    {
        id: BucketId.ShrapnelFinal,
        contributors: [
            { stat: StatType.ShrapnelFinalDamage, condition: kw(KeywordType.Shrapnel) },
        ],
    },
    {
        id: BucketId.UnstableBomberFinal,
        contributors: [
            { stat: StatType.UnstableBomberFinalDamage, condition: kw(KeywordType.UnstableBomber) },
        ],
    },
    {
        id: BucketId.BounceFinal,
        contributors: [
            { stat: StatType.BounceFinalDamage, condition: kw(KeywordType.Bounce) },
        ],
    },

    // ── Hit Amplifier (Crit DMG + Weakspot DMG are ADDITIVE here) ──────────
    {
        id: BucketId.HitAmplifier,
        contributors: [
            { stat: StatType.CritDamagePercent,    condition: flag('wasCrit') },
            { stat: StatType.WeakspotDamagePercent, condition: flag('wasWeakspot') },
        ],
    },

    // ── Target Type Buckets ───────────────────────────────────────────────
    {
        id: BucketId.TargetNormal,
        contributors: [
            { stat: StatType.DamageBonusNormal, condition: target(EnemyType.Normal) },
        ],
    },
    {
        id: BucketId.TargetElite,
        contributors: [
            { stat: StatType.DamageBonusElite, condition: target(EnemyType.Elite) },
        ],
    },
    {
        id: BucketId.TargetBoss,
        contributors: [
            { stat: StatType.DamageBonusBoss, condition: target(EnemyType.Boss) },
        ],
    },

    // ── Global Final ──────────────────────────────────────────────────────
    {
        id: BucketId.Vulnerability,
        contributors: [
            { stat: StatType.VulnerabilityPercent, condition: ALWAYS },
        ],
    },
    {
        id: BucketId.FinalDamage,
        contributors: [
            // "Ultimate DMG Bonus"
        ],
    },
];

/** Crit rate contributors — same pure-data pattern as bucket contributors. */
export const CRIT_RATE_CONTRIBUTORS: readonly ContributorDef[] = [
    { stat: StatType.CritRatePercent, condition: ALWAYS },
];
