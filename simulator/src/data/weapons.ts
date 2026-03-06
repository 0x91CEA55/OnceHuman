import { KeywordType, WeaponKey } from '../types/enums';
import { Weapon, WeaponStats, Mod } from '../models/equipment';
import { Burn, Shrapnel, FastGunner, BullsEye, PowerSurge, FrostVortex, UnstableBomber, Keyword, Bounce, FortressWarfare } from '../models/keyword';
import { getWeaponBlueprint } from './generated/registry';

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
 * Optimized factory that uses the ADR-008 Materialized Registry.
 * Note: stats are passed as RAW baseline values. Scaling happens during applyBaseStats.
 */
export function createWeapon(key: WeaponKey, star: number = 1, level: number = 1, calibration: number = 0, mod?: Mod): Weapon {
    // 1. Fetch Materialized Blueprint (Locked Data)
    const blueprint = getWeaponBlueprint(key);
    if (!blueprint) {
        throw new Error(`Weapon blueprint for ${key} not found in Materialized Registry.`);
    }

    // 2. Stat Initialization (Baseline)
    // We pass the raw blueprint values. Weapon.applyBaseStats handles runtime scaling.
    const wStats = new WeaponStats();
    wStats.damagePerProjectile.reset(blueprint.baseStats.damagePerProjectile, 'Blueprint');
    wStats.projectilesPerShot.reset(blueprint.baseStats.projectilesPerShot, 'Blueprint');
    wStats.fireRate.reset(blueprint.baseStats.fireRate, 'Blueprint');
    wStats.magazineCapacity.reset(blueprint.baseStats.magazineCapacity, 'Blueprint');
    wStats.critRatePercent.reset(blueprint.baseStats.critRatePercent, 'Blueprint');
    wStats.critDamagePercent.reset(blueprint.baseStats.critDamagePercent, 'Blueprint');
    wStats.weakspotDamagePercent.reset(blueprint.baseStats.weakspotDamagePercent, 'Blueprint');

    // 3. Keyword & Behaviors
    const keyword = getKeywordInstance(blueprint.keyword);
    
    const weapon = new Weapon(
        blueprint.key,
        blueprint.name,
        blueprint.rarity,
        star,
        level,
        calibration,
        mod,
        blueprint.type,
        keyword,
        wStats,
        blueprint.intrinsicEffects,
        blueprint.triggerDefinitions,
        blueprint.overridesKeywordTriggers
    );

    return weapon;
}
