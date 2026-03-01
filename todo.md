# OnceHuman — Action Items

## Phase 1: Core Damage Engine (Completed ✅)

- [x] **Stat Aggregator**
  - [x] Base Weapon stats
  - [x] Armor base stats (Psi Intensity)
  - [x] Mod effects (stat increases, flags)
  - [x] Armor set bonuses
- [x] **Damage Pipelines**
  - [x] `PhysicalDamagePipeline` (Bullet damage, Attack/Weapon Damage buckets)
  - [x] `KeywordDamagePipeline` (Status/Elemental procs, Psi Intensity scaling)
  - [x] Additive Crit + Weakspot logic verified
- [x] **Unit Testing**
  - [x] Stat aggregation tests
  - [x] Damage pipeline math verification
  - [x] Flag-based logic (e.g., Fateful Strike)

## Phase 2: React UI & Planner (Completed ✅)

- [x] **Scaffold React Frontend** (Vite + TS + Vanilla CSS)
- [x] **Build Planner Component**
  - [x] Weapon Selection
  - [x] Armor Slot Selection
  - [x] Mod Selection for each piece
  - [x] Stat readout with hierarchical breakdown
- [x] **Diagnostic Console**
  - [x] `AuditLog` calculation traces
  - [x] Visual console for engine logic
- [x] **Damage Dashboard**
  - [x] Physical and Keyword damage profiles
  - [x] Estimated DPS calculation
- [x] **Encounter Conditions**
  - [x] Adjustable Enemy Type, Weakspot Rate, Distance, Vulnerability

## Phase 2.5: Domain Model & Mod Refactoring (Completed ✅)

- [x] **Mod Substats System**
  - [x] Update `Mod` interface to enforce exactly 4 substats.
  - [x] Implement `Substat` entity with tiered values (White 1 to Gold 5).
  - [x] Update `Mod` UI to allow selecting substats and their tiers.
- [x] **Damage Formula Clarification**
  - [x] Update `PhysicalDamagePipeline` and `KeywordDamagePipeline` to explicitly follow bucket definitions.
  - [x] Add audit logging to pipelines for transparent calculation tracing.
- [x] **Effect System Foundation**
  - [x] Refactor `Effect` union into `BaseEffect` and `Buff` classes.
  - [x] Implement `Trigger` and `Condition` hierarchy.

## Phase 3: Reactive Event Loop & Monte Carlo (Completed ✅)

- [x] **Event-Driven Combat Architecture**
  - [x] Centralized `CombatEventBus` with deep-proc safety.
  - [x] Polymorphic `DamageIntent` modeling status/elemental traits.
  - [x] Authoritative `Entity` models (Player, Enemy) owning their state.
- [x] **Temporal Simulation Sophistication**
  - [x] `StatusManager` for localized Buff/DoT tracking with precise timers.
  - [x] Complex interactions verified (e.g., KVD Boom Boom Burn + Explosions).
- [x] **Monte Carlo Analytics**
  - [x] 500-iteration macro-engine for probabilistic outcomes.
  - [x] Scrubber-enabled temporal HUD synchronization.
  - [x] Integrated Recharts for Variance/Timeline analytics.

## Phase 4: High-Density Diegetic UI (Current 🏗️)

- [ ] **Strike 1: Telemetry Tracks (Data Layer)**
  - [ ] Implement array buffering in `DamageEngine` to track 22-stat history over the duration of the mag dump.
  - [ ] Expose normalized telemetry traces for frontend ingestion.
- [ ] **Strike 2: Micro-Pulse Attribute HUD (Visual Layer)**
  - [ ] Build `<MicroPulse />` Sparkline components adjacent to all 22 HUD stats.
  - [ ] Animate sparklines to reflect the `Telemetry Tracks` arrays, providing visual feedback of combat variance and buff uptimes.
  - [ ] Implement "Glitch/Noise" CSS indicators for stats hitting theoretical saturation limits.
- [ ] **Strike 3: Tactical Loadout Carousel (UX Layer)**
  - [ ] Refactor left-column inputs from a scrolling list to a focused "Carousel" hub.
  - [ ] Design active item "Technical Schematic" view with diegetic callout lines.
- [ ] **Strike 4: Combat Terminal Footer**
  - [ ] Integrate a scrolling `[SIM_TR]` terminal ticker at the bottom of the viewport streaming raw events from the EventBus.

## Pending Features / Technical Debt

- [ ] **Data Library**
  - [ ] Populate JSON/Constant files with actual game data (Weapons, Armor, Mods, Substats).
- [ ] **Save/Load Builds**
  - [ ] URL-based build sharing or LocalStorage persistence.

## Assumptions & Known Flaws (To Be Validated)
- We assume Attack Damage and Weapon Damage are additive within the same base bucket until empirically disproven.
- Status Damage and Elemental Damage are multiplicative against each other, but additive internally.
