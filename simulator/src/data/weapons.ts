import { WeaponType, Rarity, KeywordType, WeaponKey, StatType } from '../types/enums';
import { Weapon, WeaponStats, Mod } from '../models/equipment';
import { Burn, Shrapnel, FastGunner, BullsEye, PowerSurge, FrostVortex, UnstableBomber, Keyword, Bounce, FortressWarfare } from '../pipelines/keyword';
import { BaseEffect } from '../models/effect';
import { DataMapper } from '../engine/data-mapper';
import { ScalingEngine } from '../engine/scaling-engine';
import { EffectRegistry } from '../engine/effect-registry';
import { RawWeaponData } from '../types/data-sources';

export function getKeywordInstance(type: KeywordType): Keyword {
    switch (type) {
        case KeywordType.Burn: return new Burn();
        case KeywordType.Shrapnel: return new Shrapnel();
        case KeywordType.FastGunner: return new FastGunner();
        case KeywordType.BullsEye: return new BullsEye();
        case KeywordType.PowerSurge: return new PowerSurge();
        case KeywordType.FrostVortex: return new FrostVortex();
        case KeywordType.UnstableBomber: return new UnstableBomber();
        case KeywordType.Bounce: return new Bounce();
        case KeywordType.FortressWarfare: return new FortressWarfare();
        default: return new Shrapnel();
    }
}

/**
 * Raw data reflecting the structure of research/data/custom-datamine/weapon_list.json
 * This satisfies the "Zero-Trust" ingestion requirement by using a mapper to normalize.
 */
export const RAW_WEAPONS: Record<string, RawWeaponData> = {
    [WeaponKey.DE50Jaws]: {
        id: WeaponKey.DE50Jaws,
        name: "DE.50 - Jaws",
        type: "pistol",
        rarity: "legendary",
        base_stats: {
            damage_per_projectile: 128,
            projectiles_per_shot: 1,
            fire_rate: 190,
            magazine_capacity: 8,
            crit_rate_percent: 6,
            weakspot_damage_percent: 60,
            crit_damage_percent: 25,
        },
        mechanics: {
            description: "Unstable Bomber and Explosive DMG bonuses",
            effects: [{ ability: "unstable_bomber" }]
        },
        description: "Unstable Bomber and Explosive DMG bonuses"
    },
    [WeaponKey.SOCRLastValor]: {
        id: WeaponKey.SOCRLastValor,
        name: "SOCR - The Last Valor",
        type: "assault_rifl",
        rarity: "legendary",
        base_stats: {
            damage_per_projectile: 48,
            projectiles_per_shot: 1,
            fire_rate: 515,
            magazine_capacity: 30,
            crit_rate_percent: 10,
            weakspot_damage_percent: 60,
            crit_damage_percent: 50,
        },
        mechanics: {
            description: "4% base chance to trigger Shrapnel. Critical hits count as two hits.",
            effects: [{ ability: "shrapnel" }]
        },
        description: "4% base chance to trigger Shrapnel. Critical hits count as two hits."
    },
    [WeaponKey.KVDBoomBoom]: {
        id: WeaponKey.KVDBoomBoom,
        name: "KVD - Boom Boom",
        type: "smgs",
        rarity: "legendary",
        base_stats: {
            damage_per_projectile: 32,
            projectiles_per_shot: 1,
            fire_rate: 650,
            magazine_capacity: 100,
            crit_rate_percent: 5,
            weakspot_damage_percent: 60,
            crit_damage_percent: 50,
        },
        mechanics: {
            description: "18% chance to trigger Burn on hit. Explosion on Kill.",
            effects: [{ ability: "burn" }]
        },
        description: "18% chance to trigger Burn on hit. Explosion on Kill."
    },
    [WeaponKey.MPS5PrimalRage]: {
        id: WeaponKey.MPS5PrimalRage,
        name: "MPS5 - Primal Rage",
        type: "smgs",
        rarity: "legendary",
        base_stats: {
            damage_per_projectile: 28,
            projectiles_per_shot: 1,
            fire_rate: 750,
            magazine_capacity: 40,
            crit_rate_percent: 15,
            weakspot_damage_percent: 60,
            crit_damage_percent: 50,
        },
        mechanics: {
            description: "35% chance to gain Fast Gunner stack on hit.",
            effects: [{ ability: "fast_gunner" }]
        },
        description: "35% chance to gain Fast Gunner stack on hit."
    },
    [WeaponKey.OctopusGrilledRings]: {
        id: WeaponKey.OctopusGrilledRings,
        name: "EBR-14: Octopus! Grilled Rings!",
        type: "sniper_rifles",
        rarity: "legendary",
        base_stats: {
            damage_per_projectile: 471,
            projectiles_per_shot: 1,
            fire_rate: 300,
            magazine_capacity: 20,
            crit_rate_percent: 5,
            weakspot_damage_percent: 50,
            crit_damage_percent: 40,
        },
        mechanics: {
            description: "High Burn chance. Fire ring at max stacks. Burn DMG +75%, Max Stacks -3.",
            effects: [{ ability: "burn" }]
        },
        description: "High Burn chance. Fire ring at max stacks. Burn DMG +75%, Max Stacks -3."
    }
};

/**
 * Optimized factory that uses DataMapper for normalization, ScalingEngine for 
 * tiered/star math, and EffectRegistry for behavior injection.
 */
export function createWeapon(key: WeaponKey, star: number = 1, level: number = 1, calibration: number = 0, mod?: Mod): Weapon {
    const raw = RAW_WEAPONS[key];
    if (!raw) throw new Error(`Weapon ${key} not found`);

    // 1. Data Ingestion & Normalization
    const data = DataMapper.normalizeWeapon(raw);

    // 2. Stat Derivation (Scaling Engine)
    const calibrationMultiplier = 1 + (calibration / 100);
    const finalBaseDamage = ScalingEngine.calculateFinalBaseDamage(
        data.baseStats.damagePerProjectile,
        star,
        level,
        calibrationMultiplier
    );

    const wStats = new WeaponStats();
    wStats.damagePerProjectile.value = finalBaseDamage;
    wStats.projectilesPerShot.value = data.baseStats.projectilesPerShot;
    wStats.fireRate.value = data.baseStats.fireRate;
    wStats.magazineCapacity.value = data.baseStats.magazineCapacity;
    wStats.critRatePercent.value = data.baseStats.critRatePercent;
    wStats.critDamagePercent.value = data.baseStats.critDamagePercent;
    wStats.weakspotDamagePercent.value = data.baseStats.weakspot_damage_percent || data.baseStats.weakspotDamagePercent; // DataMapper map raw weakspot_damage_percent to weakspotDamagePercent

    // 3. Behavior Injection (Effect Registry)
    const behavior = EffectRegistry.getWeaponBehavior(data.id);
    const keyword = behavior.keywordOverride || getKeywordInstance(data.keywordType);
    const intrinsicEffects = behavior.intrinsicEffects || [];
    const triggeredEffects = behavior.triggeredEffects || [];

    const weapon = new Weapon(
        data.id, 
        data.name, 
        data.rarity, 
        star, 
        level, 
        calibration, 
        mod,
        data.type, 
        keyword, 
        wStats, 
        intrinsicEffects,
        triggeredEffects
    );

    return weapon;
}
