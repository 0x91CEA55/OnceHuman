import { WeaponType, Rarity, KeywordType } from '../types/enums';
import { Weapon, WeaponStats, Mod } from '../models/equipment';
import { Burn, Shrapnel, FastGunner, BullsEye, PowerSurge, FrostVortex, UnstableBomber, Keyword, Bounce, FortressWarfare } from '../pipelines/keyword';

export function getKeywordInstance(type: string): Keyword {
    switch (type.toLowerCase()) {
        case 'burn': return new Burn();
        case 'shrapnel': return new Shrapnel();
        case 'fast_gunner': return new FastGunner();
        case 'bulls_eye': return new BullsEye();
        case 'power_surge': return new PowerSurge();
        case 'frost_vortex': return new FrostVortex();
        case 'unstable_bomber': return new UnstableBomber();
        case 'bounce': return new Bounce();
        case 'fortress_warfare': return new FortressWarfare();
        default: return new Shrapnel(); // Fallback
    }
}

export interface WeaponData {
    id: string;
    name: string;
    type: WeaponType;
    rarity: Rarity;
    baseStats: any;
    keywordType: KeywordType;
    description: string;
}

export const WEAPON_DB: WeaponData[] = [
    {
        id: "de50_jaws",
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
    {
        id: "socr_last_valor",
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
    {
        id: "kvd_boom_boom",
        name: "KVD - Boom Boom",
        type: WeaponType.Smg, // Reference says SMG, doc says LMG. Using Smg for now as per reference.
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
        description: "18% chance to trigger Burn on hit."
    },
    {
        id: "mps5_primal_rage",
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
];

export function createWeaponFromDb(data: WeaponData, star: number = 1, level: number = 1, calibration: number = 0, mod?: Mod): Weapon {
    const wStats = new WeaponStats();
    wStats.damagePerProjectile.value = data.baseStats.damagePerProjectile;
    wStats.projectilesPerShot.value = data.baseStats.projectilesPerShot;
    wStats.fireRate.value = data.baseStats.fireRate;
    wStats.magazineCapacity.value = data.baseStats.magazineCapacity;
    wStats.critRatePercent.value = data.baseStats.critRatePercent;
    wStats.critDamagePercent.value = data.baseStats.critDamagePercent;
    wStats.weakspotDamagePercent.value = data.baseStats.weakspotDamagePercent;

    return new Weapon(
        data.id,
        data.name,
        data.rarity,
        star,
        level,
        calibration,
        mod,
        data.type,
        getKeywordInstance(data.keywordType),
        wStats,
        [] // TODO: Map intrinsic effects from reference data
    );
}
