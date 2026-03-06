import { StatAggregator } from '../engine/stat-aggregator';
import { Player, PlayerStats } from '../models/player';
import { Loadout, Weapon, WeaponStats } from '../models/equipment';
import { Rarity, WeaponType, StatType, ModKey, EnemyType, EncounterTopology } from '../types/enums';
import { Burn } from '../models/keyword';
import { DEFAULT_SUBSTATS, createModInstance } from '../data/mods';
import { EncounterConditions } from '../types/common';

describe('StatAggregator Strategy Tests', () => {
    let player: Player;
    let stats: PlayerStats;
    let loadout: Loadout;

    const dummyConditions = new EncounterConditions();
    dummyConditions.enemyType = EnemyType.Normal;
    dummyConditions.targetDistanceMeters = 10;
    dummyConditions.playerHpPercent = 100;
    dummyConditions.isTargetVulnerable = false;
    dummyConditions.weakspotHitRate = 0.5;
    dummyConditions.topology = EncounterTopology.SingleTarget;

    beforeEach(() => {
        stats = new PlayerStats();
        loadout = new Loadout();
        player = new Player(loadout, stats, 100);
    });

    test('Momentum Up strategy logic (First half of mag)', () => {
        const wStats = new WeaponStats();
        const mod = createModInstance(ModKey.MomentumUp, DEFAULT_SUBSTATS);
        loadout.weapon = new Weapon('w', 'W', Rarity.Common, 1, 1, 0, mod, WeaponType.Pistol, new Burn(), wStats, []);

        // Aggregate at 100% ammo
        StatAggregator.aggregate(player, dummyConditions, 1.0, true);
        expect(player.stats.get(StatType.FireRate)?.value).toBe(10);
        expect(player.stats.get(StatType.WeaponDamagePercent)?.value).toBe(0);
    });

    test('Momentum Up strategy logic (Second half of mag)', () => {
        const wStats = new WeaponStats();
        const mod = createModInstance(ModKey.MomentumUp, DEFAULT_SUBSTATS);
        loadout.weapon = new Weapon('w', 'W', Rarity.Common, 1, 1, 0, mod, WeaponType.Pistol, new Burn(), wStats, []);

        // Aggregate at 20% ammo
        StatAggregator.aggregate(player, dummyConditions, 0.2, true);
        expect(player.stats.get(StatType.FireRate)?.value).toBe(0);
        expect(player.stats.get(StatType.WeaponDamagePercent)?.value).toBe(30);
    });

    test('Fateful Strike strategy logic', () => {
        const wStats = new WeaponStats();
        const mod = createModInstance(ModKey.FatefulStrike, DEFAULT_SUBSTATS);
        loadout.weapon = new Weapon('w', 'W', Rarity.Common, 1, 1, 0, mod, WeaponType.Pistol, new Burn(), wStats, []);

        StatAggregator.aggregate(player, dummyConditions, 1.0, true);
        expect(player.stats.get(StatType.CritRatePercent)?.value).toBe(10);
        expect(player.stats.get(StatType.CritDamagePercent)?.value).toBe(30);
    });
});
