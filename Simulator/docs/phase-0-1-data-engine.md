# Phase 0+1: Data Schemas & Core Damage Engine — Low-Level Design

> Companion to the high-level plan at `~/.claude/plans/fuzzy-splashing-sun.md`.
> Sources tagged per Architect Protocol: `[empirical]`, `[agent-output]`, `[training-prior]`, `[user-stated]`.

---

## 1. Reference Implementation & Architectural Principles

### 1.1 Event-Driven Architecture & Domain Modeling

The engine is built on **strong domain modeling (TypeScript)** and an **event-based loop engine**.

- **Domain Models:** OOP hierarchies for `Player`, `Loadout`, `Equipment`, `Effect`, and `Stat`.
  - `Player` acts as the active entity in the simulation, possessing a `Loadout`, aggregated `PlayerStats`, active `Buffs`/`Effects`, and transient states.
  - `Loadout` represents the configuration of equipped gear, capable of dynamically determining active set bonuses and effects.
- **Calculation Components:** 
  - `StatAggregator`: Computes static base stats. Accumulation rules (like crit caps or int rounding) are encapsulated in the OOP `Stat` subclasses.
  - `PhysicalDamagePipeline`: Handles standard bullet/projectile damage. Evaluates all hypothetical outcomes (crit vs no-crit, weakspot vs no-weakspot).
  - `KeywordDamagePipeline`: Handles status and elemental proc damage. Evaluates hypothetical outcomes if flags allow procs to crit or hit weakspots.
- **Event Loop Engine:** A `DamageEngine` class simulates time/events incrementally (e.g., bullet fired, proc triggered, mag empty).
- **Stack & UI:** A modern Vite + TS + React project.

---

## 2. Data Schemas (TypeScript)

### 2.1 Enums & Identifiers

```typescript
export enum WeaponType { Pistol = 'pistol', Shotgun = 'shotgun', Smg = 'smg', AssaultRifle = 'assault_rifle', SniperRifle = 'sniper_rifle', Crossbow = 'crossbow', Launcher = 'launcher' }

export enum ArmorSlot { Helmet = 'helmet', Mask = 'mask', Top = 'top', Gloves = 'gloves', Pants = 'pants', Boots = 'boots' }
export enum WeaponSlot { Main = 'weapon_main' }
export type GearSlot = ArmorSlot | WeaponSlot;

export enum Rarity { Common = 'common', Fine = 'fine', Epic = 'epic', Legendary = 'legendary' }

export enum EnemyType { Normal = 'normal', Elite = 'elite', Boss = 'boss' }

export enum KeywordType { Burn = 'burn', FrostVortex = 'frost_vortex', PowerSurge = 'power_surge', Shrapnel = 'shrapnel', FastGunner = 'fast_gunner', UnstableBomber = 'unstable_bomber', BullsEye = 'bulls_eye', FortressWarfare = 'fortress_warfare', Bounce = 'bounce' }

/**
 * OOP Keyword Hierarchy
 * Encapsulates damage properties and trigger logic.
 */
export abstract class Keyword {
  constructor(
    public readonly id: KeywordType,
    public readonly isPhysical: boolean,
    public readonly scalingFactor: number
  ) {}

  /** Returns the expected number of procs per shot (0.0 to 1.0+) */
  abstract getExpectedProcsPerShot(player: Player, bulletDmg: DamageProfile): number;
}

export class ProbabilityKeyword extends Keyword {
  getExpectedProcsPerShot(player: Player): number {
    return player.stats.get(StatType.KeywordTriggerChancePercent) / 100;
  }
}

export class HitCountKeyword extends Keyword {
  constructor(id: KeywordType, isPhysical: boolean, scalingFactor: number, public readonly critCountsAsDouble: boolean) {
    super(id, isPhysical, scalingFactor);
  }

  getExpectedProcsPerShot(player: Player): number {
    const hitsRequired = player.stats.get(StatType.KeywordTriggerHitCount);
    if (hitsRequired <= 0) return 0;
    const critRate = player.stats.get(StatType.CritRatePercent) / 100;
    const hitsPerShot = this.critCountsAsDouble ? (1 + critRate) : 1;
    return hitsPerShot / hitsRequired;
  }
}

export enum EffectType { IncreaseStat = 'increase_stat', SetFlag = 'set_flag', OnEvent = 'on_event', ConditionalEffect = 'conditional_effect' }
export enum StatType { 
  DamagePerProjectile = 'damage_per_projectile', 
  FireRate = 'fire_rate', 
  CritRatePercent = 'crit_rate_percent', 
  MagazineCapacity = 'magazine_capacity', 
  KeywordCritRatePercent = 'keyword_crit_rate_percent',     // Used by e.g., Gilded Gauntlets (+20% Burn Crit Rate)
  KeywordCritDamagePercent = 'keyword_crit_damage_percent', // Used by e.g., Gilded Gauntlets
  KeywordTriggerChancePercent = 'keyword_trigger_chance_percent',
  KeywordTriggerHitCount = 'keyword_trigger_hit_count',
  WeaponDamagePercent = 'weapon_damage_percent',
  StatusDamagePercent = 'status_damage_percent', // Applies to Keyword/Elemental only
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
  BounceDamagePercent = 'bounce_damage_percent'
  // ...
}
export enum EventTrigger { OnHit = 'on_hit', OnCrit = 'on_crit', OnWeakspotHit = 'on_weakspot_hit', OnReload = 'on_reload' }

// Flags dynamically alter the engine's calculation pathways
export enum FlagType { 
  InfiniteAmmo = 'infinite_ammo',
  CannotDealWeakspotDamage = 'cannot_deal_weakspot_damage', // Fateful Strike Mod
  KeywordCanCrit = 'keyword_can_crit',                      // Gilded Gauntlets (Burn can crit)
  KeywordCanWeakspot = 'keyword_can_weakspot'
}
```

### 2.2 Domain Models: Stats

Using a class hierarchy for `Stat` bakes accumulation logic directly into the domain models.

```typescript
export abstract class Stat {
  abstract readonly type: StatType;
  constructor(public value: number) {}
  
  add(other: number): void {
    this.value += other;
  }
}

export class CritRateStat extends Stat {
  readonly type = StatType.CritRatePercent;
  override add(other: number): void {
    this.value = Math.min(100, this.value + other);
  }
}

export class MagazineCapacityStat extends Stat {
  readonly type = StatType.MagazineCapacity;
  override add(other: number): void {
    this.value = Math.round(this.value + other);
  }
}

export class GenericStat extends Stat {
  constructor(public readonly type: StatType, value: number) {
    super(value);
  }
}
```

### 2.3 Domain Models: Effects 

`Effect` is modeled as a discriminated union.

```typescript
export interface BaseEffect {
  type: EffectType;
  durationSeconds?: number;
  maxStacks?: number;
  currentStacks?: number;
}

export interface IncreaseStatEffect extends BaseEffect {
  type: EffectType.IncreaseStat;
  stat: StatType; 
  value: number;
}

export interface SetFlagEffect extends BaseEffect {
  type: EffectType.SetFlag;
  flag: FlagType;
  value: boolean;
}

export interface OnEventEffect extends BaseEffect {
  type: EffectType.OnEvent;
  event: EventTrigger;
  effects: Effect[];
}

export type Effect = IncreaseStatEffect | SetFlagEffect | OnEventEffect /* | ... */;
```

### 2.4 Domain Models: Equipment Hierarchy & Loadout

Converting `Armor` and `Weapon` to an OOP hierarchy allows dynamic effect resolution based on the `Loadout` context.

```typescript
export interface Mod {
  id: string;
  name: string;
  slot: GearSlot;
  // keywordType is used for matching mods to weapons, but the Weapon instance holds the active Keyword object
  keywordType?: KeywordType;
  description: string;
  effects: Effect[];
  subStats: IncreaseStatEffect[]; 
}

export abstract class Equipment {
  constructor(
    public id: string,
    public name: string,
    public rarity: Rarity,
    public star: number,
    public level: number,
    public calibration: number,
    public mod?: Mod
  ) {}

  getActiveEffects(loadout: Loadout): Effect[] {
    const effects: Effect[] = [];
    if (this.mod) {
      effects.push(...this.mod.effects, ...this.mod.subStats);
    }
    return effects;
  }
}

export class WeaponStats {
  damagePerProjectile = new GenericStat(StatType.DamagePerProjectile, 0); 
  projectilesPerShot = new GenericStat(StatType.ProjectilesPerShot, 0);
  fireRate = new GenericStat(StatType.FireRate, 0);
  magazineCapacity = new MagazineCapacityStat(0);
  critRatePercent = new CritRateStat(0);
  critDamagePercent = new GenericStat(StatType.CritDamagePercent, 0);
  weakspotDamagePercent = new GenericStat(StatType.WeakspotDamagePercent, 0);
  // ...
}

export class Weapon extends Equipment {
  constructor(
    id: string, name: string, rarity: Rarity, star: number, level: number, calibration: number, mod: Mod | undefined,
    public type: WeaponType,
    public keyword: Keyword,
    public stats: WeaponStats,
    public intrinsicEffects: Effect[]
  ) { super(id, name, rarity, star, level, calibration, mod); }

  override getActiveEffects(loadout: Loadout): Effect[] {
    return [...super.getActiveEffects(loadout), ...this.intrinsicEffects];
  }
}

export class ArmorStats {
  hp = new GenericStat(StatType.DamagePerProjectile, 0); // Using generic for now, might need HPStat
  psiIntensity = new GenericStat(StatType.PsiIntensity, 0); 
}

export abstract class Armor extends Equipment {
  constructor(
    id: string, name: string, rarity: Rarity, star: number, level: number, calibration: number, mod: Mod | undefined,
    public slot: ArmorSlot,
    public stats: ArmorStats
  ) { super(id, name, rarity, star, level, calibration, mod); }
}

export class ArmorSetDefinition {
  constructor(
    public id: string,
    public name: string,
    public bonuses: { requiredPieces: number; effects: Effect[] }[]
  ) {}
}

export class SetArmor extends Armor {
  constructor(
    id: string, name: string, rarity: Rarity, star: number, level: number, calibration: number, mod: Mod | undefined, slot: ArmorSlot, stats: ArmorStats,
    public armorSet: ArmorSetDefinition
  ) { super(id, name, rarity, star, level, calibration, mod, slot, stats); }
}

export class KeyArmor extends Armor {
  constructor(
    id: string, name: string, rarity: Rarity, star: number, level: number, calibration: number, mod: Mod | undefined, slot: ArmorSlot, stats: ArmorStats,
    public intrinsicEffects: Effect[]
  ) { super(id, name, rarity, star, level, calibration, mod, slot, stats); }

  override getActiveEffects(loadout: Loadout): Effect[] {
    return [...super.getActiveEffects(loadout), ...this.intrinsicEffects];
  }
}

export class Loadout {
  weapon?: Weapon;
  helmet?: Armor;
  mask?: Armor;
  top?: Armor;
  gloves?: Armor;
  pants?: Armor;
  boots?: Armor;

  getAllActiveEffects(): Effect[] {
    // loops over equipped pieces, calls getActiveEffects(), and computes Set Bonuses based on SetArmor grouping
    return [];
  }
}
```

### 2.5 Domain Models: Player, EncounterConditions & Damage Types

```typescript
export class PlayerStats {
  private stats: Map<StatType, Stat> = new Map();

  constructor() {
    this.stats.set(StatType.DamagePerProjectile, new GenericStat(StatType.DamagePerProjectile, 0));
    this.stats.set(StatType.FireRate, new GenericStat(StatType.FireRate, 0));
    this.stats.set(StatType.MagazineCapacity, new MagazineCapacityStat(0));
    this.stats.set(StatType.CritRatePercent, new CritRateStat(0));
    this.stats.set(StatType.CritDamagePercent, new GenericStat(StatType.CritDamagePercent, 0));
    this.stats.set(StatType.WeakspotDamagePercent, new GenericStat(StatType.WeakspotDamagePercent, 0));
    this.stats.set(StatType.StatusDamagePercent, new GenericStat(StatType.StatusDamagePercent, 0));
    this.stats.set(StatType.ElementalDamagePercent, new GenericStat(StatType.ElementalDamagePercent, 0));
    this.stats.set(StatType.WeaponDamagePercent, new GenericStat(StatType.WeaponDamagePercent, 0));
    this.stats.set(StatType.KeywordCritRatePercent, new CritRateStat(0)); // Capped at 100
    this.stats.set(StatType.KeywordCritDamagePercent, new GenericStat(StatType.KeywordCritDamagePercent, 0));
    this.stats.set(StatType.KeywordTriggerChancePercent, new CritRateStat(0));
    this.stats.set(StatType.KeywordTriggerHitCount, new GenericStat(StatType.KeywordTriggerHitCount, 0));
    this.stats.set(StatType.DamageBonusNormal, new GenericStat(StatType.DamageBonusNormal, 0));
    this.stats.set(StatType.DamageBonusElite, new GenericStat(StatType.DamageBonusElite, 0));
    this.stats.set(StatType.DamageBonusBoss, new GenericStat(StatType.DamageBonusBoss, 0));
    this.stats.set(StatType.PsiIntensity, new GenericStat(StatType.PsiIntensity, 0));
    this.stats.set(StatType.BurnDamagePercent, new GenericStat(StatType.BurnDamagePercent, 0));
    this.stats.set(StatType.FrostVortexDamagePercent, new GenericStat(StatType.FrostVortexDamagePercent, 0));
    this.stats.set(StatType.PowerSurgeDamagePercent, new GenericStat(StatType.PowerSurgeDamagePercent, 0));
    this.stats.set(StatType.ShrapnelDamagePercent, new GenericStat(StatType.ShrapnelDamagePercent, 0));
    this.stats.set(StatType.UnstableBomberDamagePercent, new GenericStat(StatType.UnstableBomberDamagePercent, 0));
    this.stats.set(StatType.BounceDamagePercent, new GenericStat(StatType.BounceDamagePercent, 0));
    // ... Initialize others
  }

  get(type: StatType): number {
    return this.stats.get(type)?.value || 0;
  }

  add(type: StatType, value: number): void {
    const stat = this.stats.get(type);
    if (stat) {
      stat.add(value);
    } else {
      // Fallback for dynamic/uninitialized stats
      this.stats.set(type, new GenericStat(type, value));
    }
  }
}

export class Player {
  public flags: Map<FlagType, boolean> = new Map();
  
  constructor(
    public loadout: Loadout,
    public stats: PlayerStats,
    public currentHp: number,
    public activeEffects: Effect[] = []
  ) {
    // Initialize flags to false
    Object.values(FlagType).forEach(flag => this.flags.set(flag, false));
  }

  hasFlag(flag: FlagType): boolean {
    return this.flags.get(flag) || false;
  }
  
  setFlag(flag: FlagType, value: boolean): void {
    this.flags.set(flag, value);
  }
}

export interface EncounterConditions {
  enemyType: EnemyType;
  targetDistanceMeters: number;
  playerHpPercent: number;
  isTargetVulnerable: boolean;
  
  // User UI Toggles
  weakspotHitRate: number; // 0 to 1 (e.g. 1.0 = user toggled "Always hit weakspot")
}

// Represents the spectrum of hypothetical damage outcomes for a single event
export interface DamageProfile {
  noCritNoWs: number;
  critNoWs: number;
  noCritWs: number;
  critWs: number;
  expected: number; // The probability-weighted outcome factoring Player Crit Rate, Ws Hit Rate, and boolean Flags
}

export interface ShotDamage {
  bulletDmg: DamageProfile;
  kwProcDmg?: DamageProfile; // Present if the shot triggered a damaging Keyword proc
}
```

---

## 3. The Two-Component Damage Pipeline Specifics

### 3.1 Base Pipeline Abstractions

Both pipelines inherit from a base class that modularizes the multiplicative buckets into clean, separate methods.

```typescript
export abstract class BaseDamagePipeline {
  protected getEnemyMultiplier(player: Player, conditions: EncounterConditions): number {
    let bonus = 0;
    if (conditions.enemyType === EnemyType.Normal) bonus = player.stats.get(StatType.DamageBonusNormal);
    else if (conditions.enemyType === EnemyType.Elite) bonus = player.stats.get(StatType.DamageBonusElite);
    else if (conditions.enemyType === EnemyType.Boss) bonus = player.stats.get(StatType.DamageBonusBoss);
    return 1 + (bonus / 100);
  }

  protected getVulnerabilityMultiplier(player: Player, conditions: EncounterConditions): number {
    return conditions.isTargetVulnerable 
      ? (1 + (player.stats.get(StatType.VulnerabilityPercent) / 100)) 
      : 1.0;
  }

  protected calculateDamageProfile(
    baseDamage: number,
    critRateInput: number,
    critDmgPct: number,
    wsRateInput: number,
    wsDmgPct: number,
    canCrit: boolean,
    canWs: boolean
  ): DamageProfile {
    const critRate = canCrit ? Math.min(critRateInput, 1.0) : 0;
    const wsRate = canWs ? wsRateInput : 0;

    const noCritNoWs = baseDamage;
    const critNoWs = canCrit ? baseDamage * (1 + critDmgPct / 100) : baseDamage;
    const noCritWs = canWs ? baseDamage * (1 + wsDmgPct / 100) : baseDamage;
    
    // Crit + Weakspot: Additive (1 + crit% + ws%) based on current model.
    // If either cannot happen, fallback to the respective single-bucket value.
    const critWs = (canCrit && canWs) 
      ? baseDamage * (1 + (critDmgPct + wsDmgPct) / 100) 
      : (canCrit ? critNoWs : (canWs ? noCritWs : baseDamage));

    const expected = 
      noCritNoWs * (1 - critRate) * (1 - wsRate) +
      critNoWs * critRate * (1 - wsRate) +
      noCritWs * (1 - critRate) * wsRate +
      critWs * critRate * wsRate;

    return { noCritNoWs, critNoWs, noCritWs, critWs, expected };
  }
}
```

### 3.2 PhysicalDamagePipeline Implementation

Focuses exclusively on bullet damage. `StatusDamagePercent` and `ElementalDamagePercent` are excluded.

```typescript
class PhysicalDamagePipeline extends BaseDamagePipeline {
  private getWeaponDamageMultiplier(player: Player): number {
    return 1 + (player.stats.get(StatType.WeaponDamagePercent) / 100);
  }

  calculate(player: Player, conditions: EncounterConditions): DamageProfile {
    const atk = player.stats.get(StatType.DamagePerProjectile);
    const bucketA = this.getWeaponDamageMultiplier(player);
    const bucketB = this.getEnemyMultiplier(player, conditions);
    const bucketD = this.getVulnerabilityMultiplier(player, conditions);

    const baseDamage = atk * bucketA * bucketB * bucketD;

    return this.calculateDamageProfile(
      baseDamage, 
      player.stats.get(StatType.CritRatePercent) / 100, 
      player.stats.get(StatType.CritDamagePercent), 
      conditions.weakspotHitRate, 
      player.stats.get(StatType.WeakspotDamagePercent), 
      true, // Physical always can crit (unless rate is 0)
      !player.hasFlag(FlagType.CannotDealWeakspotDamage)
    );
  }
}
```

### 3.2 KeywordDamagePipeline Implementation

`KeywordDamagePipeline.calculate(player: Player, conditions: EncounterConditions): DamageProfile`
This pipeline calculates damage for procs. It resolves the keyword properties (Physical vs Elemental, Scaling Factor) directly from the domain model.
`KeywordDamagePipeline.calculate(player: Player, conditions: EncounterConditions, keywordFactor: number, isPhysicalKW: boolean): DamageProfile`
This pipeline calculates damage for procs (Burn, Power Surge, Frost Vortex, Shrapnel, Unstable Bomber). Non-damaging keywords bypass this.

**The Base Stat:**
- **Elemental / Status Procs:** Scale off **Psi Intensity**.
- **Physical Procs:** Scale off **Atk** (Weapon Damage).

```typescript
class KeywordDamagePipeline {
  calculate(player: Player, conditions: EncounterConditions): DamageProfile {
    const weapon = player.loadout.weapon;
    const kwData = weapon ? KEYWORD_DATA[weapon.keyword] : undefined;

    if (!weapon || !kwData) {
      return { noCritNoWs: 0, critNoWs: 0, noCritWs: 0, critWs: 0, expected: 0 };
    }

    const { isPhysical, scalingFactor } = kwData;
  calculate(player: Player, conditions: EncounterConditions, keywordFactor: number, isPhysicalKW: boolean): DamageProfile {
    
    // Base Stat determination
    const baseStat = isPhysical 
    const baseStat = isPhysicalKW 
      ? player.stats.get(StatType.DamagePerProjectile) 
      : player.stats.get(StatType.PsiIntensity); 

    const baseDmg = baseStat * scalingFactor;
    const baseDmg = baseStat * keywordFactor;

    // Generalized Multipliers
    const statusDmg = player.stats.get(StatType.StatusDamagePercent);
    const elementalDmg = player.stats.get(StatType.ElementalDamagePercent);
    
    let kwSpecificDmg = 0;
    const keyword = weapon.keyword;
    const keyword = player.loadout.weapon?.keyword;
    if (keyword === Keyword.Burn) kwSpecificDmg = player.stats.get(StatType.BurnDamagePercent);
    if (keyword === Keyword.FrostVortex) kwSpecificDmg = player.stats.get(StatType.FrostVortexDamagePercent);
    if (keyword === Keyword.PowerSurge) kwSpecificDmg = player.stats.get(StatType.PowerSurgeDamagePercent);
    if (keyword === Keyword.Shrapnel) kwSpecificDmg = player.stats.get(StatType.ShrapnelDamagePercent);
    if (keyword === Keyword.UnstableBomber) kwSpecificDmg = player.stats.get(StatType.UnstableBomberDamagePercent);
    if (keyword === Keyword.Bounce) kwSpecificDmg = player.stats.get(StatType.BounceDamagePercent);

    let enemyBonus = 0;
    if (conditions.enemyType === EnemyType.Normal) enemyBonus = player.stats.get(StatType.DamageBonusNormal);
    if (conditions.enemyType === EnemyType.Elite) enemyBonus = player.stats.get(StatType.DamageBonusElite);
    if (conditions.enemyType === EnemyType.Boss) enemyBonus = player.stats.get(StatType.DamageBonusBoss);
    
    const vulnerability = conditions.isTargetVulnerable ? player.stats.get(StatType.VulnerabilityPercent) : 0;

    const multiplier = 
        (1 + statusDmg / 100) 
      * (1 + elementalDmg / 100) 
      * (1 + kwSpecificDmg / 100) 
      * (1 + enemyBonus / 100) 
      * (1 + vulnerability / 100);

    const finalBaseDmg = baseDmg * multiplier;

    // Conditional Crit / Weakspot Bucket for Keywords
    const canCrit = player.hasFlag(FlagType.KeywordCanCrit);
    const canWs = player.hasFlag(FlagType.KeywordCanWeakspot);

    // Keyword uses aggregate of global crit and specific kw crit
    const totalKWCritRate = player.stats.get(StatType.CritRatePercent) + player.stats.get(StatType.KeywordCritRatePercent);
    const kwCritRate = canCrit ? Math.min(totalKWCritRate / 100, 1.0) : 0;
    const wsRate = canWs ? conditions.weakspotHitRate : 0;

    const critDmg = player.stats.get(StatType.CritDamagePercent) + player.stats.get(StatType.KeywordCritDamagePercent);
    const wsDmg = player.stats.get(StatType.WeakspotDamagePercent);

    const noCritNoWs = finalBaseDmg;
    const critNoWs = canCrit ? finalBaseDmg * (1 + critDmg / 100) : finalBaseDmg;
    const noCritWs = canWs ? finalBaseDmg * (1 + wsDmg / 100) : finalBaseDmg;
    const critWs = (canCrit && canWs) ? finalBaseDmg * (1 + (critDmg + wsDmg) / 100) : (canCrit ? critNoWs : (canWs ? noCritWs : finalBaseDmg));

    const expected = 
      noCritNoWs * (1 - kwCritRate) * (1 - wsRate) +
      critNoWs * kwCritRate * (1 - wsRate) +
      noCritWs * (1 - kwCritRate) * wsRate +
      critWs * kwCritRate * wsRate;

    return { noCritNoWs, critNoWs, noCritWs, critWs, expected };
  }
}
```

---

## 4. Core Damage Engine — Event Loop Simulator

```typescript
class DamageEngine {
  player: Player;
  conditions: EncounterConditions;
  physicalPipeline: PhysicalDamagePipeline;
  kwPipeline: KeywordDamagePipeline;

  simulateMagDump(): number {
    let accumulatedExpectedDamage = 0;
    const magSize = this.player.stats.get(StatType.MagazineCapacity); 
    
    for (let bulletsLeft = magSize; bulletsLeft > 0; bulletsLeft--) {
      this.processActiveEffects();
      
      const shotResult = this.simulateShot(bulletsLeft);
      accumulatedExpectedDamage += shotResult.bulletDmg.expected;
      
      if (shotResult.kwProcDmg) {
        const kw = this.player.loadout.weapon?.keyword;
        const procTriggerChance = kw ? kw.getExpectedProcsPerShot(this.player, shotResult.bulletDmg) : 0;
        accumulatedExpectedDamage += (shotResult.kwProcDmg.expected * procTriggerChance);
      }
      
      this.advanceTime();
    }
    return accumulatedExpectedDamage;
  }

  simulateShot(bulletsLeft: number): ShotDamage {
    const bulletDmg = this.physicalPipeline.calculate(this.player, this.conditions);
    
    this.triggerEvent(EventTrigger.OnHit); 
    
    let kwProcDmg: DamageProfile | undefined = undefined;
    
    const kw = this.player.loadout.weapon?.keyword;
    if (kw && kw.scalingFactor > 0) {
        kwProcDmg = this.kwPipeline.calculate(this.player, this.conditions);
    }
    
    return { bulletDmg, kwProcDmg };
  }

  processActiveEffects() {}
  triggerEvent(eventName: EventTrigger) {}
  advanceTime() {}
}
```