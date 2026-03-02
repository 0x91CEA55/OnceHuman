import { WeaponType, Rarity, KeywordType, WeaponKey, StatType, DamageTrait } from '../types/enums';
import { Weapon, WeaponStats, Mod } from '../models/equipment';
import { Burn, Shrapnel, FastGunner, BullsEye, PowerSurge, FrostVortex, UnstableBomber, Keyword, Bounce, FortressWarfare } from '../pipelines/keyword';
import { TriggeredEffect, OnKillTrigger, OnHitTrigger, ChanceCondition, HitCounterCondition, TargetAtMaxStatusStacksCondition } from '../models/trigger';
import { ExplosionEffect, DoTEffect, ShrapnelEffect, BaseEffect, IncreaseStatEffect } from '../models/effect';

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

export interface WeaponBaseStatsData {
    damagePerProjectile: number;
    projectilesPerShot: number;
    fireRate: number;
    magazineCapacity: number;
    critRatePercent: number;
    weakspotDamagePercent: number;
    critDamagePercent: number;
}

export interface WeaponData {
    id: string;
    name: string;
    type: WeaponType;
    rarity: Rarity;
    baseStats: WeaponBaseStatsData;
    keywordType: KeywordType;
    description: string;
}

export const WEAPONS: Record<WeaponKey, WeaponData> = {
    [WeaponKey.DE50Jaws]: {
        id: WeaponKey.DE50Jaws,
        name: "DE.50 - Jaws",
        type: WeaponType.Pistol,
        rarity: Rarity.Legendary,
        baseStats: {
            damagePerProjectile: 128,
            projectilesPerShot: 1,
            fireRate: 190,
            magazineCapacity: 8,
            critRatePercent: 6,
            weakspotDamagePercent: 60,
            critDamagePercent: 25,
        },
        keywordType: KeywordType.UnstableBomber,
        description: "Unstable Bomber and Explosive DMG bonuses"
    },
    [WeaponKey.SOCRLastValor]: {
        id: WeaponKey.SOCRLastValor,
        name: "SOCR - The Last Valor",
        type: WeaponType.AssaultRifle,
        rarity: Rarity.Legendary,
        baseStats: {
            damagePerProjectile: 48,
            projectilesPerShot: 1,
            fireRate: 515,
            magazineCapacity: 30,
            critRatePercent: 10,
            weakspotDamagePercent: 60,
            critDamagePercent: 50,
        },
        keywordType: KeywordType.Shrapnel,
        description: "4% base chance to trigger Shrapnel. Critical hits count as two hits."
    },
    [WeaponKey.KVDBoomBoom]: {
        id: WeaponKey.KVDBoomBoom,
        name: "KVD - Boom Boom",
        type: WeaponType.Smg,
        rarity: Rarity.Legendary,
        baseStats: {
            damagePerProjectile: 32,
            projectilesPerShot: 1,
            fireRate: 650,
            magazineCapacity: 100,
            critRatePercent: 5,
            weakspotDamagePercent: 60,
            critDamagePercent: 50,
        },
        keywordType: KeywordType.Burn,
        description: "18% chance to trigger Burn on hit. Explosion on Kill."
    },
    [WeaponKey.MPS5PrimalRage]: {
        id: WeaponKey.MPS5PrimalRage,
        name: "MPS5 - Primal Rage",
        type: WeaponType.Smg,
        rarity: Rarity.Legendary,
        baseStats: {
            damagePerProjectile: 28,
            projectilesPerShot: 1,
            fireRate: 750,
            magazineCapacity: 40,
            critRatePercent: 15,
            weakspotDamagePercent: 60,
            critDamagePercent: 50,
        },
        keywordType: KeywordType.FastGunner,
        description: "35% chance to gain Fast Gunner stack on hit."
    },
    [WeaponKey.OctopusGrilledRings]: {
        id: WeaponKey.OctopusGrilledRings,
        name: "EBR-14: Octopus! Grilled Rings!",
        type: WeaponType.SniperRifle,
        rarity: Rarity.Legendary,
        baseStats: {
            damagePerProjectile: 471,
            projectilesPerShot: 1,
            fireRate: 300,
            magazineCapacity: 20,
            critRatePercent: 5,
            weakspotDamagePercent: 50,
            critDamagePercent: 40,
        },
        keywordType: KeywordType.Burn,
        description: "High Burn chance. Fire ring at max stacks. Burn DMG +75%, Max Stacks -3."
    }
};

/**
 * Specialized class for KVD Boom Boom to handle its unique interactions.
 */
export class KVDBoomBoom extends Weapon {
    override getTriggeredEffects(): TriggeredEffect[] {
        const effects = super.getTriggeredEffects();

        // 1. Explosion on Kill (as per meta research)
        effects.push(new TriggeredEffect(
            new OnKillTrigger(),
            [
                new ExplosionEffect(3.0, StatType.PsiIntensity, 2, "Blaze Explosion"),
                new DoTEffect('status-burn', 'Burn', 0.5, 6, 1, 0.12, StatType.PsiIntensity, DamageTrait.Burn, StatType.MaxBurnStacks, StatType.BurnDurationPercent)
            ]
        ));

        // 2. Pyro Dino Synergy (Sample implementation of "eruptions when attacking burning enemies")
        effects.push(new TriggeredEffect(
            new OnHitTrigger(),
            [new ExplosionEffect(1.0, StatType.PsiIntensity, 1, "Pyro Dino Eruption")],
            [new ChanceCondition(0.15)] // Sample chance for the extra eruption
        ));

        return effects;
    }
}

/**
 * Specialized class for DE.50 Jaws to handle hit-counting Unstable Bomber.
 */
export class DE50Jaws extends Weapon {
    override getTriggeredEffects(): TriggeredEffect[] {
        const effects = super.getTriggeredEffects();

        // Every 3 hits trigger Unstable Bomber. Crit = 2 hits.
        // This requires a StateAware trigger that increments a counter in the context.
        effects.push(new TriggeredEffect(
            new OnHitTrigger(),
            [new ExplosionEffect(0.8, StatType.PsiIntensity, 0, "Unstable Bomber")],
            [new HitCounterCondition(3, true)] // true = Crits count as 2
        ));

        return effects;
    }
}

/**
 * Specialized class for SOCR Last Valor to handle Shrapnel stacking.
 */
export class SOCRLastValor extends Weapon {
    override getTriggeredEffects(): TriggeredEffect[] {
        const effects = super.getTriggeredEffects();

        // Hitting 4 times triggers Shrapnel. Crit = 2 hits.
        effects.push(new TriggeredEffect(
            new OnHitTrigger(),
            [new ShrapnelEffect()], // Specific Shrapnel resolution
            [new HitCounterCondition(4, true)]
        ));

        return effects;
    }
}

/**
 * EBR-14: Octopus! Grilled Rings!
 */
export class OctopusGrilledRings extends Weapon {
    override getTriggeredEffects(): TriggeredEffect[] {
        const effects = [...super.getTriggeredEffects()];

        // At max stacks, generate a fire ring (Explosion)
        effects.push(new TriggeredEffect(
            new OnHitTrigger(),
            [new ExplosionEffect(1.5, StatType.PsiIntensity, 0.5, "Fire Ring")],
            [new TargetAtMaxStatusStacksCondition('status-burn')]
        ));

        return effects;
    }
}

export function createWeapon(key: WeaponKey, star: number = 1, level: number = 1, calibration: number = 0, mod?: Mod): Weapon {
    const data = WEAPONS[key];
    if (!data) throw new Error(`Weapon ${key} not found`);

    const wStats = new WeaponStats();
    wStats.damagePerProjectile.value = data.baseStats.damagePerProjectile;
    wStats.projectilesPerShot.value = data.baseStats.projectilesPerShot;
    wStats.fireRate.value = data.baseStats.fireRate;
    wStats.magazineCapacity.value = data.baseStats.magazineCapacity;
    wStats.critRatePercent.value = data.baseStats.critRatePercent;
    wStats.critDamagePercent.value = data.baseStats.critDamagePercent;
    wStats.weakspotDamagePercent.value = data.baseStats.weakspotDamagePercent;

    let keyword = getKeywordInstance(data.keywordType);
    let intrinsicEffects: BaseEffect[] = [];

    // EBR-14 Octopus specific keyword overrides and intrinsics
    if (key === WeaponKey.OctopusGrilledRings) {
        keyword = new Burn(KeywordType.Burn, 0.12, StatType.PsiIntensity, StatType.BurnDamagePercent, 0.50, true, false);
        intrinsicEffects = [
            new IncreaseStatEffect(StatType.BurnDamageFactor, 75),
            new IncreaseStatEffect(StatType.MaxBurnStacks, -3),
            new IncreaseStatEffect(StatType.KeywordCritRatePercent, 20),
            new IncreaseStatEffect(StatType.KeywordCritDamagePercent, 20)
        ];
    }

    if (key === WeaponKey.KVDBoomBoom) {
        return new KVDBoomBoom(data.id, data.name, data.rarity, star, level, calibration, mod, data.type, keyword, wStats, []);
    }
    if (key === WeaponKey.DE50Jaws) {
        return new DE50Jaws(data.id, data.name, data.rarity, star, level, calibration, mod, data.type, keyword, wStats, []);
    }
    if (key === WeaponKey.SOCRLastValor) {
        return new SOCRLastValor(data.id, data.name, data.rarity, star, level, calibration, mod, data.type, keyword, wStats, []);
    }
    if (key === WeaponKey.OctopusGrilledRings) {
        return new OctopusGrilledRings(data.id, data.name, data.rarity, star, level, calibration, mod, data.type, keyword, wStats, intrinsicEffects);
    }

    return new Weapon(
        data.id, data.name, data.rarity, star, level, calibration, mod,
        data.type, keyword, wStats, intrinsicEffects
    );
}
