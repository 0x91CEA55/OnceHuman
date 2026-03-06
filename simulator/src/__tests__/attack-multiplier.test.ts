import { Player, PlayerStats } from '../models/player';
import { Loadout } from '../models/equipment';
import { StatType, EnemyType, WeaponKey, EncounterTopology, DamageTrait } from '../types/enums';
import { EncounterConditions } from '../types/common';
import { createWeapon } from '../data/weapons';
import { StatAggregator } from '../engine/stat-aggregator';
import { resolveScenarioScan } from '../engine/resolver';

describe('Unified Resolver Attack Multipliers', () => {
    let player: Player;
    let stats: PlayerStats;
    let loadout: Loadout;

    beforeEach(() => {
        stats = new PlayerStats();
        loadout = new Loadout();
        player = new Player(loadout, stats, 100);
    });

    test('Attack bonus scales base damage correctly via Resolver', () => {
        player.loadout.weapon = createWeapon(WeaponKey.DE50Jaws);

        const conditions = new EncounterConditions();
        conditions.enemyType = EnemyType.Normal;
        conditions.weakspotHitRate = 0.5;
        conditions.topology = EncounterTopology.SingleTarget;

        const traits = new Set([DamageTrait.Attack, DamageTrait.Weapon]);

        // 1. Base case: 0% Attack Bonus
        StatAggregator.aggregate(player, conditions);
        const baseDmgFromStats = player.stats.get(StatType.DamagePerProjectile)?.value ?? 0;

        const result1 = resolveScenarioScan(baseDmgFromStats, player, conditions.enemyType, traits);
        const baseDmg = result1.noCritNoWs;

        // 2. Add 20% Attack Bonus
        player.stats.add(StatType.AttackPercent, 20);
        const result2 = resolveScenarioScan(baseDmgFromStats, player, conditions.enemyType, traits);

        expect(result2.noCritNoWs).toBeCloseTo(baseDmg * 1.2);
    });
});
