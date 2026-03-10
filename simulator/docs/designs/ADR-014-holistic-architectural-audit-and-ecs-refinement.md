# ADR-014: Holistic Architectural Audit and ECS Refinement

## Context & Frictions

Following a holistic architectural audit of the Once Human Simulator engine (guided by the In-Game Knowledge Bible and high-fidelity ECS standards), several fundamental frictions have been identified. While previous ADRs (like ADR-001, ADR-003, ADR-005) pushed the codebase towards a pure Entity Component System (ECS) and strict type safety, implementation has drifted, resulting in "God Objects", rampant type-safety loopholes (`any` casts), and legacy code accumulation.

*Note: Previous audits suggested a fidelity drift regarding "Ultimate DMG" and "DMG Coefficient". These terms are now confirmed to be translation errors for "Final DMG" and "DMG Factor", respectively. The universal bucket topology (ADR-002) correctly handles these as additive elements within their respective Factor and Final buckets. No new structural buckets are required for these terms.*

### Key Frictions Identified:
1.  **God Objects & Fat Entities:** `DamageEngine` has ballooned into a God Object, directly managing simulation loops, RNG, telemetry sampling, triggers, and logging. Additionally, domain models like `Player`, `Enemy`, and `Entity` remain "Fat Objects" with encapsulated logic (`takeDamage()`, instantiated `StatusManager`s, stateful `PlayerStats`) rather than existing as pure data components.
2.  **Type Safety Erosion:** The "Zero-Tolerance" policy for loose typing has been violated. We have circular dependency workarounds using `player: any` in `types/common.ts`, `LegacyCombatContext = any` in `effect.ts`, and rampant `as any` casting in `bucket-registry.ts` to force Enum compatibilities. The React frontend is also riddled with `any` types for payloads.
3.  **Zero-Trust Barrier Weakness:** The data ingestion layer (`DataMapper`) relies on brittle substring matching (e.g., `ability.includes('burn')`) rather than strict structural validation, allowing raw JSON anomalies to dictate internal domain behavior.
4.  **Lingering Legacy Code & Tech Debt:** The codebase contains obsolete components that serve no purpose under the new universal bucket topology. `StatType` still contains legacy generic percent stats (e.g., `BurnDamagePercent`) that must be fully migrated to the split `Factor` and `Final` paradigms. Obsolete combat contexts and legacy evaluation paths clutter the effect system.

---

## Data Validity Assessment

A direct comparison against the `INGAME_KNOWLEDGE_BIBLE.md` reveals that while our structural math (Factors and Final DMG) is sound, there are specific data-domain gaps:

*   **Sanity & Deviant Power Representation:** Mechanics scaling off low Sanity (Treacherous Tides) or Deviant Power consumption (Dark Resonance) are currently handled via loose stat lookups (`SanityPercent`). They lack pure data component representations (e.g., a `SurvivalComponent` or `ResourceComponent`) in our ECS architecture.
*   **Procedural Coefficient Passing:** The engine's treatment of `procCoefficient` is not rigorously formalized in the event flow. Events must strictly type their procedural reduction/scaling to ensure trigger cascades resolve accurately.

---

## Decision / Proposed Refactor

We will aggressively enforce pure ECS principles, strict type safety, and eliminate legacy code across the stack.

### 1. ECS Eradication of "Fat Objects"
*   **Entities:** `Player`, `Enemy`, and `Entity` classes will be deleted. Entities will become pure opaque identifiers (e.g., `type EntityId = string`).
*   **Components:** Data currently locked in classes will be extracted into pure POJO components:
    *   `HealthComponent { currentHp: number, maxHp: number }`
    *   `ResourceComponent { sanity: number, maxSanity: number, deviantPower: number, maxDeviantPower: number }`
    *   `StatsComponent { snapshot: Record<StatType, number> }`
    *   `StatusComponent { activeBuffs: ActiveBuff[], activeDoTs: ActiveDoT[] }`
    *   `FlagComponent { activeFlags: Set<FlagType> }`
*   **Systems:** `DamageEngine` will be splintered into specific, stateless pure function systems: `SimulationLoopSystem`, `TriggerEvaluationSystem`, `EffectExecutionSystem`, and `TelemetrySamplingSystem`.

### 2. Zero-Tolerance Type Safety
*   Eradicate all instances of `any`, `unknown`, and `as any`.
*   Resolve circular dependencies through interface extraction and barrel file restructuring, not via `any` escapes.
*   Replace array `any[]` declarations in registries with strict interface arrays (e.g., `ReadonlyArray<RollDefinition>`).
*   Refactor React chart tooltips and renderers to use explicit DTO interfaces instead of `(payload: any)`.

### 3. Zero-Trust Data Ingestion
*   Implement Zod (or equivalent structural validation) at the `data-mapper.ts` boundary.
*   Abolish substring matching for mechanic extraction. The ingestion pipeline must assert the strict structural shape of the incoming JSON and map it explicitly to domain enums.

### 4. Legacy Code Elimination
*   Remove all `LegacyCombatContext` interfaces and implementations.
*   Purge generic/legacy `DamagePercent` stat types (e.g., `StatType.BurnDamagePercent`) in favor of strict `Factor` and `Final` types.
*   Strip out any dead code paths in the effect evaluation and stats aggregation systems left over from pre-universal bucket architectures.

---

## Implementation Details

### ECS Component Examples (Pure Data)

```typescript
// simulator/src/ecs/components/resources.ts
export interface ResourceComponent {
    readonly sanity: number;
    readonly maxSanity: number;
    readonly deviantPower: number;
    readonly maxDeviantPower: number;
}

// simulator/src/ecs/components/status.ts
export interface StatusComponent {
    readonly dots: ReadonlyArray<ActiveDoT>;
    readonly buffs: ReadonlyArray<ActiveBuff>;
}
```

### Pure System Example

```typescript
// simulator/src/ecs/systems/telemetry-system.ts
export function sampleTelemetry(
    currentTime: number,
    statsQuery: ReadonlyMap<EntityId, StatsComponent>,
    damageHistory: ReadonlyArray<DamageEvent>
): TelemetrySnapshot {
    // Pure function, no internal class state
    // ...
}
```

### Type-Safe Bucket Registration

```typescript
// No more `flag: flag as any`
export interface ConditionDef {
    type: ConditionType;
    flag?: FlagType; // Strongly typed
}

export const CRIT_RATE_CONTRIBUTORS: ReadonlyArray<ContributorDef> = [
    // ...
];
```

---

## Migration Plan & Task Tracking

1.  **Phase 1: Legacy Purge & Domain Correction**
    *   [x] Delete `LegacyCombatContext` and related fallback paths in `effect.ts`.
    *   [x] Remove legacy `StatType.*DamagePercent` fields; migrate all definitions to `Factor` or `Final`.
    *   [x] Introduce dedicated components/stats for `Sanity` and `DeviantPower` to replace loose value assumptions.
2.  **Phase 2: Type Safety Purge**
    *   [x] Fix `types/common.ts` circular dependencies using interface abstraction.
    *   [x] Remove `as any` from `bucket-registry.ts` and `trigger-types.ts`.
    *   [x] Strongly type all React UI props and Recharts callbacks.
3.  **Phase 3: ECS Extraction**
    *   [x] Create `ecs/components/` and define POJO interfaces for Health, Resources, Stats, and Status.
    *   [x] Create `ecs/systems/` and migrate logic out of `DamageEngine`, `StatusManager`, and `StatAggregator`.
    *   [x] Refactor the top-level Simulation loop to orchestrate pure systems querying pure data.
4.  **Phase 4: Zero-Trust Ingestion**
    *   [x] Rewrite `DataMapper` using strict structural type guards/validators instead of loose string parsing.
