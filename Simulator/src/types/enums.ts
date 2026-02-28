export enum WeaponType { Pistol = 'pistol', Shotgun = 'shotgun', Smg = 'smg', AssaultRifle = 'assault_rifle', SniperRifle = 'sniper_rifle', Crossbow = 'crossbow', Launcher = 'launcher' }

export enum ArmorSlot { Helmet = 'helmet', Mask = 'mask', Top = 'top', Gloves = 'gloves', Pants = 'pants', Boots = 'boots' }
export enum WeaponSlot { Main = 'weapon_main' }
export type GearSlot = ArmorSlot | WeaponSlot;

export enum Rarity { Common = 'common', Fine = 'fine', Epic = 'epic', Legendary = 'legendary' }

export enum EnemyType { Normal = 'normal', Elite = 'elite', Boss = 'boss' }

export enum KeywordType { Burn = 'burn', FrostVortex = 'frost_vortex', PowerSurge = 'power_surge', Shrapnel = 'shrapnel', FastGunner = 'fast_gunner', UnstableBomber = 'unstable_bomber', BullsEye = 'bulls_eye', FortressWarfare = 'fortress_warfare', Bounce = 'bounce' }

export enum EffectType { IncreaseStat = 'increase_stat', SetFlag = 'set_flag', OnEvent = 'on_event', ConditionalEffect = 'conditional_effect' }

export enum StatType {
    DamagePerProjectile = 'damage_per_projectile',
    ProjectilesPerShot = 'projectiles_per_shot',
    FireRate = 'fire_rate',
    CritRatePercent = 'crit_rate_percent',
    MagazineCapacity = 'magazine_capacity',
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
    BullsEyeDamagePercent = 'bulls_eye_damage_percent'
}

export enum EventTrigger { OnHit = 'on_hit', OnCrit = 'on_crit', OnWeakspotHit = 'on_weakspot_hit', OnReload = 'on_reload' }

export enum FlagType {
    InfiniteAmmo = 'infinite_ammo',
    CannotDealWeakspotDamage = 'cannot_deal_weakspot_damage',
    KeywordCanCrit = 'keyword_can_crit',
    KeywordCanWeakspot = 'keyword_can_weakspot'
}
