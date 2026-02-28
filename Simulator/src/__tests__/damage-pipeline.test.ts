import { PhysicalDamagePipeline } from '../pipelines/physical';
import { Player, PlayerStats } from '../models/player';
import { Loadout, Weapon, WeaponStats, SetArmor, ArmorStats, ArmorSetDefinition, Mod } from '../models/equipment';
import { StatType, EnemyType, Rarity, WeaponType, ArmorSlot, EffectType, FlagType } from '../types/enums';
import { EncounterConditions } from '../types/common';
import { StatAggregator } from '../engine/stat-aggregator';
import { Burn } from '../pipelines/keyword';
import { IncreaseStatEffect, SetFlagEffect } from '../models/effect';

describe('PhysicalDamagePipeline with Concrete Gear', () => {
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

    test('Full calculation flow: Rust Pistol + Agent + Mod', () => {
        // 1. Setup Rust Pistol (Base DMG 100)
        const pistolStats = new WeaponStats();
        pistolStats.damagePerProjectile.value = 100;
        pistolStats.critDamagePercent.value = 50;
        pistolStats.weakspotDamagePercent.value = 60;
        
        const weaponMod: Mod = {
            id: 'mod-violent', name: 'Violent', slot: 'weapon_main' as any, description: '', 
            effects: [], 
            subStats: [{ type: EffectType.IncreaseStat, stat: StatType.WeaponDamagePercent, value: 10 } as IncreaseStatEffect]
        };

        loadout.weapon = new Weapon(
            'rust-pistol', 'Rust Pistol', Rarity.Common, 1, 1, 0, weaponMod,
            WeaponType.Pistol, new Burn(), pistolStats, []
        );

        // 2. Setup Agent Mask (+10% Attack)
        const agentSet = new ArmorSetDefinition('agent', 'Agent Set', [
            { requiredPieces: 1, effects: [{ type: EffectType.IncreaseStat, stat: StatType.AttackPercent, value: 10 } as IncreaseStatEffect] }
        ]);
        loadout.mask = new SetArmor('agent-mask', 'Agent Mask', Rarity.Legendary, 1, 1, 0, undefined, ArmorSlot.Mask, new ArmorStats(), agentSet);

        // 3. Aggregate Stats
        StatAggregator.aggregate(player);

        // 4. Calculate Damage
        const conditions: EncounterConditions = {
            enemyType: EnemyType.Normal,
            targetDistanceMeters: 10,
            playerHpPercent: 100,
            isTargetVulnerable: false,
            weakspotHitRate: 100 // Always hit weakspot
        };

        const result = pipeline.calculate(player, conditions);
        
        // Math:
        // Base = 100
        // Atk Mult = 1.10
        // Weapon DMG Mult = 1.10
        // Base Damage Before Crit/Ws = 100 * 1.1 * 1.1 = 121
        
        // Crit DMG = +50%
        // Ws DMG = +60%
        // Additive Crit + Ws: (1 + 0.5 + 0.6) = 2.1x
        
        // Final Crit+Ws Damage = 121 * 2.1 = 254.1
        
        expect(result.noCritNoWs).toBeCloseTo(121);
        expect(result.critWs).toBeCloseTo(254.1);
    });

    test('Fateful Strike disables Weakspots in pipeline', () => {
        const pistolStats = new WeaponStats();
        pistolStats.damagePerProjectile.value = 100;
        pistolStats.weakspotDamagePercent.value = 50;

        const fatefulMod: Mod = {
            id: 'fateful', name: 'Fateful Strike', slot: 'weapon_main' as any, description: '', 
            effects: [{ type: EffectType.SetFlag, flag: FlagType.CannotDealWeakspotDamage, value: true } as SetFlagEffect], 
            subStats: []
        };

        loadout.weapon = new Weapon(
            'w', 'W', Rarity.Epic, 1, 1, 0, fatefulMod,
            WeaponType.Pistol, new Burn(), pistolStats, []
        );

        StatAggregator.aggregate(player);

        const conditions: EncounterConditions = {
            enemyType: EnemyType.Normal,
            targetDistanceMeters: 10,
            playerHpPercent: 100,
            isTargetVulnerable: false,
            weakspotHitRate: 100 // User tries to hit weakspot
        };

        const result = pipeline.calculate(player, conditions);
        
        // Should ignore the weakspotHitRate because of the flag
        expect(result.noCritWs).toBe(100);
        expect(result.expected).toBe(100); // Assuming 0% crit rate
    });
});
