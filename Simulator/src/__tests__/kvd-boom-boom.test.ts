import { Player, PlayerStats } from '../models/player';
import { Loadout, ArmorStats, KeyArmor } from '../models/equipment';
import { StatType, EnemyType, WeaponKey, ModKey, EncounterTopology, ArmorSlot, Rarity } from '../types/enums';
import { EncounterConditions } from '../types/common';
import { createWeapon } from '../data/weapons';
import { createModInstance, DEFAULT_SUBSTATS } from '../data/mods';
import { DamageEngine } from '../engine/damage-engine';
import { StatAggregator } from '../engine/stat-aggregator';
import { Burn } from '../pipelines/keyword';

describe('KVD Boom Boom & Burn Synergy', () => {
    let player: Player;
    let conditions: EncounterConditions;

    beforeEach(() => {
        conditions = {
            enemyType: EnemyType.Boss,
            targetDistanceMeters: 10,
            playerHpPercent: 100,
            isTargetVulnerable: false,
            weakspotHitRate: 0.5,
            topology: EncounterTopology.SingleTarget
        };
        const loadout = new Loadout();
        
        // Provide Psi Intensity via Armor so it survives StatAggregator.aggregate()
        const armorStats = new ArmorStats();
        armorStats.psiIntensity.value = 1000;
        loadout.helmet = new KeyArmor('psi-helm', 'Psi Helmet', Rarity.Legendary, 1, 1, 0, undefined, ArmorSlot.Helmet, armorStats, []);
        
        player = new Player(loadout, new PlayerStats(), 100);
    });

    test('KVD Boom Boom explosion triggers on simulated kill', async () => {
        player.loadout.weapon = createWeapon(WeaponKey.KVDBoomBoom);
        const engine = new DamageEngine(player, conditions);
        
        // Simulating a mag dump - every 10 shots it triggers OnKill
        engine.simulateMagDump();
        
        const logs = engine.getLogs();
        // Updated to use 'includes' because recordDamage now appends "deals X damage"
        const explosions = logs.filter(l => l.event === 'Damage' && l.description.includes('Blaze Explosion'));
        
        // 100 round mag / 10 = 10 kills expected
        // BUT Blaze Explosion has 2s cooldown.
        expect(explosions.length).toBe(4);
        
        if (explosions.length > 0) {
            // Psi is 1000, scaling is 3.0 -> 3000 base.
            // DamageProcessor also applies status/elemental bonuses if traits are present
            // Default player has 0% bonuses, so damage should be 3000.
            expect(explosions[0].damage).toBeCloseTo(3000);
        }
    });

    test('Flame Resonance mod increases Burn stacks and reduces duration', () => {
        const flameRes = createModInstance(ModKey.FlameResonance, DEFAULT_SUBSTATS);
        player.loadout.weapon = createWeapon(WeaponKey.KVDBoomBoom, 1, 1, 0, flameRes);
        
        // Re-aggregate to apply mod stats
        StatAggregator.aggregate(player, conditions);
        
        // Base burn stacks is 5. Flame Resonance adds +2.
        expect(player.stats.get(StatType.MaxBurnStacks)?.value).toBe(7);
        // Base burn duration is 100%. Flame Resonance adds -20%.
        expect(player.stats.get(StatType.BurnDurationPercent)?.value).toBe(80);
    });

    test('Pyro Dino Synergy eruption triggers on hit', () => {
        player.loadout.weapon = createWeapon(WeaponKey.KVDBoomBoom);
        const engine = new DamageEngine(player, conditions);
        
        engine.simulateMagDump();
        
        const logs = engine.getLogs();
        const eruptions = logs.filter(l => l.description.includes('Pyro Dino Eruption'));
        
        // Eruption has 15% chance on hit. With 100 shots, we expect some eruptions.
        expect(eruptions.length).toBeGreaterThan(0);
    });
});
