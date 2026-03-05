# ADR-005: Zero-Trust Refinement — Verbatim implementation Record

**Status:** Implementation Complete
**Date:** 2026-03-05
**Deciders:** Tatum (Project Lead), Gemini CLI

---

## 1. Type-Safe Resolution Foundation (Verbatim)

### 1.1. Context Flag Specification (`resolution.ts`)
```typescript
export type ContextFlag = 
    | FlagType 
    | 'wasCrit' 
    | 'wasWeakspot' 
    | 'wasBurnCrit' 
    | 'isShielded' 
    | 'isFirstHalfOfMag';

export interface ResolutionContext {
    readonly traits: ReadonlySet<DamageTrait>;
    readonly keywords: ReadonlySet<KeywordType>;
    readonly elements: ReadonlySet<ElementType>;
    readonly targetType: EnemyType;
    /** Strictly-typed flags map. */
    readonly flags: Map<ContextFlag, boolean>;
    readonly unlockedKeywordCrits: ReadonlySet<KeywordType>;
    /** Pre-aggregated stat pool from PlayerStats. */
    readonly statValues: ReadonlyMap<StatType, number>;
}
```

### 1.2. Bucket Registry Refinement (`bucket-registry.ts`)
```typescript
const flag = (flag: ContextFlag) => ({ type: ConditionType.FlagActive, flag } as const);

export const ROLL_REGISTRY: readonly RollDefinition[] = [
    // ...
    {
        id: 'burn_crit',
        rateContributors: [
            { 
                stat: StatType.CritRatePercent, 
                condition: flag(FlagType.KeywordCanCrit) 
            },
            { 
                stat: StatType.KeywordCritRatePercent, 
                condition: flag(FlagType.KeywordCanCrit) 
            }
        ],
        resultFlag: 'wasBurnCrit'
    }
];
```

---

## 2. Engine & API Specification (Verbatim)

### 2.1. Typed Simulation Logging (`damage-engine.ts`)
```typescript
export interface SimulationLogEntry {
    readonly timestamp: number;
    readonly event: string;
    readonly description: string;
    readonly damage: number;
    readonly accumulatedDamage: number;
    readonly instantaneousDPS: number;
    readonly runningAverageDPS: number;
    /** Type-safe audit trail keyed by BucketId. */
    readonly bucketMultipliers: ReadonlyMap<BucketId, number>;
    /** Verifiable snapshot of flags active during this specific resolution event. */
    readonly flagsSnapshot: ReadonlySet<ContextFlag>;
    readonly statsSnapshot: Record<StatType, number>;
    // ...
}
```

### 2.2. Public Verification API (`damage-engine.ts`)
```typescript
    /**
     * ADR-005: Public Simulation Entry Point
     * Provides a typed API for integration tests, abolishing 'as any' escapes.
     */
    public executeShot(shotNumber: number): SimulationLogEntry {
        return this.simulateShot(shotNumber);
    }
```

---

## 3. High-Fidelity Verification (Verbatim)

### 3.1. Zero-Trust Burn Fidelity (`burn-build-fidelity.test.ts`)
```typescript
    test('Zero-Trust: Gilded Gloves unlock Burn Crit via ROLL_REGISTRY', () => {
        // ... setup ...
        const log = engine.executeShot(1);

        // 4. Verify results via explicit snapshots and enum lookups
        expect(log.flagsSnapshot.has('wasBurnCrit')).toBe(true);
        expect(log.bucketMultipliers.get(BucketId.BurnFactor)).toBe(1.5);
        
        // Calculation: 100 * 1.5 * 1.3 * 1.4 = 273
        expect(log.damage).toBe(273);
    });
```

---

## 4. Verification Proof

Presence of core refinements proved via grep:
*   `grep -F "export type ContextFlag =" simulator/src/types/resolution.ts`
*   `grep -F "public executeShot(shotNumber: number): SimulationLogEntry {" simulator/src/engine/damage-engine.ts`
*   `grep -F "bucketMultipliers: ReadonlyMap<BucketId, number>;" simulator/src/engine/damage-engine.ts`
