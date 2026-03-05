# ADR-003: Trigger & Effect Execution Model — Pure-Data Event-Driven Side Effects

**Status:** Proposed
**Date:** 2026-03-04
**Supersedes:** ADR-001 (trigger evaluation and effect execution sections)
**Deciders:** Tatum (Project Lead), Contributors

---

## Context

ADR-001 established the ECS-inspired phase pipeline. ADR-002 replaced the `DamageResolutionStrategy` class hierarchy with a pure-data bucket resolver. Neither ADR addressed the **trigger and effect system** — the reactive half of the engine that converts combat events (OnHit, OnKill, OnReload, etc.) into secondary damage, DoTs, buffs, and explosions. The current implementation (`trigger.ts`, `effect.ts`, `effect-registry.ts`, `event-bus.ts`) has six distinct problems that must be resolved before the ECS migration can complete:

### 1. Mutable State on Shared Trigger Definitions

`EveryNShotsTrigger` holds a `counter` field directly on the trigger *definition* object:

```typescript
export class EveryNShotsTrigger extends BaseTrigger {
    private counter = 0;  // ← MUTABLE STATE ON THE DEFINITION
    constructor(private readonly n: number) { super(EventTrigger.OnHit); }
    shouldFire(): boolean {
        this.counter++;
        if (this.counter >= this.n) { this.counter = 0; return true; }
        return false;
    }
}
```

`EffectRegistry` constructs `TriggeredEffect` objects once and holds them in a static map. Each Monte Carlo iteration reuses the **same** `EveryNShotsTrigger` instance. The counter carries over between iterations, so the proc timing shifts across runs. This is a silent correctness bug that inflates the variance of Monte Carlo results and makes them non-reproducible even with a seeded RNG.

### 2. Self-Instantiated Processors in Effects

`ShrapnelEffect`, `ExplosionEffect`, and `ActiveDoT` each construct their own `DamageProcessor` internally:

```typescript
export class ShrapnelEffect extends BaseEffect {
    private processor = new DamageProcessor(new LegacyResolutionStrategy());  // ← TIGHT COUPLING
    ...
}

export class ActiveDoT extends StatusInstance {
    private processor = new DamageProcessor(new LegacyResolutionStrategy());  // ← USES LEGACY STRATEGY
    ...
}
```

This bypasses the ADR-002 resolver entirely for secondary damage — Shrapnel, Explosions, and DoT ticks do not pass through the `UNIVERSAL_BUCKETS` pipeline. They use the discredited `LegacyResolutionStrategy`. The bucket isolation error from ADR-002 (11%+ underestimation) applies to *all* secondary damage in the current system.

### 3. Synchronous Recursive Event Emission

`CombatEventBus.emit()` dispatches events synchronously to all subscribers. Effects that produce secondary damage emit new `OnHit` events during the current emission, creating a call stack of `emit → handler → emit → handler → ...`. The only guard is an arbitrary `MAX_DEPTH = 5`:

```typescript
emit(event: CombatEvent) {
    if (event.depth >= this.MAX_DEPTH) return;  // ← SILENT SUPPRESSION
    const handlers = this.listeners.get(event.type);
    if (handlers) {
        for (const handler of handlers) { handler(event); }  // ← RECURSIVE
    }
}
```

This silently suppresses legitimate secondary effects when the chain exceeds depth 5. It also makes execution order implicit and impossible to audit — a handler registered first fires before a handler registered later, with no guaranteed ordering.

### 4. Untyped `any` Casts in Effect Implementations

The effect system leaks `any` across every boundary:

```typescript
// effect.ts
eventBus: any;  // ← "Using any to avoid circular dependency for now"

// ShrapnelEffect
const target = (event as any)?.target || ...;

// BuffEffect
const targetManager = (event as any)?.source?.statusManager || ctx.statusManager;

// DoTEffect
const targetManager = (event as any)?.target?.statusManager || ctx.statusManager;
```

These casts eliminate compile-time safety on the most critical path in the engine. Effect targeting (self vs. primary target vs. nearby targets) is implicit and fallback-driven, not declared.

### 5. Non-Injectable `Math.random()` in Conditions

`ChanceCondition` calls `Math.random()` directly:

```typescript
export class ChanceCondition extends Condition {
    evaluate(_ctx: CombatContext, eventData?: any): boolean {
        const coeff = eventData?.intent?.procCoefficient ?? 1.0;
        return Math.random() < (this.probability * coeff);  // ← NOT INJECTABLE
    }
}
```

This is the same problem ADR-001 identified for the resolution strategies. A seeded RNG injected via `PhaseContext` cannot reach `ChanceCondition` under the current architecture. Probabilistic triggers cannot be deterministically replayed.

### 6. Stringly-Typed Counter and Cooldown Keys

Combat state uses raw strings as keys with no type safety:

```typescript
// HitCounterCondition
const key = `hit-counter-${this.targetHits}`;  // "hit-counter-3", "hit-counter-4"

// ExplosionEffect
const cooldownKey = `explosion-${this.source || 'Generic'}`;  // "explosion-Blaze Explosion"

// CombatState
private counters: Map<string, number>
private cooldowns: Map<string, number>
```

Two effects can accidentally share a counter by producing the same key string. There is no compile-time check that counter keys are unique or that cooldown keys are scoped to the correct source.

---

## Decision

**Adopt a Pure-Data Trigger & Effect Model** consistent with the principles established in ADR-002: all trigger logic, condition logic, and effect logic is expressed as typed discriminated union data. Evaluation and execution are separate pure functions operating over that data. Mutable counter state moves into the `CombatStateComponent`. The `CombatEventBus` pub/sub is replaced by an **in-pipeline event queue** processed in two dedicated, sequentially-ordered phases.

---

## Core Principles

1. **Pure data over behavior classes.** `TriggerDef`, `TriggerConditionDef`, and `EffectDef` are typed data structures — no methods, no constructors with side effects, no class inheritance.

2. **All state in components.** Shot counters, cooldowns, and proc state live in `CombatStateComponent.counters` / `CombatStateComponent.cooldowns`. No state on definitions.

3. **Enums over strings.** Every trigger type, condition type, effect type, and target type is a TypeScript enum member. No raw string literals in the execution path.

4. **Injected RNG everywhere.** All probabilistic decisions (`ChanceCondition`) receive RNG from `PhaseContext`. No `Math.random()` calls inside trigger or effect logic.

5. **Deferred queue, not recursive emit.** Events produced during the current pipeline pass are queued in the `World`. The `triggerEvaluationSystem` drains the queue and produces `PendingEffectRecord[]`. Secondary effects that themselves produce new events are bounded by a pass-counter, not by a fragile call-stack depth check.

6. **Explicit effect targeting.** Every `EffectDef` declares its target via a typed `EffectTarget` discriminated union. No `(event as any)?.target` fallbacks.

7. **Secondary damage through the main resolver.** All `DamageInstance` effects create `DamageIntentComponent` records that pass through the full `UNIVERSAL_BUCKETS` pipeline from ADR-002. No embedded `DamageProcessor` instances.

---

## Type Definitions

### Trigger Types

```typescript
/**
 * Discriminant for TriggerDef.
 * Each value corresponds to a distinct trigger mechanism, not just an event type.
 */
export enum TriggerType {
    OnHit           = 'on_hit',
    OnCrit          = 'on_crit',
    OnWeakspotHit   = 'on_weakspot_hit',
    OnKill          = 'on_kill',
    OnReload        = 'on_reload',
    EveryNHits      = 'every_n_hits',     // Counter-gated; replaces EveryNShotsTrigger
    EveryNShots     = 'every_n_shots',    // Fires regardless of hit/miss (future)
}

/**
 * A trigger definition — pure data.
 * No mutable fields. State (counters) lives in CombatStateComponent.
 */
export type TriggerDef =
    | { readonly type: TriggerType.OnHit }
    | { readonly type: TriggerType.OnCrit }
    | { readonly type: TriggerType.OnWeakspotHit }
    | { readonly type: TriggerType.OnKill }
    | { readonly type: TriggerType.OnReload }
    | {
        readonly type: TriggerType.EveryNHits;
        readonly n: number;
        readonly critsCountDouble: boolean;
        readonly counterKey: TriggerCounterKey;  // Scoped, typed key — lives in CombatStateComponent
      };
```

### Trigger Condition Types

```typescript
export enum TriggerConditionType {
    Chance              = 'chance',
    TargetType          = 'target_type',
    MaxDistance         = 'max_distance',
    TargetAtMaxStacks   = 'target_at_max_stacks',
    NotOnCooldown       = 'not_on_cooldown',
    And                 = 'and',
    Or                  = 'or',
    Not                 = 'not',
}

export type TriggerConditionDef =
    | { readonly type: TriggerConditionType.Chance;           readonly probability: number }
    | { readonly type: TriggerConditionType.TargetType;       readonly targetType: EnemyType }
    | { readonly type: TriggerConditionType.MaxDistance;      readonly maxMeters: number }
    | { readonly type: TriggerConditionType.TargetAtMaxStacks; readonly statusId: StatusId }
    | { readonly type: TriggerConditionType.NotOnCooldown;    readonly cooldownKey: CooldownKey }
    | { readonly type: TriggerConditionType.And;              readonly conditions: readonly TriggerConditionDef[] }
    | { readonly type: TriggerConditionType.Or;               readonly conditions: readonly TriggerConditionDef[] }
    | { readonly type: TriggerConditionType.Not;              readonly condition: TriggerConditionDef };
```

### Effect Target Types

```typescript
/**
 * Declares whom an effect targets.
 * Replaces the (event as any)?.target fallback pattern.
 */
export enum EffectTargetType {
    Self            = 'self',             // The source entity (player)
    PrimaryTarget   = 'primary_target',   // The entity that was hit
    NearbyTargets   = 'nearby_targets',   // All entities within a radius (AoE)
}

export type EffectTarget =
    | { readonly type: EffectTargetType.Self }
    | { readonly type: EffectTargetType.PrimaryTarget }
    | { readonly type: EffectTargetType.NearbyTargets; readonly radiusMeters: number };
```

### Effect Types

```typescript
export enum EffectType {
    DamageInstance  = 'damage_instance',  // Secondary damage (Shrapnel, Explosion, etc.)
    ApplyDoT        = 'apply_dot',
    ApplyBuff       = 'apply_buff',
    SetFlag         = 'set_flag',
    SetCooldown     = 'set_cooldown',     // Explicit cooldown arm (not embedded in DamageInstance)
    ResetCounter    = 'reset_counter',    // Explicit counter reset
}

/**
 * An effect definition — pure data.
 * No methods, no embedded processors, no class inheritance.
 * All secondary damage passes through UNIVERSAL_BUCKETS (ADR-002).
 */
export type EffectDef =
    | {
        readonly type: EffectType.DamageInstance;
        readonly scalingFactor: number;
        readonly scalingStat: StatType;
        readonly traits: readonly DamageTrait[];
        readonly target: EffectTarget;
        readonly cooldown?: {
            readonly key: CooldownKey;
            readonly durationSeconds: number;
        };
      }
    | {
        readonly type: EffectType.ApplyDoT;
        readonly dotId: DoTId;
        readonly target: EffectTarget;
      }
    | {
        readonly type: EffectType.ApplyBuff;
        readonly buffId: BuffId;
        readonly target: EffectTarget;
      }
    | {
        readonly type: EffectType.SetFlag;
        readonly flag: FlagType;
        readonly value: boolean;
        readonly target: EffectTarget;
      }
    | {
        readonly type: EffectType.SetCooldown;
        readonly key: CooldownKey;
        readonly durationSeconds: number;
      }
    | {
        readonly type: EffectType.ResetCounter;
        readonly key: TriggerCounterKey;
      };
```

### Typed Key Types

```typescript
/**
 * Branded key types for counters and cooldowns.
 * Compile-time safety against accidental key collisions.
 * Format convention enforced by factory functions, not raw string literals.
 */
export type TriggerCounterKey = string & { readonly __brand: 'TriggerCounterKey' };
export type CooldownKey = string & { readonly __brand: 'CooldownKey' };
export type DoTId = string & { readonly __brand: 'DoTId' };
export type BuffId = string & { readonly __brand: 'BuffId' };
export type StatusId = DoTId | BuffId;

// Factory functions — only place raw strings are used
export function triggerCounterKey(scope: string): TriggerCounterKey {
    return `trigger-counter:${scope}` as TriggerCounterKey;
}
export function cooldownKey(scope: string): CooldownKey {
    return `cooldown:${scope}` as CooldownKey;
}
export function dotId(id: string): DoTId { return id as DoTId; }
export function buffId(id: string): BuffId { return id as BuffId; }
```

### Trigger Definition (Composite)

```typescript
/**
 * A complete trigger-effect pairing — pure data.
 * Replaces TriggeredEffect class.
 * All conditions are evaluated by triggerEvaluationSystem using PhaseContext.rng.
 */
export interface TriggerDefinition {
    readonly id: string;                            // Unique within the loadout
    readonly trigger: TriggerDef;
    readonly conditions: readonly TriggerConditionDef[];
    readonly effects: readonly EffectDef[];
}
```

### In-Pipeline Event Queue

```typescript
/**
 * A combat event queued during the current pipeline pass.
 * Replaces the CombatEventBus pub/sub with a World-resident queue.
 * Typed — no entity references, just EntityIds.
 */
export interface QueuedCombatEvent {
    readonly type: TriggerType;
    readonly sourceEntity: EntityId;
    readonly targetEntity: EntityId | null;
    readonly intentId: IntentId | null;   // Links to the DamageIntentComponent that produced this event
    readonly isCrit: boolean;
    readonly isWeakspot: boolean;
    readonly passDepth: number;           // Secondary-effect pass counter (replaces MAX_DEPTH stack depth)
}

/**
 * A trigger that has fired and is ready for effect execution.
 * Written by triggerEvaluationSystem, consumed by effectExecutionSystem.
 */
export interface PendingEffectRecord {
    readonly triggerId: string;           // Which TriggerDefinition fired
    readonly effects: readonly EffectDef[];
    readonly sourceEntity: EntityId;
    readonly targetEntity: EntityId | null;
    readonly intentId: IntentId | null;
    readonly passDepth: number;
}
```

### Status Definitions (Pure Data)

```typescript
/**
 * DoT and Buff definitions are now pure data stored in a registry.
 * ActiveDoT and ActiveBuff become component data in CombatStateComponent,
 * not class instances with embedded DamageProcessors.
 */
export interface DoTDefinition {
    readonly id: DoTId;
    readonly name: string;
    readonly baseTickIntervalSeconds: number;
    readonly baseDurationSeconds: number;
    readonly baseMaxStacks: number;
    readonly scalingFactor: number;
    readonly scalingStat: StatType;
    readonly traits: readonly DamageTrait[];
    // Stats that modify runtime behavior (rule mutations from ADR-002 apply here)
    readonly maxStacksStatOverride?: StatType;
    readonly durationStatOverride?: StatType;
    readonly tickFrequencyStatMultiplier?: StatType;
}

export interface BuffDefinition {
    readonly id: BuffId;
    readonly name: string;
    readonly baseDurationSeconds: number;
    readonly baseMaxStacks: number;
    // Stat contributions per stack (fed into aggregation each tick)
    readonly statContributions: readonly { stat: StatType; valuePerStack: number }[];
}

export interface DoTInstance {
    readonly definitionId: DoTId;
    currentStacks: number;
    remainingDurationSeconds: number;
    nextTickTimeSeconds: number;
    readonly maxStacks: number;    // Resolved at application time from RuleMutations
    readonly durationSeconds: number;
}

export interface BuffInstance {
    readonly definitionId: BuffId;
    currentStacks: number;
    remainingDurationSeconds: number;
    readonly maxStacks: number;
}
```

---

## The CombatStateComponent (Updated)

The existing `CombatState` class is replaced by a fully typed component with branded key maps:

```typescript
/**
 * Updated CombatStateComponent — owns all transient runtime state.
 * Replaces CombatState class and its stringly-typed maps.
 */
export interface CombatStateComponent {
    readonly entityId: EntityId;
    counters: Map<TriggerCounterKey, number>;     // Typed — no raw string keys
    cooldowns: Map<CooldownKey, number>;           // Stores expiry time (seconds)
    activeDoTs: DoTInstance[];
    activeBuffs: BuffInstance[];
    eventQueue: QueuedCombatEvent[];               // In-pipeline event queue
    pendingEffects: PendingEffectRecord[];          // Awaiting effectExecutionSystem
}
```

---

## The Two New Systems

### System 1: `triggerEvaluationSystem`

Reads `eventQueue` from the source entity's `CombatStateComponent`. For each event, evaluates all `TriggerDefinition[]` from the loadout. Produces `PendingEffectRecord[]`. Drains the queue when done.

```typescript
/**
 * Evaluates all TriggerDefinitions against queued events.
 * Produces PendingEffectRecords for effectExecutionSystem to consume.
 * Reads: CombatStateComponent.eventQueue, LoadoutComponent.triggerDefinitions
 * Writes: CombatStateComponent.pendingEffects, CombatStateComponent.counters
 */
function triggerEvaluationSystem(world: World, ctx: PhaseContext): void {
    for (const [entityId, combatState] of world.query<CombatStateComponent>(ComponentType.CombatState)) {
        if (combatState.eventQueue.length === 0) continue;

        const loadout = world.get<LoadoutComponent>(ComponentType.Loadout, entityId);
        if (!loadout) continue;

        for (const event of combatState.eventQueue) {
            if (event.passDepth >= ctx.config.maxEffectPassDepth) continue; // Bounded, not silent

            for (const triggerDef of loadout.triggerDefinitions) {
                if (!triggerMatches(triggerDef.trigger, event, combatState)) continue;
                if (!allConditionsMet(triggerDef.conditions, event, world, ctx)) continue;

                combatState.pendingEffects.push({
                    triggerId: triggerDef.id,
                    effects: triggerDef.effects,
                    sourceEntity: event.sourceEntity,
                    targetEntity: event.targetEntity,
                    intentId: event.intentId,
                    passDepth: event.passDepth,
                });
            }
        }

        combatState.eventQueue = []; // Drain
    }
}

/**
 * Checks whether a TriggerDef matches a QueuedCombatEvent.
 * Updates EveryNHits counter in CombatStateComponent (not on the definition).
 */
function triggerMatches(
    trigger: TriggerDef,
    event: QueuedCombatEvent,
    state: CombatStateComponent
): boolean {
    switch (trigger.type) {
        case TriggerType.OnHit:
            return event.type === TriggerType.OnHit;
        case TriggerType.OnCrit:
            return event.type === TriggerType.OnHit && event.isCrit;
        case TriggerType.OnWeakspotHit:
            return event.type === TriggerType.OnHit && event.isWeakspot;
        case TriggerType.OnKill:
            return event.type === TriggerType.OnKill;
        case TriggerType.OnReload:
            return event.type === TriggerType.OnReload;
        case TriggerType.EveryNHits: {
            if (event.type !== TriggerType.OnHit) return false;
            const increment = (trigger.critsCountDouble && event.isCrit) ? 2 : 1;
            const current = (state.counters.get(trigger.counterKey) ?? 0) + increment;
            state.counters.set(trigger.counterKey, current);
            if (current >= trigger.n) {
                state.counters.set(trigger.counterKey, 0);
                return true;
            }
            return false;
        }
    }
}

/**
 * Evaluates a TriggerConditionDef against the current event + world state.
 * RNG is consumed from ctx.rng — deterministic and injectable.
 */
function evaluateTriggerCondition(
    condition: TriggerConditionDef,
    event: QueuedCombatEvent,
    world: World,
    ctx: PhaseContext
): boolean {
    switch (condition.type) {
        case TriggerConditionType.Chance:
            return ctx.rng.next() < condition.probability;

        case TriggerConditionType.TargetType: {
            if (!event.targetEntity) return false;
            const enemy = world.get<EnemyTypeComponent>(ComponentType.EnemyType, event.targetEntity);
            return enemy?.enemyType === condition.targetType;
        }

        case TriggerConditionType.MaxDistance: {
            if (!event.targetEntity) return false;
            const pos = world.get<PositionComponent>(ComponentType.Position, event.targetEntity);
            return (pos?.distanceMeters ?? 0) <= condition.maxMeters;
        }

        case TriggerConditionType.TargetAtMaxStacks: {
            if (!event.targetEntity) return false;
            const targetState = world.get<CombatStateComponent>(ComponentType.CombatState, event.targetEntity);
            const dot = targetState?.activeDoTs.find(d => d.definitionId === condition.statusId);
            const buff = targetState?.activeBuffs.find(b => b.definitionId === condition.statusId);
            const instance = dot ?? buff;
            return instance ? instance.currentStacks >= instance.maxStacks : false;
        }

        case TriggerConditionType.NotOnCooldown: {
            const sourceState = world.get<CombatStateComponent>(ComponentType.CombatState, event.sourceEntity);
            const expiry = sourceState?.cooldowns.get(condition.cooldownKey) ?? 0;
            return ctx.currentTimeSeconds >= expiry;
        }

        case TriggerConditionType.And:
            return condition.conditions.every(c => evaluateTriggerCondition(c, event, world, ctx));
        case TriggerConditionType.Or:
            return condition.conditions.some(c => evaluateTriggerCondition(c, event, world, ctx));
        case TriggerConditionType.Not:
            return !evaluateTriggerCondition(condition.condition, event, world, ctx);
    }
}
```

### System 2: `effectExecutionSystem`

Reads `pendingEffects` from each entity's `CombatStateComponent`. For each record, executes each `EffectDef` against the World. Secondary `DamageInstance` effects create new `DamageIntentComponent`s and queue new events at `passDepth + 1`.

```typescript
/**
 * Executes all pending effect records.
 * DamageInstance effects create DamageIntentComponents for secondary resolution.
 * Secondary events are queued with passDepth + 1 — bounded, not call-stack recursive.
 * Reads: CombatStateComponent.pendingEffects
 * Writes: new DamageIntentComponents, CombatStateComponent (DoTs, Buffs, Cooldowns, Events)
 */
function effectExecutionSystem(world: World, ctx: PhaseContext): void {
    for (const [entityId, combatState] of world.query<CombatStateComponent>(ComponentType.CombatState)) {
        if (combatState.pendingEffects.length === 0) continue;

        for (const record of combatState.pendingEffects) {
            for (const effect of record.effects) {
                executeEffect(effect, record, world, ctx);
            }
        }

        combatState.pendingEffects = []; // Drain
    }
}

function executeEffect(
    effect: EffectDef,
    record: PendingEffectRecord,
    world: World,
    ctx: PhaseContext
): void {
    switch (effect.type) {

        case EffectType.DamageInstance: {
            // Check cooldown guard (if present on this effect)
            if (effect.cooldown) {
                const sourceState = world.get<CombatStateComponent>(ComponentType.CombatState, record.sourceEntity);
                const expiry = sourceState?.cooldowns.get(effect.cooldown.key) ?? 0;
                if (ctx.currentTimeSeconds < expiry) return;
            }

            const targets = resolveEffectTargets(effect.target, record, world);
            const sourceStats = world.get<StatsComponent>(ComponentType.Stats, record.sourceEntity);
            const baseStatValue = sourceStats?.values.get(effect.scalingStat) ?? 0;
            const baseDamage = baseStatValue * effect.scalingFactor;

            for (const targetId of targets) {
                // Create a DamageIntentComponent — passes through UNIVERSAL_BUCKETS (ADR-002)
                const intentId = createIntentId();
                world.set<DamageIntentComponent>(ComponentType.DamageIntent, intentId, {
                    intentId,
                    sourceEntity: record.sourceEntity,
                    targetEntity: targetId,
                    baseValue: baseDamage,
                    traits: new Set(effect.traits),
                    resolved: false,
                    finalValue: 0,
                    wasCrit: false,
                    wasWeakspot: false,
                    isSecondary: true,
                    passDepth: record.passDepth + 1,
                });
            }

            // Arm cooldown
            if (effect.cooldown) {
                const sourceState = world.get<CombatStateComponent>(ComponentType.CombatState, record.sourceEntity)!;
                sourceState.cooldowns.set(
                    effect.cooldown.key,
                    ctx.currentTimeSeconds + effect.cooldown.durationSeconds
                );
            }
            break;
        }

        case EffectType.ApplyDoT: {
            const dotDef = ctx.statusRegistry.getDot(effect.dotId);
            if (!dotDef) return;
            const targets = resolveEffectTargets(effect.target, record, world);
            for (const targetId of targets) {
                applyDoT(dotDef, targetId, record.sourceEntity, world, ctx);
            }
            break;
        }

        case EffectType.ApplyBuff: {
            const buffDef = ctx.statusRegistry.getBuff(effect.buffId);
            if (!buffDef) return;
            const targets = resolveEffectTargets(effect.target, record, world);
            for (const targetId of targets) {
                applyBuff(buffDef, targetId, world, ctx);
            }
            break;
        }

        case EffectType.SetFlag: {
            const targets = resolveEffectTargets(effect.target, record, world);
            for (const targetId of targets) {
                const stats = world.get<StatsComponent>(ComponentType.Stats, targetId);
                if (stats) stats.flags.set(effect.flag, effect.value);
            }
            break;
        }

        case EffectType.SetCooldown: {
            const sourceState = world.get<CombatStateComponent>(ComponentType.CombatState, record.sourceEntity);
            if (sourceState) {
                sourceState.cooldowns.set(effect.key, ctx.currentTimeSeconds + effect.durationSeconds);
            }
            break;
        }

        case EffectType.ResetCounter: {
            const sourceState = world.get<CombatStateComponent>(ComponentType.CombatState, record.sourceEntity);
            if (sourceState) sourceState.counters.set(effect.key, 0);
            break;
        }
    }
}

/**
 * Resolves EffectTarget to a list of concrete EntityIds.
 * No (event as any)?.target patterns — fully typed.
 */
function resolveEffectTargets(
    target: EffectTarget,
    record: PendingEffectRecord,
    world: World
): EntityId[] {
    switch (target.type) {
        case EffectTargetType.Self:
            return [record.sourceEntity];

        case EffectTargetType.PrimaryTarget:
            return record.targetEntity ? [record.targetEntity] : [];

        case EffectTargetType.NearbyTargets: {
            // World query for all entities within radius from the primary target's position
            const center = record.targetEntity
                ? world.get<PositionComponent>(ComponentType.Position, record.targetEntity)
                : null;
            if (!center) return [];
            const result: EntityId[] = [];
            for (const [id, pos] of world.query<PositionComponent>(ComponentType.Position)) {
                if (pos.distanceMeters <= target.radiusMeters) result.push(id);
            }
            return result;
        }
    }
}
```

### Secondary Resolution Pass

`DamageIntentComponent`s created by `effectExecutionSystem` (marked `isSecondary: true`) are processed in the same pipeline pass. The phase pipeline runs the bucket/crit/weakspot/final systems again over unresolved secondary intents. New `OnHit` events from secondary damage are queued at `passDepth + 1` and will be evaluated in the *next* invocation of `triggerEvaluationSystem` within the same sim step — but capped at `ctx.config.maxEffectPassDepth` (default: 3). This replaces the fragile `MAX_DEPTH = 5` call-stack guard with an explicit, configurable, and observable counter.

```typescript
// In PhaseContext
interface EngineConfig {
    maxEffectPassDepth: number;  // Default: 3. Replaces CombatEventBus.MAX_DEPTH = 5.
    // When a pending effect record's passDepth >= maxEffectPassDepth, it is dropped
    // and a warning is emitted to the audit log — never silently suppressed.
}
```

---

## The EffectRegistry → Static Trigger Data

The `EffectRegistry` class (static map of class instances) is replaced by a registry of `TriggerDefinition[]` per weapon/armor/mod. These are pure data — produced by `GameDataCompiler` during loadout compilation.

```typescript
// BEFORE (EffectRegistry — class instances, mutable state on triggers)
static behaviors: Partial<Record<WeaponKey, WeaponBehavior>> = {
    [WeaponKey.DE50Jaws]: {
        triggeredEffects: [
            new TriggeredEffect(
                new OnHitTrigger(),
                [new ExplosionEffect(0.8, StatType.PsiIntensity, 0, "Unstable Bomber")],
                [new HitCounterCondition(3, true)]
            )
        ],
        intrinsicEffects: []
    },
};

// AFTER (Pure data, produced by GameDataCompiler)
const de50JawsTriggers: TriggerDefinition[] = [
    {
        id: 'de50-jaws:every-3-hits',
        trigger: {
            type: TriggerType.EveryNHits,
            n: 3,
            critsCountDouble: true,
            counterKey: triggerCounterKey('de50-jaws:hit-counter'),  // Scoped, typed
        },
        conditions: [],  // No additional gate conditions
        effects: [
            {
                type: EffectType.DamageInstance,
                scalingFactor: 0.8,
                scalingStat: StatType.PsiIntensity,
                traits: [DamageTrait.Explosive, DamageTrait.Status, DamageTrait.Elemental],
                target: { type: EffectTargetType.PrimaryTarget },
                // No cooldown on Jaws — fires every 3rd hit with no CD gate
            }
        ],
    },
];

const kvdBoomBoomTriggers: TriggerDefinition[] = [
    {
        id: 'kvd-boom-boom:on-kill-explosion',
        trigger: { type: TriggerType.OnKill },
        conditions: [],
        effects: [
            {
                type: EffectType.DamageInstance,
                scalingFactor: 3.0,
                scalingStat: StatType.PsiIntensity,
                traits: [DamageTrait.Explosive, DamageTrait.Status, DamageTrait.Elemental],
                target: { type: EffectTargetType.NearbyTargets, radiusMeters: 5 },
                cooldown: {
                    key: cooldownKey('kvd-boom-boom:blaze-explosion'),
                    durationSeconds: 2,
                },
            },
            {
                type: EffectType.ApplyDoT,
                dotId: dotId('status-burn'),
                target: { type: EffectTargetType.PrimaryTarget },
            }
        ],
    },
    {
        id: 'kvd-boom-boom:on-hit-pyro',
        trigger: { type: TriggerType.OnHit },
        conditions: [
            { type: TriggerConditionType.Chance, probability: 0.15 }
        ],
        effects: [
            {
                type: EffectType.DamageInstance,
                scalingFactor: 1.0,
                scalingStat: StatType.PsiIntensity,
                traits: [DamageTrait.Explosive, DamageTrait.Status, DamageTrait.Elemental],
                target: { type: EffectTargetType.PrimaryTarget },
                cooldown: {
                    key: cooldownKey('kvd-boom-boom:pyro-dino-eruption'),
                    durationSeconds: 1,
                },
            }
        ],
    },
];
```

---

## Verification: The "Jaws State Pollution Test"

**Problem demonstrated in current code:**

```
Monte Carlo iteration 1:
  Shot 1: EveryNShotsTrigger.counter = 1
  Shot 2: EveryNShotsTrigger.counter = 2
  Shot 3: EveryNShotsTrigger.counter = 0 → FIRES ✓

Monte Carlo iteration 2 (SHARED INSTANCE — counter NOT reset):
  Shot 1: EveryNShotsTrigger.counter = 1  ← already poisoned; should start at 0
  ...depends on whether iteration 1 ended on a boundary

If iteration 1 ended mid-count (e.g., 30 shots where 30 % 3 == 0, clean):
  → Iteration 2 looks correct by accident
If iteration 1 ended with counter = 1 (e.g., 31 shots):
  → Iteration 2 fires on shot 2 instead of shot 3
  → Statistical mean is biased; variance is inflated
  → Seeding the RNG doesn't fix this because the bug is not in RNG
```

**New model — no state on definitions:**

```
Monte Carlo iteration N setup:
  world.restore(baseSnapshot)           // Full CombatStateComponent restored
  combatState.counters = new Map()      // All counters zeroed — part of the snapshot
  // No trigger definition objects to reset — they carry no state

Monte Carlo iteration N shot 1:
  triggerMatches({ type: EveryNHits, n: 3, counterKey: 'trigger-counter:de50-jaws:hit-counter' }, ...)
  → reads combatState.counters.get('trigger-counter:de50-jaws:hit-counter') → 0
  → sets to 1, returns false ✓

Monte Carlo iteration N+1 setup:
  world.restore(baseSnapshot)           // counters is Map{} again — zero-state guaranteed
```

State pollution between iterations is structurally impossible in the new model.

---

## Verification: The "Cascade Depth Bug"

**Problem demonstrated in current code:**

Consider a loadout where:
- Primary shot hits → triggers `ExplosionEffect` (OnHit, 15% chance) [depth 0 → 1]
- Explosion emits `OnHit` → triggers another `ExplosionEffect` if it crits [depth 1 → 2]
- That explosion also emits `OnHit` → conditionally chains again [depth 2 → 3]
- ...

```
Current: if (event.depth >= this.MAX_DEPTH) return;  // depth 5 → silent drop
```

If a specific weapon + armor combination legitimately produces 4-deep chains on critical hits, the 5th-level explosion is silently suppressed with no log entry, no warning, no way to know it happened.

**New model — observable bounded depth:**

```typescript
// In triggerEvaluationSystem
if (event.passDepth >= ctx.config.maxEffectPassDepth) {
    world.get<AuditLogComponent>(...).append({
        level: 'warn',
        message: `Effect chain at passDepth ${event.passDepth} exceeded maxEffectPassDepth (${ctx.config.maxEffectPassDepth}). Trigger '${triggerDef.id}' not evaluated.`,
        triggerId: triggerDef.id,
        passDepth: event.passDepth,
    });
    continue;  // Not a silent return — always logged
}
```

The depth limit is now:
1. **Configurable** — `ctx.config.maxEffectPassDepth` (default 3, can be raised for testing)
2. **Observable** — always logs when a chain is truncated
3. **Integer-counted** — `passDepth` is an integer on the event, not a JS call-stack depth, so it survives async boundaries and is serializable for replay

---

## Relationship to ADR-001 and ADR-002

ADR-001's phase pipeline updates as follows:

| ADR-001 System | ADR-003 Replacement |
|---|---|
| `eventEmissionSystem` | Unchanged in role; now writes typed `QueuedCombatEvent` to `CombatStateComponent.eventQueue` |
| `triggerEvaluationSystem` | Fully redesigned — evaluates `TriggerDefinition[]` against the event queue; uses `triggerMatches()` + `evaluateTriggerCondition()` |
| `effectExecutionSystem` | Fully redesigned — executes `EffectDef` discriminated union; all DamageInstance effects pass through UNIVERSAL_BUCKETS |
| `statusTickSystem` | Unchanged in role; now reads `DoTInstance[]` from `CombatStateComponent`; calls `resolve()` from ADR-002 for tick damage |
| `CombatEventBus` (pub/sub) | **Deleted** — replaced by `CombatStateComponent.eventQueue` (in-World data) |
| `EffectRegistry` (static class) | **Deleted** — replaced by `TriggerDefinition[]` in `LoadoutComponent` (produced by `GameDataCompiler`) |

ADR-002 connects as follows:

| ADR-002 Concept | Role in ADR-003 |
|---|---|
| `resolve(baseDmg, UNIVERSAL_BUCKETS, ctx)` | Called for every `DamageInstance` effect — secondary damage passes through the full bucket topology |
| `ResolutionContext` | Built for secondary intents the same way as primary intents — from the source entity's current `StatsComponent` |
| `DoTInstance.tick()` damage | Produced by `statusTickSystem`, calls `resolve()` with appropriate traits — no embedded `DamageProcessor` |
| `RuleMutation.ModifyMaxStacks` etc. | Applied at loadout compile time; stored as resolved values in `DoTDefinition` overrides per loadout |

---

## Updated Phase Pipeline

```typescript
const COMBAT_PIPELINE: System[] = [
    resetStatsSystem,
    equipmentAggregationSystem,
    modAggregationSystem,
    buffAggregationSystem,           // Re-aggregates stats with active buff contributions
    ammunitionSystem,
    shotResolutionSystem,            // Creates primary DamageIntentComponents
    traitTaggingSystem,
    bucketResolutionSystem,          // resolve() from ADR-002 — primary + any secondary intents
    critResolutionSystem,
    weakspotResolutionSystem,
    finalDamageSystem,
    damageApplicationSystem,
    eventEmissionSystem,             // Writes QueuedCombatEvent to eventQueue
    triggerEvaluationSystem,         // [NEW] Evaluates TriggerDefinitions → PendingEffectRecords
    effectExecutionSystem,           // [NEW] Executes EffectDefs → new intents, DoTs, Buffs
    // Secondary resolution pass: unresolved secondary intents re-enter bucket/crit/final systems
    bucketResolutionSystem,          // (second invocation — skips already-resolved intents)
    critResolutionSystem,
    weakspotResolutionSystem,
    finalDamageSystem,
    damageApplicationSystem,
    eventEmissionSystem,             // Secondary events queued at passDepth + 1
    triggerEvaluationSystem,         // Evaluates secondary triggers (passDepth checked)
    effectExecutionSystem,           // Executes tertiary effects (if passDepth < max)
    statusTickSystem,
    telemetrySampleSystem,
    auditLogSystem,
];
```

> **Note on secondary pass repetition:** The double-pass structure above is explicit but verbose. The implementation should use a bounded loop over `[bucket, crit, weakspot, final, apply, emit, trigger, execute]` until no new intents are produced or `passDepth >= max`. This is cleaner than listing phases twice and is noted here to make the intent clear.

---

## Migration Path

### Phase 1: Type Foundation

1. [ ] Add `TriggerType`, `TriggerConditionType`, `EffectType`, `EffectTargetType` to `types/enums.ts`.
2. [ ] Add `TriggerDef`, `TriggerConditionDef`, `EffectDef`, `EffectTarget`, `TriggerDefinition` interfaces to a new `types/triggers.ts`.
3. [ ] Add `TriggerCounterKey`, `CooldownKey`, `DoTId`, `BuffId` branded types with factory functions to `types/keys.ts`.
4. [ ] Add `DoTDefinition`, `BuffDefinition`, `DoTInstance`, `BuffInstance` to `types/status.ts`.
5. [ ] Update `CombatStateComponent` to use branded key maps and typed instance arrays.

### Phase 2: Status Definition Registry

6. [ ] Extract all `DoTEffect` and `BuffEffect` class definitions into `DoTDefinition[]` and `BuffDefinition[]` in `data/status-registry.ts`.
7. [ ] Validate that all existing `DoTEffect` parameters map exactly to `DoTDefinition` fields.
8. [ ] Wire `StatusRegistry` into `PhaseContext`.

### Phase 3: Trigger & Effect Data

9. [ ] Translate `EffectRegistry` entries into `TriggerDefinition[]` data structures.
10. [ ] Implement `triggerCounterKey()` and `cooldownKey()` factory functions; apply to all existing counter and cooldown usages.
11. [ ] Validate DE.50 Jaws (`EveryNHits`, n=3, critsCountDouble=true) produces correct data.
12. [ ] Validate KVD Boom Boom (OnKill explosion + OnHit 15% chance) produces correct data.
13. [ ] Validate Octopus Grilled Rings (OnHit + TargetAtMaxStacks condition) produces correct data.

### Phase 4: System Implementation

14. [ ] Implement `triggerEvaluationSystem` with `triggerMatches()` and `evaluateTriggerCondition()`.
15. [ ] Implement `effectExecutionSystem` with `executeEffect()` and `resolveEffectTargets()`.
16. [ ] Implement secondary resolution bounded loop in the pipeline runner.
17. [ ] Delete `CombatEventBus` — replace all usages with `eventQueue` writes.
18. [ ] Delete `BaseTrigger`, `OnHitTrigger`, `EveryNShotsTrigger`, `ChanceCondition`, `HitCounterCondition`, `TargetAtMaxStatusStacksCondition` classes.
19. [ ] Delete `BaseEffect`, `ShrapnelEffect`, `ExplosionEffect`, `BuffEffect`, `DoTEffect`, `ActiveBuff`, `ActiveDoT` classes — logic moves into system functions.

### Phase 5: Validation

20. [ ] Run "Jaws State Pollution Test" — assert that Monte Carlo standard deviation is stable with seeded RNG.
21. [ ] Run full burn build trace from ADR-002 — assert that DoT tick damage passes through `UNIVERSAL_BUCKETS`.
22. [ ] Verify that `AuditLogComponent` logs appear when `passDepth >= maxEffectPassDepth` (no silent drops).

---

## Open Questions

1. **`procCoefficient` handling.** The current `ChanceCondition` applies `eventData?.intent?.procCoefficient` to scale probability. This is a game mechanic where certain skills or gear reduce proc rates. If retained, `QueuedCombatEvent` should carry an explicit `procCoefficient: number` field (default 1.0). If dropped, note the assumption and confirm with the Knowledge Bible.

2. **Reload simulation.** `OnReload` trigger is defined but the simulation loop doesn't model magazine depletion or reload timing. Whether `shotResolutionSystem` emits `OnReload` events depends on whether `MagazineCapacityStat` integration is in scope for this iteration.

3. **Keyword-gated trigger conditions.** Some weapons trigger effects only when a specific keyword is active (e.g., "On PowerSurge hit"). This would be a new `TriggerConditionType.KeywordActive` variant. The current `TriggerConditionDef` union is extensible — adding it requires no changes to the resolver.

4. **Buff re-aggregation frequency.** `buffAggregationSystem` must re-run whenever a buff is applied or stack count changes. The current plan is to re-aggregate at the start of every sim step. For performance-critical scenarios (500+ Monte Carlo × many ticks), a dirty-flag on `CombatStateComponent` could gate unnecessary re-aggregation.

5. **`StatusRegistry` ownership.** Should `DoTDefinition[]` and `BuffDefinition[]` live in the `World` (as a global component) or in `PhaseContext`? Since they are immutable for the duration of a simulation run, `PhaseContext` is the natural home — they are configuration, not game state.
