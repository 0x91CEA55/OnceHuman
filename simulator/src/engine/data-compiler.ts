import { 
    RawWeaponData, 
    RawEffect, 
    RawWeaponBaseStats,
    RawWeaponDataSchema,
    RawArmorData,
    RawArmorDataSchema,
    RawModData,
    RawModDataSchema
} from '../types/data-sources';
import { 
    WeaponData, 
    WeaponBaseStatsData 
} from '../types/weapon-types';
import { 
    WeaponType, 
    Rarity, 
    KeywordType 
} from '../types/enums';

/**
 * High-Fidelity Data Compiler
 * Implements Phase 4: Zero-Trust Ingestion.
 * 
 * This system validates raw JSON data against strict internal structural requirements.
 */
export class DataCompiler {
    /**
     * Compiles raw weapon data into a validated WeaponData object.
     * Throws if validation fails.
     */
    static compileWeapon(raw: unknown): WeaponData {
        const validated = RawWeaponDataSchema.parse(raw);

        const baseStats = this.compileBaseStats(validated.base_stats);
        
        return {
            id: validated.id,
            name: validated.name,
            type: this.mapWeaponType(validated.type),
            rarity: this.mapRarity(validated.rarity),
            baseStats: baseStats,
            keywordType: this.compileKeyword(validated),
            description: validated.mechanics.description || validated.description || '',
        };
    }

    /**
     * Compiles raw armor data into a validated RawArmorData object.
     */
    static compileArmor(raw: unknown): RawArmorData {
        return RawArmorDataSchema.parse(raw);
    }

    /**
     * Compiles raw mod data into a validated RawModData object.
     */
    static compileMod(raw: unknown): RawModData {
        return RawModDataSchema.parse(raw);
    }

    private static compileBaseStats(raw: RawWeaponBaseStats): WeaponBaseStatsData {
        return {
            damagePerProjectile: raw.damage_per_projectile,
            projectiles_per_shot: raw.projectiles_per_shot,
            projectilesPerShot: raw.projectiles_per_shot,
            fireRate: raw.fire_rate,
            magazineCapacity: raw.magazine_capacity,
            critRatePercent: raw.crit_rate_percent,
            weakspotDamagePercent: raw.weakspot_damage_percent,
            critDamagePercent: raw.crit_damage_percent,
        } as WeaponBaseStatsData;
    }

    private static mapWeaponType(type: string): WeaponType {
        const t = type.toLowerCase();
        if (t.includes('pistol')) return WeaponType.Pistol;
        if (t.includes('shotgun')) return WeaponType.Shotgun;
        if (t.includes('smg')) return WeaponType.Smg;
        if (t.includes('assault_rifl') || t.includes('assault rifle')) return WeaponType.AssaultRifle;
        if (t.includes('sniper_rifl') || t.includes('sniper rifle')) return WeaponType.SniperRifle;
        if (t.includes('crossbow')) return WeaponType.Crossbow;
        if (t.includes('launcher')) return WeaponType.Launcher;
        
        console.warn(`Unknown weapon type: ${type}, defaulting to AssaultRifle`);
        return WeaponType.AssaultRifle;
    }

    private static mapRarity(rarity: string): Rarity {
        const r = rarity.toLowerCase();
        switch (r) {
            case 'common': return Rarity.Common;
            case 'fine': return Rarity.Fine;
            case 'epic': return Rarity.Epic;
            case 'legendary': return Rarity.Legendary;
            default:
                console.warn(`Unknown rarity: ${rarity}, defaulting to Common`);
                return Rarity.Common;
        }
    }

    /**
     * Replaces loose string matching with strict Keyword mapping.
     */
    private static compileKeyword(raw: RawWeaponData): KeywordType {
        const effects = raw.mechanics.effects || [];
        
        for (const effect of effects) {
            const found = this.searchForKeyword(effect);
            if (found !== KeywordType.Shrapnel || (effect.ability && effect.ability.toLowerCase() === 'shrapnel')) {
                 if (found !== KeywordType.Shrapnel) return found;
                 if (effect.ability && effect.ability.toLowerCase() === 'shrapnel') return KeywordType.Shrapnel;
            }
        }

        return KeywordType.Shrapnel;
    }

    private static searchForKeyword(effect: RawEffect): KeywordType {
        if (effect.ability) {
            const keyword = this.mapAbilityToKeyword(effect.ability);
            if (keyword) return keyword;
        }

        if (effect.effects && Array.isArray(effect.effects)) {
            for (const subEffect of effect.effects) {
                const keyword = this.searchForKeyword(subEffect);
                if (keyword !== KeywordType.Shrapnel) return keyword;
            }
        }

        return KeywordType.Shrapnel;
    }

    private static mapAbilityToKeyword(ability: string): KeywordType | null {
        const a = ability.toLowerCase();
        if (a === 'burn') return KeywordType.Burn;
        if (a === 'shrapnel') return KeywordType.Shrapnel;
        if (a === 'fast_gunner') return KeywordType.FastGunner;
        if (a === 'the_bulls_eye' || a === 'bulls_eye') return KeywordType.BullsEye;
        if (a === 'power_surge') return KeywordType.PowerSurge;
        if (a === 'frost_vortex') return KeywordType.FrostVortex;
        if (a === 'unstable_bomber') return KeywordType.UnstableBomber;
        if (a === 'bounce') return KeywordType.Bounce;
        if (a === 'fortress_warfare') return KeywordType.FortressWarfare;
        return null;
    }
}
