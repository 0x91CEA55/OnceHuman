import { Player, PlayerStats } from '../models/player';
import { Loadout, ArmorStats, KeyArmor } from '../models/equipment';
import { StatType, WeaponKey, ModKey, ArmorSlot, Rarity, AmmunitionType, DamageTrait } from '../types/enums';
import { EncounterConditions } from '../types/common';
import { createWeapon } from '../data/weapons';
import { createModInstance, DEFAULT_SUBSTATS } from '../data/mods';
import { DamageEngine } from '../engine/damage-engine';
import { StatAggregator } from '../engine/stat-aggregator';
import { DamageIntent } from '../models/damage';
import { DamageProcessor } from '../engine/damage-processor';

describe('Architecture Refactor: Bucket Scaling & Stateful Triggers', () => {
    let player: Player;
    let conditions: EncounterConditions;

    beforeEach(() => {
        conditions = new EncounterConditions();
        const loadout = new Loadout();
        player = new Player(loadout, new PlayerStats(), 100);
    });

    test('Two-Bucket Keyword Scaling (Factor * Final)', () => {
        const processor = new DamageProcessor();
        const target = { id: 'test', hp: 9999, takeDamage: () => { }, isDead: () => false, statusManager: null as any } as any;

        // 1. Setup Base Shrapnel (50% of Attack)
        player.stats.add(StatType.AttackPercent, 1000); // 1000 Attack

        // 2. Add Factor and Final bonuses
        player.stats.add(StatType.ShrapnelDamageFactor, 50); // +50% Factor
        player.stats.add(StatType.ShrapnelFinalDamage, 20); // +20% Final

        const intent = new DamageIntent(500, player, target) // 500 = 50% of 1000
            .addTrait(DamageTrait.Shrapnel);

        // Expected: 500 * (1 + 0.5) * (1 + 0.2) = 500 * 1.5 * 1.2 = 900
        const result = processor.resolve(intent);
        expect(result).toBeCloseTo(900);
    });

    test('DE.50 Jaws: HitCounterCondition (Crit counts as 2)', () => {
        player.loadout.weapon = createWeapon(WeaponKey.DE50Jaws);
        const engine = new DamageEngine(player, conditions);

        // Jaws: Every 3 hits trigger UB.
        // Mocking Math.random to force a Crit on Shot 2
        let randomCalls = 0;
        jest.spyOn(Math, 'random').mockImplementation(() => {
            randomCalls++;
            if (randomCalls === 4) return 0; // The Crit check for Shot 2
            return 0.9; // Fail other random checks
        });

        engine.simulateMagDump();

        const ubTriggers = engine.getLogs().filter(l => l.description.includes('Unstable Bomber'));
        expect(ubTriggers.length).toBeGreaterThan(0);

        jest.restoreAllMocks();
    });

    test('ConditionalEffect: Elemental Havoc (HP Threshold)', () => {
        const mod = createModInstance(ModKey.ElementalHavoc, DEFAULT_SUBSTATS);
        player.loadout.helmet = new KeyArmor('item-1', 'Helm', Rarity.Legendary, 1, 1, 0, mod, ArmorSlot.Helmet, new ArmorStats(), []);

        // Case 1: HP @ 100% (Should have both bonuses: 10 + 10 = 20)
        conditions.playerHpPercent = 100;
        StatAggregator.aggregate(player, conditions);
        expect(player.stats.get(StatType.ElementalDamagePercent)?.value).toBe(20);

        // Case 2: HP @ 50% (Should only have base bonus: 10)
        conditions.playerHpPercent = 50;
        StatAggregator.aggregate(player, conditions);
        expect(player.stats.get(StatType.ElementalDamagePercent)?.value).toBe(10);
    });

    test('Ammunition Multipliers', () => {
        // Use a KeyArmor to provide base stats that survive aggregation reset
        const armorStats = new ArmorStats();
        armorStats.psiIntensity.value = 100;
        player.loadout.helmet = new KeyArmor('item-1', 'Helm', Rarity.Legendary, 1, 1, 0, undefined, ArmorSlot.Helmet, armorStats, []);

        // Tungsten AP: 1.15x multiplier
        player.selectedAmmunition = AmmunitionType.TungstenAP;

        StatAggregator.aggregate(player, conditions);

        // 100 * 1.15 = 115
        expect(player.stats.get(StatType.PsiIntensity)?.value).toBeCloseTo(115);
    });
});
