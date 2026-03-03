import { Player, PlayerStats } from '../models/player';
import { Loadout, ArmorStats, KeyArmor } from '../models/equipment';
import { StatType, EnemyType, WeaponKey, ModKey, EncounterTopology, ArmorSlot, Rarity, EventTrigger } from '../types/enums';
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

        // We need to simulate kills manually because the target has too much HP.
        // We'll wrap the private simulateShot to emit OnKill every 10 shots.
        let shotCount = 0;
        const originalSimulateShot = (engine as any).simulateShot.bind(engine);
        jest.spyOn(engine as any, 'simulateShot').mockImplementation((num: number) => {
            shotCount = num;
            originalSimulateShot(num);
            
            if (shotCount % 10 === 0) {
                (engine as any).eventBus.emit({
                    type: EventTrigger.OnKill,
                    source: player,
                    target: (engine as any).primaryTarget,
                    depth: 0
                });
            }
        });

        // 100 round mag
        engine.simulateMagDump();

        const logs = engine.getLogs();
        const explosions = logs.filter(l => l.event === 'Damage' && l.description.includes('Blaze Explosion'));

        // 100 round mag / 10 = 10 kills expected
        // BUT Blaze Explosion has 2s cooldown.
        // KVD FR is 650. Shot interval is ~0.092s. 
        // 10 shots = 0.92s. 
        // Kill 1 (0.92s): Explosion 1. Cooldown til 2.92s.
        // Kill 2 (1.84s): Cooldown active.
        // Kill 3 (2.76s): Cooldown active.
        // Kill 4 (3.68s): Explosion 2. Cooldown til 5.68s.
        // Kill 5 (4.60s): Cooldown active.
        // Kill 6 (5.52s): Cooldown active.
        // Kill 7 (6.44s): Explosion 3. Cooldown til 8.44s.
        // Kill 8 (7.36s): Cooldown active.
        // Kill 9 (8.28s): Cooldown active.
        // Kill 10 (9.20s): Explosion 4.
        expect(explosions.length).toBe(4);

        if (explosions.length > 0) {
            // Psi is 1000 + 125 baseline = 1125. 1125 * 3.0 = 3375.
            expect(explosions[0].damage).toBeCloseTo(3375);
        }
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
