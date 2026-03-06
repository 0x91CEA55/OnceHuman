# ADR-012: Deep-Nested Telemetry — Linking Predictions to Derivations

**Status:** Proposed
**Date:** 2026-03-05
**Deciders:** Tatum (Project Lead), Gemini CLI (Systems Architect)

## 1. Context

ADR-011 introduced structured telemetry, but the "Predicted DPS" and "Scan" results in the UI appear as disconnected root entries in the engine log. Users cannot easily see the causal link between a weapon's base damage, its keyword proc chance, and the final predicted DPS value in a single, expandable tree.

## 2. Decision

1.  **Trace Return Pattern**: Update `resolve` and `resolveScenarioScan` to return `TraceNode` objects rather than automatically recording them to the global registry. This allows callers to nest these traces.
2.  **Master-Detail Prediction Tracing**: Refactor `StaticDamagePreview.tsx` to generate a single "Master Trace" for the entire output prediction. This trace will have the "Predicted DPS" as the root, with "Kinetic Expected" and "Keyword Expected" as children, which in turn contain the full resolution trees.
3.  **Audit Log Responsibility**: The `StaticDamagePreview` component will be responsible for recording the final "Master Trace" to the `telemetry` manager.

## 3. Verbatim Implementation Specification

### 3.1. `resolver.ts` Interface Update

```typescript
// simulator/src/engine/resolver.ts

export function resolve(
    baseDamage: number,
    buckets: readonly BucketDef[],
    ctx: ResolutionContext,
    recordToTelemetry: boolean = false // Rename from logToAudit
): { finalDamage: number; audit: Map<BucketId, number>; trace: TraceNode } {
    // ... calculation ...
    const trace: TraceNode = {
        id: `resolve:${Date.now()}`,
        label: 'Damage Resolution',
        baseValue: baseDamage,
        finalValue: result,
        operation: 'product',
        contributors: [...],
        timestamp: Date.now()
    };

    if (recordToTelemetry) {
        telemetry.record(trace);
    }

    return { finalDamage: result, audit, trace };
}

export function resolveScenarioScan(...): {
    noCritNoWs: number;
    // ...
    expected: number;
    masterTrace: TraceNode; // New unified trace for the scan
} {
    // ...
}
```

### 3.2. `StaticDamagePreview.tsx` Integration

```typescript
// simulator/src/components/StaticDamagePreview.tsx

const staticDps = useMemo(() => {
    // ...
    const masterTrace: TraceNode = {
        id: `output_prediction_master`,
        label: 'Output Prediction HUD',
        finalValue: dps,
        operation: 'scaling',
        contributors: [
            { 
                label: 'Kinetic Component', 
                value: physicalProfile.expected, 
                type: 'stat',
                childTrace: physicalProfile.masterTrace 
            },
            { 
                label: 'Keyword Component', 
                value: keywordExpectedPerShot, 
                type: 'stat',
                childTrace: keywordProfile?.masterTrace 
            },
            { label: 'Fire Rate (Bullets/Sec)', value: bulletsPerSecond, type: 'multiplier' }
        ],
        timestamp: Date.now()
    };

    telemetry.record(masterTrace);
    return dps;
}, [...]);
```

## 4. Verification & Proof

### 4.1. Visual Proof
Opening the **ENGINE** tab and expanding "Output Prediction HUD" should reveal the "Kinetic Component," and expanding that should reveal every multiplier bucket (Weapon Damage, Attack %, etc.) used to reach the 589 value.

### 4.2. Grep Proof
- `grep "childTrace: physicalProfile.masterTrace" simulator/src/components/StaticDamagePreview.tsx`
