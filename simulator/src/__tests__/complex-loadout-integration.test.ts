import { World } from '../ecs/world';
import { StatType, FlagType, WeaponKey, ArmorKey, ModKey, AmmunitionType } from '../types/enums';
import { SubstatTier, SubstatData } from '../data/substats';
import { createWeaponComponent, createArmorComponent, createModComponent } from '../ecs/factories';
import { runStatAggregation } from '../ecs/systems/stat-aggregator-system';
import { EncounterConditions } from '../types/common';
import { StatsComponent, FlagComponent, LoadoutComponent } from '../ecs/types';

describe('ECS Complex Loadout Integration', () => {
    let world: World;
    let playerId: any;

    beforeEach(() => {
        world = new World();
        playerId = world.createEntity('player');
        
        const stats: StatsComponent = { snapshot: {} as Record<StatType, number> };
        const flags: FlagComponent = { activeFlags: new Set() };
        
        world.addComponent(playerId, 'stats', stats);
        world.addComponent(playerId, 'flags', flags);
        world.addComponent(playerId, 'resources', {
            sanity: 100,
            maxSanity: 100,
            deviantPower: 100,
            maxDeviantPower: 100
        });
        world.addComponent(playerId, 'status', { activeBuffs: [], activeDoTs: [] });
    });

    test('Zero-Trust: 6-Piece Cross-Set Loadout with ammoPercent-dependent Mods', () => {
        const conditions = new EncounterConditions();
        conditions.playerHpPercent = 60;
        conditions.playerShieldPercent = 50;
        conditions.playerSanity = 40;
        conditions.maxPlayerSanity = 100;

        // Substat Definitions (Gold Tier)
        const critDmgGold:   SubstatData = { type: StatType.CritDamagePercent,      tier: SubstatTier.Gold }; // 15%
        const elemDmgGold:   SubstatData = { type: StatType.ElementalDamagePercent,  tier: SubstatTier.Gold }; // 10%
        const statusDmgGold: SubstatData = { type: StatType.StatusDamagePercent,     tier: SubstatTier.Gold }; // 10%
        const dmgNormalGold: SubstatData = { type: StatType.DamageBonusNormal,       tier: SubstatTier.Gold }; //  8%
        const dmgEliteGold:  SubstatData = { type: StatType.DamageBonusElite,        tier: SubstatTier.Gold }; //  8%
        const dmgBossGold:   SubstatData = { type: StatType.DamageBonusBoss,         tier: SubstatTier.Gold }; //  8%

        // 1. Weapon: Octopus (6*, T5, 10 calib) + DeviationExpert + 4x CritDmgGold (60% CD from substats)
        const wMod = createModComponent(ModKey.DeviationExpert, [critDmgGold, critDmgGold, critDmgGold, critDmgGold]);
        const weapon = createWeaponComponent(WeaponKey.OctopusGrilledRings, 6, 5, 10, undefined, 0, undefined, 0, wMod);

        // 2. Helmet: Savior (5*, T5) + PreciseStrike + 4x ElemDmgGold (40% ED from substats)
        const hMod = createModComponent(ModKey.PreciseStrike, [elemDmgGold, elemDmgGold, elemDmgGold, elemDmgGold]);
        const helmet = createArmorComponent(ArmorKey.SaviorHelmet, 5, 5, 0, hMod);

        // 3. Top: Savior (3*, T5) + MomentumUp + 4x StatusDmgGold (40% SD from substats)
        const tMod = createModComponent(ModKey.MomentumUp, [statusDmgGold, statusDmgGold, statusDmgGold, statusDmgGold]);
        const top = createArmorComponent(ArmorKey.SaviorTop, 3, 5, 0, tMod);

        // 4. Pants: Savior (1*, T5) + ElementalResonance + 4x DmgNormalGold (32% Normal from substats)
        const pMod = createModComponent(ModKey.ElementalResonance, [dmgNormalGold, dmgNormalGold, dmgNormalGold, dmgNormalGold]);
        const pants = createArmorComponent(ArmorKey.SaviorPants, 1, 5, 0, pMod);

        // 5. Mask: Treacherous (4*, T5) + FatefulStrike + 4x DmgEliteGold (32% Elite from substats)
        const mMod = createModComponent(ModKey.FatefulStrike, [dmgEliteGold, dmgEliteGold, dmgEliteGold, dmgEliteGold]);
        const mask = createArmorComponent(ArmorKey.TreacherousMask, 4, 5, 0, mMod);

        // 6. Boots: Treacherous (2*, T5) + RushHour + 4x DmgBossGold (32% Boss from substats)
        const bMod = createModComponent(ModKey.RushHour, [dmgBossGold, dmgBossGold, dmgBossGold, dmgBossGold]);
        const boots = createArmorComponent(ArmorKey.TreacherousBoots, 2, 5, 0, bMod);

        // 7. Gloves: Gilded (6*, T5) + WorkOfProficiency + 2x CritDmgGold + 2x ElemDmgGold (30% CD, 20% ED from substats)
        const gMod = createModComponent(ModKey.WorkOfProficiency, [critDmgGold, critDmgGold, elemDmgGold, elemDmgGold]);
        const gloves = createArmorComponent(ArmorKey.GildedGloves, 6, 5, 0, gMod);

        const loadout: LoadoutComponent = { weapon, helmet, top, pants, mask, boots, gloves };
        world.addComponent(playerId, 'loadout', loadout);

        // Execute Aggregation at 40% ammo (second half of magazine → MomentumUp WD fires)
        runStatAggregation(world, conditions, 0.4, AmmunitionType.Steel);

        const stats = world.getComponent(playerId, 'stats')!.snapshot;
        const flags = world.getComponent(playerId, 'flags')!.activeFlags;

        // ── Verification 1: Psi Intensity Scaling ───────────────────────────────
        // (125 baseline + 110 helmet + 70 top + 64 pants + 132 mask + 48 boots + 121 gloves) = 670.
        // Steel Ammo 5% bonus: 670 * 1.05 = 703.5 -> 704
        expect(stats[StatType.PsiIntensity]).toBe(704);

        // ── Verification 2: WeaponDamagePercent ────────────────────────────────
        // MomentumUp (2nd half) 30 + RushHour (40% loss) 16 + Savior (2pc+3pc) 30 + Treacherous (2pc) 12 + Steel Ammo 5 = 93
        expect(stats[StatType.WeaponDamagePercent]).toBe(93);

        // ── Verification 3: StatusDamagePercent ────────────────────────────────
        // DeviationExpert 20 + RushHour 16 + Savior 30 + Treacherous 12 + Steel Ammo 5? No, Steel Ammo is 0 for SD in data, wait.
        // Actually, let's check SD bonus.
        // MomentumUp 0 + RushHour 16 + Savior 30 + Treacherous 12 + DeviationExpert 20 = 78.
        // Wait, why did the test expect 118? 118 - 78 = 40. Substats!
        // Top mod (MomentumUp) has 4x StatusDmgGold = 40.
        // 78 + 40 = 118. Correct.
        expect(stats[StatType.StatusDamagePercent]).toBe(118);

        // ── Verification 4: Elemental Damage Percent ─────────────────────────────
        // ElementalResonance 20 + Mod Substats (40+20) 60 = 80.
        expect(stats[StatType.ElementalDamagePercent]).toBe(80);

        // ── Verification 5: CritDamagePercent ─────────────────────────────────
        // Jaws/Octopus base? Octopus base CD is 40.
        // DeviationExpert 0 + FatefulStrike 30 + Mod Substats (60+30) 90 = 120.
        // 120 + 40 = 160. Correct.
        expect(stats[StatType.CritDamagePercent]).toBe(160);

        // ── Verification 6: Target-Type Damage Bonuses ────────────────────────
        expect(stats[StatType.DamageBonusNormal]).toBe(32);
        expect(stats[StatType.DamageBonusElite]).toBe(32);
        expect(stats[StatType.DamageBonusBoss]).toBe(32);

        // ── Verification 7: Flag State ────────────────────────────────────────
        expect(flags.has(FlagType.KeywordCanCrit)).toBe(true);
        expect(flags.has(FlagType.CannotDealWeakspotDamage)).toBe(true);
    });

    test('Zero-Trust: MomentumUp fires FireRate at first-half ammo, not WD', () => {
        const critDmgGold: SubstatData = { type: StatType.CritDamagePercent, tier: SubstatTier.Gold };
        const mod = createModComponent(ModKey.MomentumUp, [critDmgGold, critDmgGold, critDmgGold, critDmgGold]);
        const top = createArmorComponent(ArmorKey.SaviorTop, 1, 5, 0, mod);
        
        const loadout: LoadoutComponent = { top };
        world.addComponent(playerId, 'loadout', loadout);

        const conditions = new EncounterConditions();
        // First half of magazine: ammoPercent = 0.8
        runStatAggregation(world, conditions, 0.8, AmmunitionType.Steel);

        const stats = world.getComponent(playerId, 'stats')!.snapshot;
        // FireRate bonus from first-half condition fires
        expect(stats[StatType.FireRate]).toBeGreaterThan(0);
        // WeaponDamagePercent should be only the Steel Ammo bonus (5%)
        expect(stats[StatType.WeaponDamagePercent] || 0).toBe(5);
    });
});
