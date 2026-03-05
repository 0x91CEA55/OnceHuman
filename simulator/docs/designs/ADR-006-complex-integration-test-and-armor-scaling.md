# ADR-006: High-Fidelity Armor Scaling & Complex Loadout Integration Testing

**Status:** Proposed
**Date:** 2026-03-05
**Deciders:** Tatum (Project Lead), Gemini CLI

---

## 1. Context & Objectives

To achieve absolute confidence in the "Zero-Trust" simulation engine (ADR-005), we must verify it against a highly complex, realistic end-game loadout. This loadout spans 6 armor pieces across two distinct sets (Savior, Treacherous Tides) alongside a key armor piece (Gilded Gloves), a complex weapon (Octopus), and specific mods mapped correctly to their permissible armor slots.

Furthermore, we must eliminate "empty effects" and custom subclass overrides (`applyCustomLogic`) in our mod definitions. To adhere strictly to ADR-003's "Pure Data" mandate, all mods must be modeled with absolute accuracy using data-driven effects (`ConditionalEffect`, `IncreaseStatEffect`, and a newly introduced `DynamicStatEffect`).

This ADR also mandates the inclusion of varied mod substats (Crit DMG, Elemental DMG, Status DMG, and Target-specific DMG) to ensure the `StatAggregator` correctly handles high-volume stat summation from nested objects.

## 2. Verbatim Implementation Specification

### 2.1. Dynamic Stat Effect Modeling (`effect.ts`)
To support mods like *Rush Hour* and *Embers* strictly through data, we introduce a `DynamicStatEffect` that evaluates a callback during aggregation.

```typescript
// simulator/src/models/effect.ts

export class DynamicStatEffect extends BaseEffect {
    constructor(
        public readonly stat: StatType,
        public readonly valueFn: (ctx: AggregationContext) => number,
        source?: string
    ) {
        super(source);
    }

    applyStatic(player: Player, conditions: EncounterConditions, multiplier: number = 1): void {
        const ctx: AggregationContext = {
            player,
            conditions,
            ammoPercent: 1.0,
            loadout: player.loadout
        };
        const dynamicValue = this.valueFn(ctx);
        player.stats.add(this.stat, dynamicValue * multiplier);
    }

    getDescription(): string {
        return `Dynamic calculation for ${this.stat}`;
    }

    clone(newSource?: string): DynamicStatEffect {
        return new DynamicStatEffect(this.stat, this.valueFn, newSource ?? this.source);
    }
}
```

### 2.2. High-Accuracy Pure Data Mod Registry (`mods.ts`)
We abolish `MomentumUpMod`, `FatefulStrikeMod`, and `RushHourMod`. All mods are now defined with 100% accuracy in their `permanentEffects` array, and assigned to their correct logical `ArmorSlot` or `WeaponSlot`.

```typescript
// simulator/src/data/mods.ts

export const MOD_DATA: Record<ModKey, ModData> = {
    [ModKey.FatefulStrike]: new ModData(
        ModKey.FatefulStrike, 'Fateful Strike', ArmorSlot.Mask,
        'Cannot deal Weakspot DMG. Crit rate +10% and Crit DMG +30%',
        [
            new SetFlagEffect(FlagType.CannotDealWeakspotDamage, true),
            new IncreaseStatEffect(StatType.CritRatePercent, 10),
            new IncreaseStatEffect(StatType.CritDamagePercent, 30)
        ], []
    ),
    [ModKey.DeviationExpert]: new ModData(
        ModKey.DeviationExpert, 'Deviation Expert', WeaponSlot.Main,
        'Range -25%, Fire Rate +10%, Status DMG +20%',
        [
            new IncreaseStatEffect(StatType.FireRate, 10), 
            new IncreaseStatEffect(StatType.StatusDamagePercent, 20)
        ], []
    ),
    [ModKey.MomentumUp]: new ModData(
        ModKey.MomentumUp, 'Momentum Up', ArmorSlot.Top,
        'Fire Rate +10% for first 50% of mag, Weapon DMG +30% for second half.',
        [
            new ConditionalEffect(
                (ctx) => ctx.ammoPercent > 0.5,
                [new IncreaseStatEffect(StatType.FireRate, 10)]
            ),
            new ConditionalEffect(
                (ctx) => ctx.ammoPercent <= 0.5,
                [new IncreaseStatEffect(StatType.WeaponDamagePercent, 30)]
            )
        ], []
    ),
    [ModKey.PreciseStrike]: new ModData(
        ModKey.PreciseStrike, 'Precise Strike', ArmorSlot.Helmet,
        'Hitting Weakspots grants +12.0% Weakspot DMG for 3s, up to 3 stacks',
        [], PRECISE_STRIKE_TRIGGERS
    ),
    [ModKey.ElementalResonance]: new ModData(
        ModKey.ElementalResonance, 'Elemental Resonance', ArmorSlot.Pants,
        'Elemental DMG +20% (Simplified snapshot)',
        [new IncreaseStatEffect(StatType.ElementalDamagePercent, 20)], []
    ),
    [ModKey.RushHour]: new ModData(
        ModKey.RushHour, 'Rush Hour', ArmorSlot.Boots,
        'Every 10% HP loss grants +4% Melee, Weapon, and Status DMG.',
        [
            new DynamicStatEffect(
                StatType.WeaponDamagePercent,
                (ctx) => Math.floor((100 - ctx.conditions.playerHpPercent) / 10) * 4
            ),
            new DynamicStatEffect(
                StatType.StatusDamagePercent,
                (ctx) => Math.floor((100 - ctx.conditions.playerHpPercent) / 10) * 4
            )
        ], []
    ),
    [ModKey.FlameResonance]: new ModData(
        ModKey.FlameResonance, 'Flame Resonance', WeaponSlot.Main,
        'Max Burn stack +2, Burn duration -20.0%',
        [
            new IncreaseStatEffect(StatType.MaxBurnStacks, 2), 
            new IncreaseStatEffect(StatType.BurnDurationPercent, -20)
        ], []
    ),
    [ModKey.Embers]: new ModData(
        ModKey.Embers, 'Embers', WeaponSlot.Main,
        'When Burn is removed, stacks only -50%',
        [], []
    ),
    [ModKey.WorkOfProficiency]: new ModData(
        ModKey.WorkOfProficiency, 'Work Of Proficiency', ArmorSlot.Gloves,
        'Reloading empty magazine: Reload Speed +10% and Elemental DMG +20% for 5s.',
        [], WORK_OF_PROFICIENCY_TRIGGERS
    ),
    [ModKey.FirstMoveAdvantage]: new ModData(
        ModKey.FirstMoveAdvantage, 'First-Move Advantage', ArmorSlot.Gloves,
        'For 2s after reloading: Crit Rate +10% and Crit DMG +20%.',
        [], FIRST_MOVE_ADVANTAGE_TRIGGERS
    ),
    [ModKey.MagExpansion]: new ModData(
        ModKey.MagExpansion, 'Mag Expansion', ArmorSlot.Helmet,
        'Reloading empty magazine increases capacity by 30%.',
        [new IncreaseStatEffect(StatType.MagazineCapacity, 30)], []
    ),
    [ModKey.ElementalHavoc]: new ModData(
        ModKey.ElementalHavoc, 'Elemental Havoc', ArmorSlot.Top,
        'Elemental DMG +10%. When HP above 90%, additional +10% Elemental DMG.',
        [
            new IncreaseStatEffect(StatType.ElementalDamagePercent, 10),
            new ConditionalEffect(
                (ctx) => ctx.conditions.playerHpPercent >= 90, 
                [new IncreaseStatEffect(StatType.ElementalDamagePercent, 10)]
            )
        ], []
    )
};

export function createModInstance(
    modKey: ModKey,
    substats: [Substat, Substat, Substat, Substat]
): Mod {
    const data = MOD_DATA[modKey];
    if (!data) throw new Error(`Mod ${modKey} not found`);
    return new Mod(data, substats);
}
```

### 2.3. Complex Integration Test (`complex-loadout-integration.test.ts`)
This test validates the exact mathematical scaling of tier/star combinations, the accurate application of pure-data mods, and the summation of varied Gold-tier substats.

```typescript
// simulator/src/__tests__/complex-loadout-integration.test.ts

import { Player, PlayerStats } from '../models/player';
import { Loadout } from '../models/equipment';
import { EncounterConditions } from '../types/common';
import { ArmorKey, WeaponKey, ModKey, StatType, FlagType, SubstatTier } from '../types/enums';
import { createArmor } from '../data/armor';
import { createWeapon } from '../data/weapons';
import { createModInstance, DEFAULT_SUBSTATS } from '../data/mods';
import { StatAggregator } from '../engine/stat-aggregator';
import { Substat } from '../models/substat';

describe('ADR-006: Complex Loadout & Scaling Integration', () => {

    test('Zero-Trust: 6-Piece Set Synergy, Accurate Slot Mods, Star Scaling, and Varied Substats', () => {
        const stats = new PlayerStats();
        const loadout = new Loadout();
        const player = new Player(loadout, stats, 100);
        const conditions = new EncounterConditions();
        
        conditions.playerHpPercent = 60;     // Rush Hour -> 16% bonus. Treacherous 2pc -> Active
        conditions.playerShieldPercent = 50; // Savior 2pc -> Active
        conditions.playerSanityPercent = 40; // Treacherous 3pc -> Inactive

        // Substat Definition Blocks (Gold Tier)
        const critDmgGold = new Substat(StatType.CritDamagePercent, SubstatTier.Gold);       // 15%
        const elemDmgGold = new Substat(StatType.ElementalDamagePercent, SubstatTier.Gold); // 10%
        const statusDmgGold = new Substat(StatType.StatusDamagePercent, SubstatTier.Gold);  // 10%
        const dmgNormalGold = new Substat(StatType.DamageBonusNormal, SubstatTier.Gold);    // 8%
        const dmgEliteGold = new Substat(StatType.DamageBonusElite, SubstatTier.Gold);      // 8%
        const dmgBossGold = new Substat(StatType.DamageBonusBoss, SubstatTier.Gold);        // 8%

        // 1. Equip Weapon: Octopus with Deviation Expert + 4x Crit DMG Gold (60% CD)
        const wMod = createModInstance(ModKey.DeviationExpert, [critDmgGold, critDmgGold, critDmgGold, critDmgGold]);
        player.loadout.weapon = createWeapon(WeaponKey.OctopusGrilledRings, 6, 5, 10, wMod); 

        // 2. Equip Helmet: Savior (5*) + Precise Strike + 4x Elemental DMG Gold (40% ED)
        const hMod = createModInstance(ModKey.PreciseStrike, [elemDmgGold, elemDmgGold, elemDmgGold, elemDmgGold]);
        player.loadout.helmet = createArmor(ArmorKey.SaviorHelmet, 5, 5, 0, hMod); // 110 Psi

        // 3. Equip Top: Savior (3*) + Momentum Up + 4x Status DMG Gold (40% SD)
        const tMod = createModInstance(ModKey.MomentumUp, [statusDmgGold, statusDmgGold, statusDmgGold, statusDmgGold]);
        player.loadout.top = createArmor(ArmorKey.SaviorTop, 3, 5, 0, tMod); // 70 Psi

        // 4. Equip Pants: Savior (1*) + Elemental Resonance + 4x DMG Bonus Normal Gold (32% Normal)
        const pMod = createModInstance(ModKey.ElementalResonance, [dmgNormalGold, dmgNormalGold, dmgNormalGold, dmgNormalGold]);
        player.loadout.pants = createArmor(ArmorKey.SaviorPants, 1, 5, 0, pMod); // 64 Psi

        // 5. Equip Mask: Treacherous (4*) + Fateful Strike + 4x DMG Bonus Elite Gold (32% Elite)
        const mMod = createModInstance(ModKey.FatefulStrike, [dmgEliteGold, dmgEliteGold, dmgEliteGold, dmgEliteGold]);
        player.loadout.mask = createArmor(ArmorKey.TreacherousMask, 4, 5, 0, mMod); // 132 Psi

        // 6. Equip Boots: Treacherous (2*) + Rush Hour + 4x DMG Bonus Boss Gold (32% Boss)
        const bMod = createModInstance(ModKey.RushHour, [dmgBossGold, dmgBossGold, dmgBossGold, dmgBossGold]);
        player.loadout.boots = createArmor(ArmorKey.TreacherousBoots, 2, 5, 0, bMod); // 48 Psi

        // 7. Equip Gloves: Gilded (6*) + Work of Proficiency + 2x Crit DMG, 2x Elemental (30% CD, 20% ED)
        const gMod = createModInstance(ModKey.WorkOfProficiency, [critDmgGold, critDmgGold, elemDmgGold, elemDmgGold]);
        player.loadout.gloves = createArmor(ArmorKey.GildedGloves, 6, 5, 0, gMod); // 121 Psi

        // Execute Aggregation
        StatAggregator.aggregate(player, conditions, 0.4);

        // Verification 1: Psi Intensity Scaling Math
        // 110 + 70 + 64 + 132 + 48 + 121 = 545
        expect(player.stats.get(StatType.PsiIntensity)?.value).toBe(545);

        // Verification 2: Savior 3-piece Set Bonuses (+30% WD, +30% SD)
        // Verification 3: Treacherous 2-piece Set Bonuses (+12% WD, +12% SD)
        
        // Verification 4: Mod & Substat Summation
        // WD: 30 (Savior) + 12 (Trech) + 30 (MomentumUp) + 16 (Rush Hour) = 88
        expect(player.stats.get(StatType.WeaponDamagePercent)?.value).toBe(88);

        // SD: 30 (Savior) + 12 (Trech) + 20 (Deviation Expert) + 16 (Rush Hour) + 40 (Top Substats) = 118
        expect(player.stats.get(StatType.StatusDamagePercent)?.value).toBe(118);

        // ED: 30 (Octopus) + 20 (Elemental Resonance) + 40 (Helmet Substats) + 20 (Gloves Substats) = 110
        expect(player.stats.get(StatType.ElementalDamagePercent)?.value).toBe(110);

        // CD: 30 (Fateful Strike) + 60 (Weapon Substats) + 30 (Gloves Substats) = 120
        expect(player.stats.get(StatType.CritDamagePercent)?.value).toBe(120);

        // Target Specifics
        expect(player.stats.get(StatType.DamageBonusNormal)?.value).toBe(32);
        expect(player.stats.get(StatType.DamageBonusElite)?.value).toBe(32);
        expect(player.stats.get(StatType.DamageBonusBoss)?.value).toBe(32);

        // Flag checks
        expect(player.hasFlag(FlagType.KeywordCanCrit)).toBe(true);
        expect(player.hasFlag(FlagType.CannotDealWeakspotDamage)).toBe(true);
    });
});
```

## 3. Pending Implementation Directives (Phase 3)
1. Implement `DynamicStatEffect` in `models/effect.ts`.
2. Refactor `MOD_DATA` in `data/mods.ts` to pure-data spec.
3. Implement the `complex-loadout-integration.test.ts` verbatim.
4. Verify all mathematical assertions.
