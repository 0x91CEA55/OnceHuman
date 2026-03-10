import { StatType, FlagType, WeaponType, Rarity, ArmorSlot, KeywordType, CalibrationStyle } from '../types/enums';
import { ActiveDoT, ActiveBuff } from '../types/status-types';
import { IEffect } from '../types/domain-interfaces';
import { TriggerDefinition } from '../types/trigger-types';

/**
 * Branded EntityId to prevent accidental mixing with raw strings.
 */
export type EntityId = string & { readonly __brand: unique symbol };

export function createEntityId(id: string): EntityId {
    return id as EntityId;
}

export interface HealthComponent {
    currentHp: number;
    maxHp: number;
}

export interface ResourceComponent {
    sanity: number;
    maxSanity: number;
    deviantPower: number;
    maxDeviantPower: number;
}

export interface StatsComponent {
    snapshot: Record<StatType, number>;
}

export interface StatusComponent {
    activeBuffs: ActiveBuff[];
    activeDoTs: ActiveDoT[];
}

export interface FlagComponent {
    activeFlags: Set<FlagType>;
}

export interface ModComponent {
    id: string;
    name: string;
    description: string;
    substats: { type: StatType; value: number }[];
    permanentEffects: IEffect[];
    triggerDefinitions: TriggerDefinition[];
}

export interface WeaponComponent {
    id: string;
    name: string;
    type: WeaponType;
    rarity: Rarity;
    keyword: KeywordType;
    star: number;
    level: number;
    calibration: number;
    calibrationMatrix: {
        style: CalibrationStyle;
        weaponDamageBonus: number; // RNG Line 1
        secondaryStatType: StatType; // RNG Line 2
        secondaryStatValue: number;
    };
    baseStats: {
        damagePerProjectile: number;
        projectilesPerShot: number;
        fireRate: number;
        magazineCapacity: number;
        critRatePercent: number;
        critDamagePercent: number;
        weakspotDamagePercent: number;
    };
    intrinsicEffects: IEffect[];
    triggerDefinitions: TriggerDefinition[];
    overridesKeywordTriggers: boolean;
    mod?: ModComponent;
}

export interface ArmorComponent {
    id: string;
    name: string;
    slot: ArmorSlot;
    rarity: Rarity;
    star: number;
    level: number;
    calibration: number;
    psiIntensity: number;
    intrinsicEffects: IEffect[];
    triggerDefinitions: TriggerDefinition[];
    setDefinition?: {
        id: string;
        name: string;
        bonuses: { 
            requiredPieces: number; 
            effects: IEffect[];
            triggerDefinitions?: TriggerDefinition[];
        }[];
    };
    mod?: ModComponent;
}

export interface LoadoutComponent {
    weapon?: WeaponComponent;
    helmet?: ArmorComponent;
    mask?: ArmorComponent;
    top?: ArmorComponent;
    gloves?: ArmorComponent;
    pants?: ArmorComponent;
    boots?: ArmorComponent;
}

/**
 * Component registry for the World.
 */
export interface ComponentMap {
    health: HealthComponent;
    resources: ResourceComponent;
    stats: StatsComponent;
    status: StatusComponent;
    flags: FlagComponent;
    loadout: LoadoutComponent;
}

export type ComponentType = keyof ComponentMap;
