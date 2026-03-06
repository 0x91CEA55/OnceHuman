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
        // 125 (Base) + 110 (SaviorHelmet 5*) + 70 (SaviorTop 3*) + 64 (SaviorPants 1*)
        // + 132 (TreacherousMask 4*) + 48 (TreacherousBoots 2*) + 121 (GildedGloves 6*) = 670
        expect(player.stats.get(StatType.PsiIntensity)?.value).toBe(670);

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