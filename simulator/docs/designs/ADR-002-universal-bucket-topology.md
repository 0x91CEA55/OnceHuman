# ADR-002: Universal Bucket Topology — Pure-Data Damage Resolution Model

**Status:** Proposed
**Date:** 2026-03-03
**Supersedes:** ADR-001 (Architectural Pattern Selection — damage resolution sections)
**Deciders:** Tatum (Project Lead), Contributors

---

## Context

ADR-001 established the ECS-inspired architecture direction. During design iteration, three critical discoveries invalidated the initial damage resolution model:

1. **The "one additive bucket" assumption was wrong.** The `RefinedResolutionStrategy` collapses all damage bonuses into a single additive pool. In reality, Once Human uses *many* separate additive pools, each of which becomes its own multiplicative factor. Collapsing them introduces ~13%+ error on loaded builds.

2. **Certain stats that *appear* to be separate multiplicative factors are actually additive with each other.** The "113 Test" proved that "DMG Factor" (from weapons/mods) and "DMG Coefficient" (from key armor like Mayfly) are additive within the same bucket. Crit DMG and Weakspot DMG are also additive within a single "Hit Amplifier" bucket — not separate multiplicative layers.

3. **The topology is universal.** Every damage event passes through the same set of multiplicative buckets. Buckets that don't apply to a given intent resolve to `(1 + 0/100) = 1.0` and vanish from the product. There is no need for per-damage-type topology definitions.

These findings demand a new resolution model: a **Universal Bucket Topology** expressed as pure data, with a trivially simple resolver that just multiplies everything together.

---

## Decision

Replace the `DamageResolutionStrategy` class hierarchy with a **declarative, enum-typed bucket registry** and a **two-function resolver** (`evaluate` + `resolve`). All damage relationships are modeled as data. The resolver contains zero game knowledge.

### Core Principles

1. **Pure data over code.** Bucket definitions, contributor mappings, and contribution conditions are all typed data structures — no lambdas, no class methods, no OOP dispatch.
2. **Enums over strings.** Every discriminant, bucket ID, condition type, and stat reference is a TypeScript enum member. No raw string literals in the resolution path.
3. **Universal topology.** All buckets are defined once and evaluated for every damage intent. Non-applicable buckets resolve to `1.0` via zero-sum contributors.
4. **Context-sensitivity lives in conditions, not in the resolver.** The resolver is a dumb loop. All "does this apply?" logic is expressed via `ContributionCondition` discriminated unions evaluated against the current `ResolutionContext`.

---

## Type Definitions

### New Enums

```typescript
/**
 * Identifies each multiplicative bucket in the universal topology.
 * Every damage event passes through ALL buckets. Non-applicable ones resolve to 1.0.
 */
export enum BucketId {
    // Broad damage category buckets
    WeaponDamage        = 'weapon_damage',
    ElementalDamage     = 'elemental_damage',     // Blaze + Frost + Shock + generic Elemental are ADDITIVE here
    StatusDamage        = 'status_damage',
    AttackPercent       = 'attack_percent',
    PsiIncrease         = 'psi_increase',          // (1 + psiDmgIncrease/100) — bucket like any other

    // Keyword Factor buckets (Factor + Coefficient are additive within each)
    BurnFactor          = 'burn_factor',
    FrostVortexFactor   = 'frost_vortex_factor',
    PowerSurgeFactor    = 'power_surge_factor',
    ShrapnelFactor      = 'shrapnel_factor',
    UnstableBomberFactor = 'unstable_bomber_factor',
    BounceFactor        = 'bounce_factor',

    // Keyword Final DMG buckets (each keyword gets its own multiplicative final)
    BurnFinal           = 'burn_final',
    FrostVortexFinal    = 'frost_vortex_final',
    PowerSurgeFinal     = 'power_surge_final',
    ShrapnelFinal       = 'shrapnel_final',
    UnstableBomberFinal = 'unstable_bomber_final',
    BounceFinal         = 'bounce_final',

    // Hit amplifier: Crit DMG + Weakspot DMG are ADDITIVE here
    HitAmplifier        = 'hit_amplifier',

    // Target type buckets (one per enemy type — only the matching one contributes)
    TargetNormal        = 'target_normal',
    TargetElite         = 'target_elite',
    TargetBoss          = 'target_boss',

    // Global final damage
    Vulnerability       = 'vulnerability',
    FinalDamage         = 'final_damage',          // "Ultimate DMG" / global Final DMG Bonus
}

/**
 * Discriminant for ContributionCondition — all typed, no string literals.
 */
export enum ConditionType {
    Always              = 'always',
    KeywordMatches      = 'keyword_matches',
    ElementMatches      = 'element_matches',
    TargetTypeMatches   = 'target_type_matches',
    WasCrit             = 'was_crit',
    WasWeakspot         = 'was_weakspot',
    KeywordCritUnlocked = 'keyword_crit_unlocked',
    And                 = 'and',
    Or                  = 'or',
    Not                 = 'not',
}

/**
 * Element types that can appear in elemental damage bucket conditions.
 */
export enum ElementType {
    Blaze   = 'blaze',
    Frost   = 'frost',
    Shock   = 'shock',
    Blast   = 'blast',
}
```

### ContributionCondition (Discriminated Union)

The condition tree is pure data — fully serializable, no functions. Evaluation is a separate pure function.

```typescript
export type ContributionCondition =
    | { readonly type: ConditionType.Always }
    | { readonly type: ConditionType.KeywordMatches;      readonly keyword: KeywordType }
    | { readonly type: ConditionType.ElementMatches;       readonly element: ElementType }
    | { readonly type: ConditionType.TargetTypeMatches;    readonly targetType: EnemyType }
    | { readonly type: ConditionType.WasCrit }
    | { readonly type: ConditionType.WasWeakspot }
    | { readonly type: ConditionType.KeywordCritUnlocked;  readonly keyword: KeywordType }
    | { readonly type: ConditionType.And;                  readonly conditions: readonly ContributionCondition[] }
    | { readonly type: ConditionType.Or;                   readonly conditions: readonly ContributionCondition[] }
    | { readonly type: ConditionType.Not;                  readonly condition: ContributionCondition };
```

### BucketDef and ContributorDef

```typescript
/**
 * A single stat that feeds into a bucket, gated by a condition.
 * Pure data — the condition determines whether this stat contributes a non-zero value.
 */
export interface ContributorDef {
    readonly stat: StatType;
    readonly condition: ContributionCondition;
}

/**
 * A multiplicative bucket definition.
 * Resolution: (1 + Sum(applicable_contributor_values) / 100)
 * When no contributors apply, resolves to (1 + 0/100) = 1.0
 */
export interface BucketDef {
    readonly id: BucketId;
    readonly contributors: readonly ContributorDef[];
}
```

### Resolution Context

```typescript
/**
 * Snapshot of the current damage event's state, used to evaluate conditions.
 * Pure data — no methods, no mutation during resolution.
 */
export interface ResolutionContext {
    readonly traits: ReadonlySet<DamageTrait>;
    readonly keywords: ReadonlySet<KeywordType>;
    readonly elements: ReadonlySet<ElementType>;
    readonly targetType: EnemyType;
    readonly wasCrit: boolean;
    readonly wasWeakspot: boolean;
    readonly unlockedKeywordCrits: ReadonlySet<KeywordType>;
    readonly statValues: ReadonlyMap<StatType, number>;  // Pre-aggregated stat pool
}
```

---

## The Universal Bucket Registry

Defined once. Evaluated for every damage intent. Non-applicable buckets vanish to `1.0`.

```typescript
export const UNIVERSAL_BUCKETS: readonly BucketDef[] = [

    // ── Broad Damage Category Buckets ──────────────────────────────────
    {
        id: BucketId.WeaponDamage,
        contributors: [
            { stat: StatType.WeaponDamagePercent, condition: { type: ConditionType.Always } },
        ],
    },
    {
        id: BucketId.ElementalDamage,
        contributors: [
            // Generic "Elemental DMG %" applies when ANY element trait is present
            { stat: StatType.ElementalDamagePercent, condition: { type: ConditionType.Always } },
            // Per-element stats (Blaze DMG %, etc.) only when that element matches
            // NOTE: These StatType values will need to be added to the enum when per-element stats are codified.
            // For now, the generic ElementalDamagePercent captures the known in-game stat.
        ],
    },
    {
        id: BucketId.StatusDamage,
        contributors: [
            { stat: StatType.StatusDamagePercent, condition: { type: ConditionType.Always } },
        ],
    },
    {
        id: BucketId.AttackPercent,
        contributors: [
            { stat: StatType.AttackPercent, condition: { type: ConditionType.Always } },
        ],
    },
    {
        id: BucketId.PsiIncrease,
        contributors: [
            // PsiIntensity increase percent — modeled as (1 + psiIncrease/100) like any other bucket
            // StatType.PsiIntensityIncreasePercent will need to be added to the enum.
            // Conditional contributor example: +5% Psi per burn stack would use a dynamic stat feed.
        ],
    },

    // ── Keyword Factor Buckets (Factor + Coefficient are ADDITIVE within each) ──
    {
        id: BucketId.BurnFactor,
        contributors: [
            { stat: StatType.BurnDamageFactor, condition: { type: ConditionType.KeywordMatches, keyword: KeywordType.Burn } },
            // Mayfly Coefficient also lives here — same StatType after reconciliation (the 113 Test)
        ],
    },
    {
        id: BucketId.FrostVortexFactor,
        contributors: [
            { stat: StatType.FrostVortexDamageFactor, condition: { type: ConditionType.KeywordMatches, keyword: KeywordType.FrostVortex } },
        ],
    },
    {
        id: BucketId.PowerSurgeFactor,
        contributors: [
            { stat: StatType.PowerSurgeDamageFactor, condition: { type: ConditionType.KeywordMatches, keyword: KeywordType.PowerSurge } },
        ],
    },
    {
        id: BucketId.ShrapnelFactor,
        contributors: [
            { stat: StatType.ShrapnelDamageFactor, condition: { type: ConditionType.KeywordMatches, keyword: KeywordType.Shrapnel } },
        ],
    },
    {
        id: BucketId.UnstableBomberFactor,
        contributors: [
            { stat: StatType.UnstableBomberDamageFactor, condition: { type: ConditionType.KeywordMatches, keyword: KeywordType.UnstableBomber } },
        ],
    },
    {
        id: BucketId.BounceFactor,
        contributors: [
            { stat: StatType.BounceDamageFactor, condition: { type: ConditionType.KeywordMatches, keyword: KeywordType.Bounce } },
        ],
    },

    // ── Keyword Final DMG Buckets (each is its own multiplicative factor) ──
    {
        id: BucketId.BurnFinal,
        contributors: [
            { stat: StatType.BurnFinalDamage, condition: { type: ConditionType.KeywordMatches, keyword: KeywordType.Burn } },
        ],
    },
    {
        id: BucketId.FrostVortexFinal,
        contributors: [
            { stat: StatType.FrostVortexFinalDamage, condition: { type: ConditionType.KeywordMatches, keyword: KeywordType.FrostVortex } },
        ],
    },
    {
        id: BucketId.PowerSurgeFinal,
        contributors: [
            { stat: StatType.PowerSurgeFinalDamage, condition: { type: ConditionType.KeywordMatches, keyword: KeywordType.PowerSurge } },
        ],
    },
    {
        id: BucketId.ShrapnelFinal,
        contributors: [
            { stat: StatType.ShrapnelFinalDamage, condition: { type: ConditionType.KeywordMatches, keyword: KeywordType.Shrapnel } },
        ],
    },
    {
        id: BucketId.UnstableBomberFinal,
        contributors: [
            { stat: StatType.UnstableBomberFinalDamage, condition: { type: ConditionType.KeywordMatches, keyword: KeywordType.UnstableBomber } },
        ],
    },
    {
        id: BucketId.BounceFinal,
        contributors: [
            { stat: StatType.BounceFinalDamage, condition: { type: ConditionType.KeywordMatches, keyword: KeywordType.Bounce } },
        ],
    },

    // ── Hit Amplifier (Crit DMG + Weakspot DMG are ADDITIVE) ──────────
    {
        id: BucketId.HitAmplifier,
        contributors: [
            { stat: StatType.CritDamagePercent,     condition: { type: ConditionType.WasCrit } },
            { stat: StatType.WeakspotDamagePercent,  condition: { type: ConditionType.WasWeakspot } },
            // Keyword-specific crit DMG (e.g., Burn Crit DMG from Gilded Gloves)
            // uses: condition: { type: ConditionType.And, conditions: [
            //   { type: ConditionType.WasCrit },
            //   { type: ConditionType.KeywordMatches, keyword: KeywordType.Burn }
            // ]}
            // StatType: KeywordCritDamagePercent (or per-keyword variant)
        ],
    },

    // ── Target Type Buckets ───────────────────────────────────────────
    {
        id: BucketId.TargetNormal,
        contributors: [
            { stat: StatType.DamageBonusNormal, condition: { type: ConditionType.TargetTypeMatches, targetType: EnemyType.Normal } },
        ],
    },
    {
        id: BucketId.TargetElite,
        contributors: [
            { stat: StatType.DamageBonusElite, condition: { type: ConditionType.TargetTypeMatches, targetType: EnemyType.Elite } },
        ],
    },
    {
        id: BucketId.TargetBoss,
        contributors: [
            { stat: StatType.DamageBonusBoss, condition: { type: ConditionType.TargetTypeMatches, targetType: EnemyType.Boss } },
        ],
    },

    // ── Global Final ──────────────────────────────────────────────────
    {
        id: BucketId.Vulnerability,
        contributors: [
            { stat: StatType.VulnerabilityPercent, condition: { type: ConditionType.Always } },
        ],
    },
    {
        id: BucketId.FinalDamage,
        contributors: [
            // "Ultimate DMG Bonus" / global Final DMG — stats TBD pending Bible clarification
        ],
    },
];
```

---

## The Resolver: Two Pure Functions

The entire resolution engine is two functions totaling ~40 lines. No classes. No strategy pattern. No inheritance.

### Function 1: `evaluate` — Condition Evaluator

```typescript
/**
 * Evaluates a ContributionCondition against the current ResolutionContext.
 * Pure function — no side effects, no mutation.
 */
export function evaluate(condition: ContributionCondition, ctx: ResolutionContext): boolean {
    switch (condition.type) {
        case ConditionType.Always:
            return true;

        case ConditionType.KeywordMatches:
            return ctx.keywords.has(condition.keyword);

        case ConditionType.ElementMatches:
            return ctx.elements.has(condition.element);

        case ConditionType.TargetTypeMatches:
            return ctx.targetType === condition.targetType;

        case ConditionType.WasCrit:
            return ctx.wasCrit;

        case ConditionType.WasWeakspot:
            return ctx.wasWeakspot;

        case ConditionType.KeywordCritUnlocked:
            return ctx.unlockedKeywordCrits.has(condition.keyword);

        case ConditionType.And:
            return condition.conditions.every(c => evaluate(c, ctx));

        case ConditionType.Or:
            return condition.conditions.some(c => evaluate(c, ctx));

        case ConditionType.Not:
            return !evaluate(condition.condition, ctx);
    }
}
```

### Function 2: `resolve` — Universal Damage Resolver

```typescript
/**
 * Resolves final damage by multiplying all universal buckets.
 * Non-applicable buckets contribute (1 + 0/100) = 1.0 and vanish.
 *
 * @param baseDamage  The absolute base damage (e.g., PsiIntensity * IntrinsicWeight, or Attack * 0.6)
 * @param buckets     The universal bucket registry (always UNIVERSAL_BUCKETS)
 * @param ctx         The resolution context for this damage event
 * @returns           Final damage value and per-bucket audit trail
 */
export function resolve(
    baseDamage: number,
    buckets: readonly BucketDef[],
    ctx: ResolutionContext
): { finalDamage: number; audit: Map<BucketId, number> } {
    let result = baseDamage;
    const audit = new Map<BucketId, number>();

    for (const bucket of buckets) {
        let sum = 0;

        for (const contributor of bucket.contributors) {
            if (evaluate(contributor.condition, ctx)) {
                sum += ctx.statValues.get(contributor.stat) ?? 0;
            }
        }

        const multiplier = 1 + (sum / 100);
        audit.set(bucket.id, multiplier);
        result *= multiplier;
    }

    return { finalDamage: result, audit };
}
```

That's it. The entire damage formula engine is:

```
FinalDMG = BaseDMG × PRODUCT(BucketMultiplier_i), for i = 1..N buckets
BucketMultiplier_i = 1 + (SUM(applicable_contributor_values) / 100)
```

---

## Crit Rate Resolution: Same Pattern

Crit/weakspot *roll determination* (whether a hit crits) uses the same `ContributorDef` pattern as a pre-resolution step. The resolved `wasCrit` / `wasWeakspot` booleans then feed into the `ResolutionContext` for the `HitAmplifier` bucket.

```typescript
/**
 * Crit rate contributors — same pure-data pattern.
 * Base weapon crit rate applies to ALL crit-eligible intents (bullets AND keyword procs).
 * Keyword-specific crit rate only applies when keyword matches AND keyword crit is unlocked.
 */
export const CRIT_RATE_CONTRIBUTORS: readonly ContributorDef[] = [
    // Base crit rate: always applies (to any crit-eligible intent)
    { stat: StatType.CritRatePercent, condition: { type: ConditionType.Always } },

    // Keyword-specific crit rate: only when that keyword's crit is unlocked
    // Example: Gilded Gloves unlock Burn crit and add +20% burn crit rate
    {
        stat: StatType.KeywordCritRatePercent,
        condition: {
            type: ConditionType.And,
            conditions: [
                { type: ConditionType.KeywordMatches, keyword: KeywordType.Burn },
                { type: ConditionType.KeywordCritUnlocked, keyword: KeywordType.Burn },
            ],
        },
    },
    // Additional keyword crit rate contributors would follow the same pattern
    // for FrostVortex, PowerSurge, etc. as gear is added to enable them.
];

/**
 * Roll crit using the same evaluate() function.
 * Returns the aggregated crit rate as a probability.
 */
export function resolveCritRate(contributors: readonly ContributorDef[], ctx: ResolutionContext): number {
    let sum = 0;
    for (const contributor of contributors) {
        if (evaluate(contributor.condition, ctx)) {
            sum += ctx.statValues.get(contributor.stat) ?? 0;
        }
    }
    return sum / 100;  // Convert percent to probability
}
```

---

## Rule Mutations: Separate Data Category

Not all gear effects feed stat pools. Some change the *shape* of the system. These are modeled as a separate data type.

```typescript
export enum MutationType {
    UnlockKeywordCrit       = 'unlock_keyword_crit',
    ModifyMaxStacks         = 'modify_max_stacks',
    ModifyTickFrequency     = 'modify_tick_frequency',
    ModifyTriggerChance     = 'modify_trigger_chance',
    ModifyTriggerHitCount   = 'modify_trigger_hit_count',
    UnlockKeywordWeakspot   = 'unlock_keyword_weakspot',
}

export type RuleMutation =
    | { readonly type: MutationType.UnlockKeywordCrit;     readonly keyword: KeywordType }
    | { readonly type: MutationType.ModifyMaxStacks;       readonly keyword: KeywordType; readonly delta: number }
    | { readonly type: MutationType.ModifyTickFrequency;   readonly keyword: KeywordType; readonly multiplier: number }
    | { readonly type: MutationType.ModifyTriggerChance;   readonly keyword: KeywordType; readonly delta: number }
    | { readonly type: MutationType.ModifyTriggerHitCount; readonly keyword: KeywordType; readonly delta: number }
    | { readonly type: MutationType.UnlockKeywordWeakspot; readonly keyword: KeywordType };
```

Rule mutations are applied during loadout compilation (before combat begins) and modify the `ResolutionContext`'s capabilities. For example, Gilded Gloves produce:

```typescript
const gildedGlovesMutations: RuleMutation[] = [
    { type: MutationType.UnlockKeywordCrit, keyword: KeywordType.Burn },
];
// Plus stat contributions: +20% KeywordCritRatePercent, +50% KeywordCritDamagePercent
```

---

## Three Categories of Gear Contribution

Every piece of gear decomposes into exactly three output categories:

| Category | What it produces | When it's consumed |
|---|---|---|
| **Stat Pool Contributions** | `Map<StatType, number>` additions | Aggregation phase — feeds into `ResolutionContext.statValues` |
| **Rule Mutations** | `RuleMutation[]` | Loadout compilation — modifies system capabilities before combat |
| **Dynamic/Conditional Modifiers** | Conditional stat changes (e.g., +5% Psi per burn stack) | Per-tick re-aggregation — stat values depend on live combat state |

Dynamic modifiers use the same `ContributorDef` pattern but are re-evaluated each tick against the current `CombatStateComponent`. The condition tree is expressive enough to model stack-dependent scaling:

```typescript
// Example: Mask effect "+5% PsiIntensity per Burn stack"
// This would be modeled as a dynamic modifier that runs during re-aggregation,
// checking current burn stack count and contributing (stackCount * 5) to PsiIntensity.
// The exact mechanism is a stat feed that runs during the aggregation system,
// not during damage resolution.
```

---

## Verification: The 113 Test

From the design doc: Corrosion Weapon (+15% Factor) with Mayfly Goggles (-30% Coefficient) at 267 Psi Intensity.

```
ResolutionContext:
  statValues: {
    PsiIntensity: 267,
    PowerSurgeDamageFactor: +15,    // from Corrosion weapon
    // Mayfly Coefficient mapped to same bucket: -30
    // Net in PowerSurgeFactor bucket: 15 + (-30) = -15
  }
  keywords: { PowerSurge }
  targetType: Normal
  wasCrit: false
  wasWeakspot: false

BaseDamage = 267 * 0.50  (PsiIntensity × IntrinsicWeight for Power Surge)
           = 133.5

Bucket resolution:
  PowerSurgeFactor:  1 + (-15 / 100) = 0.85   ← Factor + Coefficient additive
  All other buckets: 1.0                        ← No contributors apply

FinalDMG = 133.5 × 0.85 = 113.475 ✓
```

Matches the in-game observed value of **113**.

---

## Verification: Full Burn Build Trace

Loadout:
- mod1: +15% Elemental, +5% Status
- mod2: +5% Elite DMG
- weapon: 50% burn trigger, +20% Blaze Elemental, +5% Status, +15% Burn Factor, -2 max burn stacks, +100% burn tick freq
- gloves: unlock burn crit, burn crit rate +20%, burn crit dmg +50%
- mask: +5% psi per burn stack, +15% Burn Factor, +5% burn trigger chance

```
Pre-combat aggregated stats (at 3 burn stacks, 292 base Psi):
  PsiIntensity:            292 + (3 × 5% × 292) = 292 × 1.15 = ~335.8 (dynamic re-agg)
  → Simplified for trace:  307.05 (from previous calculation)
  ElementalDamagePercent:  15 + 20 = 35  (mod1 + weapon Blaze, ADDITIVE in same bucket)
  StatusDamagePercent:     5 + 5 = 10    (mod1 + weapon)
  BurnDamageFactor:        15 + 15 = 30  (weapon + mask, ADDITIVE in same bucket)
  DamageBonusElite:        5              (mod2, only if target is Elite)

BaseDamage = 307.05 × 0.12 (Burn IntrinsicWeight) = 36.846

Bucket resolution (vs Elite target, no crit, no weakspot):
  ElementalDamage:    1 + (35 / 100)  = 1.35
  StatusDamage:       1 + (10 / 100)  = 1.10
  BurnFactor:         1 + (30 / 100)  = 1.30
  TargetElite:        1 + (5 / 100)   = 1.05
  All other buckets:  1.0

FinalDMG = 36.846 × 1.35 × 1.10 × 1.30 × 1.05
         = 36.846 × 2.028 (approx)
         ≈ 74.7 per tick per stack

With Burn Crit (rate = base 5% + 20% burn-specific = 25%):
  HitAmplifier:   1 + (critDmg + burnCritDmg) / 100
                  e.g., 1 + (50 + 50) / 100 = 2.0
  FinalDMG_crit = 74.7 × 2.0 ≈ 149.4 per tick per stack
```

Compare against `RefinedResolutionStrategy` (WRONG — single additive bucket):

```
RefinedStrategy pools everything: 1 + (35 + 10 + 30 + 5) / 100 = 1.80
FinalDMG_refined = 36.846 × 1.80 = 66.3

Error: (74.7 - 66.3) / 74.7 = 11.2% underestimation
```

The universal bucket model correctly maintains separate multiplicative factors.

---

## Relationship to ADR-001

ADR-001's architectural recommendations (ECS-inspired, phase pipeline, World component store, seeded RNG, GameDataCompiler) remain valid. This ADR refines the **damage resolution layer** specifically:

| ADR-001 Concept | ADR-002 Replacement |
|---|---|
| `DamageResolutionStrategy` class hierarchy | `resolve()` pure function + `UNIVERSAL_BUCKETS` data |
| `MultiplierBucket` enum (6 values) | `BucketId` enum (21+ values — universal topology) |
| `TRAIT_TO_STAT_MAP` record | `ContributorDef[]` per bucket with `ContributionCondition` |
| `LegacyResolutionStrategy` / `RefinedResolutionStrategy` | Deleted — single `resolve()` function handles all cases |
| `DamageIntentComponent.bucketMultipliers: Map<MultiplierBucket, number>` | Audit trail from `resolve()` return: `Map<BucketId, number>` |

The phase pipeline from ADR-001 updates as follows:

```
bucketResolutionSystem → becomes a call to resolve(baseDmg, UNIVERSAL_BUCKETS, ctx)
critResolutionSystem   → becomes a pre-resolution call to resolveCritRate(CRIT_RATE_CONTRIBUTORS, ctx)
                         followed by RNG roll, then ctx.wasCrit feeds into HitAmplifier bucket
weakspotResolutionSystem → same pattern as crit
```

---

## Migration Path

### Phase 1: Enum + Type Foundation
1. Add `BucketId`, `ConditionType`, `ElementType`, `MutationType` enums to `types/enums.ts`.
2. Add `ContributionCondition`, `ContributorDef`, `BucketDef`, `ResolutionContext`, `RuleMutation` interfaces to a new `types/resolution.ts`.
3. Add missing `StatType` values: `PsiIntensityIncreasePercent`, per-element damage stats as needed.

### Phase 2: Registry + Resolver
4. Define `UNIVERSAL_BUCKETS` constant in `engine/bucket-registry.ts`.
5. Implement `evaluate()` and `resolve()` in `engine/resolver.ts`.
6. Implement `resolveCritRate()` alongside crit rate contributor definitions.

### Phase 3: Integration
7. Wire `resolve()` into the ECS phase pipeline's `bucketResolutionSystem`.
8. Update `DamageIntent` (or its ECS component equivalent) to carry `ResolutionContext` instead of ad-hoc trait sets.
9. Validate against "The 113 Test" and full burn build trace.

### Phase 4: Cleanup
10. Delete `DamageResolutionStrategy` interface and both implementing classes.
11. Delete `TRAIT_TO_STAT_MAP` — superseded by `UNIVERSAL_BUCKETS`.
12. Update `damage-formula-engine-abstraction.md` status to "Resolved by ADR-002".

---

## Open Questions

1. **"Ultimate DMG" bucket placement.** The Bible flags this as potentially distinct from "Final DMG Bonus." If they are separate multiplicative buckets, add a new `BucketId.UltimateDamage` with its own contributors. If they are the same, `BucketId.FinalDamage` absorbs both. The universal model handles either case — just add or don't add the bucket.

2. **Per-element stat granularity.** Currently `StatType.ElementalDamagePercent` is generic. If in-game, Blaze DMG% and Frost DMG% are distinct stats that happen to live in the same additive bucket, we'll need per-element `StatType` members. The `ContributionCondition` with `ConditionType.ElementMatches` already supports this — just add the stats.

3. **Dynamic stat re-aggregation frequency.** Effects like "+5% Psi per Burn stack" require re-aggregation of stat pools between ticks. The resolver itself is stateless, but the `ResolutionContext.statValues` must be rebuilt. This happens in the aggregation system, not in the resolver.

4. **Keyword-specific crit/weakspot DMG stats.** `StatType.KeywordCritDamagePercent` is currently a single generic stat. If different keywords can have independent crit DMG bonuses, per-keyword variants (`BurnCritDamagePercent`, etc.) will be needed. The `ContributorDef` condition pattern already supports routing these correctly.
