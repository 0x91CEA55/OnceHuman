import { PhysicalDamagePipeline } from '../pipelines/physical';
import { Player, PlayerStats } from '../models/player';
import { Loadout } from '../models/equipment';
import { StatType, EnemyType, WeaponKey } from '../types/enums';
import { EncounterConditions } from '../types/common';
import { createWeapon } from '../data/weapons';
import { StatAggregator } from '../engine/stat-aggregator';

describe('PhysicalDamagePipeline Attack Multipliers', () => {
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

    test('Attack bonus scales base damage correctly', () => {
        // Rust Pistol base damage is 128 (using DE50 Jaws as reference for high base)
        loadout.weapon = createWeapon(WeaponKey.DE50Jaws);
        
        const conditions: EncounterConditions = {
            enemyType: EnemyType.Normal,
            targetDistanceMeters: 10,
            playerHpPercent: 100,
            isTargetVulnerable: false,
            weakspotHitRate: 0
        };

        // 1. Base case: 0% Attack Bonus
        StatAggregator.aggregate(player, conditions);

        const result1 = pipeline.calculate(player, conditions);
        const baseDmg = result1.noCritNoWs;

        // 2. Add 20% Attack Bonus
        player.stats.add(StatType.AttackPercent, 20);
        const result2 = pipeline.calculate(player, conditions);
        
        expect(result2.noCritNoWs).toBeCloseTo(baseDmg * 1.2);
    });
});
