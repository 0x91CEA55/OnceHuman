import { World } from '../ecs/world';
import { StatType, EnemyType, ModKey, DamageTrait, AmmunitionType, WeaponKey } from '../types/enums';
import { EncounterConditions } from '../types/common';
import { createWeaponComponent, createModComponent } from '../ecs/factories';
import { runStatAggregation } from '../ecs/systems/stat-aggregator-system';
import { resolveScenarioScan } from '../engine/resolver';
import { StatsComponent, FlagComponent, LoadoutComponent } from '../ecs/types';
import { DEFAULT_SUBSTATS } from '../data/mods';

describe('ECS Unified Resolver Build Logic Verification', () => {
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

    test('Momentum Up dynamic logic affects resolver output', () => {
        const momentumUp = createModComponent(ModKey.MomentumUp, DEFAULT_SUBSTATS);
        const loadout: LoadoutComponent = {
            weapon: createWeaponComponent(WeaponKey.DE50Jaws, 1, 5, 0, undefined, 0, undefined, 0, momentumUp)
        };
        world.addComponent(playerId, 'loadout', loadout);

        const conditions = new EncounterConditions();
        conditions.enemyType = EnemyType.Normal;
        
        const statsComp = world.getComponent(playerId, 'stats')!;
        const flagsComp = world.getComponent(playerId, 'flags')!;
        const traits = new Set([DamageTrait.Attack, DamageTrait.Weapon]);

        // 1. First half of mag (Should have +10% Fire Rate, 0% Weapon DMG)
        runStatAggregation(world, conditions, 1.0, AmmunitionType.Copper);
        const baseDmg1 = statsComp.snapshot[StatType.DamagePerProjectile] || 0;
        const res1 = resolveScenarioScan(baseDmg1, statsComp, flagsComp, conditions.enemyType, traits);
        // We expect it to be just the base damage since we didn't add any other buffs
        expect(res1.noCritNoWs).toBe(baseDmg1);

        // 2. Second half of mag (Should have 0% Fire Rate, +30% Weapon DMG)
        runStatAggregation(world, conditions, 0.2, AmmunitionType.Copper);
        const res2 = resolveScenarioScan(baseDmg1, statsComp, flagsComp, conditions.enemyType, traits);
        // +30% Weapon Damage from Momentum Up second half
        expect(res2.noCritNoWs).toBeCloseTo(baseDmg1 * 1.3);
    });

    test('Fateful Strike disables weakspots correctly in Resolver', () => {
        const fateful = createModComponent(ModKey.FatefulStrike, DEFAULT_SUBSTATS);
        const loadout: LoadoutComponent = {
            weapon: createWeaponComponent(WeaponKey.DE50Jaws, 1, 5, 0, undefined, 0, undefined, 0, fateful)
        };
        world.addComponent(playerId, 'loadout', loadout);

        const conditions = new EncounterConditions();
        conditions.enemyType = EnemyType.Normal;
        
        const statsComp = world.getComponent(playerId, 'stats')!;
        const flagsComp = world.getComponent(playerId, 'flags')!;
        const traits = new Set([DamageTrait.Attack, DamageTrait.Weapon]);

        runStatAggregation(world, conditions, 1.0, AmmunitionType.Copper);
        const baseDmg = statsComp.snapshot[StatType.DamagePerProjectile] || 0;

        const result = resolveScenarioScan(baseDmg, statsComp, flagsComp, conditions.enemyType, traits);

        // Fateful Strike disables weakspots, so result should be baseDmg even in WS scenario
        expect(result.noCritWs).toBe(baseDmg);
    });
});
