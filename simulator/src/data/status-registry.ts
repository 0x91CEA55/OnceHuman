/**
 * Status Definition Registry — pure data.
 */

import { StatType, DamageTrait } from '../types/enums';
import { DoTDefinition, BuffDefinition } from '../types/status-types';
import { dotId, buffId } from '../types/keys';

// ─────────────────────────────────────────────────────────────────────────────
// DoT Definitions
// ─────────────────────────────────────────────────────────────────────────────

export const BURN_DOT: DoTDefinition = {
    id: dotId('status-burn'),
    name: 'Burn',
    baseTickIntervalSeconds: 0.5,
    baseDurationSeconds: 6,
    baseMaxStacks: 5,
    scalingFactor: 0.12,
    scalingStat: StatType.PsiIntensity,
    traits: [DamageTrait.Status, DamageTrait.Elemental, DamageTrait.Burn],
    maxStacksStatOverride: StatType.MaxBurnStacks,
    durationStatOverride: StatType.BurnDurationPercent,
    tickFrequencyStatMultiplier: StatType.BurnFrequencyPercent,
};

export const FROST_VORTEX_DOT: DoTDefinition = {
    id: dotId('status-vortex'),
    name: 'Frost Vortex',
    baseTickIntervalSeconds: 0.5,
    baseDurationSeconds: 4,
    baseMaxStacks: 1,
    scalingFactor: 0.50,
    scalingStat: StatType.PsiIntensity,
    traits: [DamageTrait.Status, DamageTrait.Elemental, DamageTrait.FrostVortex],
};

// ─────────────────────────────────────────────────────────────────────────────
// Buff Definitions
// ─────────────────────────────────────────────────────────────────────────────

export const FAST_GUNNER_BUFF: BuffDefinition = {
    id: buffId('buff-fastgunner'),
    name: 'Fast Gunner',
    baseDurationSeconds: 2,
    baseMaxStacks: 10,
    statContributions: [
        { stat: StatType.FireRate, valuePerStack: 10 },
    ],
};

export const BULLS_EYE_BUFF: BuffDefinition = {
    id: buffId('status-bullseye'),
    name: "Bull's Eye",
    baseDurationSeconds: 10,
    baseMaxStacks: 1,
    statContributions: [
        { stat: StatType.VulnerabilityPercent, valuePerStack: 8 },
    ],
};

export const POWER_SURGE_BUFF: BuffDefinition = {
    id: buffId('buff-power-surge'),
    name: 'Power Surge Bonus',
    baseDurationSeconds: 6,
    baseMaxStacks: 1,
    statContributions: [
        { stat: StatType.PowerSurgeDamagePercent, valuePerStack: 40 },
    ],
};

export const PROFICIENCY_BUFF: BuffDefinition = {
    id: buffId('buff-proficiency'),
    name: 'Proficiency',
    baseDurationSeconds: 5,
    baseMaxStacks: 1,
    statContributions: [
        { stat: StatType.ReloadSpeedPercent,   valuePerStack: 10 },
        { stat: StatType.ElementalDamagePercent, valuePerStack: 20 },
    ],
};

export const FIRST_MOVE_BUFF: BuffDefinition = {
    id: buffId('buff-first-move'),
    name: 'First-Move',
    baseDurationSeconds: 2,
    baseMaxStacks: 1,
    statContributions: [
        { stat: StatType.CritRatePercent,    valuePerStack: 10 },
        { stat: StatType.CritDamagePercent,  valuePerStack: 20 },
    ],
};

export const PRECISE_STRIKE_BUFF: BuffDefinition = {
    id: buffId('buff-precise-strike'),
    name: 'Precise Strike',
    baseDurationSeconds: 3,
    baseMaxStacks: 3,
    statContributions: [
        { stat: StatType.WeakspotDamagePercent, valuePerStack: 12 },
    ],
};

export const ARCHERS_FOCUS_BUFF: BuffDefinition = {
    id: buffId('buff-archers-focus'),
    name: "Archer's Focus",
    baseDurationSeconds: 10,
    baseMaxStacks: 10,
    statContributions: [
        { stat: StatType.WeakspotDamagePercent, valuePerStack: 4 },
    ],
};

export const LONE_SHADOW_BUFF: BuffDefinition = {
    id: buffId('buff-lone-shadow'),
    name: 'Lone Shadow',
    baseDurationSeconds: 30,
    baseMaxStacks: 10,
    statContributions: [
        { stat: StatType.CritDamagePercent, valuePerStack: 6 },
    ],
};

export const FORTRESS_WARFARE_BUFF: BuffDefinition = {
    id: buffId('buff-fortress-warfare'),
    name: 'Fortress Warfare',
    baseDurationSeconds: 10,
    baseMaxStacks: 1,
    statContributions: [
        { stat: StatType.CritRatePercent, valuePerStack: 15 },
    ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────────────────────

const DOT_REGISTRY = new Map<string, DoTDefinition>([
    [BURN_DOT.id,         BURN_DOT],
    [FROST_VORTEX_DOT.id, FROST_VORTEX_DOT],
]);

const BUFF_REGISTRY = new Map<string, BuffDefinition>([
    [FAST_GUNNER_BUFF.id,    FAST_GUNNER_BUFF],
    [BULLS_EYE_BUFF.id,      BULLS_EYE_BUFF],
    [POWER_SURGE_BUFF.id,    POWER_SURGE_BUFF],
    [PROFICIENCY_BUFF.id,    PROFICIENCY_BUFF],
    [FIRST_MOVE_BUFF.id,     FIRST_MOVE_BUFF],
    [PRECISE_STRIKE_BUFF.id, PRECISE_STRIKE_BUFF],
    [ARCHERS_FOCUS_BUFF.id,  ARCHERS_FOCUS_BUFF],
    [LONE_SHADOW_BUFF.id,    LONE_SHADOW_BUFF],
    [FORTRESS_WARFARE_BUFF.id, FORTRESS_WARFARE_BUFF],
]);

export class StatusRegistry {
    getDot(id: string): DoTDefinition | undefined  { return DOT_REGISTRY.get(id); }
    getBuff(id: string): BuffDefinition | undefined { return BUFF_REGISTRY.get(id); }
    getAllDots(): IterableIterator<DoTDefinition>   { return DOT_REGISTRY.values(); }
    getAllBuffs(): IterableIterator<BuffDefinition> { return BUFF_REGISTRY.values(); }
}

export const STATUS_REGISTRY = new StatusRegistry();
