# ADR-004: High-Fidelity Domain Materialization & Time-Series DPS Simulation

**Status:** Proposed
**Date:** 2026-03-05
**Deciders:** Tatum (Project Lead), Gemini CLI
**Informed:** OnceHuman Community

---

## Context

The simulator has achieved architectural purity (ADR-001/002/003). Now, we must "materialize" the game's actual complexity—specifically the Burn build archetype—and implement a high-fidelity DPS simulation engine that moves beyond static damage totals into time-series analysis.

## Decision: Domain Materialization (Burn Build)

We will implement the following items based on the "In-Game Knowledge Bible":

1.  **Armor Sets & Uniques**:
    *   **Savior Set**: Implements HP-to-Shield conversion and "While Shielded" damage scaling.
    *   **Treacherous Set**: Implements Sanity-based scaling (Sanity drop = Damage increase).
    *   **Gilded Gloves**: Critical component unlocking "Burn Crit" (Mapping character Crit stats to DoT ticks).
    *   **BBQ Gloves**: Burn frequency scaling.
2.  **Complex Mods**:
    *   **Momentum Up**: Magazine-position dependent stat scaling (First 50% vs Second 50%).
    *   **Deviation Expert**: Range-gated trade-offs (Fire Rate vs Range).
    *   **Fateful Strike**: Absolute trait disabling (No Weakspot) in exchange for high Crit.
    *   **Elemental Resonance**: Cross-magazine persistence (Stat bonus based on previous mag's performance).
    *   **Rush Hour**: Health-missing-percent scaling.
3.  **Weapon Logic**:
    *   **Octopus (MPS7 - Outer Space)**: Lightning summoning triggers and Power Surge interactions.

## Decision: High-Fidelity DPS Simulation

We will transition the simulation from "Mag Dump Total" to "Running Time-Series DPS".

1.  **Windowed DPS**: Implementation of a sliding window (e.g., 1s or 5s) to calculate "Burst" vs "Sustained" DPS.
2.  **Telemetry Expansion**: Every simulation tick will record:
    *   `cumulativeDamage`: Total damage dealt since $t=0$.
    *   `instantaneousDPS`: Damage in the last $dt$.
    *   `runningAverageDPS`: `cumulativeDamage / current_time`.
3.  **Monte Carlo Aggregation**: The Monte Carlo engine will now return the *mean trajectory* of DPS over time, allowing for visual identification of damage ramp-up and fall-off.

## Decision: Data-Driven Extension (ADR-002 Alignment)

*   **Roll Registry**: Expanded to include `BurnCrit` roll.
*   **Bucket Registry**: Explicit `BurnFactor` and `BurnFinal` buckets are already in place; we will now ensure all mod/set bonuses route to these or the broad `StatusDamage` bucket.
*   **Context Flags**: Introduction of flags like `isShielded`, `sanityTier`, `isFirstHalfOfMag`.

## Consequences

*   **Complexity**: `StatAggregator` and `DamageEngine` will need to handle more temporal state.
*   **UI Performance**: More telemetry data points per simulation run.
*   **Fidelity**: The simulator will now accurately reflect "Ramp-up" builds (like Burn/Momentum) compared to "Front-loaded" builds.
