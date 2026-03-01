import { Player, PlayerStats } from '../models/player';
import { Loadout } from '../models/equipment';
import { StatType, EnemyType, WeaponKey, ModKey } from '../types/enums';
import { EncounterConditions } from '../types/common';
import { createWeapon } from '../data/weapons';
import { createModInstance, DEFAULT_SUBSTATS } from '../data/mods';
import { DamageEngine } from '../engine/damage-engine';
import { StatAggregator } from '../engine/stat-aggregator';

describe('KVD Boom Boom & Burn Synergy', () => {
    let player: Player;
    let conditions: EncounterConditions;

    beforeEach(() => {
        conditions = {
            enemyType: EnemyType.Boss,
            targetDistanceMeters: 10,
            playerHpPercent: 100,
            isTargetVulnerable: false,
            weakspotHitRate: 0.5
        };
        const loadout = new Loadout();
        player = new Player(loadout, new PlayerStats(), 100);
    });

    test('KVD Boom Boom explosion triggers on simulated kill', () => {
        player.loadout.weapon = createWeapon(WeaponKey.KVDBoomBoom);
        const engine = new DamageEngine(player, conditions);
        
        // Simulating a mag dump - every 10 shots it triggers OnKill
        engine.simulateMagDump();
        
        const logs = engine.getLogs();
        const explosions = logs.filter(l => l.event === 'Damage' && l.description === 'Blaze Explosion');
        
        // 100 round mag / 10 = 10 kills expected
        // BUT Blaze Explosion has 2s cooldown.
        // 650 RPM = ~10.8 shots/sec. 10 shots = ~0.92s.
        // Shot 10 (0.92s): Triggered
        // Shot 20 (1.84s): CD
        // Shot 30 (2.76s): CD
        // Shot 40 (3.68s): Triggered (CD ended at 2.92s)
        // Shot 50 (4.60s): CD
        // Shot 60 (5.52s): CD
        // Shot 70 (6.44s): Triggered (CD ended at 5.68s)
        // Shot 80 (7.36s): CD
        // Shot 90 (8.28s): CD
        // Shot 100 (9.20s): Triggered (CD ended at 8.44s)
        expect(explosions.length).toBe(4);
        
        // Each explosion deals 300% Psi Intensity
        const psi = player.stats.get(StatType.PsiIntensity)?.value ?? 0;
        if (explosions.length > 0) {
            expect(explosions[0].damage).toBeCloseTo(psi * 3.0);
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
