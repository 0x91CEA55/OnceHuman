import { World } from '../ecs/world';
import { StatType, EnemyType, WeaponKey, DamageTrait } from '../types/enums';
import { EncounterConditions } from '../types/common';
import { createWeaponComponent } from '../ecs/factories';
import { runStatAggregation } from '../ecs/systems/stat-aggregator-system';
import { resolveScenarioScan } from '../engine/resolver';
import { StatsComponent, FlagComponent } from '../ecs/types';

describe('ECS Unified Resolver Attack Multipliers', () => {
    let world: World;
    let playerId: any;

    beforeEach(() => {
        world = new World();
        playerId = world.createEntity('player');
        
        const stats: StatsComponent = { snapshot: {} as Record<StatType, number> };
        const flags: FlagComponent = { activeFlags: new Set() };
        const loadout = { weapon: createWeaponComponent(WeaponKey.DE50Jaws) };

        world.addComponent(playerId, 'stats', stats);
        world.addComponent(playerId, 'flags', flags);
        world.addComponent(playerId, 'loadout', loadout);
        world.addComponent(playerId, 'resources', {
            sanity: 100,
            maxSanity: 100,
            deviantPower: 100,
            maxDeviantPower: 100
        });
    });

    test('Attack bonus scales base damage correctly via Resolver', () => {
        const conditions = new EncounterConditions();
        conditions.enemyType = EnemyType.Normal;
        
        const statsComp = world.getComponent(playerId, 'stats')!;
        const flagsComp = world.getComponent(playerId, 'flags')!;

        const traits = new Set([DamageTrait.Attack, DamageTrait.Weapon]);

        // 1. Base case: 0% Attack Bonus
        runStatAggregation(world, conditions);
        const baseDmgFromStats = statsComp.snapshot[StatType.DamagePerProjectile] || 0;

        const result1 = resolveScenarioScan(baseDmgFromStats, statsComp, flagsComp, conditions.enemyType, traits);
        const baseDmg = result1.noCritNoWs;

        // 2. Add 20% Attack Bonus
        statsComp.snapshot[StatType.AttackPercent] = (statsComp.snapshot[StatType.AttackPercent] || 0) + 20;
        const result2 = resolveScenarioScan(baseDmgFromStats, statsComp, flagsComp, conditions.enemyType, traits);

        expect(result2.noCritNoWs).toBeCloseTo(baseDmg * 1.2);
    });
});
