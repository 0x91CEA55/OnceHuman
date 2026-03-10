import { WEAPONS } from '../weapons';
import { WeaponKey } from '../../types/enums';
import { WeaponBlueprint } from '../../types/materialization';

/**
 * Global Registry for all Materialized Data versions.
 */
export const VERSIONED_REGISTRY: Record<string, Record<WeaponKey, WeaponBlueprint>> = {
    "v1.0": WEAPONS
};

/**
 * The current active version for the simulation.
 * Transitioning to ADR-008: Materialized Pipeline.
 */
export const ACTIVE_REGISTRY = WEAPONS;

export function getWeaponBlueprint(key: WeaponKey): WeaponBlueprint | undefined {
    return ACTIVE_REGISTRY[key];
}
