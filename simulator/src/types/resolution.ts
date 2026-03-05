/**
 * ADR-002: Universal Bucket Topology — Type Definitions
 *
 * All types used by the pure-data damage resolver. No methods, no classes.
 * See: simulator/docs/designs/ADR-002-universal-bucket-topology.md
 */

import { StatType, DamageTrait, KeywordType, EnemyType, FlagType } from './enums';

/**
 * ADR-005: Context Flags
 * Union of all valid flags used during damage resolution.
 * Combines permanent gear flags with transient session flags (crits, weakspots).
 */
export type ContextFlag = 
    | FlagType 
    | 'wasCrit' 
    | 'wasWeakspot' 
    | 'wasBurnCrit' 
    | 'isShielded' 
    | 'isFirstHalfOfMag';

/**
 * Each multiplicative bucket in the universal topology.
 * Every damage event passes through ALL buckets; non-applicable ones resolve to 1.0.
 */
export enum BucketId {
    WeaponDamage         = 'weapon_damage',
    ElementalDamage      = 'elemental_damage',
    StatusDamage         = 'status_damage',
    AttackPercent        = 'attack_percent',
    PsiIncrease          = 'psi_increase',
    BurnFactor           = 'burn_factor',
    FrostVortexFactor    = 'frost_vortex_factor',
    PowerSurgeFactor     = 'power_surge_factor',
    ShrapnelFactor       = 'shrapnel_factor',
    UnstableBomberFactor = 'unstable_bomber_factor',
    BounceFactor         = 'bounce_factor',
    BurnFinal            = 'burn_final',
    FrostVortexFinal     = 'frost_vortex_final',
    PowerSurgeFinal      = 'power_surge_final',
    ShrapnelFinal        = 'shrapnel_final',
    UnstableBomberFinal  = 'unstable_bomber_final',
    BounceFinal          = 'bounce_final',
    /** Crit DMG + Weakspot DMG are ADDITIVE within this bucket. */
    HitAmplifier         = 'hit_amplifier',
    TargetNormal         = 'target_normal',
    TargetElite          = 'target_elite',
    TargetBoss           = 'target_boss',
    Vulnerability        = 'vulnerability',
    FinalDamage          = 'final_damage',
}

/** Discriminant for ContributionCondition — all typed, no string literals. */
export enum ConditionType {
    Always              = 'always',
    KeywordMatches      = 'keyword_matches',
    ElementMatches      = 'element_matches',
    TargetTypeMatches   = 'target_type_matches',
    KeywordCritUnlocked = 'keyword_crit_unlocked',
    /** Generic flag check (e.g., 'wasCrit', 'wasWeakspot', 'isElite'). */
    FlagActive          = 'flag_active',
    /** Robust comparison between a stat and a literal value. */
    Comparison          = 'comparison',
    And                 = 'and',
    Or                  = 'or',
    Not                 = 'not',
}

/** Element types for elemental damage bucket conditions. */
export enum ElementType {
    Blaze = 'blaze',
    Frost = 'frost',
    Shock = 'shock',
    Blast = 'blast',
}

/** Comparison operators for the Comparison condition type. */
export type ComparisonOperator = '>' | '<' | '>=' | '<=' | '==';

/**
 * Condition tree for bucket contributions — fully serializable, no functions.
 * Evaluation is a separate pure function.
 */
export type ContributionCondition =
    | { readonly type: ConditionType.Always }
    | { readonly type: ConditionType.KeywordMatches;      readonly keyword: KeywordType }
    | { readonly type: ConditionType.ElementMatches;      readonly element: ElementType }
    | { readonly type: ConditionType.TargetTypeMatches;    readonly targetType: EnemyType }
    | { readonly type: ConditionType.KeywordCritUnlocked;  readonly keyword: KeywordType }
    | { readonly type: ConditionType.FlagActive;           readonly flag: ContextFlag }
    | { readonly type: ConditionType.Comparison;           readonly stat: StatType; readonly operator: ComparisonOperator; readonly value: number }
    | { readonly type: ConditionType.And;                  readonly conditions: readonly ContributionCondition[] }
    | { readonly type: ConditionType.Or;                   readonly conditions: readonly ContributionCondition[] }
    | { readonly type: ConditionType.Not;                  readonly condition: ContributionCondition };

/** A single stat contributor to a bucket, gated by a condition. */
export interface ContributorDef {
    readonly stat: StatType;
    readonly condition: ContributionCondition;
}

/**
 * One multiplicative bucket. Resolution: 1 + SUM(applicable_contributor_values) / 100.
 * When no contributors apply, resolves to (1 + 0/100) = 1.0.
 */
export interface BucketDef {
    readonly id: BucketId;
    readonly contributors: readonly ContributorDef[];
}

/**
 * Defines a probabilistic "Roll" (e.g., Crit, Weakspot) that sets a flag in ResolutionContext.
 */
export interface RollDefinition {
    readonly id: string;
    readonly rateContributors: readonly ContributorDef[];
    readonly resultFlag: ContextFlag;
}

/**
 * Snapshot of the current damage event's state for condition evaluation.
 * Pure data — no methods, no mutation during resolution.
 */
export interface ResolutionContext {
    readonly traits: ReadonlySet<DamageTrait>;
    readonly keywords: ReadonlySet<KeywordType>;
    readonly elements: ReadonlySet<ElementType>;
    readonly targetType: EnemyType;
    /** Strictly-typed flags map. */
    readonly flags: Map<ContextFlag, boolean>;
    readonly unlockedKeywordCrits: ReadonlySet<KeywordType>;
    /** Pre-aggregated stat pool from PlayerStats. */
    readonly statValues: ReadonlyMap<StatType, number>;
}
