import { Player, PlayerStats } from '../models/player';
import { Loadout, ArmorStats, KeyArmor } from '../models/equipment';
import { StatType, EnemyType, WeaponKey, ModKey, EncounterTopology, ArmorSlot, Rarity } from '../types/enums';
import { EncounterConditions } from '../types/common';
import { createWeapon } from '../data/weapons';
import { createModInstance, DEFAULT_SUBSTATS } from '../data/mods';
import { DamageEngine } from '../engine/damage-engine';
import { StatAggregator } from '../engine/stat-aggregator';

describe('KVD Boom Boom & Burn Synergy', () => {
    let player: Player;
    let conditions: EncounterConditions;

    beforeEach(() => {
        conditions = new EncounterConditions();
        conditions.enemyType = EnemyType.Boss;
        conditions.targetDistanceMeters = 10;
        conditions.playerHpPercent = 100;
        conditions.isTargetVulnerable = false;
        conditions.weakspotHitRate = 0.5;
        conditions.topology = EncounterTopology.SingleTarget;
        const loadout = new Loadout();

        // Provide Psi Intensity via Armor so it survives StatAggregator.aggregate()
        const armorStats = new ArmorStats();
        armorStats.psiIntensity.value = 1000;
        loadout.helmet = new KeyArmor('psi-helm', 'Psi Helmet', Rarity.Legendary, 1, 1, 0, undefined, ArmorSlot.Helmet, armorStats, []);

        player = new Player(loadout, new PlayerStats(), 100);
    });

    test('Flame Resonance mod increases Burn stacks and reduces duration', () => {
        const flameRes = createModInstance(ModKey.FlameResonance, DEFAULT_SUBSTATS);
        player.loadout.weapon = createWeapon(WeaponKey.KVDBoomBoom, 1, 1, 0, flameRes);

        StatAggregator.aggregate(player, conditions);

        expect(player.stats.get(StatType.MaxBurnStacks)?.value).toBe(7);
        expect(player.stats.get(StatType.BurnDurationPercent)?.value).toBe(80);
    });

    test('Pyro Dino Synergy eruption triggers on hit', () => {
        player.loadout.weapon = createWeapon(WeaponKey.KVDBoomBoom);
        const engine = new DamageEngine(player, conditions);

        engine.simulateMagDump();

        const logs = engine.getLogs();
        const eruptions = logs.filter(l => l.description.includes('Pyro Dino Eruption'));

        expect(eruptions.length).toBeGreaterThan(0);
    });
});
