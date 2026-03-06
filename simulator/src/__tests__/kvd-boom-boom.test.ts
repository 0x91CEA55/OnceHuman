import { Player, PlayerStats } from '../models/player';
import { Loadout, ArmorStats, KeyArmor } from '../models/equipment';
import { StatType, EnemyType, WeaponKey, ModKey, EncounterTopology, ArmorSlot, Rarity } from '../types/enums';
import { createWeapon } from '../data/weapons';
import { createModInstance, DEFAULT_SUBSTATS } from '../data/mods';
import { DamageEngine } from '../engine/damage-engine';
import { EncounterConditions } from '../types/common';

describe('KVD Boom Boom & Burn Synergy', () => {
    let player: Player;
    let stats: PlayerStats;
    let loadout: Loadout;

    beforeEach(() => {
        stats = new PlayerStats();
        loadout = new Loadout();
        player = new Player(loadout, stats, 100);
    });

    test('Flame Resonance mod increases Burn stacks and reduces duration', () => {
        const flameRes = createModInstance(ModKey.FlameResonance, DEFAULT_SUBSTATS);
        const kvd = createWeapon(WeaponKey.KVDBoomBoom, 1, 1, 0, flameRes);
        loadout.weapon = kvd;

        const armorStats = new ArmorStats();
        armorStats.psiIntensity.reset(1000, 'Test');
        loadout.helmet = new KeyArmor('h1', 'H', Rarity.Common, 1, 1, 0, undefined, ArmorSlot.Helmet, armorStats, []);

        const conditions = new EncounterConditions();
        const engine = new DamageEngine(player, conditions);

        engine.simulateMagDump();

        // Max Burn Stacks baseline is 5 (from player.ts initialization)
        // Flame Resonance adds +2
        // Total should be 7
        expect(player.stats.get(StatType.MaxBurnStacks)?.value).toBe(7);
        // Burn Duration baseline is 100%
        // Flame Resonance adds -20%
        // Total should be 80%
        expect(player.stats.get(StatType.BurnDurationPercent)?.value).toBe(80);
    });

    test('Pyro Dino Synergy eruption triggers on hit', () => {
        const kvd = createWeapon(WeaponKey.KVDBoomBoom);
        loadout.weapon = kvd;

        const conditions = new EncounterConditions();
        conditions.enemyType = EnemyType.Boss;
        conditions.topology = EncounterTopology.SingleTarget;

        const engine = new DamageEngine(player, conditions);

        engine.simulateMagDump();

        const logs = engine.getLogs();
        const eruptions = logs.filter(l => l.description.includes('Pyro Dino Eruption'));

        expect(eruptions.length).toBeGreaterThan(0);
    });
});
