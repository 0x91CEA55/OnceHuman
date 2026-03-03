# Damage Formula Engine Abstraction

Every underlying damage formula in Once Human is well-known to follow linear polynomial form:

```
DMG = PRODUCT{Ci}, where Ci is any individual source constant, and i=1..n
```

Each Ci is derived from a DMG 'source', which can be loosely categorized as:
- Weapon
- Elemental (Blaze, Frost, Shock, Blast)
- Status
- Keyword (Power Surge, Burn, Frost Vortex, Unstable Bomber, Bounce, Shrapnel) 
   - Only these KWs are noted to have a "Factor" formula including a "DMG Factor Bonus" and a "Final DMG Bonus"
- Crit
- Weakspot
- Target (Enemy Type: Normal, Elite, Boss aka Great Ones)
- Final
- Ultimate??? (Translation error meaning "Final DMG Bonus"?)

All DMG values are known to follow a multiplicative factor approach to scale a BaseDMG value:
1. Attack = "damage dealth by a single bullet from ranged weapon or a single strike from melee weapon"
2. WeaponDMG = "direct damage dealth by attacking with weapons. Its base value is determined by Attack of the weapon. This is the main type of damage dealt when using a weapon DMG build.
1. Elemental builds have their KwDmg scale off PsiIntensity: 
    - `DMG = (KwIntrinsicScaling * PsiIntensity) * PRODUCT{PFi=2..n}`
2. Non-Elemental builds have their KwDmg scale off AttackDMG:
    - `DMG = (KwIntrinsicScaling * AttackDMG) * PRODUCT{PFi=2..n}`

The topology should be **pure data all the way down**. Buckets are data. Contributors are data. Conditions are data. One generic system evaluates everything. No lambdas in the registry.

```typescript
// === CONDITIONS: Pure declarative data, no functions ===

type ContributionCondition =
    | { type: 'always' }
    | { type: 'keyword_matches', keyword: KeywordType }
    | { type: 'element_matches', element: ElementType }
    | { type: 'target_type_matches', targetType: EnemyType }
    | { type: 'was_crit' }
    | { type: 'was_weakspot' }
    | { type: 'keyword_crit_unlocked', keyword: KeywordType }
    | { type: 'and', conditions: ContributionCondition[] }
    | { type: 'or', conditions: ContributionCondition[] }

// === CONTRIBUTORS: StatType + when it applies ===

interface ContributorDef {
    stat: StatType;
    condition: ContributionCondition;
}

// === BUCKETS: Named groups of additive contributors ===

interface BucketDef {
    id: string;
    contributors: ContributorDef[];
}
```

The full registry, defined once:

```typescript
const UNIVERSAL_BUCKETS: BucketDef[] = [

    // --- Psi Intensity Increase (mask: +5% per stack becomes a flat 15% written during aggregation) ---
    {
        id: 'psi_increase',
        contributors: [
            { stat: StatType.PsiIntensityBonusPercent, condition: { type: 'always' } },
        ]
    },

    // --- Keyword Factor (Factor + Coefficient, additive within) ---
    {
        id: 'keyword_factor',
        contributors: [
            { stat: StatType.BurnDamageFactor,           condition: { type: 'keyword_matches', keyword: KeywordType.Burn } },
            { stat: StatType.PowerSurgeDamageFactor,     condition: { type: 'keyword_matches', keyword: KeywordType.PowerSurge } },
            { stat: StatType.FrostVortexDamageFactor,    condition: { type: 'keyword_matches', keyword: KeywordType.FrostVortex } },
            { stat: StatType.ShrapnelDamageFactor,       condition: { type: 'keyword_matches', keyword: KeywordType.Shrapnel } },
            { stat: StatType.UnstableBomberDamageFactor, condition: { type: 'keyword_matches', keyword: KeywordType.UnstableBomber } },
            { stat: StatType.BounceDamageFactor,         condition: { type: 'keyword_matches', keyword: KeywordType.Bounce } },
        ]
    },

    // --- Status DMG ---
    {
        id: 'status_dmg',
        contributors: [
            { stat: StatType.StatusDamagePercent, condition: { type: 'always' } },
        ]
    },

    // --- Elemental DMG (umbrella + matching subdivision, additive together) ---
    {
        id: 'elemental_dmg',
        contributors: [
            { stat: StatType.ElementalDamagePercent, condition: { type: 'always' } },
            { stat: StatType.BlazeDmgPercent,        condition: { type: 'element_matches', element: ElementType.Blaze } },
            { stat: StatType.FrostDmgPercent,        condition: { type: 'element_matches', element: ElementType.Frost } },
            { stat: StatType.ShockDmgPercent,        condition: { type: 'element_matches', element: ElementType.Shock } },
        ]
    },

    // --- Weapon DMG ---
    {
        id: 'weapon_dmg',
        contributors: [
            { stat: StatType.WeaponDamagePercent, condition: { type: 'always' } },
        ]
    },

    // --- Attack ---
    {
        id: 'attack',
        contributors: [
            { stat: StatType.AttackPercent, condition: { type: 'always' } },
        ]
    },

    // --- Keyword Final (separate multiplicative layer from Factor) ---
    {
        id: 'keyword_final',
        contributors: [
            { stat: StatType.BurnFinalDamage,           condition: { type: 'keyword_matches', keyword: KeywordType.Burn } },
            { stat: StatType.PowerSurgeFinalDamage,     condition: { type: 'keyword_matches', keyword: KeywordType.PowerSurge } },
            { stat: StatType.FrostVortexFinalDamage,    condition: { type: 'keyword_matches', keyword: KeywordType.FrostVortex } },
            { stat: StatType.ShrapnelFinalDamage,       condition: { type: 'keyword_matches', keyword: KeywordType.Shrapnel } },
            { stat: StatType.UnstableBomberFinalDamage, condition: { type: 'keyword_matches', keyword: KeywordType.UnstableBomber } },
            { stat: StatType.BounceFinalDamage,         condition: { type: 'keyword_matches', keyword: KeywordType.Bounce } },
        ]
    },

    // --- Hit Amplifier (Crit DMG + Weakspot DMG, additive with each other!) ---
    {
        id: 'hit_amplifier',
        contributors: [
            // Base crit dmg — applies to ANY intent that critted
            { stat: StatType.CritDamagePercent, condition: { type: 'was_crit' } },
            // Base weakspot — applies to ANY intent that hit weakspot
            { stat: StatType.WeakspotDamagePercent, condition: { type: 'was_weakspot' } },
            // Keyword-specific crit dmg — only when BOTH crit happened AND keyword matches
            { stat: StatType.BurnCritDmg, condition: { type: 'and', conditions: [
                { type: 'was_crit' },
                { type: 'keyword_matches', keyword: KeywordType.Burn }
            ]}},
            { stat: StatType.PowerSurgeCritDmg, condition: { type: 'and', conditions: [
                { type: 'was_crit' },
                { type: 'keyword_matches', keyword: KeywordType.PowerSurge }
            ]}},
        ]
    },

    // --- Target Type ---
    {
        id: 'target_type',
        contributors: [
            { stat: StatType.DamageBonusNormal, condition: { type: 'target_type_matches', targetType: EnemyType.Normal } },
            { stat: StatType.DamageBonusElite,  condition: { type: 'target_type_matches', targetType: EnemyType.Elite } },
            { stat: StatType.DamageBonusBoss,   condition: { type: 'target_type_matches', targetType: EnemyType.Boss } },
        ]
    },

    // --- Vulnerability ---
    {
        id: 'vulnerability',
        contributors: [
            { stat: StatType.VulnerabilityPercent, condition: { type: 'always' } },
        ]
    },
];
```

And the entire resolution system is two tiny pure functions:

```typescript
// Condition evaluator — the ONLY place intent context is inspected
function evaluate(cond: ContributionCondition, ctx: IntentContext): boolean {
    switch (cond.type) {
        case 'always':                return true;
        case 'keyword_matches':       return ctx.keyword === cond.keyword;
        case 'element_matches':       return ctx.element === cond.element;
        case 'target_type_matches':   return ctx.targetType === cond.targetType;
        case 'was_crit':              return ctx.wasCrit;
        case 'was_weakspot':          return ctx.wasWeakspot;
        case 'keyword_crit_unlocked': return ctx.critUnlockedFor.has(cond.keyword);
        case 'and':                   return cond.conditions.every(c => evaluate(c, ctx));
        case 'or':                    return cond.conditions.some(c => evaluate(c, ctx));
    }
}

// Universal resolver — doesn't know what damage type it's resolving
function resolve(
    baseDamage: number,
    stats: PlayerStats,
    ctx: IntentContext,
    stacks: number = 1,
): number {
    let result = baseDamage;
    for (const bucket of UNIVERSAL_BUCKETS) {
        let sum = 0;
        for (const contrib of bucket.contributors) {
            if (evaluate(contrib.condition, ctx)) {
                sum += stats.get(contrib.stat) ?? 0;
            }
        }
        result *= (1 + sum / 100);  // sum=0 → 1.0 → vanishes
    }
    return result * stacks;
}
```

That's it. The resolver has no idea what Burn is, what an Elite is, what a crit is. It just evaluates data conditions and multiplies sums.

Now to your specific points:

**PsiIntensity as a bucket** — yes, exactly. The mask's "+5% per burn stack" doesn't need special pre-resolution handling. During aggregation (which re-runs before each tick), the system sees 3 burn stacks, calculates `5 * 3 = 15`, writes that to `StatType.PsiIntensityBonusPercent`. The `psi_increase` bucket picks it up as `(1 + 15/100) = 1.15`. The raw PsiIntensity value stays as the base. Same treatment as every other bucket. No special case.

**Crit rate decoupling** — totally feasible. The crit *roll* (happens before bucket resolution) uses the same `ContributorDef` pattern:

```typescript
const CRIT_RATE_CONTRIBUTORS: ContributorDef[] = [
    // Base crit rate — always participates in the roll for any crit-eligible intent
    { stat: StatType.CritRatePercent, condition: { type: 'always' } },

    // Burn crit rate — ONLY participates when intent is burn AND burn crit is unlocked
    { stat: StatType.BurnCritRate, condition: { type: 'and', conditions: [
        { type: 'keyword_matches', keyword: KeywordType.Burn },
        { type: 'keyword_crit_unlocked', keyword: KeywordType.Burn },
    ]}},

    // PS crit rate — same pattern
    { stat: StatType.PowerSurgeCritRate, condition: { type: 'and', conditions: [
        { type: 'keyword_matches', keyword: KeywordType.PowerSurge },
        { type: 'keyword_crit_unlocked', keyword: KeywordType.PowerSurge },
    ]}},
];
```

So for a **bullet intent** (no keyword): base CritRate of 8% is the only contributor that passes its condition. Burn and PS crit rates fail `keyword_matches` and contribute nothing.

For a **burn tick with Gilded Gloves**: base CritRate 8% passes (`always`), BurnCritRate 20% passes (keyword is Burn AND burn crit is unlocked), PS fails. Effective rate = 28%. The base crit rate automatically applies to both bullet and keyword contexts without duplication — it's one stat, one contributor, the `always` condition handles it.

The gloves' unlock mutation sets `critUnlockedFor.add(KeywordType.Burn)` on the intent context. Without gloves, that set is empty, the `keyword_crit_unlocked` condition fails, and burn crit rate contributes zero. The crit roll for a burn tick uses only base rate (which normally doesn't matter since `baseCritEligible` would be false for keywords without unlock — but that's another gate at the "should we even roll" level, not the pool level).

**The deeper question — can every game concept resolve to a numerical value universally?**

I think the answer is yes, with one key structural insight: there are exactly **two data flows** in the system, and everything maps to one of them:

1. **Stat contributions** → feed into pools → resolved by the universal bucket multiplier. This covers all damage math.

2. **Rule mutations** → modify the *shape* of the IntentContext before resolution. Things like "unlock burn crit" don't produce a number — they flip a boolean in `critUnlockedFor`. Things like "max burn stacks -2" don't affect damage per tick — they affect how many ticks exist. These are structural, not numerical.

Both are pure data. Both have the same `ContributionCondition` pattern for applicability. The difference is just *what they produce*: a number that sums into a pool, or a state mutation that changes what conditions evaluate to.

The only edge case I can still imagine is if the game introduces a mechanic where **a bucket's existence itself is conditional** — not "this bucket's sum is zero" but "this bucket should multiply differently" (like a bucket that divides instead of multiplies, or uses a different formula shape). But "product of sums" appears to be a universal invariant of the Once Human damage formula, so I don't think that's a real risk.

Want me to update the ADR now with this final model? The core of it is: universal bucket registry as pure data, `ContributionCondition` as the single abstraction for all context-sensitivity, and a resolver that's genuinely just a loop.

---

## Appendix A: Findings - Terminology Confusion & "The 113 Test" (2026-03-02)

During the visual audit, a significant ambiguity was identified regarding **"DMG Factor"** (found on weapons/generic mods) and **"DMG Coefficient"** (found on key armor like Mayfly/Gaston).

### The In-Game Verification
Testing a **Corrosion Weapon** (+15% Factor) with **Mayfly Goggles** (-30% Coefficient) at **267 Psi Intensity**:
- **Result**: 113 Damage.
- **Reverse Math**: `267 * 0.50 (Intrinsic) * (1 + 0.15 - 0.30) = 113.475`
- **Conclusion**: Despite different naming conventions, "Factor" and "Coefficient" are **additive with each other** within a single multiplicative bucket applied to the intrinsic keyword power.

### Gemini's Proposed Implementation: Tag-Based Aggregation
To handle this "Zero-Trust" environment where wording is inconsistent, I propose a **Tag-Based Resolution** strategy:
1.  **DamageIntent**: Carries "Facts" (e.g., `Intrinsic: 0.50`, `Traits: [PowerSurge, Shock, Status]`).
2.  **ResolutionStrategy**: Categorizes traits into three interaction layers:
    - **Base**: `SourceStat * IntrinsicWeight`
    - **Additive Bucket**: `1 + Sum(StatModifiers)` (Where Factor and Coefficient live).
    - **Multiplicative Bucket**: `Product(FinalModifiers)` (Where Final and Ultimate live).

---

## User Note: Pending Alternative Abstraction
The user has proposed that an "even cleaner abstraction" exists and will provide a counter-proposal/alternative design. 

**STATUS**: Awaiting user's alternative design for review before finalizing the `DamageResolutionStrategy` internals.
