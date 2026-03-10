import { StatType, FlagType, Rarity, ArmorSlot, WeaponType, GearSlot } from './enums';
import { ResourceComponent, EncounterConditions } from './common';
import { TriggerDefinition } from './trigger-types';

export interface IStat {
    readonly type: StatType;
    readonly value: number;
    add(value: number, source: string): void;
    reset(value?: number, source?: string): void;
}

export interface IEffect {
    source?: string;
    applyStatic(player: IPlayer, conditions: EncounterConditions, multiplier: number): void;
    applyWithContext(ctx: AggregationContext, multiplier?: number): void;
    getDescription(): string;
    clone(newSource?: string): IEffect;
}

export interface IModData {
    readonly id: string;
    readonly name: string;
    readonly slot: GearSlot;
    readonly description: string;
    readonly permanentEffects: IEffect[];
    readonly triggerDefinitions: TriggerDefinition[];
}

export interface IMod {
    readonly definition: IModData;
    apply(ctx: AggregationContext): void;
}

export interface IEquipment {
    readonly id: string;
    readonly name: string;
    readonly rarity: Rarity;
    readonly star: number;
    readonly level: number;
    readonly calibration: number;
    mod?: IMod;
    apply(ctx: AggregationContext): void;
    getAllTriggerDefinitions(): TriggerDefinition[];
}

export interface IWeapon extends IEquipment {
    readonly type: WeaponType;
    readonly stats: {
        damagePerProjectile: IStat;
        fireRate: IStat;
        magazineCapacity: IStat;
        critRatePercent: IStat;
        critDamagePercent: IStat;
        weakspotDamagePercent: IStat;
    };
}

export interface IArmor extends IEquipment {
    readonly slot: ArmorSlot;
    readonly stats: {
        psiIntensity: IStat;
    };
}

export interface ILoadout {
    weapon?: IWeapon;
    helmet?: IArmor;
    mask?: IArmor;
    top?: IArmor;
    gloves?: IArmor;
    pants?: IArmor;
    boots?: IArmor;
    apply(ctx: AggregationContext): void;
    getAllTriggerDefinitions(): TriggerDefinition[];
}

export interface IPlayer {
    readonly id: string;
    hp: number;
    activeEffects: IEffect[];
    stats: {
        add(type: StatType, value: number, source?: string): void;
        get(type: StatType): IStat | undefined;
    };
    hasFlag(flag: FlagType): boolean;
    setFlag(flag: FlagType, value: boolean): void;
    loadout: ILoadout;
}

export interface AggregationContext {
    player: IPlayer;
    conditions: EncounterConditions;
    ammoPercent: number;
    loadout: ILoadout;
    resources: ResourceComponent;
}
