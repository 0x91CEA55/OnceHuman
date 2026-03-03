import { WeaponType, Rarity, KeywordType } from './enums';

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
