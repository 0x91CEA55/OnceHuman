# ADR-007: Context-Aware Effect Resolution — Breaking the `applyStatic` Barrier

**Status:** Proposed
**Date:** 2026-03-05
**Deciders:** Tatum (Project Lead), Claude Code (Fresh Context Review)
**Supersedes:** ADR-006 (Phase 3 Implementation Directives — absorbs and corrects)

---

## 1. Problem Statement

### 1.1. The `applyStatic` Barrier (Blocks ADR-006 Phase 3)

ADR-006 mandated converting `MomentumUp` from `MomentumUpMod.applyCustomLogic` to two `ConditionalEffect` instances whose predicates depend on `ctx.ammoPercent`. However, a structural incompatibility in `BaseEffect.applyStatic` prevents this from working correctly.

The `BaseEffect.applyStatic` signature is:

```typescript
abstract applyStatic(player: Player, conditions: EncounterConditions, multiplier: number): void;
```

It does not receive `ammoPercent`. As a result, `ConditionalEffect.applyStatic` must construct a fresh `AggregationContext` internally — and it hardcodes `ammoPercent: 1.0`:

```typescript
// simulator/src/models/effect.ts — CURRENT BROKEN STATE
applyStatic(player: Player, conditions: EncounterConditions, multiplier: number = 1): void {
    const ctx: AggregationContext = {
        player,
        conditions,
        ammoPercent: 1.0,  // ← HARDCODED. Breaks any predicate that reads ammoPercent.
        loadout: player.loadout
    };
    if (this.predicate(ctx)) { ... }
}
```

The ADR-006 spec for `DynamicStatEffect.applyStatic` has the **identical defect**:

```typescript
// ADR-006 §2.1 spec — DEFECTIVE AS WRITTEN
applyStatic(player: Player, conditions: EncounterConditions, multiplier: number = 1): void {
    const ctx: AggregationContext = {
        player,
        conditions,
        ammoPercent: 1.0,  // ← HARDCODED. Makes any ammoPercent-based valueFn inert.
        loadout: player.loadout
    };
    ...
}
```

**Impact:** If `MomentumUp` is refactored per ADR-006 spec using `ConditionalEffect`, the predicate `(ctx) => ctx.ammoPercent <= 0.5` would **never fire**, because the hardcoded context always presents `ammoPercent: 1.0`. The second-half-of-mag weapon damage bonus would silently vanish. The custom subclass is the only currently working path.

### 1.2. ADR-006 Not Yet Implemented (As of 2026-03-05)

A grep-level audit confirms the following ADR-006 Phase 3 directives remain unimplemented:

| Directive | Expected State | Actual State |
|-----------|---------------|-------------|
| `DynamicStatEffect` in `effect.ts` | Present | **Absent** |
| `MomentumUpMod` subclass | Abolished | **Still present** |
| `FatefulStrikeMod` subclass | Abolished | **Still present** |
| `RushHourMod` subclass | Abolished | **Still present** |
| Mod slot assignments | Correct per gear slot | **All `ArmorSlot.Helmet`** |
| `FatefulStrike.permanentEffects` | `CritRate +10`, `CritDmg +30` | **Only `CannotDealWeakspotDamage`** |
| `RushHour.permanentEffects` | Two `DynamicStatEffect` entries | **Empty `[]`** |
| `MomentumUp.permanentEffects` | Two `ConditionalEffect` entries | **Empty `[]`** |
| `complex-loadout-integration.test.ts` | Present | **Absent** |

Additionally, `FatefulStrikeMod.applyCustomLogic` contains a **state mutation bug** that grows unboundedly on repeated aggregation:

```typescript
// simulator/src/data/mods.ts — BUG: mutates weapon.intrinsicEffects every cycle
class FatefulStrikeMod extends Mod {
    protected override applyCustomLogic(ctx: AggregationContext): void {
        ctx.player.stats.add(StatType.CritRatePercent, 10);
        ctx.player.stats.add(StatType.CritDamagePercent, 30);
        // BUG: This pushes a new SetFlagEffect on every call, growing weapon.intrinsicEffects forever
        ctx.loadout.weapon?.intrinsicEffects.push(new SetFlagEffect(FlagType.CannotDealWeakspotDamage, true));
    }
}
```

### 1.3. ADR-006 Test Math Error — `CritDamagePercent` Off by 40

The ADR-006 complex integration test asserts:

```typescript
// ADR-006 §2.3 — INCORRECT
expect(player.stats.get(StatType.CritDamagePercent)?.value).toBe(120);
// Comment: "CD: 30 (Fateful Strike) + 60 (Weapon Substats) + 30 (Gloves Substats) = 120"
```

This omits the Octopus weapon's base `critDamagePercent` stat. In `createWeapon`, `wStats.critDamagePercent.value` is set from the raw data (`crit_damage_percent: 40`) and applied unconditionally in `Weapon.applyBaseStats`. The `ScalingEngine` only scales `DamagePerProjectile` — base CD is never scaled.

**Correct calculation:**
```
CD: 40 (Octopus base) + 30 (FatefulStrike) + 60 (Weapon Substats) + 30 (Gloves Substats) = 160
```

### 1.4. ADR-006 Test Import Error — `SubstatTier` in Wrong Module

The ADR-006 test spec imports `SubstatTier` from `'../types/enums'`:

```typescript
// ADR-006 §2.3 — INCORRECT IMPORT
import { ArmorKey, WeaponKey, ModKey, StatType, FlagType, SubstatTier } from '../types/enums';
```

`SubstatTier` is defined in `simulator/src/models/substat.ts`, not `types/enums.ts`. This import would fail at compile time.

---

## 2. Decision: `applyWithContext` Pattern

We introduce a single, non-breaking extension to `BaseEffect`:

```typescript
applyWithContext(ctx: AggregationContext, multiplier?: number): void
```

**Default implementation** delegates to the existing `applyStatic`, preserving full backward compatibility for all current effect subclasses (`IncreaseStatEffect`, `SetFlagEffect`, `StaticAttributeEffect`, etc.).

**Override in `ConditionalEffect`** uses the real `ctx.ammoPercent` rather than hardcoding 1.0.

**Override in `DynamicStatEffect`** (new, per ADR-006 §2.1) uses the real `ctx` throughout.

All call sites within the aggregation pipeline — `Mod.apply`, `Weapon.applyIntrinsicLogic`, `KeyArmor.applyIntrinsicLogic`, and `Loadout.applySetBonuses` — are updated to call `applyWithContext(ctx, 1)` in place of `applyStatic(ctx.player, ctx.conditions, 1)`.

`Weapon.applyBaseStats` retains `applyStatic` calls since those effects are always `StaticAttributeEffect` and never need `ammoPercent`.

### Rationale

This is the minimal change that unblocks ADR-006 without altering `applyStatic` signatures (which would require updating every existing effect subclass and every test that calls effects directly). It preserves the "pure data, pure function" mandate of ADR-003 — effects remain stateless data objects; the context is what flows through.

---

## 3. Verbatim Implementation Specification

### 3.1. `effect.ts` — Add `applyWithContext` + `DynamicStatEffect`

```typescript
// simulator/src/models/effect.ts

import { StatType, FlagType } from '../types/enums';
import { Player } from './player';
import { EncounterConditions, AggregationContext } from '../types/common';

/**
 * Legacy compatibility shim — executeDynamic no longer called by the engine.
 * @deprecated Use TriggerDefinition / EffectDef (ADR-003) for all dynamic effects.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LegacyCombatContext = any;

export abstract class BaseEffect {
    constructor(public source?: string) {}

    abstract applyStatic(player: Player, conditions: EncounterConditions, multiplier: number): void;

    /**
     * ADR-007: Context-aware application path.
     * Default delegates to applyStatic for backward compat.
     * Override in effects that require ctx.ammoPercent or other context fields.
     */
    applyWithContext(ctx: AggregationContext, multiplier: number = 1): void {
        this.applyStatic(ctx.player, ctx.conditions, multiplier);
    }

    /** @deprecated Not called by the ADR-003 engine. Stub implementations are acceptable. */
    executeDynamic(_ctx: LegacyCombatContext, _event?: unknown): void {}
    abstract getDescription(): string;
    abstract clone(newSource?: string): BaseEffect;
}

export class ConditionalEffect extends BaseEffect {
    constructor(
        public readonly predicate: (ctx: AggregationContext) => boolean,
        public readonly effects: BaseEffect[],
        source?: string
    ) {
        super(source);
    }

    applyStatic(player: Player, conditions: EncounterConditions, multiplier: number = 1): void {
        // Legacy path: builds context with hardcoded ammoPercent=1.0.
        // Use applyWithContext for ammo-sensitive predicates.
        const ctx: AggregationContext = {
            player,
            conditions,
            ammoPercent: 1.0,
            loadout: player.loadout
        };
        if (this.predicate(ctx)) {
            for (const effect of this.effects) {
                effect.applyStatic(player, conditions, multiplier);
            }
        }
    }

    /**
     * ADR-007: Override to propagate real ammoPercent from the outer context.
     * This is the correct path for ammo-sensitive conditionals (e.g. MomentumUp).
     */
    override applyWithContext(ctx: AggregationContext, multiplier: number = 1): void {
        if (this.predicate(ctx)) {
            for (const effect of this.effects) {
                effect.applyWithContext(ctx, multiplier);
            }
        }
    }

    getDescription(): string {
        return `Conditional: ${this.effects.map(e => e.getDescription()).join(', ')}`;
    }

    clone(newSource?: string): ConditionalEffect {
        return new ConditionalEffect(this.predicate, this.effects.map(e => e.clone()), newSource ?? this.source);
    }
}

/**
 * ADR-006 §2.1 / ADR-007: Effect whose stat contribution is computed at aggregation time.
 * Supports stack-dependent, position-dependent, or condition-derived bonuses.
 * Uses applyWithContext exclusively — applyStatic delegates but loses ammoPercent precision.
 */
export class DynamicStatEffect extends BaseEffect {
    constructor(
        public readonly stat: StatType,
        public readonly valueFn: (ctx: AggregationContext) => number,
        source?: string
    ) {
        super(source);
    }

    applyStatic(player: Player, conditions: EncounterConditions, multiplier: number = 1): void {
        // Fallback: ammoPercent is 1.0. Correct for HP/Sanity-dependent mods,
        // incorrect for ammo-position-dependent mods. Prefer applyWithContext.
        const ctx: AggregationContext = {
            player,
            conditions,
            ammoPercent: 1.0,
            loadout: player.loadout
        };
        const dynamicValue = this.valueFn(ctx);
        player.stats.add(this.stat, dynamicValue * multiplier);
    }

    /**
     * ADR-007: Override for full-fidelity context access.
     */
    override applyWithContext(ctx: AggregationContext, multiplier: number = 1): void {
        const dynamicValue = this.valueFn(ctx);
        ctx.player.stats.add(this.stat, dynamicValue * multiplier);
    }

    getDescription(): string {
        return `Dynamic calculation for ${this.stat}`;
    }

    clone(newSource?: string): DynamicStatEffect {
        return new DynamicStatEffect(this.stat, this.valueFn, newSource ?? this.source);
    }
}

export class IncreaseStatEffect extends BaseEffect {
    constructor(
        public readonly stat: StatType,
        public readonly value: number,
        source?: string
    ) {
        super(source);
    }

    applyStatic(player: Player, _conditions: EncounterConditions, multiplier: number = 1): void {
        player.stats.add(this.stat, this.value * multiplier);
    }

    getDescription(): string {
        return `Increase ${this.stat} by ${this.value}`;
    }

    clone(newSource?: string): IncreaseStatEffect {
        return new IncreaseStatEffect(this.stat, this.value, newSource ?? this.source);
    }
}

export class SetFlagEffect extends BaseEffect {
    constructor(
        public readonly flag: FlagType,
        public readonly value: boolean,
        source?: string
    ) {
        super(source);
    }

    applyStatic(player: Player, _conditions: EncounterConditions, _multiplier: number = 1): void {
        player.setFlag(this.flag, this.value);
    }

    getDescription(): string {
        return `Set flag ${this.flag} to ${this.value}`;
    }

    clone(newSource?: string): SetFlagEffect {
        return new SetFlagEffect(this.flag, this.value, newSource ?? this.source);
    }
}

export class StaticAttributeEffect extends BaseEffect {
    constructor(
        public readonly stat: StatType,
        public readonly value: number,
        source?: string
    ) {
        super(source);
    }

    applyStatic(player: Player, _conditions: EncounterConditions, multiplier: number = 1): void {
        player.stats.add(this.stat, this.value * multiplier);
    }

    getDescription(): string {
        return `${this.stat.replace(/_/g, ' ')}: +${this.value}`;
    }

    clone(newSource?: string): StaticAttributeEffect {
        return new StaticAttributeEffect(this.stat, this.value, newSource ?? this.source);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy effect class shells — kept for BuildBreakdown.tsx instanceof checks.
// executeDynamic is a no-op stub; the ADR-003 engine uses EffectDef instead.
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated ADR-003: replaced by DynEffectType.DamageInstance in trigger-definitions.ts */
export class ShrapnelEffect extends BaseEffect {
    constructor(source?: string) { super(source || 'Shrapnel'); }
    applyStatic(_player: Player, _conditions: EncounterConditions, _multiplier: number = 1): void {}
    getDescription(): string { return `Trigger Shrapnel (50% Attack)`; }
    clone(newSource?: string): ShrapnelEffect { return new ShrapnelEffect(newSource ?? this.source); }
}

/** @deprecated ADR-003: replaced by DynEffectType.DamageInstance in trigger-definitions.ts */
export class ExplosionEffect extends BaseEffect {
    constructor(
        public readonly scalingFactor: number,
        public readonly statType: StatType,
        public readonly cooldownSeconds: number = 0,
        source?: string
    ) { super(source); }
    applyStatic(_player: Player, _conditions: EncounterConditions, _multiplier: number = 1): void {}
    getDescription(): string { return `Trigger explosion scaling ${this.scalingFactor}x off ${this.statType}`; }
    clone(newSource?: string): ExplosionEffect {
        return new ExplosionEffect(this.scalingFactor, this.statType, this.cooldownSeconds, newSource ?? this.source);
    }
}

/** @deprecated ADR-003: replaced by DynEffectType.ApplyBuff + BuffDefinition in status-registry.ts */
export class BuffEffect extends BaseEffect {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly durationSeconds: number,
        public readonly maxStacks: number,
        public readonly effects: BaseEffect[],
        source?: string
    ) { super(source); }
    applyStatic(_player: Player, _conditions: EncounterConditions, _multiplier: number = 1): void {}
    getDescription(): string { return `Grants ${this.name} buff for ${this.durationSeconds}s`; }
    clone(newSource?: string): BuffEffect {
        return new BuffEffect(this.id, this.name, this.durationSeconds, this.maxStacks, this.effects.map(e => e.clone()), newSource ?? this.source);
    }
}

/** @deprecated ADR-003: replaced by DynEffectType.ApplyDoT + DoTDefinition in status-registry.ts */
export class DoTEffect extends BaseEffect {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly tickInterval: number,
        public readonly durationSeconds: number,
        public readonly maxStacks: number,
        public readonly scalingFactor: number,
        public readonly baseStatType: StatType,
        public readonly trait: string,
        public readonly maxStacksStat?: StatType,
        public readonly durationStat?: StatType,
        source?: string
    ) { super(source); }
    applyStatic(_player: Player, _conditions: EncounterConditions, _multiplier: number = 1): void {}
    getDescription(): string { return `Inflicts ${this.name} DoT for ${this.durationSeconds}s`; }
    clone(newSource?: string): DoTEffect {
        return new DoTEffect(this.id, this.name, this.tickInterval, this.durationSeconds, this.maxStacks, this.scalingFactor, this.baseStatType, this.trait, this.maxStacksStat, this.durationStat, newSource ?? this.source);
    }
}
```

### 3.2. `equipment.ts` — Update Call Sites to `applyWithContext`

Four call sites must be updated. Only the changed methods are shown:

```typescript
// simulator/src/models/equipment.ts

// In class Mod:
apply(ctx: AggregationContext): void {
    // 1. Apply Substats
    for (const sub of this.substats) {
        const eff = new StaticAttributeEffect(sub.type, sub.value, `Mod Substat: ${this.definition.name}`);
        ctx.player.activeEffects.push(eff);
        eff.applyWithContext(ctx, 1);  // ADR-007: was applyStatic(ctx.player, ctx.conditions, 1)
    }

    // 2. Apply Permanent Logic
    for (const eff of this.definition.permanentEffects) {
        ctx.player.activeEffects.push(eff);
        eff.applyWithContext(ctx, 1);  // ADR-007: was applyStatic(ctx.player, ctx.conditions, 1)
    }

    // 3. Custom strategy hook (no subclasses exist post-ADR-007)
    this.applyCustomLogic(ctx);
}

// In class KeyArmor:
protected override applyIntrinsicLogic(ctx: AggregationContext): void {
    for (const effect of this.intrinsicEffects) {
        ctx.player.activeEffects.push(effect);
        effect.applyWithContext(ctx, 1);  // ADR-007: was applyStatic(ctx.player, ctx.conditions, 1)
    }
}

// In class Weapon:
protected override applyIntrinsicLogic(ctx: AggregationContext): void {
    for (const effect of this.intrinsicEffects) {
        ctx.player.activeEffects.push(effect);
        effect.applyWithContext(ctx, 1);  // ADR-007: was applyStatic(ctx.player, ctx.conditions, 1)
    }

    const calibEffects = this.calibrationMatrix.getStyleEffects(this.type);
    for (const effect of calibEffects) {
        ctx.player.activeEffects.push(effect);
        effect.applyWithContext(ctx, 1);  // ADR-007: was applyStatic(ctx.player, ctx.conditions, 1)
    }
}

// In class Loadout, private applySetBonuses:
private applySetBonuses(ctx: AggregationContext): void {
    // ... (set counting logic unchanged) ...
    for (const setId in setCounts) {
        const count = setCounts[setId];
        const definition = setDefinitions[setId];
        for (const bonus of definition.bonuses) {
            if (count >= bonus.requiredPieces) {
                for (const effect of bonus.effects) {
                    ctx.player.activeEffects.push(effect);
                    effect.applyWithContext(ctx, 1);  // ADR-007: was applyStatic(ctx.player, ctx.conditions, 1)
                }
            }
        }
    }
}
```

### 3.3. `mods.ts` — Pure-Data Refactor (Abolish Custom Subclasses, Fix Slots)

All three custom subclasses (`MomentumUpMod`, `FatefulStrikeMod`, `RushHourMod`) are abolished. All logic moves into `permanentEffects` using `ConditionalEffect` and `DynamicStatEffect`. All mod slot assignments are corrected to their authoritative gear slots.

```typescript
// simulator/src/data/mods.ts

import { StatType, FlagType, WeaponSlot, ArmorSlot, ModKey } from '../types/enums';
import { ModData, Mod } from '../models/equipment';
import { Substat, SubstatTier } from '../models/substat';
import { IncreaseStatEffect, SetFlagEffect, ConditionalEffect, DynamicStatEffect } from '../models/effect';
import {
    WORK_OF_PROFICIENCY_TRIGGERS,
    FIRST_MOVE_ADVANTAGE_TRIGGERS,
    PRECISE_STRIKE_TRIGGERS,
} from './trigger-definitions';

export const MOD_DATA: Record<ModKey, ModData> = {
    [ModKey.FatefulStrike]: new ModData(
        ModKey.FatefulStrike,
        'Fateful Strike',
        ArmorSlot.Mask,  // ADR-007: was ArmorSlot.Helmet
        'Cannot deal Weakspot DMG. Crit rate +10% and Crit DMG +30%',
        [
            new SetFlagEffect(FlagType.CannotDealWeakspotDamage, true),
            new IncreaseStatEffect(StatType.CritRatePercent, 10),    // ADR-007: was missing (was in applyCustomLogic)
            new IncreaseStatEffect(StatType.CritDamagePercent, 30),  // ADR-007: was missing (was in applyCustomLogic)
        ],
        []
    ),
    [ModKey.DeviationExpert]: new ModData(
        ModKey.DeviationExpert,
        'Deviation Expert',
        WeaponSlot.Main,  // ADR-007: was ArmorSlot.Helmet
        'Range -25%, Fire Rate +10%, Status DMG +20%',
        [
            new IncreaseStatEffect(StatType.FireRate, 10),
            new IncreaseStatEffect(StatType.StatusDamagePercent, 20)
        ],
        []
    ),
    [ModKey.MomentumUp]: new ModData(
        ModKey.MomentumUp,
        'Momentum Up',
        ArmorSlot.Top,  // ADR-007: was ArmorSlot.Helmet
        'Fire Rate +10% for first 50% of mag, Weapon DMG +30% for second half.',
        [
            // ADR-007: Both conditions use applyWithContext → real ammoPercent.
            // With applyStatic (legacy path), ammoPercent is 1.0 and second condition never fires.
            new ConditionalEffect(
                (ctx) => ctx.ammoPercent > 0.5,
                [new IncreaseStatEffect(StatType.FireRate, 10)]
            ),
            new ConditionalEffect(
                (ctx) => ctx.ammoPercent <= 0.5,
                [new IncreaseStatEffect(StatType.WeaponDamagePercent, 30)]
            ),
        ],
        []
    ),
    [ModKey.PreciseStrike]: new ModData(
        ModKey.PreciseStrike,
        'Precise Strike',
        ArmorSlot.Helmet,  // Correct: Helmet slot
        'Hitting Weakspots grants +12.0% Weakspot DMG for 3s, up to 3 stacks',
        [],
        PRECISE_STRIKE_TRIGGERS
    ),
    [ModKey.ElementalResonance]: new ModData(
        ModKey.ElementalResonance,
        'Elemental Resonance',
        ArmorSlot.Pants,  // Correct: already was Pants
        'Elemental DMG +20% (Simplified snapshot)',
        [new IncreaseStatEffect(StatType.ElementalDamagePercent, 20)],
        []
    ),
    [ModKey.RushHour]: new ModData(
        ModKey.RushHour,
        'Rush Hour',
        ArmorSlot.Boots,  // Correct: already was Boots
        'Every 10% HP loss grants +4% Melee, Weapon, and Status DMG.',
        [
            // ADR-007: Pure data. valueFn reads conditions.playerHpPercent via ctx.
            new DynamicStatEffect(
                StatType.WeaponDamagePercent,
                (ctx) => Math.floor((100 - ctx.conditions.playerHpPercent) / 10) * 4
            ),
            new DynamicStatEffect(
                StatType.StatusDamagePercent,
                (ctx) => Math.floor((100 - ctx.conditions.playerHpPercent) / 10) * 4
            ),
        ],
        []
    ),
    [ModKey.FlameResonance]: new ModData(
        ModKey.FlameResonance,
        'Flame Resonance',
        WeaponSlot.Main,  // Correct: already was WeaponSlot.Main
        'Max Burn stack +2, Burn duration -20.0%',
        [
            new IncreaseStatEffect(StatType.MaxBurnStacks, 2),
            new IncreaseStatEffect(StatType.BurnDurationPercent, -20)
        ],
        []
    ),
    [ModKey.Embers]: new ModData(
        ModKey.Embers,
        'Embers',
        WeaponSlot.Main,  // Correct: already was WeaponSlot.Main
        'When Burn is removed, stacks only -50%',
        [],
        []
    ),
    [ModKey.WorkOfProficiency]: new ModData(
        ModKey.WorkOfProficiency,
        'Work Of Proficiency',
        ArmorSlot.Gloves,  // ADR-007: was ArmorSlot.Helmet
        'Reloading empty magazine: Reload Speed +10% and Elemental DMG +20% for 5s.',
        [],
        WORK_OF_PROFICIENCY_TRIGGERS
    ),
    [ModKey.FirstMoveAdvantage]: new ModData(
        ModKey.FirstMoveAdvantage,
        'First-Move Advantage',
        ArmorSlot.Gloves,  // ADR-007: was ArmorSlot.Helmet
        'For 2s after reloading: Crit Rate +10% and Crit DMG +20%.',
        [],
        FIRST_MOVE_ADVANTAGE_TRIGGERS
    ),
    [ModKey.MagExpansion]: new ModData(
        ModKey.MagExpansion,
        'Mag Expansion',
        ArmorSlot.Helmet,  // Correct: already was Helmet
        'Reloading empty magazine increases capacity by 30%.',
        [new IncreaseStatEffect(StatType.MagazineCapacity, 30)],
        []
    ),
    [ModKey.ElementalHavoc]: new ModData(
        ModKey.ElementalHavoc,
        'Elemental Havoc',
        ArmorSlot.Top,  // ADR-007: was ArmorSlot.Helmet
        'Elemental DMG +10%. When HP above 90%, additional +10% Elemental DMG.',
        [
            new IncreaseStatEffect(StatType.ElementalDamagePercent, 10),
            new ConditionalEffect(
                (ctx) => ctx.conditions.playerHpPercent >= 90,
                [new IncreaseStatEffect(StatType.ElementalDamagePercent, 10)]
            )
        ],
        []
    )
};

/**
 * ADR-007: All mods are now pure data. No custom subclasses remain.
 * createModInstance is a simple factory with no dispatch logic.
 */
export function createModInstance(
    modKey: ModKey,
    substats: [Substat, Substat, Substat, Substat]
): Mod {
    const data = MOD_DATA[modKey];
    if (!data) throw new Error(`Mod ${modKey} not found`);
    return new Mod(data, substats);
}

export const MODS = MOD_DATA; // Backwards compatibility for UI

export const DEFAULT_SUBSTATS: [Substat, Substat, Substat, Substat] = [
    new Substat(StatType.CritDamagePercent, SubstatTier.None),
    new Substat(StatType.CritDamagePercent, SubstatTier.None),
    new Substat(StatType.CritDamagePercent, SubstatTier.None),
    new Substat(StatType.CritDamagePercent, SubstatTier.None),
];
```

### 3.4. `complex-loadout-integration.test.ts` — Corrected Integration Test

This is the ADR-006 §2.3 test with three corrections applied:
1. **`SubstatTier` import** corrected from `'../types/enums'` → `'../models/substat'`
2. **`CritDamagePercent` expected value** corrected from `120` → `160` (adds Octopus base +40)
3. **`DamageBonusNormal/Elite/Boss` expected values** corrected from `32` → `32` (4 × 8.0 Gold; values in `SUBSTAT_VALUE_LOOKUP` confirmed correct)

```typescript
// simulator/src/__tests__/complex-loadout-integration.test.ts

import { Player, PlayerStats } from '../models/player';
import { Loadout } from '../models/equipment';
import { EncounterConditions } from '../types/common';
import { ArmorKey, WeaponKey, ModKey, StatType, FlagType } from '../types/enums';
import { Substat, SubstatTier } from '../models/substat';  // ADR-007: corrected import
import { createArmor } from '../data/armor';
import { createWeapon } from '../data/weapons';
import { createModInstance } from '../data/mods';
import { StatAggregator } from '../engine/stat-aggregator';

describe('ADR-007: Complex Loadout Integration — Context-Aware Effects & Pure-Data Mods', () => {

    test('Zero-Trust: 6-Piece Cross-Set Loadout with ammoPercent-dependent Mods', () => {
        const stats = new PlayerStats();
        const loadout = new Loadout();
        const player = new Player(loadout, stats, 100);
        const conditions = new EncounterConditions();

        // Encounter state:
        //   HP = 60%  → Treacherous 2pc ACTIVE (< 70%),  Rush Hour: 4 stacks (+16% WD/SD)
        //   Shield = 50% → Savior 2pc ACTIVE (> 0)
        //   Sanity = 40% → Treacherous 3pc partial bonus INACTIVE (only 2 Treacherous pieces equipped)
        conditions.playerHpPercent = 60;
        conditions.playerShieldPercent = 50;
        conditions.playerSanityPercent = 40;

        // Substat Definitions (Gold Tier)
        const critDmgGold   = new Substat(StatType.CritDamagePercent,      SubstatTier.Gold); // 15%
        const elemDmgGold   = new Substat(StatType.ElementalDamagePercent,  SubstatTier.Gold); // 10%
        const statusDmgGold = new Substat(StatType.StatusDamagePercent,     SubstatTier.Gold); // 10%
        const dmgNormalGold = new Substat(StatType.DamageBonusNormal,       SubstatTier.Gold); //  8%
        const dmgEliteGold  = new Substat(StatType.DamageBonusElite,        SubstatTier.Gold); //  8%
        const dmgBossGold   = new Substat(StatType.DamageBonusBoss,         SubstatTier.Gold); //  8%

        // 1. Weapon: Octopus (6*, T5, 10 calib) + DeviationExpert + 4x CritDmgGold (60% CD from substats)
        const wMod = createModInstance(ModKey.DeviationExpert, [critDmgGold, critDmgGold, critDmgGold, critDmgGold]);
        player.loadout.weapon = createWeapon(WeaponKey.OctopusGrilledRings, 6, 5, 10, wMod);

        // 2. Helmet: Savior (5*, T5) + PreciseStrike + 4x ElemDmgGold (40% ED from substats)
        const hMod = createModInstance(ModKey.PreciseStrike, [elemDmgGold, elemDmgGold, elemDmgGold, elemDmgGold]);
        player.loadout.helmet = createArmor(ArmorKey.SaviorHelmet, 5, 5, 0, hMod);  // Psi: round(92 × 1.0 × 1.20) = 110

        // 3. Top: Savior (3*, T5) + MomentumUp + 4x StatusDmgGold (40% SD from substats)
        //    ammoPercent = 0.4 → second-half condition fires → WD +30 (NOT FireRate +10)
        const tMod = createModInstance(ModKey.MomentumUp, [statusDmgGold, statusDmgGold, statusDmgGold, statusDmgGold]);
        player.loadout.top = createArmor(ArmorKey.SaviorTop, 3, 5, 0, tMod);        // Psi: round(64 × 1.0 × 1.10) = 70

        // 4. Pants: Savior (1*, T5) + ElementalResonance + 4x DmgNormalGold (32% Normal from substats)
        const pMod = createModInstance(ModKey.ElementalResonance, [dmgNormalGold, dmgNormalGold, dmgNormalGold, dmgNormalGold]);
        player.loadout.pants = createArmor(ArmorKey.SaviorPants, 1, 5, 0, pMod);    // Psi: round(64 × 1.0 × 1.00) = 64

        // 5. Mask: Treacherous (4*, T5) + FatefulStrike + 4x DmgEliteGold (32% Elite from substats)
        const mMod = createModInstance(ModKey.FatefulStrike, [dmgEliteGold, dmgEliteGold, dmgEliteGold, dmgEliteGold]);
        player.loadout.mask = createArmor(ArmorKey.TreacherousMask, 4, 5, 0, mMod); // Psi: round(115 × 1.0 × 1.15) = 132

        // 6. Boots: Treacherous (2*, T5) + RushHour + 4x DmgBossGold (32% Boss from substats)
        const bMod = createModInstance(ModKey.RushHour, [dmgBossGold, dmgBossGold, dmgBossGold, dmgBossGold]);
        player.loadout.boots = createArmor(ArmorKey.TreacherousBoots, 2, 5, 0, bMod); // Psi: round(46 × 1.0 × 1.05) = 48

        // 7. Gloves: Gilded (6*, T5) + WorkOfProficiency + 2x CritDmgGold + 2x ElemDmgGold (30% CD, 20% ED from substats)
        const gMod = createModInstance(ModKey.WorkOfProficiency, [critDmgGold, critDmgGold, elemDmgGold, elemDmgGold]);
        player.loadout.gloves = createArmor(ArmorKey.GildedGloves, 6, 5, 0, gMod);  // Psi: round(97 × 1.0 × 1.25) = 121

        // Execute Aggregation at 40% ammo (second half of magazine → MomentumUp WD fires)
        StatAggregator.aggregate(player, conditions, 0.4);

        // ── Verification 1: Psi Intensity Scaling ───────────────────────────────
        // 110 (SaviorHelmet 5*) + 70 (SaviorTop 3*) + 64 (SaviorPants 1*)
        // + 132 (TreacherousMask 4*) + 48 (TreacherousBoots 2*) + 121 (GildedGloves 6*) = 545
        expect(player.stats.get(StatType.PsiIntensity)?.value).toBe(545);

        // ── Verification 2: WeaponDamagePercent ────────────────────────────────
        // Savior 2pc (shield active):  +10
        // Savior 3pc (unconditional):  +20   → Total Savior: +30
        // Treacherous 2pc (HP < 70%): +12
        // MomentumUp (ammo <= 50%):   +30   ← requires applyWithContext (ADR-007)
        // RushHour (4 stacks × 4%):   +16
        // Total: 30 + 12 + 30 + 16 = 88
        expect(player.stats.get(StatType.WeaponDamagePercent)?.value).toBe(88);

        // ── Verification 3: StatusDamagePercent ────────────────────────────────
        // Savior 2pc:         +10
        // Savior 3pc:         +20  → Total Savior: +30
        // Treacherous 2pc:    +12
        // DeviationExpert:    +20
        // RushHour (4 stacks): +16
        // Top Substats (4x):  +40
        // Total: 30 + 12 + 20 + 16 + 40 = 118
        expect(player.stats.get(StatType.StatusDamagePercent)?.value).toBe(118);

        // ── Verification 4: ElementalDamagePercent ─────────────────────────────
        // Octopus intrinsic:           +30
        // ElementalResonance mod:      +20
        // Helmet substats (4x Gold):   +40
        // Gloves substats (2x Gold):   +20
        // Total: 30 + 20 + 40 + 20 = 110
        expect(player.stats.get(StatType.ElementalDamagePercent)?.value).toBe(110);

        // ── Verification 5: CritDamagePercent ─────────────────────────────────
        // ADR-007 CORRECTION from ADR-006 spec (was 120, must be 160):
        // Octopus base CD (from WeaponStats.critDamagePercent):  +40  ← ADR-006 omitted this
        // FatefulStrike permanentEffects:                        +30  ← ADR-007: moved from applyCustomLogic
        // Weapon mod substats (4x CritDmgGold):                 +60
        // Gloves mod substats (2x CritDmgGold):                 +30
        // Total: 40 + 30 + 60 + 30 = 160
        expect(player.stats.get(StatType.CritDamagePercent)?.value).toBe(160);

        // ── Verification 6: Target-Type Damage Bonuses ────────────────────────
        // Each: 4x Gold substat (8% each) = 32%
        expect(player.stats.get(StatType.DamageBonusNormal)?.value).toBe(32);
        expect(player.stats.get(StatType.DamageBonusElite)?.value).toBe(32);
        expect(player.stats.get(StatType.DamageBonusBoss)?.value).toBe(32);

        // ── Verification 7: Flag State ────────────────────────────────────────
        // GildedGloves intrinsic: KeywordCanCrit = true
        // FatefulStrike permanentEffects: CannotDealWeakspotDamage = true
        expect(player.hasFlag(FlagType.KeywordCanCrit)).toBe(true);
        expect(player.hasFlag(FlagType.CannotDealWeakspotDamage)).toBe(true);
    });

    test('Zero-Trust: MomentumUp fires FireRate at first-half ammo, not WD', () => {
        // Verifies that applyWithContext correctly selects the first-half branch
        // when ammoPercent > 0.5 — the mirror test of the main complex loadout.
        const stats = new PlayerStats();
        const loadout = new Loadout();
        const player = new Player(loadout, stats, 100);
        const conditions = new EncounterConditions();

        const critDmgGold = new Substat(StatType.CritDamagePercent, SubstatTier.Gold);
        const mod = createModInstance(ModKey.MomentumUp, [critDmgGold, critDmgGold, critDmgGold, critDmgGold]);
        player.loadout.top = createArmor(ArmorKey.SaviorTop, 1, 5, 0, mod);

        // First half of magazine: ammoPercent = 0.8
        StatAggregator.aggregate(player, conditions, 0.8);

        // FireRate bonus from first-half condition fires
        expect(player.stats.get(StatType.FireRate)?.value).toBeGreaterThan(0);
        // WeaponDamagePercent must be zero (second-half condition must NOT fire)
        expect(player.stats.get(StatType.WeaponDamagePercent)?.value ?? 0).toBe(0);
    });
});
```

---

## 4. Verification Proof

### 4.1. Deterministic Math Verification (The 160 Test)

The `CritDamagePercent = 160` assertion is verifiable by tracing the aggregation pipeline:

| Source | Value | Via |
|--------|-------|-----|
| Octopus `WeaponStats.critDamagePercent` | +40 | `Weapon.applyBaseStats` → `StaticAttributeEffect` |
| `FatefulStrike.permanentEffects[CritDamagePercent]` | +30 | `Mod.apply` → `eff.applyWithContext` |
| `DeviationExpert` substats (4 × CritDmgGold = 4 × 15) | +60 | `Mod.apply` substats loop |
| `WorkOfProficiency` substats (2 × CritDmgGold = 2 × 15) | +30 | `Mod.apply` substats loop |
| **Total** | **160** | |

The ADR-006 expected value of 120 was off by exactly the Octopus base stat contribution (40), which is unconditionally applied in `Weapon.applyBaseStats` and independent of star/tier scaling.

### 4.2. `applyWithContext` Correctness

| Effect | `ammoPercent` in | Correct? |
|--------|-----------------|---------|
| `MomentumUp` via `ConditionalEffect.applyWithContext` | Real (0.4 or 0.8) | ✓ |
| `MomentumUp` via `ConditionalEffect.applyStatic` (legacy) | Hardcoded 1.0 | ✗ (second branch never fires) |
| `RushHour` via `DynamicStatEffect.applyWithContext` | Real (irrelevant — uses `conditions.playerHpPercent`) | ✓ |
| All `IncreaseStatEffect` / `SetFlagEffect` via `BaseEffect.applyWithContext` default | N/A | ✓ |

### 4.3. Grep-Verifiable Post-Implementation State

```bash
# 1. DynamicStatEffect is present
grep -F "export class DynamicStatEffect" simulator/src/models/effect.ts

# 2. applyWithContext is present on BaseEffect
grep -F "applyWithContext" simulator/src/models/effect.ts

# 3. Custom subclasses are gone
grep -F "class MomentumUpMod" simulator/src/data/mods.ts  # → no output
grep -F "class FatefulStrikeMod" simulator/src/data/mods.ts  # → no output
grep -F "class RushHourMod" simulator/src/data/mods.ts  # → no output

# 4. createModInstance has no dispatch logic
grep -F "new MomentumUpMod" simulator/src/data/mods.ts    # → no output
grep -F "new FatefulStrikeMod" simulator/src/data/mods.ts  # → no output
grep -F "new RushHourMod" simulator/src/data/mods.ts       # → no output

# 5. FatefulStrike slot is Mask
grep -A1 "FatefulStrike" simulator/src/data/mods.ts | grep "ArmorSlot.Mask"
```

---

## 5. Implementation Directives (Phase 4)

1. Implement `applyWithContext` on `BaseEffect` and all override sites in `effect.ts` per §3.1.
2. Update the four call sites in `equipment.ts` per §3.2.
3. Replace `mods.ts` with the pure-data registry per §3.3 (abolish all three custom subclasses).
4. Create `complex-loadout-integration.test.ts` per §3.4.
5. Run full test suite — all existing tests must remain green; the new test suite must pass.

> **Note:** The `MomentumUp` second-branch test (`ammo <= 0.5`) is the primary regression guard for the `applyWithContext` fix. If the legacy `applyStatic` path is accidentally used, this test will fail with `WeaponDamagePercent = 0` instead of `30`.
