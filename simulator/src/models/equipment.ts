import { GearSlot, Rarity, WeaponType, ArmorSlot, StatType, CalibrationStyle } from '../types/enums';
import { Keyword } from './keyword';
import { GenericStat, MagazineCapacityStat, CritRateStat } from './stats';
import { Substat } from './substat';
import { BaseEffect, StaticAttributeEffect, IncreaseStatEffect } from './effect';
import { TriggerDefinition } from '../types/trigger-types';

import { AggregationContext } from '../types/common';
import { ScalingEngine } from '../engine/scaling-engine';

/**
 * Represents the static blueprint data for a Mod (e.g., "Fateful Strike").
 */
export class ModData {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly slot: ArmorSlot | GearSlot,
        public readonly description: string,
        public readonly permanentEffects: BaseEffect[],
        public readonly triggerDefinitions: TriggerDefinition[]
    ) {}
}

/**
 * Represents an instance of a Mod with specific substat rolls.
 */
export class Mod {
    constructor(
        public readonly definition: ModData,
        public readonly substats: [Substat, Substat, Substat, Substat]
    ) {}

    apply(ctx: AggregationContext): void {
        const source = `Mod: ${this.definition.name}`;
        // 1. Apply Substats
        for (const sub of this.substats) {
            const eff = new StaticAttributeEffect(sub.type, sub.value, `${source} (Substat)`);
            ctx.player.activeEffects.push(eff);
            eff.applyWithContext(ctx, 1);
        }

        // 2. Apply Permanent Logic
        for (const eff of this.definition.permanentEffects) {
            ctx.player.activeEffects.push(eff);
            eff.applyWithContext(ctx, 1);
        }

        // 3. Apply custom strategy logic
        this.applyCustomLogic(ctx);
    }

    protected applyCustomLogic(_ctx: AggregationContext): void {
        // Overridden by specific mod implementations
    }
}

export abstract class Equipment {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly rarity: Rarity,
        public readonly star: number,
        public readonly level: number,
        public readonly calibration: number,
        public mod: Mod | undefined
    ) {}

    public apply(ctx: AggregationContext): void {
        this.applyBaseStats(ctx);
        this.applyIntrinsicLogic(ctx);
        if (this.mod) this.mod.apply(ctx);
    }

    protected abstract applyBaseStats(ctx: AggregationContext): void;
    protected abstract applyIntrinsicLogic(ctx: AggregationContext): void;

    public getAllTriggerDefinitions(): TriggerDefinition[] {
        const defs: TriggerDefinition[] = [];
        if (this.mod) defs.push(...this.mod.definition.triggerDefinitions);
        defs.push(...this.getTriggerDefinitions());
        return defs;
    }

    protected getTriggerDefinitions(): TriggerDefinition[] {
        return [];
    }
}

export class WeaponStats {
    damagePerProjectile = new GenericStat(StatType.DamagePerProjectile, 0);
    projectilesPerShot = new GenericStat(StatType.ProjectilesPerShot, 1);
    fireRate = new GenericStat(StatType.FireRate, 0);
    magazineCapacity = new MagazineCapacityStat(0);
    critRatePercent = new CritRateStat(0);
    critDamagePercent = new GenericStat(StatType.CritDamagePercent, 0);
    weakspotDamagePercent = new GenericStat(StatType.WeakspotDamagePercent, 0);
}

const STYLE_BASE_DMG_REGISTRY: Record<CalibrationStyle, number> = {
    [CalibrationStyle.Heavy]: 20,
    [CalibrationStyle.Precision]: 20,
    [CalibrationStyle.Portable]: 20,
    [CalibrationStyle.RapidShot]: 10,
    [CalibrationStyle.None]: 0
};

export class Calibration {
    constructor(
        public style: CalibrationStyle = CalibrationStyle.None,
        public weaponDamageBonus: number = 0, // RNG Line 1 (Baked into Base)
        public secondaryStatType: StatType = StatType.CritDamagePercent, // RNG Line 2
        public secondaryStatValue: number = 0
    ) {}

    /**
     * Returns the predictable effects based on style and weapon type.
     */
    getStyleEffects(weaponType: WeaponType): BaseEffect[] {
        const source = `Calibration Style: ${this.style}`;
        const styleEffects: Record<CalibrationStyle, (wt: WeaponType) => BaseEffect[]> = {
            [CalibrationStyle.RapidShot]: (wt) => wt === WeaponType.SniperRifle
                ? [
                    new IncreaseStatEffect(StatType.BoltPullingSpeedPercent, 50, source),
                    new IncreaseStatEffect(StatType.ActionDelayPercent, -50, source),
                    new IncreaseStatEffect(StatType.ReloadSpeedPercent, 15, source),
                    new IncreaseStatEffect(StatType.AttackPercent, -10, source)
                  ]
                : [
                    new IncreaseStatEffect(StatType.FireRate, 10, source),
                    new IncreaseStatEffect(StatType.AccuracyPercent, -50, source)
                  ],
            [CalibrationStyle.Heavy]: () => [
                new IncreaseStatEffect(StatType.AttackPercent, 10, source),
                new IncreaseStatEffect(StatType.FireRate, -10, source)
            ],
            [CalibrationStyle.Precision]: () => [
                new IncreaseStatEffect(StatType.WeakspotDamagePercent, 15, source)
            ],
            [CalibrationStyle.Portable]: () => [],
            [CalibrationStyle.None]: () => []
        };

        const factory = styleEffects[this.style] || styleEffects[CalibrationStyle.None];
        const effects = factory(weaponType);

        if (this.secondaryStatValue !== 0) {
            effects.push(new IncreaseStatEffect(this.secondaryStatType, this.secondaryStatValue, 'Calibration Affix'));
        }

        return effects;
    }

    /**
     * Returns the TOTAL base damage bonus PERCENTAGE from this calibration matrix (Style + Affix)
     */
    getBaseDmgBonus(): number {
        const styleBase = STYLE_BASE_DMG_REGISTRY[this.style] || 0;
        return styleBase + this.weaponDamageBonus;
    }

    /**
     * Returns the TOTAL base damage multiplier from this calibration matrix (Style + Affix)
     */
    getBaseDmgMultiplier(): number {
        return 1 + this.getBaseDmgBonus() / 100;
    }
}

export class Weapon extends Equipment {
    public calibrationMatrix: Calibration = new Calibration();

    constructor(
        id: string, name: string, rarity: Rarity, star: number, level: number, calibration: number, mod: Mod | undefined,
        public type: WeaponType,
        public keyword: Keyword,
        public stats: WeaponStats,
        public intrinsicEffects: BaseEffect[],
        public triggerDefinitions: TriggerDefinition[] = [],
        /** When true, keyword's default trigger definitions are skipped (e.g. OctopusGrilledRings overrides Burn chance). */
        public overridesKeywordTriggers: boolean = false
    ) { super(id, name, rarity, star, level, calibration, mod); }

    protected override applyBaseStats(ctx: AggregationContext): void {
        const source = `Weapon: ${this.name}`;
        // Calibration Level Multiplier (e.g., Level 10 = +20%)
        const levelBonus = this.calibration * 2;
        // Matrix Multipliers (Style + RNG Bonus)
        const matrixBonus = this.calibrationMatrix.getBaseDmgBonus();
        
        // Combined Calibration Multiplier (Additive percentages converted to multiplier)
        const combinedMultiplier = 1 + (levelBonus + matrixBonus) / 100;

        const finalBaseDamage = ScalingEngine.calculateFinalBaseDamage(
            this.stats.damagePerProjectile.value,
            this.star,
            this.level,
            combinedMultiplier
        );

        const statsToApply = [
            { type: StatType.DamagePerProjectile, value: finalBaseDamage },
            { type: StatType.ProjectilesPerShot, value: this.stats.projectilesPerShot.value },
            { type: StatType.FireRate, value: this.stats.fireRate.value },
            { type: StatType.MagazineCapacity, value: this.stats.magazineCapacity.value },
            { type: StatType.CritRatePercent, value: this.stats.critRatePercent.value },
            { type: StatType.CritDamagePercent, value: this.stats.critDamagePercent.value },
            { type: StatType.WeakspotDamagePercent, value: this.stats.weakspotDamagePercent.value },
        ];

        for (const s of statsToApply) {
            if (s.value !== 0) {
                const eff = new StaticAttributeEffect(s.type, s.value, source);
                ctx.player.activeEffects.push(eff);
                eff.applyStatic(ctx.player, ctx.conditions, 1);
            }
        }
    }

    protected override applyIntrinsicLogic(ctx: AggregationContext): void {
        for (const effect of this.intrinsicEffects) {
            ctx.player.activeEffects.push(effect);
            effect.applyWithContext(ctx, 1);
        }

        const calibEffects = this.calibrationMatrix.getStyleEffects(this.type);
        for (const effect of calibEffects) {
            ctx.player.activeEffects.push(effect);
            effect.applyWithContext(ctx, 1);
        }
    }

    override getTriggerDefinitions(): TriggerDefinition[] {
        const keywordTriggers = this.overridesKeywordTriggers ? [] : this.keyword.getTriggerDefinitions();
        return [...keywordTriggers, ...this.triggerDefinitions];
    }
}

export class ArmorStats {
    psiIntensity = new GenericStat(StatType.PsiIntensity, 0);
}

export class Armor extends Equipment {
    constructor(
        id: string, name: string, rarity: Rarity, star: number, level: number, calibration: number, mod: Mod | undefined,
        public readonly slot: ArmorSlot,
        public readonly stats: ArmorStats
    ) { super(id, name, rarity, star, level, calibration, mod); }

    protected override applyBaseStats(ctx: AggregationContext): void {
        const eff = new StaticAttributeEffect(StatType.PsiIntensity, this.stats.psiIntensity.value, `Armor: ${this.name}`);
        ctx.player.activeEffects.push(eff);
        eff.applyStatic(ctx.player, ctx.conditions, 1);
    }

    protected override applyIntrinsicLogic(_ctx: AggregationContext): void {}
}

export class KeyArmor extends Armor {
    constructor(
        id: string, name: string, rarity: Rarity, star: number, level: number, calibration: number, mod: Mod | undefined, slot: ArmorSlot, stats: ArmorStats,
        public readonly intrinsicEffects: BaseEffect[]
    ) { super(id, name, rarity, star, level, calibration, mod, slot, stats); }

    protected override applyIntrinsicLogic(ctx: AggregationContext): void {
        for (const effect of this.intrinsicEffects) {
            ctx.player.activeEffects.push(effect);
            effect.applyWithContext(ctx, 1);
        }
    }
}

export class ArmorSetDefinition {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly bonuses: { requiredPieces: number; effects: BaseEffect[] }[]
    ) {}
}

export class SetArmor extends Armor {
    constructor(
        id: string, name: string, rarity: Rarity, star: number, level: number, calibration: number, mod: Mod | undefined, slot: ArmorSlot, stats: ArmorStats,
        public readonly setDefinition: ArmorSetDefinition
    ) { super(id, name, rarity, star, level, calibration, mod, slot, stats); }

    protected override applyIntrinsicLogic(_ctx: AggregationContext): void {}
}

export class Loadout {
    public weapon: Weapon | undefined;
    public helmet: Armor | undefined;
    public mask: Armor | undefined;
    public top: Armor | undefined;
    public gloves: Armor | undefined;
    public pants: Armor | undefined;
    public boots: Armor | undefined;

    public apply(ctx: AggregationContext): void {
        if (this.weapon) this.weapon.apply(ctx);
        if (this.helmet) this.helmet.apply(ctx);
        if (this.mask) this.mask.apply(ctx);
        if (this.top) this.top.apply(ctx);
        if (this.gloves) this.gloves.apply(ctx);
        if (this.pants) this.pants.apply(ctx);
        if (this.boots) this.boots.apply(ctx);

        this.applySetBonuses(ctx);
    }

    public getAllTriggerDefinitions(): TriggerDefinition[] {
        const defs: TriggerDefinition[] = [];
        if (this.weapon) defs.push(...this.weapon.getAllTriggerDefinitions());
        if (this.helmet) defs.push(...this.helmet.getAllTriggerDefinitions());
        if (this.mask) defs.push(...this.mask.getAllTriggerDefinitions());
        if (this.top) defs.push(...this.top.getAllTriggerDefinitions());
        if (this.gloves) defs.push(...this.gloves.getAllTriggerDefinitions());
        if (this.pants) defs.push(...this.pants.getAllTriggerDefinitions());
        if (this.boots) defs.push(...this.boots.getAllTriggerDefinitions());
        return defs;
    }

    private applySetBonuses(ctx: AggregationContext): void {
        const armors = [this.helmet, this.mask, this.top, this.gloves, this.pants, this.boots].filter(a => a !== undefined) as Armor[];
        const setCounts: Record<string, number> = {};
        const setDefinitions: Record<string, ArmorSetDefinition> = {};

        for (const armor of armors) {
            if (armor instanceof SetArmor) {
                const setId = armor.setDefinition.id;
                setCounts[setId] = (setCounts[setId] || 0) + 1;
                setDefinitions[setId] = armor.setDefinition;
            }
        }

        for (const setId in setCounts) {
            const count = setCounts[setId];
            const definition = setDefinitions[setId];
            for (const bonus of definition.bonuses) {
                if (count >= bonus.requiredPieces) {
                    for (const effect of bonus.effects) {
                        ctx.player.activeEffects.push(effect);
                        effect.applyWithContext(ctx, 1);
                    }
                }
            }
        }
    }
}
