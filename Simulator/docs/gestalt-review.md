# Gestalt Review & Architecture Analysis

**Date:** February 28, 2026
**Focus:** Domain Model, Calculation Engine, UI-Engine Interaction, and Mod Substat System.

## 1. Executive Summary
This document provides a holistic, skeptical review of the Once Human DPS Simulator's current foundation. While the initial React scaffolding and static aggregation systems provide a functional "calculator" phase, the underlying domain models and engine abstractions are insufficient to support the ultimate goal: a robust, time-series Event Loop Simulator (Phase 3). 

A major shift in how we handle temporal state, effect conditionals, and equipment schemas (specifically Mods) is required before we build further.

## 2. Domain Model Critique

### 2.1 The `Stat` Hierarchy and Aggregation
- **Observation:** Currently, `StatAggregator` processes all equipment and spits out static `PlayerStats`. 
- **Flaw:** This ignores conditional and temporal effects. For example, *Fast Gunner* grants +1% Attack per stack on hit. A static aggregator cannot represent this. 
- **Resolution:** The domain model must differentiate between **Base Stats** (from equipment) and **Combat State Stats** (which fluctuate frame-by-frame or shot-by-shot based on active buffs/debuffs).

### 2.2 The `Effect` System
- **Observation:** `Effect` is modeled as a discriminated union (`IncreaseStatEffect`, `SetFlagEffect`, `OnEventEffect`). 
- **Flaw:** The current implementation doesn't execute `OnEventEffect`. Furthermore, effects like "Burn" are not just stat increases; they are DOT (Damage Over Time) objects that require an event loop to tick every 0.5s.
- **Resolution:** We need a formal `Buff` / `Debuff` / `StatusEffect` system. When an event fires (e.g., `OnHit`), it should add a `StatusEffect` to a `Target` or `Player` entity, which has its own `duration`, `tickRate`, and `maxStacks`.

### 2.3 Equipment Schema: Mod Substats
- **Observation:** Mods currently have a trivial `subStats` array.
- **Missing Mechanic:** In Once Human, Mod "Attribute Effects" (substats) have tiers representing point values:
  - **White (Common):** 1 pt
  - **Green (Uncommon):** 2 pts
  - **Blue (Rare):** 3 pts
  - **Purple (Epic):** 4 pts
  - **Gold (Legendary):** 5 pts
  - A legendary mod drops with 4 substats (often totaling level 12) and can be upgraded 5 times (max theoretical level 17). 
- **Resolution:** 
  - Update `Mod` schema to strictly enforce exactly 4 substats.
  - Create a `Substat` entity that holds `type` (e.g., Crit DMG, Weapon DMG, Elemental DMG, DMG vs Elite) and `tier` (1 to 5).
  - The calculation engine will use lookup tables to convert `[StatType, Tier]` into the actual numerical bonus added to the player's base stats.

## 3. Calculation Engine Critique

### 3.1 Static Formulas vs. Monte Carlo
- **Observation:** The `DamageDashboard` relies entirely on `PhysicalDamagePipeline.calculate` which returns an `expected` mathematical average.
- **Flaw:** Mathematical averages are inaccurate for complex procs. For example, *Shrapnel* has a 4% base chance, but crits count as two hits. If you shoot 30 rounds, the timing of the Shrapnel procs and whether they align with external buffs (like a 3-second *Precise Strike* buff) alters the DPS non-linearly.
- **Resolution:** The static calculation is good for a quick "paper DPS" readout, but we must fully commit to the `DamageEngine.simulateMagDump()` event loop. The `DamageEngine` should emit a timeline of events (shots fired, crits, weakspot hits, procs, DOT ticks), which we then sum up to calculate true DPS.

### 3.2 Damage Multiplier Buckets
- **Observation:** The user correctly identified ambiguities in the design docs regarding multiplicative vs additive buckets. 
- **Flaw:** If Attack% and Weapon DMG% are additive within the same bucket, multiplying them separately inflates the damage exponentially. Furthermore, Elemental/Status procs scale via Psi Intensity but ignore Attack/Weapon DMG bonuses, whereas Physical Keywords (like Shrapnel) *do* scale with Attack/Weapon DMG.
- **Resolution:** 
  - Explicitly hardcode the buckets based on the formulas in `design-high-level.md`.
  - Introduce `DamageContext` that specifies if the current calculation is for a Bullet, a Physical Keyword Proc, or an Elemental Keyword Proc. The pipeline should conditionally include/exclude multiplier buckets based on this context.

## 4. UI & Architecture Observations

### 4.1 React State & Performance
- **Observation:** Re-rendering the dashboard on every selection change is fast now because it's O(1) math. 
- **Flaw:** Once we replace the math with a 10,000-iteration Monte Carlo simulation, the UI will freeze on every dropdown change.
- **Resolution:** Simulation execution must be moved to a Web Worker, or we must provide a "Run Simulation" button rather than relying on `useMemo` for heavy lifting. The static math can remain real-time.

### 4.2 Mod UI Deficiencies
- **Observation:** The `EquipmentSlot` UI allows selecting a named mod, but no substats.
- **Resolution:** The UI must be expanded to include 4 dropdowns for substats per mod, alongside a "Tier" selector (1-5) or a visual "Upgrade" mechanism that mimics the in-game UI. 

## 5. Actionable Next Steps (TODO cross-reference)

1. **Refactor `Mod` Domain Model:** Introduce `Substat` class/interface with Tier tracking and numerical lookup tables. *(Prerequisite for accurate stats)*
2. **Clarify Damage Formula Buckets:** Update `PhysicalDamagePipeline` and `KeywordDamagePipeline` to explicitly use the bucket definitions from the new `design-high-level.md` diff. 
3. **Draft the Event Loop (`DamageEngine`):** Build the state machine that handles `tick()`, `fire()`, `applyBuff()`, and tracking `time`.
4. **Web Worker Integration:** Setup a basic worker for the `DamageEngine` so the UI doesn't block during Phase 3.
5. **UI Enhancement:** Build the `ModSubstatSelector` UI component.

---
*Assumptions Made:*
- We assume Attack Damage and Weapon Damage are additive within the same base bucket until empirically disproven.
- We assume Status Damage and Elemental Damage are multiplicative against each other, but additive internally if multiple sources exist.
- For Phase 2/3 transition, we will support both a "Static Estimate" (what we have now) and a "Simulated DPS" (Monte Carlo output).