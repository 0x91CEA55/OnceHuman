import { WeaponKey, Rarity, WeaponType, KeywordType, StatType, DamageTrait, FlagType } from '../types/enums';
import { WeaponBlueprint } from '../types/materialization';
import { IncreaseStatEffect, SetFlagEffect } from '../ecs/effects';
import { TriggerType, DynEffectType, EffectTargetType, TriggerConditionType } from '../types/trigger-types';
import { triggerCounterKey, cooldownKey } from '../types/keys';
import { BURN_DOT, BULLS_EYE_BUFF, FAST_GUNNER_BUFF, FROST_VORTEX_DOT, POWER_SURGE_BUFF, FORTRESS_WARFARE_BUFF } from './status-registry';

const PRIMARY = { type: EffectTargetType.PrimaryTarget } as const;
const SELF    = { type: EffectTargetType.Self } as const;
const AOE5    = { type: EffectTargetType.NearbyTargets, radiusMeters: 5 } as const;

/**
 * ADR-008: Materialized Weapon Registry
 * 
 * Source Truth: research/INGAME_KNOWLEDGE_BIBLE.md
 * 
 * NOTE: baseStats represent Tier V, 6-Star, Full Calibration baselines 
 * from WeaponsOverview-FullStarsFullCalibsLvl5.png. 
 * These are the "Final" stats used for the Star 1 / Tier 5 baseline.
 */
export const WEAPONS: Record<WeaponKey, WeaponBlueprint> = {
    [WeaponKey.DE50Jaws]: {
        key: WeaponKey.DE50Jaws,
        name: "DE.50 - Jaws",
        type: WeaponType.Pistol,
        rarity: Rarity.Legendary,
        keyword: KeywordType.UnstableBomber,
        baseStats: {
            damagePerProjectile: 939,
            projectilesPerShot: 1,
            fireRate: 190,
            magazineCapacity: 9,
            critRatePercent: 6,
            critDamagePercent: 25,
            weakspotDamagePercent: 60
        },
        intrinsicEffects: [
            new SetFlagEffect(FlagType.KeywordCanCrit, true),
            new IncreaseStatEffect(StatType.KeywordCritRatePercent, 35)
        ],
        triggerDefinitions: [
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
            {
                id: 'weapon:de50_jaws:on-crit-ub',
                trigger: { type: TriggerType.OnCrit },
                conditions: [{ type: TriggerConditionType.Chance, probability: 0.30 }],
                effects: [
                    {
                        type: DynEffectType.DamageInstance,
                        scalingFactor: 0.8,
                        scalingStat: StatType.PsiIntensity,
                        traits: [DamageTrait.Explosive, DamageTrait.Status, DamageTrait.Elemental, DamageTrait.UnstableBomber],
                        target: PRIMARY,
                        label: 'Unstable Bomber (Crit Proc)',
                    },
                ],
            }
        ],
        overridesKeywordTriggers: true,
        metadata: { sourceFile: 'INGAME_KNOWLEDGE_BIBLE.md', sourceDate: '2026-03-05', pipelineVersion: '1.0' }
    },
    [WeaponKey.DBSGDoombringer]: {
        key: WeaponKey.DBSGDoombringer,
        name: "DBSG - Doombringer",
        type: WeaponType.Shotgun,
        rarity: Rarity.Legendary,
        keyword: KeywordType.BullsEye,
        baseStats: {
            damagePerProjectile: 452,
            projectilesPerShot: 6,
            fireRate: 180,
            magazineCapacity: 2,
            critRatePercent: 10,
            critDamagePercent: 30,
            weakspotDamagePercent: 25
        },
        intrinsicEffects: [],
        triggerDefinitions: [
            {
                id: 'weapon:dbsg_doombringer:on-hit-mark',
                trigger: { type: TriggerType.OnHit },
                conditions: [{ type: TriggerConditionType.Chance, probability: 0.30 }], 
                effects: [{ type: DynEffectType.ApplyBuff, buffId: BULLS_EYE_BUFF.id, target: PRIMARY }],
            }
        ],
        overridesKeywordTriggers: true,
        metadata: { sourceFile: 'INGAME_KNOWLEDGE_BIBLE.md', sourceDate: '2026-03-05', pipelineVersion: '1.0' }
    },
    [WeaponKey.MPS7OuterSpace]: {
        key: WeaponKey.MPS7OuterSpace,
        name: "MPS7 - Outer Space",
        type: WeaponType.Smg,
        rarity: Rarity.Legendary,
        keyword: KeywordType.PowerSurge,
        baseStats: {
            damagePerProjectile: 240,
            projectilesPerShot: 1,
            fireRate: 850,
            magazineCapacity: 35,
            critRatePercent: 8,
            critDamagePercent: 30,
            weakspotDamagePercent: 50
        },
        intrinsicEffects: [
            new IncreaseStatEffect(StatType.PowerSurgeDamageFactor, 30)
        ],
        triggerDefinitions: [
            {
                id: 'weapon:mps7_outer_space:every-12-hits-lightning',
                trigger: {
                    type: TriggerType.EveryNHits,
                    n: 12,
                    critsCountDouble: false,
                    counterKey: triggerCounterKey('weapon:mps7_outer_space:hit-counter'),
                },
                conditions: [],
                effects: [
                    {
                        type: DynEffectType.DamageInstance,
                        scalingFactor: 5.0,
                        scalingStat: StatType.PsiIntensity,
                        traits: [DamageTrait.Elemental, DamageTrait.PowerSurge],
                        target: PRIMARY,
                        label: 'Celestial Lightning',
                    }
                ]
            },
            {
                id: 'weapon:mps7_outer_space:on-reload-buff',
                trigger: { type: TriggerType.OnReload },
                conditions: [],
                effects: [{ type: DynEffectType.ApplyBuff, buffId: POWER_SURGE_BUFF.id, target: SELF }]
            }
        ],
        overridesKeywordTriggers: false,
        metadata: { sourceFile: 'INGAME_KNOWLEDGE_BIBLE.md', sourceDate: '2026-03-05', pipelineVersion: '1.0' }
    },
    [WeaponKey.KAMAbyssGlance]: {
        key: WeaponKey.KAMAbyssGlance,
        name: "KAM - Abyss Glance",
        type: WeaponType.AssaultRifle,
        rarity: Rarity.Legendary,
        keyword: KeywordType.FrostVortex,
        baseStats: {
            damagePerProjectile: 285,
            projectilesPerShot: 1,
            fireRate: 600,
            magazineCapacity: 50,
            critRatePercent: 6,
            critDamagePercent: 30,
            weakspotDamagePercent: 55
        },
        intrinsicEffects: [
            new IncreaseStatEffect(StatType.ElementalDamagePercent, 30),
        ],
        triggerDefinitions: [
            {
                id: 'weapon:kam_abyss_glance:on-hit-vortex',
                trigger: { type: TriggerType.OnHit },
                conditions: [
                    { type: TriggerConditionType.NotOnCooldown, cooldownKey: cooldownKey('weapon:kam_abyss_glance:vortex-cd') }
                ],
                effects: [
                    { type: DynEffectType.ApplyDoT, dotId: FROST_VORTEX_DOT.id, target: PRIMARY },
                    { type: DynEffectType.SetCooldown, key: cooldownKey('weapon:kam_abyss_glance:vortex-cd'), durationSeconds: 7 }
                ]
            }
        ],
        overridesKeywordTriggers: true,
        metadata: { sourceFile: 'INGAME_KNOWLEDGE_BIBLE.md', sourceDate: '2026-03-05', pipelineVersion: '1.0' }
    },
    [WeaponKey.AWS338Bullseye]: {
        key: WeaponKey.AWS338Bullseye,
        name: "AWS.338 - Bullseye",
        type: WeaponType.SniperRifle,
        rarity: Rarity.Legendary,
        keyword: KeywordType.BullsEye,
        baseStats: {
            damagePerProjectile: 2310,
            projectilesPerShot: 1,
            fireRate: 40,
            magazineCapacity: 5,
            critRatePercent: 2,
            critDamagePercent: 26,
            weakspotDamagePercent: 95
        },
        intrinsicEffects: [],
        triggerDefinitions: [
            {
                id: 'weapon:aws338_bullseye:on-weakspot-mark',
                trigger: { type: TriggerType.OnWeakspotHit },
                conditions: [{ type: TriggerConditionType.Chance, probability: 0.70 }],
                effects: [{ type: DynEffectType.ApplyBuff, buffId: BULLS_EYE_BUFF.id, target: PRIMARY }]
            }
        ],
        overridesKeywordTriggers: true,
        metadata: { sourceFile: 'INGAME_KNOWLEDGE_BIBLE.md', sourceDate: '2026-03-05', pipelineVersion: '1.0' }
    },
    [WeaponKey.MG4ConflictingMemories]: {
        key: WeaponKey.MG4ConflictingMemories,
        name: "MG4 - Conflicting Memories",
        type: WeaponType.AssaultRifle,
        rarity: Rarity.Legendary,
        keyword: KeywordType.Shrapnel,
        baseStats: {
            damagePerProjectile: 235,
            projectilesPerShot: 1,
            fireRate: 700,
            magazineCapacity: 75,
            critRatePercent: 8,
            critDamagePercent: 30,
            weakspotDamagePercent: 35
        },
        intrinsicEffects: [
            new IncreaseStatEffect(StatType.MagazineCapacity, 40)
        ],
        triggerDefinitions: [
            {
                id: 'weapon:mg4_conflicting_memories:every-12-hits-shrapnel',
                trigger: {
                    type: TriggerType.EveryNHits,
                    n: 12,
                    critsCountDouble: false,
                    counterKey: triggerCounterKey('weapon:mg4_conflicting_memories:hit-counter'),
                },
                conditions: [],
                effects: [
                    {
                        type: DynEffectType.DamageInstance,
                        scalingFactor: 0.6,
                        scalingStat: StatType.AttackPercent,
                        traits: [DamageTrait.Weapon, DamageTrait.Shrapnel],
                        target: PRIMARY,
                        label: 'Shrapnel',
                    }
                ]
            }
        ],
        overridesKeywordTriggers: true,
        metadata: { sourceFile: 'INGAME_KNOWLEDGE_BIBLE.md', sourceDate: '2026-03-05', pipelineVersion: '1.0' }
    },
    [WeaponKey.G17HazardousObject]: {
        key: WeaponKey.G17HazardousObject,
        name: "G17 - Hazardous Object",
        type: WeaponType.Pistol,
        rarity: Rarity.Legendary,
        keyword: KeywordType.UnstableBomber,
        baseStats: {
            damagePerProjectile: 438,
            projectilesPerShot: 1,
            fireRate: 410,
            magazineCapacity: 13,
            critRatePercent: 8,
            critDamagePercent: 28,
            weakspotDamagePercent: 55
        },
        intrinsicEffects: [],
        triggerDefinitions: [
            {
                id: 'weapon:g17_hazardous_object:on-hit-ub',
                trigger: { type: TriggerType.OnHit },
                conditions: [{ type: TriggerConditionType.Chance, probability: 0.20 }],
                effects: [
                    {
                        type: DynEffectType.DamageInstance,
                        scalingFactor: 0.7,
                        scalingStat: StatType.PsiIntensity,
                        traits: [DamageTrait.Explosive, DamageTrait.Status, DamageTrait.Elemental, DamageTrait.UnstableBomber],
                        target: PRIMARY,
                        label: 'Unstable Bomber',
                    }
                ]
            }
        ],
        overridesKeywordTriggers: true,
        metadata: { sourceFile: 'INGAME_KNOWLEDGE_BIBLE.md', sourceDate: '2026-03-05', pipelineVersion: '1.0' }
    },
    [WeaponKey.ACS12Corrosion]: {
        key: WeaponKey.ACS12Corrosion,
        name: "ACS12 - Corrosion",
        type: WeaponType.Shotgun,
        rarity: Rarity.Legendary,
        keyword: KeywordType.PowerSurge,
        baseStats: {
            damagePerProjectile: 262,
            projectilesPerShot: 5,
            fireRate: 180,
            magazineCapacity: 18,
            critRatePercent: 8,
            critDamagePercent: 27,
            weakspotDamagePercent: 15
        },
        intrinsicEffects: [
            new SetFlagEffect(FlagType.KeywordCanCrit, true),
            new IncreaseStatEffect(StatType.KeywordCritRatePercent, 25),
            new IncreaseStatEffect(StatType.PowerSurgeDamageFactor, 15)
        ],
        triggerDefinitions: [
            {
                id: 'weapon:acs12_corrosion:on-hit-surge',
                trigger: { type: TriggerType.OnHit },
                conditions: [{ type: TriggerConditionType.Chance, probability: 0.80 }],
                effects: [
                    {
                        type: DynEffectType.DamageInstance,
                        scalingFactor: 0.35, 
                        scalingStat: StatType.PsiIntensity,
                        traits: [DamageTrait.Status, DamageTrait.Elemental, DamageTrait.PowerSurge],
                        target: PRIMARY,
                        label: 'Power Surge',
                    }
                ]
            }
        ],
        overridesKeywordTriggers: true,
        metadata: { sourceFile: 'INGAME_KNOWLEDGE_BIBLE.md', sourceDate: '2026-03-05', pipelineVersion: '1.0' }
    },
    [WeaponKey.MPS5Kumawink]: {
        key: WeaponKey.MPS5Kumawink,
        name: "MPS5 - Kumawink",
        type: WeaponType.Smg,
        rarity: Rarity.Legendary,
        keyword: KeywordType.Bounce,
        baseStats: {
            damagePerProjectile: 270,
            projectilesPerShot: 1,
            fireRate: 750,
            magazineCapacity: 30,
            critRatePercent: 8,
            critDamagePercent: 30,
            weakspotDamagePercent: 55
        },
        intrinsicEffects: [
            new IncreaseStatEffect(StatType.BounceDamageFactor, 75)
        ],
        triggerDefinitions: [
            {
                id: 'weapon:mps5_kumawink:on-hit-bounce',
                trigger: { type: TriggerType.OnHit },
                conditions: [{ type: TriggerConditionType.Chance, probability: 0.25 }],
                effects: [
                    {
                        type: DynEffectType.DamageInstance,
                        scalingFactor: 0.35, 
                        scalingStat: StatType.AttackPercent,
                        traits: [DamageTrait.Weapon, DamageTrait.Bounce],
                        target: PRIMARY, 
                        label: 'Bounce Ricochet',
                    }
                ]
            }
        ],
        overridesKeywordTriggers: true,
        metadata: { sourceFile: 'INGAME_KNOWLEDGE_BIBLE.md', sourceDate: '2026-03-05', pipelineVersion: '1.0' }
    },
    [WeaponKey.SOCRLastValor]: {
        key: WeaponKey.SOCRLastValor,
        name: "SOCR - The Last Valor",
        type: WeaponType.AssaultRifle,
        rarity: Rarity.Legendary,
        keyword: KeywordType.Shrapnel,
        baseStats: {
            damagePerProjectile: 330,
            projectilesPerShot: 1,
            fireRate: 515,
            magazineCapacity: 30,
            critRatePercent: 6,
            critDamagePercent: 27,
            weakspotDamagePercent: 60
        },
        intrinsicEffects: [
            new IncreaseStatEffect(StatType.ShrapnelDamageFactor, 30),
        ],
        triggerDefinitions: [
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
        ],
        overridesKeywordTriggers: true,
        metadata: { sourceFile: 'INGAME_KNOWLEDGE_BIBLE.md', sourceDate: '2026-03-05', pipelineVersion: '1.0' }
    },
    [WeaponKey.HAMRBrahminy]: {
        key: WeaponKey.HAMRBrahminy,
        name: "HAMR - Brahminy",
        type: WeaponType.AssaultRifle, 
        rarity: Rarity.Legendary,
        keyword: KeywordType.Bounce,
        baseStats: {
            damagePerProjectile: 1596,
            projectilesPerShot: 1,
            fireRate: 85,
            magazineCapacity: 8,
            critRatePercent: 2,
            critDamagePercent: 30,
            weakspotDamagePercent: 80
        },
        intrinsicEffects: [],
        triggerDefinitions: [
            {
                id: 'weapon:hamr_brahminy:on-hit-bounce',
                trigger: { type: TriggerType.OnHit },
                conditions: [{ type: TriggerConditionType.Chance, probability: 0.75 }],
                effects: [
                    {
                        type: DynEffectType.DamageInstance,
                        scalingFactor: 0.35,
                        scalingStat: StatType.AttackPercent,
                        traits: [DamageTrait.Weapon, DamageTrait.Bounce],
                        target: PRIMARY,
                        label: 'Bounce',
                    }
                ]
            }
        ],
        overridesKeywordTriggers: true,
        metadata: { sourceFile: 'INGAME_KNOWLEDGE_BIBLE.md', sourceDate: '2026-03-05', pipelineVersion: '1.0' }
    },
    [WeaponKey.KVDBoomBoom]: {
        key: WeaponKey.KVDBoomBoom,
        name: "KVD - Boom! Boom!",
        type: WeaponType.Smg,
        rarity: Rarity.Legendary,
        keyword: KeywordType.Burn,
        baseStats: {
            damagePerProjectile: 319,
            projectilesPerShot: 1,
            fireRate: 500,
            magazineCapacity: 100,
            critRatePercent: 10,
            critDamagePercent: 30,
            weakspotDamagePercent: 40
        },
        intrinsicEffects: [
            new IncreaseStatEffect(StatType.ElementalDamagePercent, 30),
        ],
        triggerDefinitions: [
            {
                id: 'weapon:kvd_boom_boom:on-hit-burn',
                trigger: { type: TriggerType.OnHit },
                conditions: [{ type: TriggerConditionType.Chance, probability: 0.18 }],
                effects: [{ type: DynEffectType.ApplyDoT, dotId: BURN_DOT.id, target: PRIMARY }],
            },
            {
                id: 'weapon:kvd_boom_boom:on-hit-explosion',
                trigger: { type: TriggerType.OnHit },
                conditions: [{ type: TriggerConditionType.NotOnCooldown, cooldownKey: cooldownKey('weapon:kvd_boom_boom:explosion-cd') }],
                effects: [
                    {
                        type: DynEffectType.DamageInstance,
                        scalingFactor: 3.0,
                        scalingStat: StatType.PsiIntensity,
                        traits: [DamageTrait.Explosive, DamageTrait.Status, DamageTrait.Elemental, DamageTrait.Burn],
                        target: AOE5,
                        label: 'Pyro Dino Eruption',
                    },
                    { type: DynEffectType.SetCooldown, key: cooldownKey('weapon:kvd_boom_boom:explosion-cd'), durationSeconds: 2 }
                ],
            },
        ],
        overridesKeywordTriggers: true,
        metadata: { sourceFile: 'INGAME_KNOWLEDGE_BIBLE.md', sourceDate: '2026-03-05', pipelineVersion: '1.0' }
    },
    [WeaponKey.PDW90HolographicResonance]: {
        key: WeaponKey.PDW90HolographicResonance,
        name: "PDW90 - Holographic Resonance",
        type: WeaponType.Smg,
        rarity: Rarity.Legendary,
        keyword: KeywordType.BullsEye,
        baseStats: {
            damagePerProjectile: 171,
            projectilesPerShot: 1,
            fireRate: 900,
            magazineCapacity: 50,
            critRatePercent: 8,
            critDamagePercent: 45,
            weakspotDamagePercent: 30
        },
        intrinsicEffects: [],
        triggerDefinitions: [
            {
                id: 'weapon:pdw90_holographic_resonance:on-hit-mark',
                trigger: { type: TriggerType.OnHit },
                conditions: [{ type: TriggerConditionType.Chance, probability: 0.20 }],
                effects: [{ type: DynEffectType.ApplyBuff, buffId: BULLS_EYE_BUFF.id, target: PRIMARY }]
            }
        ],
        overridesKeywordTriggers: true,
        metadata: { sourceFile: 'INGAME_KNOWLEDGE_BIBLE.md', sourceDate: '2026-03-05', pipelineVersion: '1.0' }
    },
    [WeaponKey.ACS12PyroclasmStarter]: {
        key: WeaponKey.ACS12PyroclasmStarter,
        name: "ACS12 - Pyroclasm Starter",
        type: WeaponType.Shotgun,
        rarity: Rarity.Legendary,
        keyword: KeywordType.Burn,
        baseStats: {
            damagePerProjectile: 262,
            projectilesPerShot: 5,
            fireRate: 180,
            magazineCapacity: 18,
            critRatePercent: 8,
            critDamagePercent: 27,
            weakspotDamagePercent: 15
        },
        intrinsicEffects: [
            new IncreaseStatEffect(StatType.ElementalDamagePercent, 20)
        ],
        triggerDefinitions: [
            {
                id: 'weapon:acs12_pyroclasm_starter:on-hit-burn',
                trigger: { type: TriggerType.OnHit },
                conditions: [{ type: TriggerConditionType.Chance, probability: 0.27 }],
                effects: [{ type: DynEffectType.ApplyDoT, dotId: BURN_DOT.id, target: PRIMARY }]
            }
        ],
        overridesKeywordTriggers: true,
        metadata: { sourceFile: 'INGAME_KNOWLEDGE_BIBLE.md', sourceDate: '2026-03-05', pipelineVersion: '1.0' }
    },
    [WeaponKey.MPS5PrimalRage]: {
        key: WeaponKey.MPS5PrimalRage,
        name: "MPS5 - Primal Rage",
        type: WeaponType.Smg,
        rarity: Rarity.Legendary,
        keyword: KeywordType.FastGunner,
        baseStats: {
            damagePerProjectile: 270,
            projectilesPerShot: 1,
            fireRate: 750,
            magazineCapacity: 30,
            critRatePercent: 8,
            critDamagePercent: 30,
            weakspotDamagePercent: 55
        },
        intrinsicEffects: [],
        triggerDefinitions: [
            {
                id: 'weapon:mps5_primal_rage:on-hit-fg',
                trigger: { type: TriggerType.OnHit },
                conditions: [{ type: TriggerConditionType.Chance, probability: 0.35 }],
                effects: [{ type: DynEffectType.ApplyBuff, buffId: FAST_GUNNER_BUFF.id, target: SELF }],
            }
        ],
        overridesKeywordTriggers: true,
        metadata: { sourceFile: 'INGAME_KNOWLEDGE_BIBLE.md', sourceDate: '2026-03-05', pipelineVersion: '1.0' }
    },
    [WeaponKey.M416SilentAnabasis]: {
        key: WeaponKey.M416SilentAnabasis,
        name: "M416 - Silent Anabasis",
        type: WeaponType.AssaultRifle,
        rarity: Rarity.Legendary,
        keyword: KeywordType.FrostVortex,
        baseStats: {
            damagePerProjectile: 240,
            projectilesPerShot: 1,
            fireRate: 750,
            magazineCapacity: 36,
            critRatePercent: 6,
            critDamagePercent: 27,
            weakspotDamagePercent: 60
        },
        intrinsicEffects: [
            new IncreaseStatEffect(StatType.ElementalDamagePercent, 30)
        ],
        triggerDefinitions: [
            {
                id: 'weapon:m416_silent_anabasis:on-hit-vortex',
                trigger: { type: TriggerType.OnHit },
                conditions: [{ type: TriggerConditionType.Chance, probability: 0.12 }],
                effects: [{ type: DynEffectType.ApplyDoT, dotId: FROST_VORTEX_DOT.id, target: PRIMARY }]
            }
        ],
        overridesKeywordTriggers: true,
        metadata: { sourceFile: 'INGAME_KNOWLEDGE_BIBLE.md', sourceDate: '2026-03-05', pipelineVersion: '1.0' }
    },
    [WeaponKey.KVSBRLittleJaws]: {
        key: WeaponKey.KVSBRLittleJaws,
        name: "KV-SBR - Little Jaws",
        type: WeaponType.AssaultRifle, 
        rarity: Rarity.Legendary,
        keyword: KeywordType.UnstableBomber,
        baseStats: {
            damagePerProjectile: 209,
            projectilesPerShot: 1,
            fireRate: 1000,
            magazineCapacity: 30,
            critRatePercent: 10,
            critDamagePercent: 30,
            weakspotDamagePercent: 45
        },
        intrinsicEffects: [],
        triggerDefinitions: [
            {
                id: 'weapon:kv_sbr_little_jaws:on-hit-ub',
                trigger: { type: TriggerType.OnHit },
                conditions: [{ type: TriggerConditionType.NotOnCooldown, cooldownKey: cooldownKey('weapon:kv_sbr_little_jaws:ub-cd') }],
                effects: [
                    {
                        type: DynEffectType.DamageInstance,
                        scalingFactor: 0.7,
                        scalingStat: StatType.PsiIntensity,
                        traits: [DamageTrait.Explosive, DamageTrait.Status, DamageTrait.Elemental, DamageTrait.UnstableBomber],
                        target: PRIMARY,
                        label: 'Unstable Bomber',
                    },
                    { type: DynEffectType.SetCooldown, key: cooldownKey('weapon:kv_sbr_little_jaws:ub-cd'), durationSeconds: 0.9 }
                ]
            }
        ],
        overridesKeywordTriggers: true,
        metadata: { sourceFile: 'INGAME_KNOWLEDGE_BIBLE.md', sourceDate: '2026-03-05', pipelineVersion: '1.0' }
    },
    [WeaponKey.TEC9AdditionalRules]: {
        key: WeaponKey.TEC9AdditionalRules,
        name: "TEC9 - Additional Rules",
        type: WeaponType.Pistol,
        rarity: Rarity.Legendary,
        keyword: KeywordType.FortressWarfare,
        baseStats: {
            damagePerProjectile: 449,
            projectilesPerShot: 1,
            fireRate: 450,
            magazineCapacity: 30,
            critRatePercent: 10,
            critDamagePercent: 30,
            weakspotDamagePercent: 45
        },
        intrinsicEffects: [],
        triggerDefinitions: [
            {
                id: 'weapon:tec9_additional_rules:on-hit-fw',
                trigger: { type: TriggerType.OnHit },
                conditions: [{ type: TriggerConditionType.NotOnCooldown, cooldownKey: cooldownKey('weapon:tec9_additional_rules:fw-cd') }],
                effects: [
                    { type: DynEffectType.ApplyBuff, buffId: FORTRESS_WARFARE_BUFF.id, target: SELF },
                    { type: DynEffectType.SetCooldown, key: cooldownKey('weapon:tec9_additional_rules:fw-cd'), durationSeconds: 10 }
                ]
            }
        ],
        overridesKeywordTriggers: true,
        metadata: { sourceFile: 'INGAME_KNOWLEDGE_BIBLE.md', sourceDate: '2026-03-05', pipelineVersion: '1.0' }
    },
    [WeaponKey.OctopusGrilledRings]: {
        key: WeaponKey.OctopusGrilledRings,
        name: "EBR-14: Octopus! Grilled Rings!",
        type: WeaponType.SniperRifle,
        rarity: Rarity.Legendary,
        keyword: KeywordType.Burn,
        baseStats: {
            damagePerProjectile: 471,
            projectilesPerShot: 1,
            fireRate: 300,
            magazineCapacity: 20,
            critRatePercent: 5,
            critDamagePercent: 40,
            weakspotDamagePercent: 50
        },
        intrinsicEffects: [
            new IncreaseStatEffect(StatType.BurnDamageFactor, 75),
            new IncreaseStatEffect(StatType.MaxBurnStacks, -3),
            new IncreaseStatEffect(StatType.KeywordCritRatePercent, 20),
        ],
        triggerDefinitions: [
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
        ],
        overridesKeywordTriggers: true,
        metadata: { sourceFile: 'INGAME_KNOWLEDGE_BIBLE.md', sourceDate: '2026-03-05', pipelineVersion: '1.0' }
    }
};
