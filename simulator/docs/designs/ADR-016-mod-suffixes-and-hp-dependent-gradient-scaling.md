# ADR-016: Mod Suffixes & HP-Dependent Gradient Scaling

## Context & Findings

Following a deep-dive analysis of in-game data (Source: `research/data/ingame-screenshots/Mod/LunarCrescentSubstatPercents.png`), we have codified the mechanics of "Lunar" and "Crescent" mod suffixes. 

These suffixes represent a significant shift from static "Additive Buckets" to **Dynamic Multipliers** governed by player state (HP and Shield). For high-end "Edge-of-Death" builds (e.g., Gilded Gloves + Rapid EBR Octopus), these suffixes act as the primary engine for exponential scaling.

### Statistical Findings (Gold/Legendary T5 Peak)

| Suffix | Stat Type | Base Value | Scaling Component | Max Condition |
| :--- | :--- | :--- | :--- | :--- |
| **Lunar** | Crit DMG | 0% | +30.0% | HP ≤ 30% |
| **Lunar** | Elem DMG | 0% | +16.0% | HP ≤ 30% |
| **Crescent** | Crit DMG | 10.0% | +15.0% | Shield ≥ 40% |
| **Crescent** | Elem DMG | 5.0% | +8.0% | Shield ≥ 40% |

## Proposed Mathematical Model

To maintain architectural integrity with the **Universal Bucket Topology (ADR-002)**, these scaling effects must be implemented as **Dynamic Multiplier Systems** within the ECS `StatAggregatorSystem`.

### 1. Lunar Scaling (Inverse Gradient)
The Lunar suffix utilizes an **Inverse Linear Interpolation** capped at a threshold.

**Formula**:
```typescript
function calculateLunarBonus(peakValue: number, currentHpPercent: number): number {
    // Community Consensus: Max effect starts at 30% HP
    const threshold = 30;
    const minHp = 0;
    
    if (currentHpPercent <= threshold) return peakValue;
    
    // Linear decay from 30% to 100%
    // Note: In-game baseline at 100% HP is approx 30% of peak (observed ~9% for 30% mod)
    const baselineRatio = 0.3;
    const slope = (1 - baselineRatio) / (100 - threshold);
    const bonusRatio = 1 - (slope * (currentHpPercent - threshold));
    
    return peakValue * Math.max(baselineRatio, bonusRatio);
}
```

### 2. Crescent Scaling (Threshold Trigger)
The Crescent suffix utilizes a **Base + Conditional Extra** logic.

**Formula**:
```typescript
function calculateCrescentBonus(baseVal: number, extraVal: number, currentShieldPercent: number): number {
    const triggerThreshold = 40;
    return currentShieldPercent >= triggerThreshold ? (baseVal + extraVal) : baseVal;
}
```

## Implementation Specification (Verbatim)

### Component Updates (`src/ecs/types.ts`)
```typescript
export interface SuffixComponent {
    type: 'lunar' | 'crescent' | 'none';
    statType: StatType;
    peakValue: number;
    baseValue?: number; // For Crescent base
}

// Add to ModComponent
export interface ModComponent {
    // ... existing
    suffix?: SuffixComponent;
}
```

### System Logic (`src/ecs/systems/stat-aggregator-system.ts`)
```typescript
function applySuffixScaling(ctx: AggregationContext, mod: ModComponent): void {
    if (!mod.suffix) return;
    
    const { type, statType, peakValue, baseValue } = mod.suffix;
    let finalBonus = 0;
    
    if (type === 'lunar') {
        finalBonus = calculateLunarBonus(peakValue, ctx.conditions.playerHpPercent);
    } else if (type === 'crescent') {
        finalBonus = calculateCrescentBonus(baseValue || 0, peakValue, ctx.conditions.playerShieldPercent);
    }
    
    if (finalBonus > 0) {
        ctx.player.stats.add(statType, finalBonus, `Suffix: ${type.toUpperCase()}`);
    }
}
```

## Task & Implementation Tracking

- [ ] Update `src/ecs/types.ts` to include `SuffixComponent` and `SuffixTier`.
- [ ] Implement `applySuffixScaling` in `src/ecs/systems/stat-aggregator-system.ts`.
- [ ] Add Lunar/Crescent data to `src/data/mods.ts` (mapping suffixes to their peak values).
- [ ] Update UI `EncounterConditionsPanel.tsx` to ensure the HP/Shield sliders accurately reflect suffix changes in real-time.
- [ ] Create high-fidelity integration test `src/__tests__/suffix-scaling.test.ts` to verify bit-perfect interpolation at 1%, 30%, 75%, and 100% HP.
