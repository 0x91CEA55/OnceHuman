import { RawWeaponData } from '../types/data-sources';
import { WeaponData, WeaponBaseStatsData } from '../types/weapon-types';
import { WeaponType, Rarity, KeywordType } from '../types/enums';

export interface NormalizedDamageBonus {
    type: 'penetration' | 'impact' | 'suppression' | 'none';
    target: 'rosetta' | 'protocell' | 'deviant' | 'none';
    value: number;
}

export class DataMapper {
    static normalizeWeapon(raw: RawWeaponData): WeaponData {
        const baseStats: WeaponBaseStatsData = {
            damagePerProjectile: raw.base_stats.damage_per_projectile,
            projectilesPerShot: raw.base_stats.projectiles_per_shot,
            fireRate: raw.base_stats.fire_rate,
            magazineCapacity: raw.base_stats.magazine_capacity,
            critRatePercent: raw.base_stats.crit_rate_percent,
            weakspotDamagePercent: raw.base_stats.weakspot_damage_percent,
            critDamagePercent: raw.base_stats.crit_damage_percent,
        };

        const damageBonus = this.normalizeDamageBonus(raw.damage_bonus);

        return {
            id: raw.id,
            name: raw.name,
            type: this.mapWeaponType(raw.type),
            rarity: this.mapRarity(raw.rarity),
            baseStats: baseStats,
            keywordType: this.extractKeyword(raw),
            description: raw.mechanics.description,
            // damageBonus is not yet in WeaponData, but we might want it later
        };
    }

    private static mapWeaponType(type: string): WeaponType {
        const mapping: Record<string, WeaponType> = {
            'pistol': WeaponType.Pistol,
            'shotgun': WeaponType.Shotgun,
            'smgs': WeaponType.Smg,
            'assault_rifl': WeaponType.AssaultRifle,
            'sniper_rifles': WeaponType.SniperRifle,
            'crossbow': WeaponType.Crossbow,
            'launcher': WeaponType.Launcher
        };
        return mapping[type.toLowerCase()] || WeaponType.AssaultRifle;
    }

    private static mapRarity(rarity: string): Rarity {
        const mapping: Record<string, Rarity> = {
            'common': Rarity.Common,
            'fine': Rarity.Fine,
            'epic': Rarity.Epic,
            'legendary': Rarity.Legendary
        };
        return mapping[rarity.toLowerCase()] || Rarity.Common;
    }

    private static extractKeyword(raw: RawWeaponData): KeywordType {
        if (raw.mechanics.effects) {
            for (const effect of raw.mechanics.effects) {
                if (effect.ability) {
                    const ability = effect.ability.toLowerCase();
                    if (ability.includes('burn')) return KeywordType.Burn;
                    if (ability.includes('shrapnel')) return KeywordType.Shrapnel;
                    if (ability.includes('fast_gunner')) return KeywordType.FastGunner;
                    if (ability.includes('the_bulls_eye') || ability.includes('bulls_eye')) return KeywordType.BullsEye;
                    if (ability.includes('power_surge')) return KeywordType.PowerSurge;
                    if (ability.includes('frost_vortex')) return KeywordType.FrostVortex;
                    if (ability.includes('unstable_bomber')) return KeywordType.UnstableBomber;
                    if (ability.includes('bounce')) return KeywordType.Bounce;
                    if (ability.includes('fortress_warfare')) return KeywordType.FortressWarfare;
                }
                if (effect.effects) {
                    for (const subEffect of effect.effects) {
                        if (subEffect.ability) {
                            const ability = subEffect.ability.toLowerCase();
                            if (ability.includes('burn')) return KeywordType.Burn;
                            if (ability.includes('shrapnel')) return KeywordType.Shrapnel;
                            if (ability.includes('fast_gunner')) return KeywordType.FastGunner;
                            if (ability.includes('the_bulls_eye') || ability.includes('bulls_eye')) return KeywordType.BullsEye;
                            if (ability.includes('power_surge')) return KeywordType.PowerSurge;
                            if (ability.includes('frost_vortex')) return KeywordType.FrostVortex;
                            if (ability.includes('unstable_bomber')) return KeywordType.UnstableBomber;
                            if (ability.includes('bounce')) return KeywordType.Bounce;
                            if (ability.includes('fortress_warfare')) return KeywordType.FortressWarfare;
                        }
                    }
                }
            }
        }
        return KeywordType.Shrapnel; // Default
    }

    private static normalizeDamageBonus(bonus?: string | { type: string; target: string; value: number }): NormalizedDamageBonus {
        if (!bonus || bonus === 'None') {
            return { type: 'none', target: 'none', value: 0 };
        }

        if (typeof bonus === 'string') {
            if (bonus.startsWith('Impact:')) {
                const target = bonus.toLowerCase().includes('protocell') ? 'protocell' : 'none' as any;
                return { type: 'impact', target, value: 0.2 }; // Standard value if not specified
            }
            if (bonus.startsWith('Suppression:')) {
                const target = bonus.toLowerCase().includes('deviant') ? 'deviant' : 'none' as any;
                return { type: 'suppression', target, value: 0.2 };
            }
        } else {
            return {
                type: bonus.type as any,
                target: bonus.target as any,
                value: bonus.value
            };
        }

        return { type: 'none', target: 'none', value: 0 };
    }
}
