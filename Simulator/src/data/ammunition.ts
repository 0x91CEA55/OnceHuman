import { AmmunitionType } from '../types/enums';

export interface AmmunitionData {
    type: AmmunitionType;
    name: string;
    damageMultiplier: number;
    psiMultiplier: number;
}

export const AMMUNITION: Record<AmmunitionType, AmmunitionData> = {
    [AmmunitionType.Copper]: { type: AmmunitionType.Copper, name: 'Copper Ammo', damageMultiplier: 1.00, psiMultiplier: 1.00 },
    [AmmunitionType.CopperAP]: { type: AmmunitionType.CopperAP, name: 'Advanced Copper Ammo', damageMultiplier: 1.04, psiMultiplier: 1.04 },
    [AmmunitionType.Steel]: { type: AmmunitionType.Steel, name: 'Steel Ammo', damageMultiplier: 1.05, psiMultiplier: 1.05 },
    [AmmunitionType.SteelAP]: { type: AmmunitionType.SteelAP, name: 'Advanced Steel Ammo', damageMultiplier: 1.08, psiMultiplier: 1.08 },
    [AmmunitionType.Tungsten]: { type: AmmunitionType.Tungsten, name: 'Tungsten Ammo', damageMultiplier: 1.10, psiMultiplier: 1.10 },
    [AmmunitionType.TungstenAP]: { type: AmmunitionType.TungstenAP, name: 'Advanced Tungsten Ammo', damageMultiplier: 1.15, psiMultiplier: 1.15 },
};
