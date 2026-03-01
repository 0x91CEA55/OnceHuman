export enum WeaponType { Pistol = 'pistol', Shotgun = 'shotgun', Smg = 'smg', AssaultRifle = 'assault_rifle', SniperRifle = 'sniper_rifle', Crossbow = 'crossbow', Launcher = 'launcher' }

export enum WeaponKey {
    DE50Jaws = 'de50_jaws',
    SOCRLastValor = 'socr_last_valor',
    KVDBoomBoom = 'kvd_boom_boom',
    MPS5PrimalRage = 'mps5_primal_rage'
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
    OasisMask = 'oasis_mask'
}

export enum ArmorSetKey {
    Lonewolf = 'lonewolf_set',
    Bastille = 'bastille_set'
}

export enum ModKey {
    FatefulStrike = 'mod-fateful-strike',
    DeviationExpert = 'mod-deviation-expert',
    MomentumUp = 'mod-momentum-up',
    PreciseStrike = 'mod-precise-strike',
    FlameResonance = 'mod-flame-resonance',
    Embers = 'mod-embers'
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

export enum StatType {
    DamagePerProjectile = 'damage_per_projectile',
    ProjectilesPerShot = 'projectiles_per_shot',
    FireRate = 'fire_rate',
    CritRatePercent = 'crit_rate_percent',
    MagazineCapacity = 'magazine_capacity',
    AttackPercent = 'attack_percent',
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
    DamageBonusNormal = 'damage_bonus_normal',
    DamageBonusElite = 'damage_bonus_elite',
    DamageBonusBoss = 'damage_bonus_boss',
    PsiIntensity = 'psi_intensity',
    BurnDamagePercent = 'burn_damage_percent',
    FrostVortexDamagePercent = 'frost_vortex_damage_percent',
    PowerSurgeDamagePercent = 'power_surge_damage_percent',
    ShrapnelDamagePercent = 'shrapnel_damage_percent',
    UnstableBomberDamagePercent = 'unstable_bomber_damage_percent',
    BounceDamagePercent = 'bounce_damage_percent',
    BullsEyeDamagePercent = 'bulls_eye_damage_percent',
    MaxBurnStacks = 'max_burn_stacks',
    BurnDurationPercent = 'burn_duration_percent'
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

export enum EventTrigger { OnHit = 'on_hit', OnCrit = 'on_crit', OnWeakspotHit = 'on_weakspot_hit', OnReload = 'on_reload', OnKill = 'on_kill' }

export enum FlagType {
    InfiniteAmmo = 'infinite_ammo',
    CannotDealWeakspotDamage = 'cannot_deal_weakspot_damage',
    KeywordCanCrit = 'keyword_can_crit',
    KeywordCanWeakspot = 'keyword_can_weakspot'
}
