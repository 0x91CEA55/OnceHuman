# Architectural Audit Report: 2090 Tactical Refinement

**Date:** February 28, 2026
**Status:** In Progress (Post-Diegetic Overhaul)

## 1. Compliance Scorecard

| Principle | Status | Notes |
|---|---|---|
| **Polymorphism Over Imperative** | ⚠️ Partial | Imperative if/else chains remain in `DamageProcessor` and `StatusManager`. |
| **Authoritative Domain Models** | ✅ Solid | Entities, Equipment, and Effects are class-based with internal logic. |
| **Rigorous Type Safety** | ⚠️ Partial | `any` escapes exist in `CombatContext` and `DamageEngine` logs. |
| **Context Encapsulation** | ✅ Good | `CombatContext` and `AggregationContext` are well-utilized. |
| **Clean Delegation** | ⚠️ Partial | `StatusManager` still handles DoT damage math imperatively. |
| **Purge Primitive Obsession** | ✅ Good | Enums are used for most indexing, though status IDs remain strings. |

---

## 2. High-Priority Violations

### 2.1 Imperative Keyword Scaling (`DamageProcessor.ts`)
The `DamageProcessor.resolve` method contains an `if/else` chain mapping `DamageTrait` to `StatType` multipliers.
- **Violation:** Principle 1 (Polymorphism Over Imperative Logic).
- **Proposed Fix:** Use a static registry or a `Map<DamageTrait, StatType>` to resolve trait-based multipliers.
  - Tatum's note: intent.getTraits().map(trait -> source.stats.get(Traits[trait.Key].statType)) with TraitKey similar to our Mods + ModKey enum sounds robust, thoughts? Ideally should not be so many if conditionals in DamageProcessor. Also added a note comment in that class, there seems to be some double dipping.

### 2.2 Hardcoded DoT Damage Math (`StatusManager.ts`)
The `StatusManager.tick` method hardcodes the base damage formula for `status-burn` and `status-vortex`.
- **Violation:** Principle 5 (Clean Delegation).
- **Proposed Fix:** Delegate the creation of the `DamageIntent` to the `ActiveDoT` or `DoTEffect` class. The Manager should only coordinate the timing.
    - Tatum's note: Agreed, please ensure The ActiveDoT or DoTEffect are truly the best spot too.

### 2.3 Type Safety Leaks (`CombatContext` & `DamageEngine`)
Multiple `any` casts exist to handle circular dependencies or complex log serialization.
- **Violation:** Principle 3 (Rigorous Type Safety).
- **Proposed Fix:** 
    - Move common interfaces to a `types/` layer to resolve circularity.
    - Implement a `toSnapshot()` method on all stateful objects for clean serialization without `any`.
    - Tatum's note: Don't hesitate to shuffle types around, the current layout is completely optional. Whatever makes the most architectural sense, please go ahead. 

### 2.4 Keyword Factory Switch (`weapons.ts`)
The `getKeywordInstance` function uses a `switch` statement to instantiate Keywords.
- **Violation:** Principle 1 (Polymorphism Over Imperative Logic).
- **Proposed Fix:** Use a registry of constructors mapped to the `KeywordType` enum.
    - Tatum's note: Record<[KeywordType], keywordConstructor> sounds good. But btw, why are NONE of the getExpectedProcsPerShot used? WHat even is this method meant for? A shot can have more than one proc when? When there's mutliple projectiles per shot? Or?

---

## 3. Transfer from Gestalt Review (Historical)

The following historical concerns from `gestalt-review.md` have been fully addressed:
- **Base vs Combat Stats:** Resolved via `StatAggregator` and `CombatState`.
- **Mod Substat System:** Resolved via `Substat` entity and 4-slot enforcement.
- **Monte Carlo Integration:** Resolved via Async 500-iteration engine.
- **Multiplier Buckets:** Resolved via `DamageProcessor` trait-based system.

---

## 4. Actionable Refinement Roadmap

1.  **Refactor `StatusManager`**: Move DoT damage logic into `ActiveDoT.resolveTickDamage(ctx)`.
2.  **Refactor `DamageProcessor`**: Replace keyword `if/else` with a trait-multiplier registry.
3.  **Harden Type Safety**: Eliminate `any` from `CombatContext` and `SimulationLogEntry`.
4.  **Register-Based Factory**: Convert `getKeywordInstance` to a polymorphic registry.
