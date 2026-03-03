# ADR-001: Combat Simulation Engine — Architectural Pattern Selection

**Status:** Proposed
**Date:** 2026-03-03
**Deciders:** Tatum (Project Lead), Contributors

---

## Context

The Once Human Simulator is a **combat theorycrafting engine** that must faithfully model AAA RPG/MMO damage resolution: stacking buffs, probabilistic procs, compound keyword interactions, DoT ticking, cooldown gating, conditional triggers, and multiplicative bucket math. The current codebase (v0.1.0) has been through significant refactors and has arrived at a hybrid OOP architecture that blends Strategy, Visitor, and Pub/Sub patterns. The team is hitting friction points around:

1. **Tight coupling between domain models and engine logic.** `ActiveDoT` and `ShrapnelEffect` instantiate their own `DamageProcessor` internally. `CombatContext` carries `eventBus: any` to dodge circular deps. `AggregationContext` uses `player: any` and `loadout: any` for the same reason.

2. **God-object tendencies.** `DamageEngine` owns the sim loop, event wiring, telemetry sampling, logging, context factory, time advancement, and Monte Carlo orchestration — all in one 292-line class. `Player` is both an Entity and a stat container and a flag container and an effect carrier.

3. **Stateful triggers with hidden mutation.** `EveryNShotsTrigger` holds a mutable `counter` field on the trigger *definition*, meaning shared references between simulation runs would corrupt state. `CombatState` uses stringly-typed keys (`"hit-counter-3"`, `"explosion-Blaze Explosion"`).

4. **Type safety erosion at boundaries.** `CombatEvent` in `event-bus.ts` and `CombatEvent` in `types/common.ts` are two different things with the same name. `(event as any)?.target` casts appear across effect implementations. `Record<string, number>` for bucket multipliers loses all trait-level type information.

5. **No deterministic replay.** `Math.random()` is called inline in resolution strategies, conditions, and triggers. Simulations cannot be seeded, replayed, or differentially debugged.

6. **Data ingestion still partially untyped.** The `DataMapper` does string-matching (`ability.includes('burn')`) against raw JSON. JSON shapes are loosely typed in `data-sources.ts`. The design doc notes a "Zero-Trust" approach is needed but the mapper layer isn't there yet.

The question on the table: should we adopt a **full Entity-Component-System (ECS)** architecture, or refine the current OOP-Strategy pattern into something more disciplined?

---

## Decision

**Adopt a Typed ECS-Inspired Architecture with a Strict Phase Pipeline**, not a textbook game-loop ECS, but a simulation-focused variant that takes ECS's best ideas (data-oriented components, system-as-function, entity-as-ID) and adapts them for a *calculation engine* rather than a real-time renderer. Keep the existing Strategy pattern for damage resolution and the Event Bus for reactive triggers, but re-seat them as composable *systems* operating over typed component stores.

This is **Option B** below, the recommended path.

---

## Options Considered

### Option A: Disciplined OOP Refactor (Keep Current Patterns, Fix the Friction)

Retain the class hierarchy (`Entity` → `Player`/`Enemy`, `Equipment` → `Weapon`/`Armor`, `BaseEffect` → subclasses) but address the specific pain points through targeted refactoring.

| Dimension | Assessment |
|-----------|------------|
| Complexity | **Low** — Minimal conceptual leap from current code |
| Migration Cost | **Low** — Surgical fixes, no mass rewrite |
| Type Safety | **Medium** — Improves with `any` removal, but OOP inheritance still tempts loose downcasting |
| Scalability (Combinatorial) | **Medium** — Adding a new keyword or interaction requires touching multiple class hierarchies |
| Testability | **Medium** — Better with DI, but stateful objects remain harder to snapshot/diff |
| Team Familiarity | **High** — Pattern already in use |

**What this looks like:**
- Extract `DamageProcessor` injection into effects via constructor DI instead of self-instantiation.
- Replace `any` types with proper interfaces; resolve circular deps with barrel exports or interface-only modules.
- Move `Math.random()` behind an injectable `RNG` service.
- Split `DamageEngine` into `SimulationRunner`, `TelemetrySampler`, `MonteCarloOrchestrator`.
- Replace stringly-typed counters with a typed `CombatStateStore<K extends string, V>`.

**Pros:**
- Lowest disruption to existing working code.
- Team can ship incremental improvements immediately.
- Existing tests require minimal rewrite.

**Cons:**
- Doesn't solve the *combinatorial explosion* problem. Every new keyword/mod/armor interaction still needs a new `BaseEffect` subclass or a new `TriggeredEffect` wiring in `EffectRegistry`.
- Class hierarchies will continue to accumulate god-object tendencies as the game adds content.
- The `applyStatic`/`executeDynamic` split on `BaseEffect` is already strained — effects like `ShrapnelEffect` need dynamic resolution during what's supposed to be a static phase, requiring them to carry their own processor.
- Deep inheritance (`SetArmor extends Armor extends Equipment`) makes composition rigid.

---

### Option B: Typed ECS-Inspired Simulation Architecture (Recommended)

Entities become opaque IDs. All data lives in typed component maps. All logic lives in pure system functions that query component stores and write results. The event bus, damage resolution, and stat aggregation become composable systems in an explicit phase pipeline.

| Dimension | Assessment |
|-----------|------------|
| Complexity | **Medium-High** — Requires conceptual shift from "objects that do things" to "data that systems process" |
| Migration Cost | **Medium** — Can be done incrementally behind a facade, but needs a foundation rewrite for Entity/Component stores |
| Type Safety | **Very High** — Components are plain typed data. Systems are pure functions. No inheritance, no downcasting, no `any`. |
| Scalability (Combinatorial) | **Very High** — New keyword = new component type + new system handler. No class hierarchy to navigate. |
| Testability | **Very High** — Systems are pure functions over immutable snapshots. Snapshot-diff testing is trivial. |
| Team Familiarity | **Low-Medium** — ECS is common in game dev but may be new for web-focused contributors |

**What this looks like:**

#### Core Primitives

```typescript
// Entity is just an ID
type EntityId = string & { readonly __brand: unique symbol };

// Components are plain typed data — no methods, no inheritance
interface StatsComponent {
    readonly entityId: EntityId;
    values: Map<StatType, number>;
    flags: Map<FlagType, boolean>;
}

interface EquipmentComponent {
    readonly entityId: EntityId;
    weapon: WeaponData | null;
    armor: Map<ArmorSlot, ArmorData>;
    mods: Map<GearSlot, ModData>;
}

interface CombatStateComponent {
    readonly entityId: EntityId;
    counters: Map<CounterKey, number>;      // CounterKey is a branded string union, not raw string
    cooldowns: Map<CooldownKey, number>;
    activeBuffs: BuffInstance[];
    activeDoTs: DoTInstance[];
}

interface DamageIntentComponent {
    readonly intentId: IntentId;             // Unique per damage event
    readonly sourceEntity: EntityId;
    readonly targetEntity: EntityId;
    baseValue: number;
    traits: Set<DamageTrait>;
    behavior: DamageBehavior;
    bucketMultipliers: Map<MultiplierBucket, number>;  // MultiplierBucket is a typed enum, not string
    resolved: boolean;
    finalValue: number;
    wasCrit: boolean;
    wasWeakspot: boolean;
}
```

#### Component Store (The World)

```typescript
class World {
    private stores: Map<ComponentType, Map<EntityId, Component>> = new Map();

    // Fully typed get/set with compile-time component type inference
    get<T extends Component>(type: ComponentType, entityId: EntityId): T | undefined;
    set<T extends Component>(type: ComponentType, entityId: EntityId, component: T): void;
    query<T extends Component>(type: ComponentType): IterableIterator<[EntityId, T]>;

    // Snapshot for Monte Carlo isolation
    snapshot(): WorldSnapshot;
    restore(snapshot: WorldSnapshot): void;
}
```

#### Systems as Pure Phase Functions

```typescript
// Each system is a function that reads from World and writes to World
// NO hidden state, NO self-instantiated processors, NO any casts

type System = (world: World, ctx: PhaseContext) => void;

// The simulation pipeline is an explicit ordered list of systems
const COMBAT_PIPELINE: System[] = [
    resetStatsSystem,           // Clear derived stats
    equipmentAggregationSystem, // Apply gear base stats, calibration, set bonuses
    modAggregationSystem,       // Apply mod substats + permanent effects
    buffAggregationSystem,      // Apply active buff stat modifications
    ammunitionSystem,           // Apply ammo multipliers
    shotResolutionSystem,       // Create DamageIntentComponents for this shot
    traitTaggingSystem,         // Tag intents with DamageTraits from source
    bucketResolutionSystem,     // The damage formula: resolve multiplier buckets per intent
    critResolutionSystem,       // Roll crits (using injected RNG)
    weakspotResolutionSystem,   // Roll weakspot (using injected RNG)
    finalDamageSystem,          // Collapse intent into final number
    damageApplicationSystem,    // Apply damage to target HP component
    eventEmissionSystem,        // Emit typed events (OnHit, OnCrit, etc.)
    triggerEvaluationSystem,    // Evaluate all registered triggers against events
    effectExecutionSystem,      // Execute triggered effects (DoTs, Buffs, Explosions)
    statusTickSystem,           // Advance DoTs, expire buffs
    telemetrySampleSystem,      // Sample stats for waveform visualization
    auditLogSystem,             // Record log entries
];
```

#### Damage Resolution as a System (not embedded in effects)

```typescript
// The bucket resolution system replaces the current DamageResolutionStrategy pattern
// but keeps the same mathematical model — it just operates on component data

function bucketResolutionSystem(world: World, ctx: PhaseContext): void {
    for (const [intentId, intent] of world.query<DamageIntentComponent>(ComponentType.DamageIntent)) {
        if (intent.resolved) continue;

        const sourceStats = world.get<StatsComponent>(ComponentType.Stats, intent.sourceEntity);
        if (!sourceStats) continue;

        // Apply the 3-layer model from the design doc:
        // Layer 1: Base (already set as intent.baseValue)
        // Layer 2: Additive Bucket (Factor + Coefficient sources summed)
        // Layer 3: Multiplicative Bucket (Final DMG sources multiplied)

        let additiveBucketSum = 0;
        for (const trait of intent.traits) {
            const mapping = TRAIT_TO_STAT_MAP[trait];
            if (mapping?.factor) {
                additiveBucketSum += sourceStats.values.get(mapping.factor) ?? 0;
            }
        }
        intent.bucketMultipliers.set(MultiplierBucket.Additive, 1 + additiveBucketSum / 100);

        for (const trait of intent.traits) {
            const mapping = TRAIT_TO_STAT_MAP[trait];
            if (mapping?.final) {
                const finalVal = sourceStats.values.get(mapping.final) ?? 0;
                if (finalVal !== 0) {
                    intent.bucketMultipliers.set(
                        MultiplierBucket.Final,
                        (intent.bucketMultipliers.get(MultiplierBucket.Final) ?? 1) * (1 + finalVal / 100)
                    );
                }
            }
        }
    }
}
```

#### JSON Ingestion Boundary (The Compiler)

```typescript
// The DataMapper becomes a "Compiler" that produces typed components from raw JSON
// This is the ONLY place untyped JSON is touched. Everything downstream is typed.

interface RawGameData { /* mirrors JSON schema exactly */ }

class GameDataCompiler {
    // Input: raw JSON (the untrusted boundary)
    // Output: typed component data (the trusted domain)
    compile(raw: RawGameData): CompiledLoadout {
        // All string matching, fallback logic, and normalization lives HERE
        // Nothing downstream ever sees a raw JSON field
    }
}

interface CompiledLoadout {
    weapon: WeaponData;          // Fully typed, no optionals from JSON ambiguity
    armor: Map<ArmorSlot, ArmorData>;
    mods: Map<GearSlot, ModData>;
    triggeredEffects: TriggerDefinition[];  // Pure data, not class instances
    keywords: KeywordDefinition[];
}
```

#### RNG Injection

```typescript
interface RNGService {
    next(): number;              // [0, 1)
    seed(value: number): void;
    fork(): RNGService;          // For parallel Monte Carlo isolation
}

class SeededRNG implements RNGService {
    // xoshiro256** or similar fast PRNG
}

class SystemRNG implements RNGService {
    next() { return Math.random(); }
}
```

**Pros:**
- **Combinatorial scalability.** Adding a new keyword = define a `KeywordDefinition` data object + add a case to `triggerEvaluationSystem`. No new classes, no inheritance chain to navigate.
- **Total type safety.** Components are plain data with no `any`. Systems operate on typed queries. The `(event as any)?.target` pattern is eliminated.
- **Deterministic replay.** Injected RNG + World snapshots = bit-perfect simulation replay and differential debugging.
- **Monte Carlo isolation is trivial.** `world.snapshot()` before each iteration, `world.restore()` after. No cloning of deep object graphs.
- **Testability.** Systems are pure functions: `(World, Context) → World mutations`. Unit test each system in isolation by constructing a minimal World with only the relevant components.
- **Clean JSON boundary.** `GameDataCompiler` is the single airlock. Everything inside the engine is typed. Everything outside is untrusted.
- **Eliminates circular dependency pain.** Components don't import each other. Systems import component *types* but not other systems. The World mediates all access.
- **Phase pipeline makes execution order explicit.** No more hidden ordering dependencies between `applyStatic` and `executeDynamic`.

**Cons:**
- **Higher upfront cost.** Requires building the `World` store, the component type registry, and the phase pipeline runner before any game logic can migrate.
- **Less familiar pattern.** Contributors used to OOP may find "entity is just an ID" counterintuitive initially.
- **Indirection.** Instead of `player.stats.get(StatType.CritRate)`, it's `world.get<StatsComponent>(ComponentType.Stats, playerId)?.values.get(StatType.CritRate)`. More verbose, though helper functions can wrap this.
- **Risk of over-engineering.** A simulation engine with 1-2 entities at a time doesn't *need* the cache-line optimization that makes ECS shine in real-time games. The benefit here is structural, not performance.

---

### Option C: Functional Pipeline with Immutable State (Redux-like)

Model the entire simulation as a series of pure reducer functions over an immutable state tree.

| Dimension | Assessment |
|-----------|------------|
| Complexity | **High** — Requires full immutability discipline |
| Migration Cost | **High** — Complete rewrite of all mutable state |
| Type Safety | **Very High** — Immutable records, discriminated unions |
| Scalability | **High** — Similar to ECS for composition |
| Testability | **Very High** — Pure functions, snapshot comparison |
| Team Familiarity | **Low** — Functional paradigm shift |

**Pros:** Strongest guarantees about state purity. Time-travel debugging for free.
**Cons:** Immutable updates on nested Maps are ergonomically painful in TypeScript. Performance overhead from structural sharing on hot paths (500+ Monte Carlo iterations × 30+ shots × multiple systems). The simulation domain is inherently about *mutable evolving state* (buffs ticking, stacks decrementing) — fighting that with immutability adds friction without proportional benefit in a single-threaded calculation engine.

---

## Trade-off Analysis

The core tension is **familiarity vs. structural scalability**.

Option A is safe and fast to execute, but the codebase will continue accumulating the same friction as Once Human adds content (new keywords, new armor sets, new mod interactions). Every 3-keyword combination creates a potential interaction matrix that's hard to express in inheritance hierarchies. The `BaseEffect` class hierarchy already has 8+ subclasses, and it will keep growing.

Option B (ECS-inspired) requires more upfront work but pays off *specifically* for this domain. Combat damage simulators are fundamentally about:

1. **Composing orthogonal modifiers** (stat buffs, proc triggers, damage traits) — Components compose naturally.
2. **Evaluating conditional interactions** (if target has max burn stacks AND weapon has shrapnel, then...) — Systems can query any combination of components without downcasting.
3. **Running many iterations of the same pipeline** (Monte Carlo) — World snapshots are cheap compared to deep-cloning object graphs.
4. **Deterministic reproduction** (verifying against in-game screenshots like "The 113 Test") — Seeded RNG + ordered phase pipeline = reproducible results.

Option C is overkill. The benefits of full immutability don't justify the ergonomic cost for a browser-based calculation engine that isn't distributed or multi-threaded.

**Recommendation: Option B**, implemented incrementally. The migration can be phased behind a facade so existing tests continue to pass during transition.

---

## Consequences

### What Becomes Easier
- Adding new keywords, mods, weapons, and armor sets (data-driven, no new classes).
- Writing regression tests against in-game verified values (deterministic, snapshot-based).
- Debugging damage discrepancies (audit the phase pipeline step by step).
- Monte Carlo performance (snapshot/restore vs deep-clone).
- Onboarding new contributors (read the pipeline order, understand what each system does).

### What Becomes Harder
- Quick one-off hacks (can't just override a method on a subclass anymore).
- Reading a single entity's "full story" (data is spread across component stores rather than encapsulated in one object).
- Initial ramp-up for contributors unfamiliar with ECS patterns.

### What We'll Need to Revisit
- The UI layer's assumptions about Player/Weapon objects (will need an adapter or view-model layer).
- The `EffectRegistry` pattern (becomes a data table of `TriggerDefinition[]` rather than a class map).
- Whether the event bus remains a first-class pub/sub or becomes a system-internal queue processed during the `triggerEvaluationSystem` phase.

---

## Implementation Plan (Phased Migration)

### Phase 0: Stabilization (Pre-Migration)
1. [ ] Fix all broken tests — establish green baseline.
2. [ ] Inject `RNGService` into existing `DamageResolutionStrategy` and all `Math.random()` call sites.
3. [ ] Resolve the dual `CombatEvent` type name collision.
4. [ ] Remove all `any` types from `AggregationContext` and `CombatContext`.

### Phase 1: Foundation (The World)
5. [ ] Implement `World` component store with typed `get`/`set`/`query`.
6. [ ] Define core component interfaces: `StatsComponent`, `EquipmentComponent`, `CombatStateComponent`, `DamageIntentComponent`.
7. [ ] Implement `PhaseContext` (carries RNG, timing, config — replaces the ad-hoc `CombatContext`).
8. [ ] Implement `WorldSnapshot` for Monte Carlo isolation.

### Phase 2: Systems Migration (Inside-Out)
9. [ ] Migrate `StatAggregator.aggregate()` → `equipmentAggregationSystem` + `modAggregationSystem` + `buffAggregationSystem`.
10. [ ] Migrate `DamageResolutionStrategy.resolve()` → `bucketResolutionSystem` + `critResolutionSystem` + `weakspotResolutionSystem`.
11. [ ] Migrate `StatusManager.tick()` → `statusTickSystem`.
12. [ ] Migrate `CombatEventBus` → `eventEmissionSystem` + `triggerEvaluationSystem`.
13. [ ] Migrate `DamageEngine.simulateShot()` → `shotResolutionSystem` + `damageApplicationSystem`.

### Phase 3: Data Compiler
14. [ ] Implement `GameDataCompiler` as the single JSON→typed-component boundary.
15. [ ] Migrate `DataMapper`, `EffectRegistry`, and weapon/armor/mod data files to produce `CompiledLoadout` data.
16. [ ] Validate against the Knowledge Bible — "The 113 Test" must still pass.

### Phase 4: Monte Carlo & Telemetry
17. [ ] Migrate `DamageEngine.runMonteCarlo()` → `MonteCarloRunner` using `World.snapshot()/restore()`.
18. [ ] Migrate telemetry sampling to `telemetrySampleSystem`.
19. [ ] Validate statistical distributions match previous engine output.

### Phase 5: UI Adapter
20. [ ] Build a thin `SimulationViewModel` that projects World state into the shapes the React UI expects.
21. [ ] Ensure the timeline scrubber, stat HUD, and sparklines continue to work.

---

## Appendix: Key Type Definitions (Reference)

```typescript
// Branded entity ID prevents accidental string usage
type EntityId = string & { readonly __brand: unique symbol };
function createEntityId(raw: string): EntityId { return raw as EntityId; }

// Typed multiplier buckets (replaces Record<string, number>)
enum MultiplierBucket {
    Additive = 'additive',          // Factor + Coefficient layer
    Final = 'final',                // Final DMG Bonus layer
    Crit = 'crit',
    Weakspot = 'weakspot',
    Vulnerability = 'vulnerability',
    EnemyType = 'enemy_type',
}

// Typed counter/cooldown keys (replaces stringly-typed CombatState)
type CounterKey = `hit-counter:${string}` | `shot-counter:${string}`;
type CooldownKey = `cd:${string}`;

// Trait-to-stat mapping (replaces the if-chain in RefinedResolutionStrategy)
const TRAIT_TO_STAT_MAP: Record<DamageTrait, { factor?: StatType; final?: StatType }> = {
    [DamageTrait.Weapon]:          { factor: StatType.WeaponDamagePercent },
    [DamageTrait.Attack]:          { factor: StatType.AttackPercent },
    [DamageTrait.Status]:          { factor: StatType.StatusDamagePercent },
    [DamageTrait.Elemental]:       { factor: StatType.ElementalDamagePercent },
    [DamageTrait.Burn]:            { factor: StatType.BurnDamageFactor, final: StatType.BurnFinalDamage },
    [DamageTrait.FrostVortex]:     { factor: StatType.FrostVortexDamageFactor, final: StatType.FrostVortexFinalDamage },
    [DamageTrait.PowerSurge]:      { factor: StatType.PowerSurgeDamageFactor, final: StatType.PowerSurgeFinalDamage },
    [DamageTrait.Shrapnel]:        { factor: StatType.ShrapnelDamageFactor, final: StatType.ShrapnelFinalDamage },
    [DamageTrait.UnstableBomber]:  { factor: StatType.UnstableBomberDamageFactor, final: StatType.UnstableBomberFinalDamage },
    [DamageTrait.Bounce]:          { factor: StatType.BounceDamageFactor, final: StatType.BounceFinalDamage },
    [DamageTrait.Explosive]:       {},
    [DamageTrait.Melee]:           {},
    [DamageTrait.FastGunner]:      {},
    [DamageTrait.BullsEye]:        {},
};
```
