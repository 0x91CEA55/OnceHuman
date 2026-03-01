# Data Ingestion Gap Analysis: Current Engine vs. In-Game Reality

## Executive Summary
Our current "Reactive Lifecycle Engine" is structurally sound but suffers from **Primitive Obsession** and **Logic Under-Delegation** when compared to the complex interactions documented in `raw.json`. To ingest actual game data, we must move from a single-multiplier model to a **Bucket-Aware Resolution** model.

## 1. Multi-Bucket Keyword Damage (Factor vs. Final)
**The Gap:** Our `DamageIntent` currently treats multipliers as a flat list or simple buckets. In-game keywords (Shrapnel, Burn, Vortex) use two distinct multiplicative buckets: **Factor** (Additive) and **Final** (Multiplicative with Factor).
*   **Current:** `Base * Multipliers`
*   **In-Game:** `Base * (1 + Sum(Factor)) * (1 + Sum(Final)) * (1 + Sum(Elemental/Status))`
*   **Audit Directive:** Refactor `DamageIntent` to support explicit Bucket types that resolve according to the `damage_formula_system` in `raw.json`.

## 2. Dynamic & Conditional Multi-Stage Effects
**The Gap:** `raw.json` reveals effects that change behavior based on simulation state (e.g., `Momentum Up`: "First 50% of mag: Fire Rate +10%, Next 50%: Weapon DMG +30%").
*   **Current:** Effects are mostly static attribute modifiers.
*   **The Audit Solution:** Move from `StaticAttributeEffect` to `StateAwareEffect`. Effects must be able to inspect `CombatContext` (specifically `player.weapon.currentMag / player.weapon.maxMag`) during every tick or event.

## 3. Trigger Complexity (Counters & State)
**The Gap:** Weapons like *KVD: Boom Boom* or *DE.50: Jaws* use hit counters that interact with Crits (e.g., "Crit counts as 2 hits").
*   **Current:** Triggers are simple `Math.random()` checks.
*   **The Audit Solution:** Introduce **Stateful Triggers**. A trigger should not just be a condition; it should be a domain model that can maintain its own internal counter (e.g., `HitCounterTrigger`).

## 4. Entity Topology & AoE Propagation
**The Gap:** `ExplosionEffect` currently uses a placeholder `getNearbyTargets`. `raw.json` defines specific radii and decay for keywords like *Frost Vortex* and *Unstable Bomber*.
*   **Current:** `EncounterTopology` is an Enum, but lacks spatial logic.
*   **The Audit Solution:** Implement a `SpatialResolver` within the `CombatContext` that uses the `EncounterTopology` to return actual `Entity` instances with distance-based damage falloff.

## 5. Implementation Strategy (The Audit Lens)

### Step A: Bucket-Aware Resolution
Abolish `intent.addMultiplier(value)`. Replace with:
```typescript
intent.addFactor(StatType.ShrapnelDamageFactor, 0.15);
intent.addFinal(StatType.ShrapnelFinalDamage, 0.25);
```

### Step B: Recursive Trigger Decoration
Instead of `if (isCrit) hits += 2`, use a **Trigger Decorator** pattern where a `CritHitBonusTrigger` wraps a `HitCounterTrigger`.

### Step C: Contextual Effect Resolution
Update `BaseEffect.onApply` to receive the full `CombatContext`, allowing effects to register "Watchers" on the player's magazine or HP state.

## Conclusion
We are **70% of the way there**. The architectural foundation (Event Bus + Damage Intent) is correct. The remaining 30% is moving the "Smart Logic" out of the engine and into the **Effect Classes** themselves, fulfilling the mandate of **Polymorphism Over Imperative Logic**.
