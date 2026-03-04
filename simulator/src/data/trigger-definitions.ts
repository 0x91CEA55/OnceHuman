/**
 * Trigger Definition Registry — pure data.
 *
 * All weapon and keyword trigger definitions expressed as TriggerDefinition[].
 * Replaces: EffectRegistry (static class with TriggeredEffect instances)
 *           Keyword.getTriggeredEffects() (methods returning TriggeredEffect[])
 *
 * Key properties:
 * - No mutable state on definitions — EveryNHits counter lives in engine state
 * - All effect labels are explicit for log traceability
 * - Cooldown keys are typed and scoped
 * - TargetAtMaxStacks condition uses the typed DoTId string
 *
 * ADR-003: §Trigger Definition Data, §Verification: The "Jaws State Pollution Test"
 */

import { StatType, DamageTrait, WeaponKey, KeywordType } from '../types/enums';
import { TriggerDefinition, TriggerType, TriggerConditionType, DynEffectType, EffectTargetType } from '../types/trigger-types';
import { triggerCounterKey, cooldownKey, dotId, buffId } from '../types/keys';
import {
    BURN_DOT, FROST_VORTEX_DOT,
    FAST_GUNNER_BUFF, BULLS_EYE_BUFF,
    PROFICIENCY_BUFF, FIRST_MOVE_BUFF, PRECISE_STRIKE_BUFF,
} from './status-registry';

const PRIMARY = { type: EffectTargetType.PrimaryTarget } as const;
const SELF    = { type: EffectTargetType.Self } as const;
const AOE5    = { type: EffectTargetType.NearbyTargets, radiusMeters: 5 } as const;

// ─────────────────────────────────────────────────────────────────────────────
// Keyword Trigger Definitions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default Burn keyword triggers (18% chance on hit).
 * OctopusGrilledRings overrides this with 50% chance — see WEAPON_TRIGGER_DEFINITIONS.
 */
export const BURN_KEYWORD_TRIGGERS: TriggerDefinition[] = [
    {
        id: 'keyword:burn:on-hit-dot',
        trigger: { type: TriggerType.OnHit },
        conditions: [{ type: TriggerConditionType.Chance, probability: 0.18 }],
        effects: [{ type: DynEffectType.ApplyDoT, dotId: BURN_DOT.id, target: PRIMARY }],
    },
];

export const FROST_VORTEX_KEYWORD_TRIGGERS: TriggerDefinition[] = [
    {
        id: 'keyword:frost_vortex:on-hit-dot',
        trigger: { type: TriggerType.OnHit },
        conditions: [{ type: TriggerConditionType.Chance, probability: 0.10 }],
        effects: [{ type: DynEffectType.ApplyDoT, dotId: FROST_VORTEX_DOT.id, target: PRIMARY }],
    },
];

export const FAST_GUNNER_KEYWORD_TRIGGERS: TriggerDefinition[] = [
    {
        id: 'keyword:fast_gunner:on-hit-buff',
        trigger: { type: TriggerType.OnHit },
        conditions: [{ type: TriggerConditionType.Chance, probability: 0.35 }],
        effects: [{ type: DynEffectType.ApplyBuff, buffId: FAST_GUNNER_BUFF.id, target: SELF }],
    },
];

export const BULLS_EYE_KEYWORD_TRIGGERS: TriggerDefinition[] = [
    {
        id: 'keyword:bulls_eye:on-hit-buff',
        trigger: { type: TriggerType.OnHit },
        conditions: [{ type: TriggerConditionType.Chance, probability: 0.70 }],
        effects: [{ type: DynEffectType.ApplyBuff, buffId: BULLS_EYE_BUFF.id, target: SELF }],
    },
];

/**
 * UnstableBomber — EveryNHits(4) explosion.
 * The ADR-003 canonical example of EveryNHits replacing EveryNShotsTrigger.
 * Counter lives in engine state (per-simulation), never on this definition object.
 */
export const UNSTABLE_BOMBER_KEYWORD_TRIGGERS: TriggerDefinition[] = [
    {
        id: 'keyword:unstable_bomber:every-4-hits',
        trigger: {
            type: TriggerType.EveryNHits,
            n: 4,
            critsCountDouble: false,
            counterKey: triggerCounterKey('keyword:unstable_bomber:hit-counter'),
        },
        conditions: [],
        effects: [
            {
                type: DynEffectType.DamageInstance,
                scalingFactor: 0.7,
                scalingStat: StatType.PsiIntensity,
                traits: [DamageTrait.Explosive, DamageTrait.Status, DamageTrait.Elemental, DamageTrait.UnstableBomber],
                target: PRIMARY,
                label: 'Unstable Bomber',
            },
        ],
    },
];

/** Placeholder triggers for keywords that proc damage via pipeline, not events. */
export const POWER_SURGE_KEYWORD_TRIGGERS: TriggerDefinition[] = [];
export const SHRAPNEL_KEYWORD_TRIGGERS: TriggerDefinition[]    = [];
export const BOUNCE_KEYWORD_TRIGGERS: TriggerDefinition[]      = [];
export const FORTRESS_WARFARE_KEYWORD_TRIGGERS: TriggerDefinition[] = [];

export const KEYWORD_TRIGGERS: Record<KeywordType, TriggerDefinition[]> = {
    [KeywordType.Burn]:            BURN_KEYWORD_TRIGGERS,
    [KeywordType.FrostVortex]:     FROST_VORTEX_KEYWORD_TRIGGERS,
    [KeywordType.FastGunner]:      FAST_GUNNER_KEYWORD_TRIGGERS,
    [KeywordType.BullsEye]:        BULLS_EYE_KEYWORD_TRIGGERS,
    [KeywordType.UnstableBomber]:  UNSTABLE_BOMBER_KEYWORD_TRIGGERS,
    [KeywordType.PowerSurge]:      POWER_SURGE_KEYWORD_TRIGGERS,
    [KeywordType.Shrapnel]:        SHRAPNEL_KEYWORD_TRIGGERS,
    [KeywordType.Bounce]:          BOUNCE_KEYWORD_TRIGGERS,
    [KeywordType.FortressWarfare]: FORTRESS_WARFARE_KEYWORD_TRIGGERS,
};

// ─────────────────────────────────────────────────────────────────────────────
// Weapon-Specific Trigger Definitions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DE.50 – Jaws
 * Every 3 hits (crits count as 2) → Unstable Bomber explosion.
 *
 * ADR-003 verification: "Jaws State Pollution Test"
 * Counter is in engine state → zero-state is guaranteed on each Monte Carlo iteration.
 */
const DE50_JAWS_TRIGGERS: TriggerDefinition[] = [
    {
        id: 'weapon:de50_jaws:every-3-hits',
        trigger: {
            type: TriggerType.EveryNHits,
            n: 3,
            critsCountDouble: true,
            counterKey: triggerCounterKey('weapon:de50_jaws:hit-counter'),
        },
        conditions: [],
        effects: [
            {
                type: DynEffectType.DamageInstance,
                scalingFactor: 0.8,
                scalingStat: StatType.PsiIntensity,
                traits: [DamageTrait.Explosive, DamageTrait.Status, DamageTrait.Elemental, DamageTrait.UnstableBomber],
                target: PRIMARY,
                label: 'Unstable Bomber',
            },
        ],
    },
];

/**
 * SOCR – The Last Valor
 * Every 4 hits (crits count as 2) → Shrapnel explosion (50% Attack).
 */
const SOCR_LAST_VALOR_TRIGGERS: TriggerDefinition[] = [
    {
        id: 'weapon:socr_last_valor:every-4-hits',
        trigger: {
            type: TriggerType.EveryNHits,
            n: 4,
            critsCountDouble: true,
            counterKey: triggerCounterKey('weapon:socr_last_valor:hit-counter'),
        },
        conditions: [],
        effects: [
            {
                type: DynEffectType.DamageInstance,
                scalingFactor: 0.5,
                scalingStat: StatType.AttackPercent,
                traits: [DamageTrait.Weapon, DamageTrait.Shrapnel],
                target: PRIMARY,
                label: 'Shrapnel',
            },
        ],
    },
];

/**
 * KVD – Boom Boom
 * OnKill → Blaze Explosion (AoE 5m, 3.0× Psi, 2s CD) + Burn DoT on target
 * OnHit  → 15% chance Pyro Dino Eruption (1.0× Psi, 1s CD)
 *
 * Note: The Boom Boom uses the standard Burn keyword for its 18% on-hit burn trigger
 * (handled by BURN_KEYWORD_TRIGGERS). The weapon-specific triggers are the kill explosion
 * and the on-hit pyro dino chance.
 */
const KVD_BOOM_BOOM_TRIGGERS: TriggerDefinition[] = [
    {
        id: 'weapon:kvd_boom_boom:on-kill-explosion',
        trigger: { type: TriggerType.OnKill },
        conditions: [],
        effects: [
            {
                type: DynEffectType.DamageInstance,
                scalingFactor: 3.0,
                scalingStat: StatType.PsiIntensity,
                traits: [DamageTrait.Explosive, DamageTrait.Status, DamageTrait.Elemental],
                target: AOE5,
                label: 'Blaze Explosion',
                cooldown: {
                    key: cooldownKey('weapon:kvd_boom_boom:blaze-explosion'),
                    durationSeconds: 2,
                },
            },
            {
                type: DynEffectType.ApplyDoT,
                dotId: BURN_DOT.id,
                target: PRIMARY,
            },
        ],
    },
    {
        id: 'weapon:kvd_boom_boom:on-hit-pyro-dino',
        trigger: { type: TriggerType.OnHit },
        conditions: [{ type: TriggerConditionType.Chance, probability: 0.15 }],
        effects: [
            {
                type: DynEffectType.DamageInstance,
                scalingFactor: 1.0,
                scalingStat: StatType.PsiIntensity,
                traits: [DamageTrait.Explosive, DamageTrait.Status, DamageTrait.Elemental],
                target: PRIMARY,
                label: 'Pyro Dino Eruption',
                cooldown: {
                    key: cooldownKey('weapon:kvd_boom_boom:pyro-dino'),
                    durationSeconds: 1,
                },
            },
        ],
    },
];

/**
 * EBR-14: Octopus! Grilled Rings!
 * Uses a boosted Burn trigger (50% chance instead of 18%) — defined here directly.
 * OnHit + TargetAtMaxBurnStacks → Fire Ring explosion (1.5× Psi, 0.5s CD).
 */
const OCTOPUS_GRILLED_RINGS_TRIGGERS: TriggerDefinition[] = [
    // Override the default keyword burn trigger with 50% chance
    {
        id: 'weapon:octopus_grilled_rings:on-hit-burn',
        trigger: { type: TriggerType.OnHit },
        conditions: [{ type: TriggerConditionType.Chance, probability: 0.50 }],
        effects: [{ type: DynEffectType.ApplyDoT, dotId: BURN_DOT.id, target: PRIMARY }],
    },
    {
        id: 'weapon:octopus_grilled_rings:on-hit-fire-ring',
        trigger: { type: TriggerType.OnHit },
        conditions: [
            { type: TriggerConditionType.TargetAtMaxStacks, statusId: BURN_DOT.id },
        ],
        effects: [
            {
                type: DynEffectType.DamageInstance,
                scalingFactor: 1.5,
                scalingStat: StatType.PsiIntensity,
                traits: [DamageTrait.Explosive, DamageTrait.Status, DamageTrait.Elemental, DamageTrait.Burn],
                target: PRIMARY,
                label: 'Fire Ring',
                cooldown: {
                    key: cooldownKey('weapon:octopus_grilled_rings:fire-ring'),
                    durationSeconds: 0.5,
                },
            },
        ],
    },
];

/**
 * MPS5 – Primal Rage uses the FastGunner keyword — no additional weapon-specific triggers.
 */
const MPS5_PRIMAL_RAGE_TRIGGERS: TriggerDefinition[] = [];

/**
 * Map from WeaponKey → weapon-specific TriggerDefinition[].
 *
 * For weapons that override keyword triggers (e.g. OctopusGrilledRings overrides Burn chance),
 * set overridesKeywordTriggers: true so the weapon loader skips the default keyword triggers.
 */
export interface WeaponTriggerEntry {
    /** Additional weapon-specific triggers layered on top of keyword triggers. */
    triggers: TriggerDefinition[];
    /**
     * If true, do NOT include the default keyword triggers for this weapon.
     * Used by OctopusGrilledRings which has its own 50% Burn trigger.
     */
    overridesKeywordTriggers?: boolean;
}

export const WEAPON_TRIGGER_REGISTRY: Partial<Record<WeaponKey, WeaponTriggerEntry>> = {
    // DE50 Jaws replaces UnstableBomber keyword (every-4-hits) with its own every-3-hits counter
    [WeaponKey.DE50Jaws]:            { triggers: DE50_JAWS_TRIGGERS, overridesKeywordTriggers: true },
    // SOCR Last Valor replaces Shrapnel keyword with its own every-4-hits counter
    [WeaponKey.SOCRLastValor]:       { triggers: SOCR_LAST_VALOR_TRIGGERS, overridesKeywordTriggers: true },
    [WeaponKey.KVDBoomBoom]:         { triggers: KVD_BOOM_BOOM_TRIGGERS },
    [WeaponKey.OctopusGrilledRings]: { triggers: OCTOPUS_GRILLED_RINGS_TRIGGERS, overridesKeywordTriggers: true },
    [WeaponKey.MPS5PrimalRage]:      { triggers: MPS5_PRIMAL_RAGE_TRIGGERS },
};

// ─────────────────────────────────────────────────────────────────────────────
// Mod Trigger Definitions
// ─────────────────────────────────────────────────────────────────────────────

export const WORK_OF_PROFICIENCY_TRIGGERS: TriggerDefinition[] = [
    {
        id: 'mod:work_of_proficiency:on-reload',
        trigger: { type: TriggerType.OnReload },
        conditions: [],
        effects: [{ type: DynEffectType.ApplyBuff, buffId: PROFICIENCY_BUFF.id, target: SELF }],
    },
];

export const FIRST_MOVE_ADVANTAGE_TRIGGERS: TriggerDefinition[] = [
    {
        id: 'mod:first_move_advantage:on-reload',
        trigger: { type: TriggerType.OnReload },
        conditions: [],
        effects: [{ type: DynEffectType.ApplyBuff, buffId: FIRST_MOVE_BUFF.id, target: SELF }],
    },
];

export const PRECISE_STRIKE_TRIGGERS: TriggerDefinition[] = [
    {
        id: 'mod:precise_strike:on-weakspot-hit',
        trigger: { type: TriggerType.OnWeakspotHit },
        conditions: [],
        effects: [{ type: DynEffectType.ApplyBuff, buffId: PRECISE_STRIKE_BUFF.id, target: SELF }],
    },
];
