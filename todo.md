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

## Phase 3: Event Loop Simulator (Current 🏗️)

- [ ] **Keyword Logic Migration**
  - [ ] Refactor `Keyword` model to use `TriggeredEffect` instead of `getExpectedProcsPerShot`.
  - [ ] Implement `OnWeakspotHitTrigger` and `EveryNShotsTrigger` (for Jaws/Unstable Bomber).
  - [ ] Transition Shrapnel to a discrete event trigger (4% chance on hit).
- [ ] **Temporal Simulation Sophistication**
  - [ ] Implement DoT (Damage Over Time) Manager in `DamageEngine`.
    - [ ] Track independent instances/stacks of DoTs with their own expiry and tick timers.
    - [ ] Support stacking logic (e.g. Burn stacks increasing damage or refreshing duration).
  - [ ] Model "Boom Boom" Burn & Explosion:
    - [ ] 12% Psi scaling Burn DoT (ticks every 0.5s).
    - [ ] Explosion trigger (e.g. on kill or stack threshold).
    - [ ] Stacking interaction: Verify if stacks tick independently or sum into one damage event.
  - [ ] Implement `until_next_reload` buff duration logic.
- [ ] **Monte Carlo & Performance**
  - [ ] Move Monte Carlo execution to a Web Worker.
  - [ ] Display damage over time graph (Recharts).
  - [ ] Provide "Simulated vs Deterministic" DPS comparison UI.

## Pending Features / Technical Debt

- [ ] **Accuracy Audit:** Compare `weapon_list.json` mechanics against `Keyword` subclasses to ensure all triggers (e.g. `on_mag_empty`) are modeled.
- [ ] **Data Library:** Populate actual game data for all weapons/armor.

## Pending Features / Technical Debt

- [ ] **Data Library**
  - [ ] Populate JSON/Constant files with actual game data (Weapons, Armor, Mods, Substats).
- [ ] **Save/Load Builds**
  - [ ] URL-based build sharing or LocalStorage persistence.

## Assumptions & Known Flaws (To Be Validated)
- We assume Attack Damage and Weapon Damage are additive within the same base bucket until empirically disproven.
- Status Damage and Elemental Damage are multiplicative against each other, but additive internally.
