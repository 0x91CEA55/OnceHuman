# Damage Formula Engine Abstraction

Every underlying damage formula in Once Human is well-known to follow linear polynomial form:

```
DMG = PRODUCT{Ci}, where Ci is any individual source constant, and i=1..n
```

Each Ci is derived from a DMG 'source', which can be loosely categorized as:
- Weapon
- Elemental (Blaze, Frost, Shock, Blast)
- Status
- Keyword (Power Surge, Burn, Frost Vortex, Unstable Bomber, Bounce, Shrapnel) <- Only these KWs are noted to have a "Factor" formula including a "DMG Factor Bonus" and a "Final DMG Bonus"
- Crit
- Weakspot
- Target (Enemy Type: Normal, Elite, Boss aka Great Ones)
- Final
- Ultimate??? (Translation error meaning "Final DMG Bonus"?)

All DMG values are known to follow a multiplicative factor approach to scale a BaseDMG value:
1. Attack = "damage dealth by a single bullet from ranged weapon or a single strike from melee weapon"
2. WeaponDMG = "direct damage dealth by attacking with weapons. Its base value is determined by Attack of the weapon. This is the main type of damage dealt when using a weapon DMG build.
1. Elemental builds scale off PsiIntensity: DMG = (0.12 * PsiIntensity) * PRODUCT{Ci=2..n}
2. Non-Elemental builds scale off Weapon DMG: DMG = (0.6 * AttackDMG) * PRODUCT{Ci=2..n}

---

## Findings: Terminology Confusion & "The 113 Test" (2026-03-02)

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
