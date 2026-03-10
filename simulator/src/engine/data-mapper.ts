import { RawArmorData, RawModData } from '../types/data-sources';
import { WeaponData } from '../types/weapon-types';
import { DataCompiler } from './data-compiler';
import { auditLog } from './audit-log';

/**
 * DataMapper - Legacy interface, now uses DataCompiler for Zero-Trust Ingestion.
 * Phase 4 Refactor.
 */
export class DataMapper {
    /**
     * Maps raw weapon data to internal WeaponData.
     * Delegates to DataCompiler for strict validation.
     */
    static normalizeWeapon(raw: unknown): WeaponData {
        try {
            return DataCompiler.compileWeapon(raw);
        } catch (error) {
            auditLog.warn(`DataMapper`, `Failed to compile weapon. Error: ${(error as Error).message}`);
            throw error;
        }
    }

    /**
     * Normalizes armor data using DataCompiler.
     */
    static normalizeArmor(raw: unknown): RawArmorData {
        try {
            return DataCompiler.compileArmor(raw);
        } catch (error) {
            auditLog.warn(`DataMapper`, `Failed to compile armor. Error: ${(error as Error).message}`);
            throw error;
        }
    }

    /**
     * Normalizes mod data using DataCompiler.
     */
    static normalizeMod(raw: unknown): RawModData {
        try {
            return DataCompiler.compileMod(raw);
        } catch (error) {
            auditLog.warn(`DataMapper`, `Failed to compile mod. Error: ${(error as Error).message}`);
            throw error;
        }
    }
}
