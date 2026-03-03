import { Player, PlayerStats } from '../models/player';
import { StatType, DamageTrait } from '../types/enums';
import { Loadout } from '../models/equipment';
import { DamageProcessor } from '../engine/damage-processor';
import { DamageIntent } from '../models/damage';
import { Enemy } from '../models/enemy';
import { LegacyResolutionStrategy, RefinedResolutionStrategy } from '../engine/damage-resolution-strategy';

describe('Golden Formula Regression: Zero-Trust Resolution', () => {
    let player: Player;
    let enemy: Enemy;

    beforeEach(() => {
        const stats = new PlayerStats();
        // Mock baseline to 0 for pure formula testing
        const psi = stats.get(StatType.PsiIntensity);
        if (psi) psi.value = 0;
        
        player = new Player(new Loadout(), stats, 100);
        enemy = new Enemy('test-enemy', 1000000);
    });

    test('Legacy Strategy: Should resolve purely multiplicatively', () => {
        const strategy = new LegacyResolutionStrategy();
        const processor = new DamageProcessor(strategy);
        
        // Base 100 * (1.2 Status) * (1.15 Elem) * (1.5 Weapon) = 207
        player.stats.add(StatType.StatusDamagePercent, 20);
        player.stats.add(StatType.ElementalDamagePercent, 15);
        player.stats.add(StatType.WeaponDamagePercent, 50);

        const intent = new DamageIntent(100, player, enemy)
            .addTrait(DamageTrait.Status)
            .addTrait(DamageTrait.Elemental)
            .addTrait(DamageTrait.Weapon);

        const damage = processor.resolve(intent);
        
        expect(damage).toBeCloseTo(207);
    });

    test('Refined Strategy: Should resolve with additive factor buckets', () => {
        const strategy = new RefinedResolutionStrategy();
        const processor = new DamageProcessor(strategy);
        
        // Base 100 * (1 + 0.20 + 0.15 + 0.50) = 185
        // Because Refined sums Status, Elemental, and Weapon into one additive bucket
        player.stats.add(StatType.StatusDamagePercent, 20);
        player.stats.add(StatType.ElementalDamagePercent, 15);
        player.stats.add(StatType.WeaponDamagePercent, 50);

        const intent = new DamageIntent(100, player, enemy)
            .addTrait(DamageTrait.Status)
            .addTrait(DamageTrait.Elemental)
            .addTrait(DamageTrait.Weapon);

        const damage = processor.resolve(intent);
        
        expect(damage).toBeCloseTo(185);
    });
});
