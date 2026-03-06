import { Player, PlayerStats } from '../models/player';
import { Loadout, Weapon, WeaponStats } from '../models/equipment';
import { EnemyType, Rarity, WeaponType, ModKey, EncounterTopology, DamageTrait } from '../types/enums';
import { EncounterConditions } from '../types/common';
import { StatAggregator } from '../engine/stat-aggregator';
import { Burn } from '../models/keyword';
import { DEFAULT_SUBSTATS, createModInstance } from '../data/mods';
import { resolveScenarioScan } from '../engine/resolver';

describe('Unified Resolver Build Logic Verification', () => {
    let player: Player;
    let stats: PlayerStats;
    let loadout: Loadout;

    beforeEach(() => {
        stats = new PlayerStats();
        loadout = new Loadout();
        player = new Player(loadout, stats, 100);
    });

    test('Momentum Up dynamic logic affects resolver output', () => {
        const pistolStats = new WeaponStats();
        pistolStats.damagePerProjectile.reset(100, 'Test');

        const momentumUp = createModInstance(ModKey.MomentumUp, DEFAULT_SUBSTATS);
        loadout.weapon = new Weapon('w', 'W', Rarity.Common, 1, 1, 0, momentumUp, WeaponType.Pistol, new Burn(), pistolStats, []);

        const conditions = new EncounterConditions();
        conditions.enemyType = EnemyType.Normal;
        conditions.weakspotHitRate = 0.5;
        conditions.topology = EncounterTopology.SingleTarget;

        const traits = new Set([DamageTrait.Attack, DamageTrait.Weapon]);

        // 1. First half of mag (Should have +10% Fire Rate, 0% Weapon DMG)
        StatAggregator.aggregate(player, conditions, 1.0, true);
        const res1 = resolveScenarioScan(100, player, conditions.enemyType, traits);
        expect(res1.noCritNoWs).toBe(100);

        // 2. Second half of mag (Should have 0% Fire Rate, +30% Weapon DMG)
        StatAggregator.aggregate(player, conditions, 0.2, true);
        const res2 = resolveScenarioScan(100, player, conditions.enemyType, traits);
        expect(res2.noCritNoWs).toBe(130);
    });

    test('Fateful Strike disables weakspots correctly in Resolver', () => {
        const pistolStats = new WeaponStats();
        pistolStats.damagePerProjectile.reset(100, 'Test');
        pistolStats.weakspotDamagePercent.reset(50, 'Test');

        const fateful = createModInstance(ModKey.FatefulStrike, DEFAULT_SUBSTATS);
        loadout.weapon = new Weapon('w', 'W', Rarity.Common, 1, 1, 0, fateful, WeaponType.Pistol, new Burn(), pistolStats, []);

        const conditions = new EncounterConditions();
        conditions.enemyType = EnemyType.Normal;
        conditions.weakspotHitRate = 0.5;
        conditions.topology = EncounterTopology.SingleTarget;

        const traits = new Set([DamageTrait.Attack, DamageTrait.Weapon]);

        StatAggregator.aggregate(player, conditions, 1.0, true);

        const result = resolveScenarioScan(100, player, conditions.enemyType, traits);

        // Fateful Strike disables weakspots, so result should be 100 even with 100% hit rate scenario
        expect(result.noCritWs).toBe(100);
    });
});
