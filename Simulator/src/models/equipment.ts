import { GearSlot, KeywordType, Rarity, WeaponType, ArmorSlot, StatType } from '../types/enums';
import { Effect, IncreaseStatEffect } from './effect';
import { Keyword } from '../pipelines/keyword';
import { GenericStat, MagazineCapacityStat, CritRateStat } from './stats';

export interface Mod {
    id: string;
    name: string;
    slot: GearSlot;
    keywordType?: KeywordType;
    description: string;
    effects: Effect[];
    subStats: IncreaseStatEffect[];
}

export abstract class Equipment {
    constructor(
        public id: string,
        public name: string,
        public rarity: Rarity,
        public star: number,
        public level: number,
        public calibration: number,
        public mod?: Mod
    ) { }

    getActiveEffects(loadout: Loadout): Effect[] {
        const effects: Effect[] = [];
        if (this.mod) {
            effects.push(...this.mod.effects, ...this.mod.subStats);
        }
        return effects;
    }
}

export class WeaponStats {
    damagePerProjectile = new GenericStat(StatType.DamagePerProjectile, 0);
    projectilesPerShot = new GenericStat(StatType.ProjectilesPerShot, 0);
    fireRate = new GenericStat(StatType.FireRate, 0);
    magazineCapacity = new MagazineCapacityStat(0);
    critRatePercent = new CritRateStat(0);
    critDamagePercent = new GenericStat(StatType.CritDamagePercent, 0);
    weakspotDamagePercent = new GenericStat(StatType.WeakspotDamagePercent, 0);
}

export class Weapon extends Equipment {
    constructor(
        id: string, name: string, rarity: Rarity, star: number, level: number, calibration: number, mod: Mod | undefined,
        public type: WeaponType,
        public keyword: Keyword,
        public stats: WeaponStats,
        public intrinsicEffects: Effect[]
    ) { super(id, name, rarity, star, level, calibration, mod); }

    override getActiveEffects(loadout: Loadout): Effect[] {
        return [...super.getActiveEffects(loadout), ...this.intrinsicEffects];
    }
}

export class ArmorStats {
    hp = new GenericStat(StatType.DamagePerProjectile, 0); // Placeholder type from doc
    psiIntensity = new GenericStat(StatType.PsiIntensity, 0);
}

export abstract class Armor extends Equipment {
    constructor(
        id: string, name: string, rarity: Rarity, star: number, level: number, calibration: number, mod: Mod | undefined,
        public slot: ArmorSlot,
        public stats: ArmorStats
    ) { super(id, name, rarity, star, level, calibration, mod); }
}

export class ArmorSetDefinition {
    constructor(
        public id: string,
        public name: string,
        public bonuses: { requiredPieces: number; effects: Effect[] }[]
    ) { }
}

export class SetArmor extends Armor {
    constructor(
        id: string, name: string, rarity: Rarity, star: number, level: number, calibration: number, mod: Mod | undefined, slot: ArmorSlot, stats: ArmorStats,
        public armorSet: ArmorSetDefinition
    ) { super(id, name, rarity, star, level, calibration, mod, slot, stats); }
}

export class KeyArmor extends Armor {
    constructor(
        id: string, name: string, rarity: Rarity, star: number, level: number, calibration: number, mod: Mod | undefined, slot: ArmorSlot, stats: ArmorStats,
        public intrinsicEffects: Effect[]
    ) { super(id, name, rarity, star, level, calibration, mod, slot, stats); }

    override getActiveEffects(loadout: Loadout): Effect[] {
        return [...super.getActiveEffects(loadout), ...this.intrinsicEffects];
    }
}

export class Loadout {
    weapon?: Weapon;
    helmet?: Armor;
    mask?: Armor;
    top?: Armor;
    gloves?: Armor;
    pants?: Armor;
    boots?: Armor;

    getAllActiveEffects(): Effect[] {
        return [];
    }
}
