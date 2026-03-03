# OnceHuman Simulator — Technical Architecture Snapshot

## Core Philosophy
The Once Human Simulator is a **Reactive Combat Theorycrafting Engine** designed to model complex weapon interactions with high fidelity. Unlike standard "calculator" tools, it uses an **Asynchronous Monte Carlo Engine** and an **Event-Driven Domain Model** to simulate probabilistic combat outcomes (procs, stacks, and luck variance).

---

## 1. Tactical Architecture (The Engine)

### Authoritative Domain Models
Logic is encapsulated within instantiated classes rather than loose data objects.
- **Entities (Player/Enemy):** Stateful actors that own their own `StatusManager` and `Attribute HUD` snapshots.
- **Equipment (Weapon/Armor/Mod):** Implements the **Strategy Pattern**. Each piece of gear is responsible for applying its own static bonuses and registering its own dynamic triggers.
- **Mods:** Enforce a strict schema (exactly 4 tiered substats) and provide polymorphic lifecycle hooks.

### Reactive Event Loop (`CombatEventBus`)
Combat is modeled as a stream of events (`OnHit`, `OnCrit`, `OnKill`, `OnProc`).
- **Decoupled Logic:** Weapons and Keywords do not call each other. They subscribe to the `EventBus` and react independently.
- **Recursive Safety:** Employs **Categorical Proc Gating** and **Proc Coefficients** (e.g., Proc A has a 0.0 coefficient to prevent triggering Proc B), eliminating infinite recursion risks without hardcoded depth limits.

### Polymorphic Damage Intent
Damage is not a single number but a **DamageIntent** object.
- **Trait-Based Identity:** Every damage instance carries multiple traits (e.g., `[Status, Elemental, Burn, Explosive]`).
- **Bucket-Based Resolution:** The `DamageProcessor` acts as a visitor, matching intent traits against the player's statistical "Multiplier Buckets" (Status, Elemental, Weapon, etc.) to resolve final damage in a single, type-safe pass.
- **Dynamic Capabilities:** Conditional effects (like Gilded Gauntlets) can intercept intents to dynamically enable behaviors like `KeywordCrit` or `KeywordWeakspot`.

---

## 2. Statistical Simulation (The Analytics)

### Async Monte Carlo Engine
To prevent UI blocking during complex simulations, the engine employs a **Non-Blocking Chunked Processor**.
- **Probabilistic Verification:** Executes 500+ iterations per "Run" to generate statistical distributions (Mean, StdDev, Min/Max Luck).
- **Statistical Telemetry:** Samples all 22 combat attributes every 0.1s across all iterations to create **Mean Waveforms** and **Variance Clouds**.

### High-Fidelity Time-Slicing
The simulation pre-calculates a complete mag-dump timeline.
- **Scrubber Synchronization:** A reactive timeline slider allows users to view the **exact state** of the combat terminal (Stats, Buffs, DoT timers) at any microsecond (`T+X.XXs`).
- **State Isolation:** Simulations run on cloned entity instances to ensure the "Pilot" (UI Base State) remains pure and unpolluted.

---

## 3. Diegetic User Interface (The HUD)

### High-Density Tactical Console
The UI follows a **Diegetic "2090 Tactical" Aesthetic** designed for horizontal real estate.
- **3-Column "Command Center":** 
    - **Pilot (Inputs):** Compact, hardware-calibration style encounter and gear selection.
    - **HUD (Attribute Matrix):** A 3-column real-time telemetry readout of all 22 stats.
    - **Analytics (Results):** Visual waveform charts and luck-distribution histograms.
- **Diegetic Framing:** Replaced standard web borders with technical `DiegeticFrame` components featuring corner brackets, radial grids, and glass backdrops.

### Real-Time Telemetry Visualization
- **MicroPulse Sparklines:** Every stat in the HUD features an SVG sparkline showing its statistical average and "Luck Cloud" (variance) over the mag dump.
- **Diegetic Glitch FX:** Automated detection of "Theoretical Saturation" (diminishing returns). Row backgrounds flicker and glow red if a stat is stacked inefficiently.
- **Terminal Footer:** A fixed marquee ticker streaming live `[SIM_TR]` combat events from the reactive bus.

---

## 4. Technical Summary for LLMs

| Component | Pattern / Implementation |
|---|---|
| **Core Loop** | Asynchronous Event Bus (Pub/Sub) |
| **Math Engine** | Multiplier Bucket Processor (Visitor Pattern) |
| **Logic Injection** | Strategy Pattern (Mod/Weapon subclasses) |
| **State Sync** | Time-sliced Serialized Snapshots |
| **UI Rendering** | Reactive HUD with SVG Micro-Telemetry |
| **Persistence** | LocalStorage + JSON Schema Export (Pending) |

This architecture ensures that adding a new complex weapon (like KVD Boom Boom) or a specific mod interaction (like Embers) is a matter of adding a new strategy class rather than modifying the core damage pipeline.
