/**
 * ADR-005: Zero-Trust Burn Build Verification (Integrated)
 * 
 * Verifies the interactions materialized in ADR-004 using the FULL pipeline:
 * StatAggregator -> DamageEngine -> Resolver.
 *
 * Refined per ADR-005 to eliminate 'as any' and string-key lookups.
 */

import { Player, PlayerStats } from '../models/player';
import { Loadout } from '../models/equipment';
import { EncounterConditions } from '../types/common';
import { ArmorKey, WeaponKey, StatType, FlagType } from '../types/enums';
import { BucketId } from '../types/resolution';
import { createArmor } from '../data/armor';
import { createWeapon } from '../data/weapons';
import { DamageEngine } from '../engine/damage-engine';
import { StatAggregator } from '../engine/stat-aggregator';
import { FixedRng } from '../engine/rng';

describe('ADR-005: Integrated Burn Build Fidelity', () => {

    test('Zero-Trust: Gilded Gloves unlock Burn Crit via ROLL_REGISTRY', () => {
        const stats = new PlayerStats();
        const loadout = new Loadout();
        const player = new Player(loadout, stats, 100);
        const conditions = new EncounterConditions();
        
        // 1. Equip EBR-14 Octopus (Burn weapon) and Gilded Gloves
        player.loadout.weapon = createWeapon(WeaponKey.OctopusGrilledRings); 
        player.loadout.gloves = createArmor(ArmorKey.GildedGloves);
        
        // 2. Aggregate stats (Sets KeywordCanCrit flag on player)
        StatAggregator.aggregate(player, conditions);
        expect(player.hasFlag(FlagType.KeywordCanCrit)).toBe(true);

        // 3. Run simulation shot using public, typed API
        const engine = new DamageEngine(player, conditions, null, new FixedRng([0.1])); // Force roll success
        
        // Finalize stats for predictable result (after aggregation)
        player.stats.set(StatType.DamagePerProjectile, 100);
        player.stats.set(StatType.CritRatePercent, 100);
        player.stats.set(StatType.KeywordCritDamagePercent, 50);
        player.stats.set(StatType.BurnDamageFactor, 0); // Clear factory bonuses for pure check

        const log = engine.executeShot(1);

        // 4. Verify results via explicit snapshots and enum lookups
        expect(log.flagsSnapshot.has('wasBurnCrit')).toBe(true);
        expect(log.bucketMultipliers.get(BucketId.BurnFactor)).toBe(1.5);
        
        // Calculation: 100 * 1.5 * 1.3 * 1.4 = 273
        expect(log.damage).toBe(273);
    });

    test('Zero-Trust: Savior Set 2-piece requires Shield state', () => {
        const stats = new PlayerStats();
        const loadout = new Loadout();
        const player = new Player(loadout, stats, 100);
        const conditions = new EncounterConditions();

        // 1. Equip 2 pieces of Savior
        player.loadout.helmet = createArmor(ArmorKey.SaviorHelmet);
        player.loadout.mask = createArmor(ArmorKey.SaviorMask);

        // 2. Scenario A: No Shield
        conditions.playerShieldPercent = 0;
        StatAggregator.aggregate(player, conditions);
        expect(player.stats.get(StatType.WeaponDamagePercent)?.value).toBe(0);

        const engineA = new DamageEngine(player, conditions);
        player.stats.set(StatType.DamagePerProjectile, 100);
        const logA = engineA.executeShot(1);
        expect(logA.bucketMultipliers.get(BucketId.WeaponDamage)).toBe(1.0);

        // 3. Scenario B: With Shield
        conditions.playerShieldPercent = 50;
        StatAggregator.aggregate(player, conditions);
        expect(player.stats.get(StatType.WeaponDamagePercent)?.value).toBe(10);

        const engineB = new DamageEngine(player, conditions);
        player.stats.set(StatType.DamagePerProjectile, 100);
        const logB = engineB.executeShot(1);
        
        // WeaponDamage bucket = 1 + 10/100 = 1.1
        expect(logB.bucketMultipliers.get(BucketId.WeaponDamage)).toBe(1.1);
    });
});
