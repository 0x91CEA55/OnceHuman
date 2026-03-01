import { GearSlot, KeywordType, Rarity, WeaponType, ArmorSlot, StatType } from '../types/enums';
import { Keyword } from '../pipelines/keyword';
import { GenericStat, MagazineCapacityStat, CritRateStat } from './stats';
import { Substat } from './substat';
import { BaseEffect, StaticAttributeEffect } from './effect';
import { TriggeredEffect } from './trigger';

import { EncounterConditions } from '../types/common';

// Using type import to avoid circular dependency
import type { Player } from './player';

/**
 * AggregationContext provides the transient state needed during stat calculation.
 */
export interface AggregationContext {
    player: Player;
    conditions: EncounterConditions;
    ammoPercent: number;
    loadout: Loadout;
}

/**
 * Represents the static blueprint data for a Mod (e.g., "Fateful Strike").
 */
export class ModData {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly slot: GearSlot,
        public readonly description: string,
        public readonly permanentEffects: BaseEffect[],
        public readonly triggeredEffects: TriggeredEffect[],
        public readonly keywordType?: KeywordType
    ) { }
}

/**
 * Represents a specific instance of a Mod equipped on an item.
 * Implements the Strategy pattern to shape the player's attributes and combat behavior.
 */
export class Mod {
    constructor(
        public readonly data: ModData,
        public readonly substats: [Substat, Substat, Substat, Substat]
    ) { }

    /**
     * Applies the mod's logic to the current aggregation context.
     */
    apply(ctx: AggregationContext): void {
        // 1. Apply Permanent Effects defined in blueprint
        for (const effect of this.data.permanentEffects) {
            ctx.player.activeEffects.push(effect);
            effect.applyStatic(ctx.player, ctx.conditions, 1);
        }

        // 2. Apply attributes (substats)
        for (const substat of this.substats) {
            if (substat.value !== 0) {
                const eff = new StaticAttributeEffect(substat.type, substat.value, this.data.name);
                ctx.player.activeEffects.push(eff);
                eff.applyStatic(ctx.player, ctx.conditions, 1);
            }
        }

        // 3. Custom Strategy Logic
        this.applyCustomLogic(ctx);
    }

    protected applyCustomLogic(_ctx: AggregationContext): void {
        // To be overridden by specific mod implementations
    }

    /**
     * Polymorphic method to get triggered effects, allowing dynamic/stateful logic.
     */
    getTriggeredEffects(): TriggeredEffect[] {
        return this.data.triggeredEffects;
    }
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

    /**
     * Applies base item stats and delegates mod logic.
     */
    apply(ctx: AggregationContext): void {
        // 1. Apply Base Item Stats
        this.applyBaseStats(ctx);

        // 2. Apply Mod Logic
        if (this.mod) {
            this.mod.apply(ctx);
        }

        // 3. Apply Intrinsic Logic (to be overridden)
        this.applyIntrinsicLogic(ctx);
    }

    protected abstract applyBaseStats(ctx: AggregationContext): void;
    protected applyIntrinsicLogic(_ctx: AggregationContext): void { }

    /**
     * Unified entry point for gathering all triggered effects from this piece of equipment.
     */
    getTriggeredEffects(): TriggeredEffect[] {
        return this.mod?.getTriggeredEffects() || [];
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
        public intrinsicEffects: BaseEffect[]
    ) { super(id, name, rarity, star, level, calibration, mod); }

    protected override applyBaseStats(ctx: AggregationContext): void {
        const statsToApply = [
            { type: StatType.DamagePerProjectile, value: this.stats.damagePerProjectile.value },
            { type: StatType.ProjectilesPerShot, value: this.stats.projectilesPerShot.value },
            { type: StatType.FireRate, value: this.stats.fireRate.value },
            { type: StatType.MagazineCapacity, value: this.stats.magazineCapacity.value },
            { type: StatType.CritRatePercent, value: this.stats.critRatePercent.value },
            { type: StatType.CritDamagePercent, value: this.stats.critDamagePercent.value },
            { type: StatType.WeakspotDamagePercent, value: this.stats.weakspotDamagePercent.value },
        ];

        for (const s of statsToApply) {
            if (s.value !== 0) {
                const eff = new StaticAttributeEffect(s.type, s.value, this.name);
                ctx.player.activeEffects.push(eff);
                eff.applyStatic(ctx.player, ctx.conditions, 1);
            }
        }
    }

    protected override applyIntrinsicLogic(ctx: AggregationContext): void {
        for (const effect of this.intrinsicEffects) {
            ctx.player.activeEffects.push(effect);
            effect.applyStatic(ctx.player, ctx.conditions, 1);
        }
    }

    override getTriggeredEffects(): TriggeredEffect[] {
        return [...super.getTriggeredEffects(), ...this.keyword.getTriggeredEffects()];
    }
}

export class ArmorStats {
    hp = new GenericStat(StatType.PsiIntensity, 0); // Placeholder until HP StatType added, but NOT DamagePerProjectile
    psiIntensity = new GenericStat(StatType.PsiIntensity, 0);
}

export abstract class Armor extends Equipment {
    constructor(
        id: string, name: string, rarity: Rarity, star: number, level: number, calibration: number, mod: Mod | undefined,
        public slot: ArmorSlot,
        public stats: ArmorStats
    ) { super(id, name, rarity, star, level, calibration, mod); }

    protected override applyBaseStats(ctx: AggregationContext): void {
        if (this.stats.psiIntensity.value > 0) {
            const eff = new StaticAttributeEffect(StatType.PsiIntensity, this.stats.psiIntensity.value, this.name);
            ctx.player.activeEffects.push(eff);
            eff.applyStatic(ctx.player, ctx.conditions, 1);
        }
    }
}

export class ArmorSetDefinition {
    constructor(
        public id: string,
        public name: string,
        public bonuses: { requiredPieces: number; effects: BaseEffect[] }[]
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
        public intrinsicEffects: BaseEffect[]
    ) { super(id, name, rarity, star, level, calibration, mod, slot, stats); }

    protected override applyIntrinsicLogic(ctx: AggregationContext): void {
        for (const effect of this.intrinsicEffects) {
            ctx.player.activeEffects.push(effect);
            effect.applyStatic(ctx.player, ctx.conditions, 1);
        }
    }
}

export class Loadout {
    public weapon?: Weapon;
    private armorPieces: Map<ArmorSlot, Armor> = new Map();

    get helmet() { return this.armorPieces.get(ArmorSlot.Helmet); }
    set helmet(val: Armor | undefined) { this.updateArmor(ArmorSlot.Helmet, val); }
    
    get mask() { return this.armorPieces.get(ArmorSlot.Mask); }
    set mask(val: Armor | undefined) { this.updateArmor(ArmorSlot.Mask, val); }
    
    get top() { return this.armorPieces.get(ArmorSlot.Top); }
    set top(val: Armor | undefined) { this.updateArmor(ArmorSlot.Top, val); }
    
    get gloves() { return this.armorPieces.get(ArmorSlot.Gloves); }
    set gloves(val: Armor | undefined) { this.updateArmor(ArmorSlot.Gloves, val); }
    
    get pants() { return this.armorPieces.get(ArmorSlot.Pants); }
    set pants(val: Armor | undefined) { this.updateArmor(ArmorSlot.Pants, val); }
    
    get boots() { return this.armorPieces.get(ArmorSlot.Boots); }
    set boots(val: Armor | undefined) { this.updateArmor(ArmorSlot.Boots, val); }

    private updateArmor(slot: ArmorSlot, val: Armor | undefined) {
        if (val) this.armorPieces.set(slot, val);
        else this.armorPieces.delete(slot);
    }

    getPieces(): Equipment[] {
        const pieces: Equipment[] = [];
        if (this.weapon) pieces.push(this.weapon);
        pieces.push(...this.armorPieces.values());
        return pieces;
    }

    /**
     * Unified entry point for applying the entire loadout to a player.
     */
    apply(ctx: AggregationContext): void {
        // 1. Apply all pieces (stats + mods + intrinsics)
        for (const piece of this.getPieces()) {
            piece.apply(ctx);
        }

        // 2. Apply Set Bonuses
        this.applySetBonuses(ctx);
    }

    getAllTriggeredEffects(): TriggeredEffect[] {
        const triggered: TriggeredEffect[] = [];
        for (const piece of this.getPieces()) {
            triggered.push(...piece.getTriggeredEffects());
        }
        return triggered;
    }

    private applySetBonuses(ctx: AggregationContext): void {
        const setCounts = new Map<string, { count: number, set: ArmorSetDefinition }>();
        
        for (const piece of this.getPieces()) {
            if (piece instanceof SetArmor) {
                const setId = piece.armorSet.id;
                const current = setCounts.get(setId) || { count: 0, set: piece.armorSet };
                setCounts.set(setId, { count: current.count + 1, set: current.set });
            }
        }

        for (const { count, set } of setCounts.values()) {
            for (const bonus of set.bonuses) {
                if (count >= bonus.requiredPieces) {
                    for (const effect of bonus.effects) {
                        ctx.player.activeEffects.push(effect);
                        effect.applyStatic(ctx.player, ctx.conditions, 1);
                    }
                }
            }
        }
    }
}
