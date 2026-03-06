# ADR-010: Unified Resolver Predictions — Abolishing Legacy Pipelines

**Status:** Proposed
**Date:** 2026-03-05
**Deciders:** Tatum (Project Lead), Gemini CLI (Cleanup Architect)

## 1. Context

The codebase contains a `simulator/src/pipelines/` directory with `physical.ts` and `keyword.ts`. These files implement a legacy version of the damage formula that manually multiplies stats. This approach has led to:
1.  **Mathematical Inconsistency**: The "Static Output Prediction" HUD differs from the actual simulation engine (`DamageEngine.ts`).
2.  **Bugs**: The physical pipeline incorrectly preferred raw weapon base damage over aggregated player stats, leading to mis-scaled output (e.g., 542 instead of 677).
3.  **Maintenance Debt**: Any change to the damage formula (ADR-002 Buckets) must be implemented twice—once in the `resolver.ts` and once in the legacy pipelines.

ADR-002 and ADR-003 established the **Resolver** as the canonical implementation of the damage formula.

## 2. Decision

1.  **Abolish Pipelines**: Delete the `simulator/src/pipelines/` directory entirely.
2.  **Unify on Resolver**: Refactor `StaticDamagePreview.tsx` and `DamageDashboard.tsx` to use the canonical `resolve(...)` and `statValuesFromSnapshot(...)` functions from `engine/resolver.ts`.
3.  **Static Scenario Simulation**: Implement a helper utility to execute "Scenario Scans" (Normal, Crit, WS, Crit+WS) by injecting manual flags into the `ResolutionContext`.

## 3. Verbatim Implementation Specification

### 3.1. Unified Prediction Helper (`resolver.ts`)

```typescript
// simulator/src/engine/resolver.ts

/**
 * Executes a static damage scan across common combat scenarios.
 * Used for UI previews without running a full timeseries simulation.
 */
export function resolveScenarioScan(
    baseDamage: number,
    player: Player,
    targetType: EnemyType,
    traits: ReadonlySet<DamageTrait>,
    unlockedKeywordCrits: ReadonlySet<KeywordType> = new Set()
): {
    noCritNoWs: number;
    critNoWs: number;
    noCritWs: number;
    critWs: number;
    expected: number;
} {
    const statValues = statValuesFromSnapshot(player.stats.snapshot());
    
    const runScenario = (flags: Record<ContextFlag, boolean>) => {
        const ctx = buildResolutionContext(traits, targetType, statValues, new Map(Object.entries(flags) as [ContextFlag, boolean][]), unlockedKeywordCrits);
        return resolve(baseDamage, UNIVERSAL_BUCKETS, ctx).finalDamage;
    };

    const noCritNoWs = runScenario({ wasCrit: false, wasWeakspot: false, wasBurnCrit: false } as any);
    const critNoWs   = runScenario({ wasCrit: true,  wasWeakspot: false, wasBurnCrit: true } as any);
    const noCritWs   = runScenario({ wasCrit: false, wasWeakspot: true,  wasBurnCrit: false } as any);
    const critWs     = runScenario({ wasCrit: true,  wasWeakspot: true,  wasBurnCrit: true } as any);

    // Expected Value Calculation
    const critRate = (player.stats.get(StatType.CritRatePercent)?.value ?? 0) / 100;
    const wsRate   = (player.stats.get(StatType.WeakspotHitRatePercent)?.value ?? 0) / 100;

    const expected = 
        noCritNoWs * (1 - critRate) * (1 - wsRate) +
        critNoWs   * critRate       * (1 - wsRate) +
        noCritWs   * (1 - critRate) * wsRate +
        critWs     * critRate       * wsRate;

    return { noCritNoWs, critNoWs, noCritWs, critWs, expected };
}
```

### 3.2. Refactored `StaticDamagePreview.tsx`

```typescript
// simulator/src/components/StaticDamagePreview.tsx

import React, { useMemo } from 'react';
import { Player } from '../models/player';
import { EncounterConditions } from '../types/common';
import { StatType, DamageTrait, EnemyType } from '../types/enums';
import { DiegeticFrame } from './DiegeticFrame';
import { Target, Zap, Flame, Activity } from 'lucide-react';
import { resolveScenarioScan, KEYWORD_TRAIT_MAP } from '../engine/resolver';

export const StaticDamagePreview: React.FC<{ player: Player, conditions: EncounterConditions }> = ({ player, conditions }) => {
    const weapon = player.loadout.weapon;
    const baseDamage = player.stats.get(StatType.DamagePerProjectile)?.value ?? 0;

    const physicalTraits = useMemo(() => new Set([DamageTrait.Attack, DamageTrait.Weapon]), []);
    const physicalProfile = useMemo(() => 
        resolveScenarioScan(baseDamage, player, conditions.enemyType, physicalTraits),
    [baseDamage, player, conditions.enemyType, physicalTraits]);

    const keywordProfile = useMemo(() => {
        if (!weapon?.keyword) return null;
        const traits = new Set(KEYWORD_TRAIT_MAP[weapon.keyword.type] || []);
        const kwBase = (player.stats.get(weapon.keyword.baseStatType)?.value ?? 0) * (weapon.keyword.scalingFactor || 0);
        return resolveScenarioScan(kwBase, player, conditions.enemyType, traits);
    }, [weapon, player, conditions.enemyType]);

    // ... rendering logic using profiles ...
```

## 4. Verification & Proof

### 4.1. Mathematical Proof
Executing `resolveScenarioScan` with `wasCrit: true` and `wasWeakspot: true` will now correctly trigger the `BucketId.HitAmplifier` bucket in the resolver, ensuring that `CritDamagePercent` and `WeakspotDamagePercent` are summed additively before multiplication, as per ADR-002.

### 4.2. File Deletion
- `rm simulator/src/pipelines/physical.ts`
- `rm simulator/src/pipelines/keyword.ts`
- `rm simulator/src/pipelines/base.ts`
