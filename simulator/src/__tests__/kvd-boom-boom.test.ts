import { World } from '../ecs/world';
import { StatType, EnemyType, WeaponKey, ModKey, AmmunitionType } from '../types/enums';
import { createWeaponComponent, createModComponent } from '../ecs/factories';
import { SimulationRunner } from '../engine/simulation-runner';
import { EncounterConditions } from '../types/common';
import { runStatAggregation } from '../ecs/systems/stat-aggregator-system';
import { DEFAULT_SUBSTATS } from '../data/mods';
import { StatsComponent, FlagComponent, LoadoutComponent } from '../ecs/types';

describe('ECS KVD Boom Boom & Burn Synergy', () => {
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

    test('Flame Resonance mod increases Burn stacks and reduces duration', () => {
        const flameRes = createModComponent(ModKey.FlameResonance, DEFAULT_SUBSTATS);
        const loadout: LoadoutComponent = {
            weapon: createWeaponComponent(WeaponKey.KVDBoomBoom, 1, 5, 0, undefined, 0, undefined, 0, flameRes)
        };
        world.addComponent(playerId, 'loadout', loadout);

        const conditions = new EncounterConditions();
        runStatAggregation(world, conditions, 1.0, AmmunitionType.Steel);

        const stats = world.getComponent(playerId, 'stats')!.snapshot;

        // Max Burn Stacks baseline is 5 (from stat-aggregator-system.ts initialization)
        // Flame Resonance adds +2
        // Total should be 7
        expect(stats[StatType.MaxBurnStacks]).toBe(7);
        // Burn Duration baseline is 100%
        // Flame Resonance adds -20%
        // Total should be 80%
        expect(stats[StatType.BurnDurationPercent]).toBe(80);
    });

    test('Pyro Dino Synergy eruption triggers on hit', async () => {
        const loadout: LoadoutComponent = {
            weapon: createWeaponComponent(WeaponKey.KVDBoomBoom, 1, 5, 0)
        };
        world.addComponent(playerId, 'loadout', loadout);

        const conditions = new EncounterConditions();
        conditions.enemyType = EnemyType.Boss;

        const runner = new SimulationRunner(loadout, conditions, AmmunitionType.Steel);
        const logs = runner.simulateMagDump();

        const eruptions = logs.filter(l => l.description.includes('Pyro Dino Eruption'));
        expect(eruptions.length).toBeGreaterThan(0);
    });
});
