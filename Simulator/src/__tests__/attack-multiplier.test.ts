import { PhysicalDamagePipeline } from '../pipelines/physical';
import { Player, PlayerStats } from '../models/player';
import { Loadout } from '../models/equipment';
import { StatType, EnemyType } from '../types/enums';
import { EncounterConditions } from '../types/common';

describe('Attack Multiplier Logic', () => {
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

    test('AttackPercent and WeaponDamagePercent are multiplicative', () => {
        // Base damage 100
        stats.get(StatType.DamagePerProjectile)?.add(100);
        
        // +10% Attack
        stats.get(StatType.AttackPercent)?.add(10);
        
        // +10% Weapon Damage
        stats.get(StatType.WeaponDamagePercent)?.add(10);

        const conditions: EncounterConditions = {
            enemyType: EnemyType.Normal,
            targetDistanceMeters: 10,
            playerHpPercent: 100,
            isTargetVulnerable: false,
            weakspotHitRate: 0
        };

        const result = pipeline.calculate(player, conditions);
        
        // 100 * 1.1 (Attack) * 1.1 (WeaponDmg) = 121
        // If they were additive: 100 * (1 + 0.1 + 0.1) = 120
        expect(result.noCritNoWs).toBeCloseTo(121);
    });
});
