# Interaction Engine Architectural Audit: The "KVD Paradox" & Systemic Debt

## 1. The Identity & Stacking Paradox
Current architecture relies on string literals (`id: 'status-burn'`) to manage stacking. This is a "Script-Kid" anti-pattern that bypasses true Type Safety and polymorphic behavior.

*   **The Issue:** Stacks are currently managed by the `StatusManager` looking up a string key. If two different items apply "Burn," the engine cannot distinguish if they *should* stack together or if they represent independent instances of the same keyword with different scaling.
*   **Encapsulation Failure:** The `DoTEffect` class is "dumb"—it doesn't own its stacking logic. Instead, `StatusManager` imperatively manages the `ActiveDoT` instance. In a strict OOP model, the `Effect` should define its own `StackingStrategy`.

## 2. The "Nearby Enemy" Ghost (Environment Vacuum)
The current `DamageEngine` models a 1v1 vacuum. This renders mechanics like KVD's "AoE Blaze Explosion" and "Chain Reaction Burn" fundamentally inaccurate.

*   **Inaccuracy in KVD Modeling:** KVD Boom Boom triggers an explosion when a **burning** target dies, applying stacks to **nearby** enemies. 
*   **Current Failure:** 
    1.  We lack a `TargetHasStatusCondition` to verify the "is burning" requirement.
    2.  We lack an `Entity` or `Battlefield` model. Applying a `DoTEffect` within an `OnKill` trigger in a 1v1 sim applies a dot to a dead target, which is mechanically void. 
    3.  Chain reactions (Burn A triggers Explosion B which applies Burn C) are currently impossible to model without a recursive event-propagation system.

## 3. Coupling of Global Stats to Local Effects
Using `StatType.MaxBurnStacks` as a global player stat to drive local effect limits is a leaky abstraction.

*   **The Issue:** The engine assumes "Burn" is a singular global concept. If a future mechanic introduces "Blue Burn" vs "Red Burn" with different stack caps, the current `StatType` system collapses. 
*   **The Steelman Case:** Stack limits should be properties of the `EffectInstance`, potentially modified by the `Mod` that applied them, rather than a global stat that all instances of "Burn" must obey.

## 4. The "Embers" Implementation Wall
The `Embers` mod ("When Burn is removed, stacks only -50%") is currently **unimplementable** without hardcoding logic into the `StatusManager`.

*   **Architectural Gap:** We lack "Status Lifecycle Hooks." There is no `onExpired` or `onCleared` event that a Mod can intercept.
*   **Authorization Violation:** Managers (`StatusManager`) are currently "God Objects" that know too much about how DoTs decay. This logic should be delegated to the `Effect` or a `Keywords` controller.

## 5. Instance vs. Blueprint Debt
Triggered effects are currently returned as "Blueprints" (`ModData`). 

*   **The Issue:** We don't distinguish between a `TriggeredEffectDefinition` and a `TriggeredEffectInstance`. 
*   **Consequence:** We cannot easily validate if two effects are of the same type or track stateful data (like internal counters) *within* the effect itself without resorting to the global `CombatState` map.

## Summary of Lacking Components
1.  **Targeting System:** An abstraction to differentiate between `PrimaryTarget`, `Self`, and `AoE(radius)`.
2.  **Effect Identity System:** Replacing `string ids` with `EffectTypes` or `StackingGroups`.
3.  **Event Bubbling:** An event bus that allows "Procs on Procs" (e.g., Explosion proccing from a Burn tick).
4.  **Lifecycle Hooks:** `OnApply`, `OnTick`, `OnExpire`, `OnClear` for all status effects.

---

# Proposed Solution: The Reactive Lifecycle Architecture

To resolve the systemic debt and enable high-fidelity modeling of weapons like KVD Boom Boom, we must pivot from a **Manager-Driven** engine to an **Entity-Driven** engine.

## 1. Targeting Context & The Entity Model
Introduce an `Entity` base class for `Player` and `Enemy`. All combat events must contain a `source: Entity` and a `target: Entity`.

*   **The Change:** `TriggeredEffect.execute(ctx)` becomes `TriggeredEffect.execute(source, target, ctx)`.
*   **The Benefit:** This allows KVD’s `ExplosionEffect` to specifically target `Target.Nearby(3m)` rather than the current (dead) primary target.

## 2. Effect Instance Identity & Stacking Strategy
Replace `string id` with a polymorphic `EffectIdentity`. Each `EffectInstance` defines its own `StackingStrategy`.

*   **Proposed Interface:**
    ```typescript
    interface StackingStrategy {
        canStackWith(other: EffectInstance): boolean;
        onStackAdded(existing: EffectInstance, newEffect: EffectInstance): void;
    }
    ```
*   **The Benefit:** This enables "Embers" to intercept the decay event and modify the stack count rather than letting the `StatusManager` simply delete the object.

## 3. The Lifecycle Hook Pipeline (Reactive Effects)
Transform `BaseEffect` into a stateful lifecycle controller.

*   **Hooks:**
    *   `onApply(target)`: Triggered when the effect first hits an entity.
    *   `onTick(target)`: Triggered by the StatusManager interval.
    *   `onExpire(target)`: Triggered when duration reaches zero.
    *   `onRemoved(target)`: Triggered by external "Cleanse" or "Purge" effects.
*   **The Benefit:** Mods like `Flame Resonance` can now modify the `onApply` parameters of a specific instance without needing to touch global `StatTypes`.

## 4. The Event Bus (Proc-on-Proc Bubbling)
Instead of the `DamageEngine` imperatively looping through triggers, we introduce a central `CombatEventBus`.

*   **Flow:** `Burn Tick` -> emits `DamageEvent` -> `CombatEventBus` catches `DamageEvent` -> triggers `OnHit` logic for other mods.
*   **The Benefit:** This allows for recursive interactions (e.g., "When Burn deals damage, 10% chance to trigger X") which are currently impossible in our flat loop.

## 5. Separation of Definition vs. Instance
Explicitly distinguish between `ModData` (the blueprint) and `ModInstance` (the stateful equipment piece).

---

# Proposed Solution 2: The Holistic Battlefield & Mitigation Pipeline

## 1. The DamageIntent Class (Polymorphic Traits & Behaviors)
Replace the "data bag" packet with an authoritative `DamageIntent` class.
*   **Trait-Based Identity:** Damage instances are assigned multiple `DamageTraits` (e.g., `Status`, `Elemental`, `Burn`).
*   **Behavioral Toggles:** Intents possess a `behavior` object (e.g., `canCrit`, `canWeakspot`). By default, Status damage has these disabled.
*   **The "Gilded" Capability:** Mods like **Gilded Gauntlets** intercept the intent creation and call `intent.enableCrit()`, allowing keywords like Burn to inherit the Player's crit math dynamically.

## 2. Categorical Proc Gating (The Industry Standard)
To prevent infinite loops without naive depth limits, we implement a **Strict Proc Registry**.
*   **The Rule:** A `CombatEvent` generated by an intent with the `isProc` flag **cannot** trigger any `TriggeredEffect` that is also marked as a `ProcTrigger`.
*   **Proc Coefficients:** Every skill/effect is assigned a `procCoefficient`. KVD explosions will have a `procCoefficient` of **0.0** to prevent recursive eruptions.

---

# Technical Trace: The 3-Hit KVD Loop

**Scenario:** Player has +40% Status DMG and +20% Elemental DMG.

### Hit 1: Initial Contact
1.  **Weapon** creates `DamageIntent` (Traits: `Weapon`, `Physical`).
2.  **Processor** resolves 100 DMG.
3.  **EventBus** emits `OnHit`.
4.  **Burn Keyword** procs.
5.  **BurnStatusInstance** is created on Target. It snapshots current Player Psi (1000).

### Hit 2: The Synergy
1.  **Weapon** creates `DamageIntent` (Traits: `Weapon`, `Physical`).
2.  **EventBus** emits `OnHit`.
3.  **KVD Specialized Trigger** checks `Target.hasStatus('burn')` -> **TRUE**.
4.  **Eruption Proc** creates `DamageIntent` (Traits: `Status`, `Elemental`, `Explosive`, `isProc: true`).
5.  **Processor** resolves: `Base(1000) * Status(1.4) * Elemental(1.2)` = **1,680 Damage**.

### Hit 3: The Kill
1.  **Weapon** triggers a **Kill** event.
2.  **KVD Blaze Explosion** procs.
3.  **Explosion Proc** creates `DamageIntent` (Traits: `Status`, `Elemental`, `isProc: true`, `procCoefficient: 0`).
4.  **Processor** resolves 5,040 Damage.
5.  **EventBus** emits `DamageEvent`.
6.  **Recursion Check:** Trigger for "Burn on Hit" sees `procCoefficient: 0`. Chance becomes `0.18 * 0 = 0`. 
7.  **Result:** The loop terminates safely after delivering the explosion.
