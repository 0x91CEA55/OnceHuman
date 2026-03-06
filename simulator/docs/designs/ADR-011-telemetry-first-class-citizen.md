# ADR-011: Telemetry as a First-Class Citizen — Structured Calculation Tracing

**Status:** Proposed
**Date:** 2026-03-05
**Deciders:** Tatum (Project Lead), Gemini CLI (Systems Architect)

## 1. Context

The current audit system in `simulator/src/engine/audit-log.ts` relies on flat string concatenation. This makes it difficult to maintain, evolve, or use for deep-dive UI visualizations. To provide absolute transparency ("Zero-Trust"), we need a structured way to trace how every value in the UI was derived.

## 2. Decision

1.  **Abolish String-Based Auditing**: Move away from `auditLog.log(category, label, value, formula)`.
2.  **Structured Trace Model**: Introduce `CalculationTrace` as a recursive tree structure that represents a mathematical operation (Sum, Product, Scaling).
3.  **Traceable PlayerStats**: Update the `Stat` and `PlayerStats` models to record the source of every contribution (e.g., specific armor piece, mod, or buff).
4.  **Telemetry Registry**: Maintain a registry of the most recent "Terminal Traces" for all primary UI values (each Stat, each Damage scenario).

## 3. Verbatim Implementation Specification

### 3.1. Telemetry Types (`simulator/src/types/telemetry.ts`)

```typescript
export type TraceOperation = 'sum' | 'product' | 'scaling' | 'identity' | 'roll';

export interface TraceNode {
    id: string;
    label: string;
    finalValue: number;
    baseValue?: number;
    operation: TraceOperation;
    contributors: Array<TraceContributor>;
    timestamp: number;
}

export interface TraceContributor {
    label: string;
    value: number;
    source?: string;
    type: 'stat' | 'constant' | 'multiplier' | 'flag';
    isPercentage?: boolean;
    childTrace?: TraceNode;
}

export interface TelemetryRegistry {
    stats: Map<StatType, TraceNode>;
    resolutions: Map<string, TraceNode>;
}
```

### 3.2. Traceable Stats (`simulator/src/models/stats.ts`)

```typescript
export interface StatContribution {
    value: number;
    source: string;
}

export abstract class Stat {
    abstract readonly type: StatType;
    public contributions: StatContribution[] = [];
    
    constructor(public baseValue: number, public initialSource: string = 'Baseline') {
        this.contributions.push({ value: baseValue, source: initialSource });
    }

    get value(): number {
        return this.contributions.reduce((sum, c) => sum + c.value, 0);
    }

    add(value: number, source: string): void {
        if (value === 0) return;
        this.contributions.push({ value, source });
    }
}
```

### 3.3. Refactored Stat Aggregator (`simulator/src/engine/stat-aggregator.ts`)

```typescript
// ... inside aggregate ...
// Ammunition
if (ammo.weaponDamageBonus > 0) {
    player.stats.add(StatType.WeaponDamagePercent, ammo.weaponDamageBonus, `Ammunition: ${ammo.name}`);
}

// Statuses
for (const contrib of def.statContributions) {
    const bonus = contrib.valuePerStack * buffInstance.currentStacks;
    player.stats.add(contrib.stat, bonus, `Status: ${def.name} (${buffInstance.currentStacks}x)`);
}
```

### 3.4. Structured Resolver (`simulator/src/engine/resolver.ts`)

```typescript
export function resolve(
    baseDamage: number,
    buckets: readonly BucketDef[],
    ctx: ResolutionContext,
    recordTrace: boolean = false
): { finalDamage: number; trace?: TraceNode } {
    let result = baseDamage;
    const contributors: TraceContributor[] = [];

    for (const bucket of buckets) {
        let bucketSum = 0;
        const bucketContributors: TraceContributor[] = [];
        for (const contributor of bucket.contributors) {
            if (evaluate(contributor.condition, ctx)) {
                const val = ctx.statValues.get(contributor.stat) ?? 0;
                if (val !== 0) {
                    bucketSum += val;
                    bucketContributors.push({ label: contributor.stat, value: val, type: 'stat', isPercentage: true });
                }
            }
        }
        const multiplier = 1 + bucketSum / 100;
        result *= multiplier;
        if (multiplier !== 1) {
            contributors.push({
                label: `Bucket: ${bucket.id}`,
                value: multiplier,
                type: 'multiplier',
                childTrace: {
                    id: bucket.id,
                    label: bucket.id,
                    finalValue: multiplier,
                    operation: 'sum',
                    contributors: bucketContributors,
                    timestamp: Date.now()
                }
            });
        }
    }
    // ...
}
```

## 4. Verification & Proof

### 4.1. Unit Test
Implement `telemetry.test.ts` to verify that adding a stat with a source is correctly recorded and retrievable via the trace.

### 4.2. Functional Proof
The **ENGINE** tab in the UI will no longer show "Resolver: Bucket: weapon_damage | x1.150" as a string, but as a structured list item that can be expanded to show `StatType.WeaponDamagePercent: 15% (Source: Tungsten AP)`.
