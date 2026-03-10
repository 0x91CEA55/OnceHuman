import { World } from '../ecs/world';
import { StatType, WeaponKey, ArmorKey, AmmunitionType } from '../types/enums';
import { BucketId } from '../types/resolution';
import { createWeaponComponent, createArmorComponent } from '../ecs/factories';
import { SimulationRunner } from '../engine/simulation-runner';
import { EncounterConditions } from '../types/common';
import { runStatAggregation } from '../ecs/systems/stat-aggregator-system';
import { runCombatShot } from '../ecs/systems/combat-system';
import { StatsComponent, FlagComponent, LoadoutComponent } from '../ecs/types';
import { SeededRng } from '../engine/rng';

describe('ECS Burn Build Fidelity', () => {
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

    test('Zero-Trust: Gilded Gloves unlock Burn Crit via ROLL_REGISTRY', () => {
        const loadout: LoadoutComponent = {
            weapon: createWeaponComponent(WeaponKey.OctopusGrilledRings),
            gloves: createArmorComponent(ArmorKey.GildedGloves)
        };
        world.addComponent(playerId, 'loadout', loadout);

        const conditions = new EncounterConditions();
        conditions.weakspotHitRate = 0;
        runStatAggregation(world, conditions, 1.0, AmmunitionType.Steel);
        
        const statsComp = world.getComponent(playerId, 'stats')!;
        // Manually override stats for predictable result
        statsComp.snapshot[StatType.PsiIntensity] = 0;
        statsComp.snapshot[StatType.DamagePerProjectile] = 100;
        statsComp.snapshot[StatType.CritRatePercent] = 100;
        statsComp.snapshot[StatType.CritDamagePercent] = 0;
        statsComp.snapshot[StatType.KeywordCritDamagePercent] = 50;
        statsComp.snapshot[StatType.WeakspotDamagePercent] = 0;
        statsComp.snapshot[StatType.WeakspotHitRatePercent] = 0;
        statsComp.snapshot[StatType.BurnDamageFactor] = 0;
        statsComp.snapshot[StatType.ElementalDamagePercent] = 30;
        statsComp.snapshot[StatType.StatusDamagePercent] = 40;
        statsComp.snapshot[StatType.WeaponDamagePercent] = 0;

        // Execute combat system directly
        const result = runCombatShot(world, playerId, conditions, new SeededRng(42));

        expect(result.flagsSnapshot.has('wasBurnCrit')).toBe(true);
        expect(result.audit.get(BucketId.BurnFactor)).toBe(1.0);
        expect(result.audit.get(BucketId.HitAmplifier)).toBe(1.5);
        
        // Calculation: 100 * 1.3 * 1.4 * 1.5 = 273
        expect(result.finalDamage).toBe(273);
    });

    test('Zero-Trust: Savior Set 2-piece requires Shield state', () => {
        const loadout: LoadoutComponent = {
            weapon: createWeaponComponent(WeaponKey.DE50Jaws),
            helmet: createArmorComponent(ArmorKey.SaviorHelmet),
            mask: createArmorComponent(ArmorKey.SaviorMask)
        };
        world.addComponent(playerId, 'loadout', loadout);

        const conditions = new EncounterConditions();

        // 1. Scenario A: No Shield
        conditions.playerShieldPercent = 0;
        runStatAggregation(world, conditions, 1.0, AmmunitionType.Copper);
        const statsA = world.getComponent(playerId, 'stats')!.snapshot;
        expect(statsA[StatType.WeaponDamagePercent] || 0).toBe(0);

        const runnerA = new SimulationRunner(loadout, conditions, AmmunitionType.Copper);
        const logA = runnerA.simulateMagDump().find(l => l.event === 'Shot')!;
        expect(logA.bucketMultipliers.get(BucketId.WeaponDamage)).toBe(1.0);

        // 2. Scenario B: With Shield
        conditions.playerShieldPercent = 50;
        runStatAggregation(world, conditions, 1.0, AmmunitionType.Copper);
        const statsB = world.getComponent(playerId, 'stats')!.snapshot;
        expect(statsB[StatType.WeaponDamagePercent]).toBe(10);

        const runnerB = new SimulationRunner(loadout, conditions, AmmunitionType.Copper);
        const logB = runnerB.simulateMagDump().find(l => l.event === 'Shot')!;
        
        // WeaponDamage bucket = 1 + 10/100 = 1.1
        expect(logB.bucketMultipliers.get(BucketId.WeaponDamage)).toBe(1.1);
    });
});
