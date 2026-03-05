/**
 * Status Definition Registry — pure data.
 *
 * All DoT and Buff definitions extracted from the old class hierarchy
 * (DoTEffect, BuffEffect, ActiveDoT, ActiveBuff) into plain typed objects.
 *
 * ADR-003: Status definitions are configuration, not game state.
 * They live in PhaseContext (or here, as module-level constants), never in World.
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
    [PROFICIENCY_BUFF.id,    PROFICIENCY_BUFF],
    [FIRST_MOVE_BUFF.id,     FIRST_MOVE_BUFF],
    [PRECISE_STRIKE_BUFF.id, PRECISE_STRIKE_BUFF],
]);

export class StatusRegistry {
    getDot(id: string): DoTDefinition | undefined  { return DOT_REGISTRY.get(id); }
    getBuff(id: string): BuffDefinition | undefined { return BUFF_REGISTRY.get(id); }
    getAllDots(): IterableIterator<DoTDefinition>   { return DOT_REGISTRY.values(); }
    getAllBuffs(): IterableIterator<BuffDefinition> { return BUFF_REGISTRY.values(); }
}

export const STATUS_REGISTRY = new StatusRegistry();
