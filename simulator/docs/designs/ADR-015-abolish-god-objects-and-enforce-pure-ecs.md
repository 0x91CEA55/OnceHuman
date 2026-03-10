# ADR-015: Abolish God Objects and Enforce Pure ECS

## Context

Following the mandate of ADR-014, our architectural audit of the simulator's core models and engines revealed significant violations of Entity Component System (ECS) fidelity. Specifically, `Player`, `Enemy`, and `Entity` remain as "Fat Objects" encapsulating state, while `Equipment` (`Weapon`, `Armor`, `Mod`, `Loadout`) models entangle blueprint data with aggregation logic. Furthermore, `DamageEngine` functions as a God Object handling simulation orchestration, state management, ECS integration, and Monte Carlo execution simultaneously. Lastly, the `DataCompiler` relies on manual, fragile type guards, violating the strict Zero-Trust boundaries required for incoming data.

To achieve bit-perfect parity and maintainable architecture, we must eradicate these Object-Oriented paradigms in favor of pure ECS principles and strict data validation.

## Data Validity Assessment

During the audit, the following structural discrepancies were identified:
1.  **OOP Inheritance vs. ECS Composition:** `Player` inherits from `Entity` and directly contains a `StatusManager`, `PlayerStats`, HP, and flags. In a pure ECS, entities are strictly IDs (`EntityId`), and all state must reside in isolated Components.
2.  **Fat Equipment Models:** `Equipment` classes (and their subclasses like `Weapon`, `Armor`, `Mod`) define `apply(ctx)` methods. This violates the ECS mandate that components are Plain Old Java Objects (POJOs) and all logic belongs in Systems.
3.  **Monolithic Damage Engine:** `DamageEngine` directly couples Monte Carlo execution, trigger event firing, time advancement, and metric tracking. It initializes an isolated `World` per instance, making cross-system state tracking difficult and preventing a unified simulation loop.
4.  **Stateless Aggregation:** `StatAggregator` currently mutates the `Player` object's internal state via static methods. It should be a pure System that reads from `EquipmentComponent`s and writes to a `StatsComponent`.
5.  **Fragile Ingestion Boundaries:** `DataCompiler` utilizes manual type guards (e.g., `typeof data.id === 'string'`). This is brittle and does not scale well with complex data shapes. It must be replaced with a robust schema validation library.

## Decision / Proposed Refactor

1.  **Delete Object Models:** Formally deprecate and delete `Player`, `Enemy`, and `Entity` classes. They will be entirely replaced by the `EntityId` brand defined in `simulator/src/ecs/types.ts` combined with component composition (`HealthComponent`, `StatsComponent`, `StatusComponent`, `FlagComponent`).
2.  **Pure Data Equipment Components:** Refactor `Weapon`, `Armor`, `Mod`, and `Loadout` into strict TypeScript interfaces (POJOs). All logic currently residing in their `apply()` methods will be migrated to a new `StatAggregatorSystem`.
3.  **StatAggregator as an ECS System:** Convert `StatAggregator` into a pure ECS system (`StatAggregatorSystem`) that operates on entities possessing both `LoadoutComponent` and `StatsComponent`.
4.  **Deconstruct DamageEngine:** Break down `DamageEngine` into smaller, focused systems or a thin `SimulationRunner`. Combat logic will be handled by a `CombatSystem`, time and ticks by the `SimulationLoop`, and metrics by the `TelemetrySystem`.
5.  **Zod for Zero-Trust Ingestion:** Introduce Zod (or a functionally equivalent schema validation library) in `DataCompiler` to define rigorous, strictly-typed schemas for all incoming JSON payloads.

## Implementation Details

### 1. ECS Entity Refactor
Entities become pure IDs.
```typescript
// simulator/src/ecs/types.ts
export type EntityId = string & { readonly __brand: unique symbol };
```

### 2. Pure Data Components for Equipment
Move equipment to components.
```typescript
export interface WeaponComponent {
    definitionId: string;
    type: WeaponType;
    keyword: KeywordType;
    baseStats: WeaponBaseStatsData;
    calibrationMatrix: CalibrationData;
    intrinsicEffects: EffectDefinition[];
}

export interface LoadoutComponent {
    weapon?: WeaponComponent;
    helmet?: ArmorComponent;
    // ...other slots
}
```

### 3. StatAggregatorSystem
A pure system that transforms equipment data into stats.
```typescript
// simulator/src/ecs/systems/stat-aggregator-system.ts
export function runStatAggregation(world: World): void {
    const entities = world.query(['loadout', 'stats']);
    for (const entity of entities) {
        const loadout = world.getComponent(entity, 'loadout');
        const stats = world.getComponent(entity, 'stats');
        
        // Pure calculation logic moved here from Equipment classes
        const newStats = calculateBaseStats(loadout);
        stats.snapshot = newStats;
    }
}
```

### 4. Deconstructing Damage Engine
`SimulationRunner` orchestrates the ECS loop instead of containing all logic.
```typescript
export class SimulationRunner {
    private world: World;
    
    public tick(dt: number) {
        runStatAggregation(this.world);
        runTriggerSystem(this.world, dt);
        runCombatSystem(this.world, dt);
        runEffectSystem(this.world, dt);
        runTelemetrySystem(this.world);
    }
}
```

### 5. Zod Data Ingestion
Replace manual type guards in `DataCompiler`.
```typescript
import { z } from 'zod';

const WeaponBaseStatsSchema = z.object({
    damage_per_projectile: z.number(),
    projectiles_per_shot: z.number(),
    fire_rate: z.number(),
    magazine_capacity: z.number(),
    crit_rate_percent: z.number(),
    weakspot_damage_percent: z.number(),
    crit_damage_percent: z.number(),
});

const RawWeaponDataSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    rarity: z.string(),
    base_stats: WeaponBaseStatsSchema,
    mechanics: z.object({
        description: z.string().optional(),
        effects: z.array(z.any()).optional(),
    }),
});

export class DataCompiler {
    static compileWeapon(raw: unknown): WeaponData {
        const validated = RawWeaponDataSchema.parse(raw);
        // ... map to internal types
    }
}
```

## Migration Plan

1.  **Phase 1: Component Definition & Validation Schema (Zero Downtime)**
    *   Introduce `LoadoutComponent`, `WeaponComponent`, etc. in `ecs/types.ts`.
    *   Install Zod and refactor `DataCompiler` to utilize strict schemas. Verify against existing custom datamine JSONs.
2.  **Phase 2: Parallel Systems Execution**
    *   Implement `StatAggregatorSystem` and `SimulationRunner`.
    *   Run the new ECS pipeline side-by-side with the old `DamageEngine` during unit tests to verify bit-perfect output equivalence.
3.  **Phase 3: The Purge**
    *   Once parity is proven, physically delete `Player`, `Enemy`, `Entity`, and `Equipment` classes.
    *   Retire `DamageEngine` in favor of `SimulationRunner`.
4.  **Phase 4: Telemetry Alignment**
    *   Ensure the `TelemetrySystem` correctly intercepts events from the pure ECS systems to maintain high-fidelity audit logs mandated by ADR-005.
