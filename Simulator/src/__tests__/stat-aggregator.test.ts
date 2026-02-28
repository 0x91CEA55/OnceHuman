import { StatAggregator } from '../engine/stat-aggregator';
import { Player, PlayerStats } from '../models/player';
import { Loadout, Weapon, WeaponStats, SetArmor, ArmorStats, ArmorSetDefinition, Mod } from '../models/equipment';
import { Rarity, WeaponType, StatType, ArmorSlot, EffectType, FlagType } from '../types/enums';
import { Burn } from '../pipelines/keyword';
import { IncreaseStatEffect, SetFlagEffect } from '../models/effect';

describe('StatAggregator Concrete Gear Tests', () => {
    let player: Player;
    let stats: PlayerStats;
    let loadout: Loadout;

    beforeEach(() => {
        stats = new PlayerStats();
        loadout = new Loadout();
        player = new Player(loadout, stats, 100);
    });

    test('Empty loadout results in zero base damage', () => {
        StatAggregator.aggregate(player);
        expect(player.stats.get(StatType.DamagePerProjectile)?.value).toBe(0);
    });

    test('Starter Setup: Rust Pistol + Agent 1pc + Mod', () => {
        // 1. Setup Rust Pistol (Base DMG 50)
        const pistolStats = new WeaponStats();
        pistolStats.damagePerProjectile.value = 50;
        
        // Weapon Mod: Violent (+5% Weapon DMG)
        const weaponMod: Mod = {
            id: 'mod-violent', name: 'Violent', slot: 'weapon_main' as any, description: '', 
            effects: [], 
            subStats: [{ type: EffectType.IncreaseStat, stat: StatType.WeaponDamagePercent, value: 5 } as IncreaseStatEffect]
        };

        loadout.weapon = new Weapon(
            'rust-pistol', 'Rust Pistol', Rarity.Common, 1, 1, 0, weaponMod,
            WeaponType.Pistol, new Burn(), pistolStats, []
        );

        // 2. Setup Agent Mask (1pc bonus: +10% Attack)
        const agentSet = new ArmorSetDefinition('agent', 'Agent Set', [
            { requiredPieces: 1, effects: [{ type: EffectType.IncreaseStat, stat: StatType.AttackPercent, value: 10 } as IncreaseStatEffect] }
        ]);
        const armorStats = new ArmorStats();
        loadout.mask = new SetArmor('agent-mask', 'Agent Mask', Rarity.Legendary, 1, 1, 0, undefined, ArmorSlot.Mask, armorStats, agentSet);

        // 3. Aggregate
        StatAggregator.aggregate(player);

        // 4. Verify
        expect(player.stats.get(StatType.DamagePerProjectile)?.value).toBe(50);
        expect(player.stats.get(StatType.AttackPercent)?.value).toBe(10);
        expect(player.stats.get(StatType.WeaponDamagePercent)?.value).toBe(5);
    });

    test('Fateful Strike Mod disables weakspots via Flag', () => {
        const wStats = new WeaponStats();
        const fatefulMod: Mod = {
            id: 'mod-fateful', name: 'Fateful Strike', slot: 'weapon_main' as any, description: '', 
            effects: [{ type: EffectType.SetFlag, flag: FlagType.CannotDealWeakspotDamage, value: true } as SetFlagEffect], 
            subStats: []
        };

        loadout.weapon = new Weapon(
            'wpn', 'Wpn', Rarity.Epic, 1, 1, 0, fatefulMod,
            WeaponType.Pistol, new Burn(), wStats, []
        );

        StatAggregator.aggregate(player);

        expect(player.hasFlag(FlagType.CannotDealWeakspotDamage)).toBe(true);
    });
});
