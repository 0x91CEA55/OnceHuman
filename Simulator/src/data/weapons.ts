import { WeaponType, Rarity, KeywordType, WeaponKey, StatType } from '../types/enums';
import { Weapon, WeaponStats, Mod } from '../models/equipment';
import { Burn, Shrapnel, FastGunner, BullsEye, PowerSurge, FrostVortex, UnstableBomber, Keyword, Bounce, FortressWarfare } from '../pipelines/keyword';
import { TriggeredEffect, OnKillTrigger, OnHitTrigger, ChanceCondition } from '../models/trigger';
import { ExplosionEffect, DoTEffect } from '../models/effect';

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
                new DoTEffect('status-burn', 'Burn', 0.5, 6, 1, StatType.MaxBurnStacks, StatType.BurnDurationPercent)
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

    const keyword = getKeywordInstance(data.keywordType);

    if (key === WeaponKey.KVDBoomBoom) {
        return new KVDBoomBoom(
            data.id, data.name, data.rarity, star, level, calibration, mod,
            data.type, keyword, wStats, []
        );
    }

    return new Weapon(
        data.id, data.name, data.rarity, star, level, calibration, mod,
        data.type, keyword, wStats, [] 
    );
}
