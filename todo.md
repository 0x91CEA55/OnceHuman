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

## Phase 3: Event Loop Simulator (Current 🏗️)

- [ ] **Time-Series Simulation**
  - [ ] Implement `DamageEngine` loop (per-shot events)
  - [ ] Handle dynamic buff stacking (e.g., Lonewolf stacks on crit)
  - [ ] Handle time-decaying effects
- [ ] **Monte Carlo Visualization**
  - [ ] Display damage over time graph (Recharts or similar)
  - [ ] Compare deterministic vs. simulated DPS
- [ ] **Data Engine Integration**
  - [ ] Hook UI state into `StatAggregator` and `DamagePipelines`
  - [ ] Dynamic updates on selection change

## Pending Features / Technical Debt

- [ ] **Event Loop Simulator**
  - [ ] Implement `DamageEngine` for full mag-dump simulation
  - [ ] Handle `OnEvent` triggers (e.g., stacks on hit)
- [ ] **Data Library**
  - [ ] Populate JSON/Constant files with actual game data (Weapons, Armor, Mods)
- [ ] **Save/Load Builds**
  - [ ] URL-based build sharing or LocalStorage persistence
