import { WEAPONS_V1_0 } from './v1_0';
import { WeaponKey } from '../../types/enums';
import { WeaponBlueprint } from '../../types/materialization';

/**
 * Global Registry for all Materialized Data versions.
 */
export const VERSIONED_REGISTRY: Record<string, Record<string, WeaponBlueprint>> = {
    "v1.0": WEAPONS_V1_0
};

/**
 * The current active version for the simulation.
 * Transitioning to ADR-008: Materialized Pipeline.
 */
export const ACTIVE_REGISTRY = WEAPONS_V1_0;

export function getWeaponBlueprint(key: WeaponKey): WeaponBlueprint | undefined {
    return ACTIVE_REGISTRY[key];
}
