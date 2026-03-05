export enum WeaponType { Pistol = 'pistol', Shotgun = 'shotgun', Smg = 'smg', AssaultRifle = 'assault_rifle', SniperRifle = 'sniper_rifle', Crossbow = 'crossbow', Launcher = 'launcher' }

export enum WeaponKey {
    DE50Jaws = 'de50_jaws',
    SOCRLastValor = 'socr_last_valor',
    KVDBoomBoom = 'kvd_boom_boom',
    MPS5PrimalRage = 'mps5_primal_rage',
    OctopusGrilledRings = 'octopus_grilled_rings'
}

export enum ArmorSlot { Helmet = 'helmet', Mask = 'mask', Top = 'top', Gloves = 'gloves', Pants = 'pants', Boots = 'boots' }

export enum ArmorKey {
    LonewolfHood = 'lonewolf_hood',
    LonewolfMask = 'lonewolf_mask',
    LonewolfJacket = 'lonewolf_jacket',
    LonewolfGloves = 'lonewolf_gloves',
    LonewolfPants = 'lonewolf_pants',
    LonewolfShoes = 'lonewolf_shoes',
    Beret = 'beret',
    OasisMask = 'oasis_mask',
    GildedGloves = 'gilded_gloves',
    BBQGloves = 'bbq_gloves',
    SaviorHelmet = 'savior_helmet',
    SaviorMask = 'savior_mask',
    SaviorTop = 'savior_top',
    SaviorGloves = 'savior_gloves',
    SaviorPants = 'savior_pants',
    SaviorBoots = 'savior_boots',
    TreacherousHelmet = 'treacherous_helmet',
    TreacherousMask = 'treacherous_mask',
    TreacherousTop = 'treacherous_top',
    TreacherousGloves = 'treacherous_gloves',
    TreacherousPants = 'treacherous_pants',
    TreacherousBoots = 'treacherous_boots'
}

export enum ArmorSetKey {
    Lonewolf = 'lonewolf_set',
    Bastille = 'bastille_set',
    Savior = 'savior_set',
    Treacherous = 'treacherous_set'
}

export enum ModKey {
    FatefulStrike = 'mod-fateful-strike',
    DeviationExpert = 'mod-deviation-expert',
    MomentumUp = 'mod-momentum-up',
    PreciseStrike = 'mod-precise-strike',
    FlameResonance = 'mod-flame-resonance',
    Embers = 'mod-embers',
    WorkOfProficiency = 'mod-work-of-proficiency',
    FirstMoveAdvantage = 'mod-first-move-advantage',
    MagExpansion = 'mod-mag-expansion',
    ElementalHavoc = 'mod-elemental-havoc',
    ElementalResonance = 'mod-elemental-resonance',
    RushHour = 'mod-rush-hour'
}

export enum WeaponSlot { Main = 'weapon_main' }
export type GearSlot = ArmorSlot | WeaponSlot;

export enum Rarity { Common = 'common', Fine = 'fine', Epic = 'epic', Legendary = 'legendary' }

export enum EnemyType { Normal = 'normal', Elite = 'elite', Boss = 'boss' }

export enum EncounterTopology {
    SingleTarget = 'single_target',
    Horde = 'horde',
    DuoElites = 'duo_elites'
}

export enum KeywordType { Burn = 'burn', FrostVortex = 'frost_vortex', PowerSurge = 'power_surge', Shrapnel = 'shrapnel', FastGunner = 'fast_gunner', UnstableBomber = 'unstable_bomber', BullsEye = 'bulls_eye', FortressWarfare = 'fortress_warfare', Bounce = 'bounce' }

export enum EffectType { IncreaseStat = 'increase_stat', SetFlag = 'set_flag', OnEvent = 'on_event', ConditionalEffect = 'conditional_effect' }

export enum CalibrationStyle {
    Portable = 'portable',
    RapidShot = 'rapid_shot',
    Heavy = 'heavy',
    Precision = 'precision',
    None = 'none'
}

export enum StatType {
    DamagePerProjectile = 'damage_per_projectile',
    ProjectilesPerShot = 'projectiles_per_shot',
    FireRate = 'fire_rate',
    CritRatePercent = 'crit_rate_percent',
    MagazineCapacity = 'magazine_capacity',
    ReloadSpeedPercent = 'reload_speed_percent',
    AttackPercent = 'attack_percent',
    
    // Calibration Specifics
    BoltPullingSpeedPercent = 'bolt_pulling_speed_percent',
    ActionDelayPercent = 'action_delay_percent',
    AccuracyPercent = 'accuracy_percent',
    StabilityPercent = 'stability_percent',
    KeywordCritRatePercent = 'keyword_crit_rate_percent',
    KeywordCritDamagePercent = 'keyword_crit_damage_percent',
    KeywordTriggerChancePercent = 'keyword_trigger_chance_percent',
    KeywordTriggerHitCount = 'keyword_trigger_hit_count',
    WeaponDamagePercent = 'weapon_damage_percent',
    StatusDamagePercent = 'status_damage_percent',
    ElementalDamagePercent = 'elemental_damage_percent',
    VulnerabilityPercent = 'vulnerability_percent',
    CritDamagePercent = 'crit_damage_percent',
    WeakspotDamagePercent = 'weakspot_damage_percent',
    WeakspotHitRatePercent = 'weakspot_hit_rate_percent',
    DamageBonusNormal = 'damage_bonus_normal',
    DamageBonusElite = 'damage_bonus_elite',
    DamageBonusBoss = 'damage_bonus_boss',
    PsiIntensity = 'psi_intensity',

    // Keyword Specific - FACTOR Buckets (Additive within)
    BurnDamageFactor = 'burn_dmg_factor',
    FrostVortexDamageFactor = 'frost_vortex_dmg_factor',
    PowerSurgeDamageFactor = 'power_surge_dmg_factor',
    ShrapnelDamageFactor = 'shrapnel_dmg_factor',
    UnstableBomberDamageFactor = 'unstable_bomber_dmg_factor',
    BounceDamageFactor = 'bounce_dmg_factor',

    // Keyword Specific - FINAL Buckets (Multiplicative with Factor)
    BurnFinalDamage = 'burn_final_dmg',
    FrostVortexFinalDamage = 'frost_vortex_final_dmg',
    PowerSurgeFinalDamage = 'power_surge_final_dmg',
    ShrapnelFinalDamage = 'shrapnel_final_dmg',
    UnstableBomberFinalDamage = 'unstable_bomber_final_dmg',
    BounceFinalDamage = 'bounce_final_dmg',

    // Legacy / Generic Percent Stats
    BurnDamagePercent = 'burn_damage_percent',
    FrostVortexDamagePercent = 'frost_vortex_damage_percent',
    PowerSurgeDamagePercent = 'power_surge_damage_percent',
    ShrapnelDamagePercent = 'shrapnel_damage_percent',
    UnstableBomberDamagePercent = 'unstable_bomber_damage_percent',
    BounceDamagePercent = 'bounce_damage_percent',
    BullsEyeDamagePercent = 'bulls_eye_damage_percent',

    MaxBurnStacks = 'max_burn_stacks',
    BurnDurationPercent = 'burn_duration_percent',
    BurnFrequencyPercent = 'burn_frequency_percent',

    // Simulation & UI Stats
    DPS = 'dps',
    SanityPercent = 'sanity_percent',
    ShieldPercent = 'shield_percent'
}

export enum DamageTrait {
    Weapon = 'weapon',
    Attack = 'attack',
    Status = 'status',
    Elemental = 'elemental',
    Explosive = 'explosive',
    Melee = 'melee',
    Burn = 'burn',
    FrostVortex = 'frost_vortex',
    PowerSurge = 'power_surge',
    Shrapnel = 'shrapnel',
    UnstableBomber = 'unstable_bomber',
    Bounce = 'bounce',
    FastGunner = 'fast_gunner',
    BullsEye = 'bulls_eye'
}

export enum AmmunitionType {
    Copper = 'copper',
    CopperAP = 'copper_ap',
    Steel = 'steel',
    SteelAP = 'steel_ap',
    Tungsten = 'tungsten',
    TungstenAP = 'tungsten_ap'
}

export enum EventTrigger { OnHit = 'on_hit', OnCrit = 'on_crit', OnWeakspotHit = 'on_weakspot_hit', OnReload = 'on_reload', OnKill = 'on_kill' }

export enum FlagType {
    InfiniteAmmo = 'infinite_ammo',
    CannotDealWeakspotDamage = 'cannot_deal_weakspot_damage',
    KeywordCanCrit = 'keyword_can_crit',
    KeywordCanWeakspot = 'keyword_can_weakspot'
}
