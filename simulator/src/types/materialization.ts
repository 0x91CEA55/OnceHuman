import { WeaponKey, Rarity, WeaponType, KeywordType } from './enums';
import { TriggerDefinition } from './trigger-types';
import { BaseEffect } from '../models/effect';

/**
 * ADR-008: WeaponBlueprint represents the "Locked" and "Materialized" 
 * domain model for a weapon. It is generated via the build-time pipeline 
 * from raw datamining inputs and human-audited source truth (Bible).
 */
export interface WeaponBlueprint {
    /** The unique internal identifier (locked to the enum). */
    key: WeaponKey;
    /** Display name from the Bible. */
    name: string;
    /** Normalized weapon category. */
    type: WeaponType;
    /** Game rarity tier. */
    rarity: Rarity;
    /** Associated Archetype (e.g., Burn, Shrapnel). */
    keyword: KeywordType;
    
    /** 
     * Base stats representing a "Tier V, 6-Star, Full Calibration" baseline. 
     * These values are ready for the ScalingEngine.
     */
    baseStats: {
        damagePerProjectile: number;
        projectilesPerShot: number;
        fireRate: number;
        magazineCapacity: number;
        critRatePercent: number;
        critDamagePercent: number;
        weakspotDamagePercent: number;
    };

    /** 
     * Resolved executable logic. 
     * No more "description" parsing; these are instantiated engine effects.
     */
    intrinsicEffects: BaseEffect[];

    /** 
     * Resolved behaviors for ADR-003. 
     * These replace the WEAPON_TRIGGER_REGISTRY lookup.
     */
    triggerDefinitions: TriggerDefinition[];
    
    /** 
     * When true, skip default keyword triggers (e.g., Jaws, Octopus). 
     */
    overridesKeywordTriggers: boolean;

    /** 
     * Traceability info: What file/version produced this blueprint. 
     */
    metadata: {
        sourceFile: string;
        sourceDate: string;
        pipelineVersion: string;
    };
}

/**
 * Registry mapping for versioned weapon data.
 */
export type WeaponRegistry = Record<WeaponKey, WeaponBlueprint>;
