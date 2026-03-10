import { runStatAggregation } from '../ecs/systems/stat-aggregator-system';
import { World } from '../ecs/world';
import { StatType, ModKey, EnemyType, AmmunitionType, WeaponKey } from '../types/enums';
import { DEFAULT_SUBSTATS } from '../data/mods';
import { EncounterConditions } from '../types/common';
import { createWeaponComponent, createModComponent } from '../ecs/factories';
import { StatsComponent, FlagComponent, LoadoutComponent } from '../ecs/types';

describe('ECS StatAggregator Strategy Tests', () => {
    let world: World;
    let playerId: any;

    const dummyConditions = new EncounterConditions();
    dummyConditions.enemyType = EnemyType.Normal;

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

    test('Momentum Up strategy logic (First half of mag)', () => {
        const mod = createModComponent(ModKey.MomentumUp, DEFAULT_SUBSTATS);
        const loadout: LoadoutComponent = {
            weapon: createWeaponComponent(WeaponKey.DE50Jaws, 1, 5, 0, undefined, 0, undefined, 0, mod)
        };
        world.addComponent(playerId, 'loadout', loadout);

        // Aggregate at 100% ammo
        runStatAggregation(world, dummyConditions, 1.0, AmmunitionType.Steel);
        const stats = world.getComponent(playerId, 'stats')!.snapshot;
        // Jaws base 190 + Momentum Up 10 = 200
        expect(stats[StatType.FireRate]).toBe(200);
        // Jaws base 0 + Momentum Up 0 (1st half) + Steel Ammo 5 = 5
        expect(stats[StatType.WeaponDamagePercent] || 0).toBe(5);
    });

    test('Momentum Up strategy logic (Second half of mag)', () => {
        const mod = createModComponent(ModKey.MomentumUp, DEFAULT_SUBSTATS);
        const loadout: LoadoutComponent = {
            weapon: createWeaponComponent(WeaponKey.DE50Jaws, 1, 5, 0, undefined, 0, undefined, 0, mod)
        };
        world.addComponent(playerId, 'loadout', loadout);

        // Aggregate at 20% ammo
        runStatAggregation(world, dummyConditions, 0.2, AmmunitionType.Steel);
        const stats = world.getComponent(playerId, 'stats')!.snapshot;
        // Jaws base 190 + Momentum Up 0 (2nd half) = 190
        expect(stats[StatType.FireRate] || 0).toBe(190);
        // Jaws base 0 + Momentum Up 30 (2nd half) + Steel Ammo 5 = 35
        expect(stats[StatType.WeaponDamagePercent]).toBe(35);
    });

    test('Fateful Strike strategy logic', () => {
        const mod = createModComponent(ModKey.FatefulStrike, DEFAULT_SUBSTATS);
        const loadout: LoadoutComponent = {
            weapon: createWeaponComponent(WeaponKey.DE50Jaws, 1, 5, 0, undefined, 0, undefined, 0, mod)
        };
        world.addComponent(playerId, 'loadout', loadout);

        runStatAggregation(world, dummyConditions, 1.0, AmmunitionType.Steel);
        const stats = world.getComponent(playerId, 'stats')!.snapshot;
        // Jaws base 6 + Fateful Strike 10 = 16
        expect(stats[StatType.CritRatePercent]).toBe(16);
        // Jaws base 25 + Fateful Strike 30 = 55
        expect(stats[StatType.CritDamagePercent]).toBe(55);
    });
});
