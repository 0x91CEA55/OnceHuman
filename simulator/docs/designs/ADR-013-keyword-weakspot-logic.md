# ADR-013: Keyword Weakspot Logic — Differentiating Bullet vs Elemental Procs

**Status:** Proposed
**Date:** 2026-03-05
**Deciders:** Tatum (Project Lead), Gemini CLI (Systems Architect)

## 1. Context

In the Once Human combat system, not all damage-dealing keywords are equal regarding critical hits and weakspot hits. 
- **Bullet-Based Keywords** (e.g., Shrapnel, Bounce) represent secondary physical projectiles. They can inherently crit and can hit weakspots.
- **Elemental/Status Keywords** (e.g., Burn, Power Surge, Frost Vortex) represent magical or chemical effects. They cannot hit weakspots by default, and can only crit if specific game mechanics (like the "Gilded Gloves" or specific mods) unlock that ability.

The current `Keyword` model lacks a clear flag for weakspot capability, and the `ResolutionContext` does not differentiate between "Bullet" and "Elemental" damage instances when evaluating rolls.

## 2. Decision

1.  **Ammend Keyword Interface**: Add `canWeakspot: boolean` to the `Keyword` model.
2.  **Model Materialization**:
    *   `Bounce`, `Shrapnel` -> `canWeakspot: true`
    *   `Burn`, `PowerSurge`, `FrostVortex`, `UnstableBomber` -> `canWeakspot: false`
3.  **Gated Resolver Scans**: Update `resolveScenarioScan` to force `wasWeakspot: false` if the keyword does not support it, ensuring the UI Output Prediction HUD does not display "Ghost" weakspot damage for elemental procs.
4.  **Bucket Registry Guarding**: Update the `HitAmplifier` bucket to require both the `wasWeakspot` flag AND the absence of the `CannotDealWeakspotDamage` flag.

## 3. Verbatim Implementation Specification

### 3.1. Keyword Model Update (`simulator/src/models/keyword.ts`)

```typescript
export interface Keyword {
    // ...
    readonly canCrit: boolean;
    /** 
     * ADR-013: Defines if this keyword's damage instances can benefit from weakspot bonuses. 
     */
    readonly canWeakspot: boolean;
}

export class Shrapnel implements Keyword {
    constructor(
        // ...
        public readonly canCrit: boolean = true,
        public readonly canWeakspot: boolean = true
    ) {}
}

export class Burn implements Keyword {
    constructor(
        // ...
        public readonly canCrit: boolean = false,
        public readonly canWeakspot: boolean = false
    ) {}
}
```

### 3.2. Resolver Logic Update (`simulator/src/engine/resolver.ts`)

```typescript
export function resolveScenarioScan(
    // ...
    canCrit: boolean = true,
    canWeakspot: boolean = true
): ScenarioScanResult {
    // ...
    const runScenario = (flags: ScenarioFlags) => {
        const initialFlags = new Map<ContextFlag, boolean>();
        Object.entries(flags).forEach(([k, v]) => {
            let finalVal = v;
            if (k === 'wasCrit' && !canCrit) finalVal = false;
            if (k === 'wasWeakspot' && !canWeakspot) finalVal = false;
            if (k === 'wasBurnCrit' && !canCrit) finalVal = false;
            initialFlags.set(k as ContextFlag, finalVal);
        });
        // ...
    };
    // ...
}
```

## 4. Verification & Proof

### 4.1. UI Verification
Select a weapon with **Burn** (Elemental). The "Output Prediction" HUD should show `SYSTEM_IDLE` or `0` for the "Proc Weakspot" row, even if the enemy is a Weakspot target.

### 4.2. Engine Consistency
The `Predicted DPS` value for Burn weapons will no longer be inflated by the user's `WeakspotHitRate`, as the `resolveScenarioScan` now correctly excludes those scenarios from the expected value calculation for that keyword.
