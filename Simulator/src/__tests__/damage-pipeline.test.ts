import { PhysicalDamagePipeline } from '../pipelines/physical';
import { Player, PlayerStats } from '../models/player';
import { Loadout, Weapon, WeaponStats } from '../models/equipment';
import { EnemyType, Rarity, WeaponType, ModKey } from '../types/enums';
import { EncounterConditions } from '../types/common';
import { StatAggregator } from '../engine/stat-aggregator';
import { Burn } from '../pipelines/keyword';
import { DEFAULT_SUBSTATS, createModInstance } from '../data/mods';

describe('PhysicalDamagePipeline Strategy Verification', () => {
    let pipeline: PhysicalDamagePipeline;
    let player: Player;
    let stats: PlayerStats;
    let loadout: Loadout;

    beforeEach(() => {
        pipeline = new PhysicalDamagePipeline();
        stats = new PlayerStats();
        loadout = new Loadout();
        player = new Player(loadout, stats, 100);
    });

    test('Momentum Up dynamic logic affects pipeline output', () => {
        const pistolStats = new WeaponStats();
        pistolStats.damagePerProjectile.value = 100;
        
        const momentumUp = createModInstance(ModKey.MomentumUp, DEFAULT_SUBSTATS);
        loadout.weapon = new Weapon('w', 'W', Rarity.Common, 1, 1, 0, momentumUp, WeaponType.Pistol, new Burn(), pistolStats, []);

        const conditions: EncounterConditions = {
            enemyType: EnemyType.Normal,
            targetDistanceMeters: 10,
            playerHpPercent: 100,
            isTargetVulnerable: false,
            weakspotHitRate: 0
        };

        // 1. First half of mag (Should have +10% Fire Rate, 0% Weapon DMG)
        StatAggregator.aggregate(player, conditions, 1.0, true);
        const res1 = pipeline.calculate(player, conditions);
        expect(res1.noCritNoWs).toBe(100);

        // 2. Second half of mag (Should have 0% Fire Rate, +30% Weapon DMG)
        StatAggregator.aggregate(player, conditions, 0.2, true);
        const res2 = pipeline.calculate(player, conditions);
        expect(res2.noCritNoWs).toBe(130);
    });

    test('Fateful Strike disables weakspots correctly', () => {
        const pistolStats = new WeaponStats();
        pistolStats.damagePerProjectile.value = 100;
        pistolStats.weakspotDamagePercent.value = 50;

        const fateful = createModInstance(ModKey.FatefulStrike, DEFAULT_SUBSTATS);
        loadout.weapon = new Weapon('w', 'W', Rarity.Common, 1, 1, 0, fateful, WeaponType.Pistol, new Burn(), pistolStats, []);

        const conditions: EncounterConditions = {
            enemyType: EnemyType.Normal,
            targetDistanceMeters: 10,
            playerHpPercent: 100,
            isTargetVulnerable: false,
            weakspotHitRate: 1.0
        };

        StatAggregator.aggregate(player, conditions, 1.0, true);

        const result = pipeline.calculate(player, conditions);
        
        // Fateful Strike disables weakspots, so result should be 100 even with 100% hit rate
        expect(result.noCritWs).toBe(100);
    });
});
