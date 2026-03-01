# OnceHuman Simulator — High-Level Design

## Problem Statement

Once Human (NetEase) lacks robust community tooling for theorycrafting weapon builds and comparing DPS across loadouts. The goal of this project is to build a **database-backed DPS simulator** that models the full damage pipeline — physical and elemental — under realistic combat conditions including weapon keywords, mod effects, gear set bonuses, and proc/stack mechanics.

The tool should serve as both a **deterministic calculator** (expected-value DPS for quick comparisons) and an **event-driven simulator** (Monte Carlo for proc-heavy builds where buff uptime and RNG matter).

**Constraint:** Single HTML file per deliverable, no build tooling or bundling.

---

## Game Context: Once Human Combat & Damage System

### Weapon Structure

Each weapon is defined by:
- **Type:** pistol, shotgun, SMG, assault rifle, sniper rifle (+ possibly crossbow, launcher)
- **Rarity:** common, rare, epic, legendary
- **Base stats:** damage per projectile, projectiles per shot, fire rate (RPM), magazine capacity, crit rate %, crit damage %, weakspot damage %, stability, accuracy, range, reload time, reload speed
- **Keyword:** one of 9 combat mechanics (see below)
- **Blueprint fragment type:** Wanderer, Operator, Beyonder, Stranger, Juggernaut, Huntsman

Weapons scale via three axes:
```
Star level:  1→×1.0  2→×1.1  3→×1.2  4→×1.3  5→×1.4  6→×1.5
Char level:  1→×1.0  2→×1.05 3→×1.10 4→×1.15 5→×1.20
Calibration: 0→+0%   1→+2%   2→+4%   3→+6%   4→+8%   5→+10%  6→+12%

Final stat = base * star_mult * level_mult * (1 + calibration_bonus)
```

### The Keyword System

Each weapon has exactly one keyword — its core combat identity. Keywords fall into three categories:

**Elemental keywords** (damage scales from Psi Intensity):

| Keyword | Element | Behavior |
|---|---|---|
| Burn | Blaze (Fire) | Stackable DoT with max stacks and duration |
| Frost Vortex | Frost (Ice) | AoE damage zone, scales with duration and enemy count |
| Power Surge | Shock (Lightning) | Burst proc, can spread to nearby enemies |
| Unstable Bomber | Blast (Explosive) | Explosion proc on hit |

**Physical keywords** (damage scales from weapon stats):

| Keyword | Behavior |
|---|---|
| Shrapnel | Fragment projectiles with weakspot targeting |
| Bounce | Ricochet hits between targets |

**Utility keywords** (provide buffs/debuffs):

| Keyword | Behavior |
|---|---|
| Fast Gunner | Stacking fire rate buff |
| The Bull's Eye | Mark target + vulnerability debuff |
| Fortress Warfare | Stationary zone granting attack buff |

### Damage Formula

```js
// PHYSICAL ONLY MULTIPLIERS AND BASE DAMAGE
AttackDamageBonusMultiplier = (1 + AttackDamageBonusPercent / 100)
WeaponDamageBonusMultiplier = (1 + WeaponDamageBonusPercent / 100)
CritOnlyDamageBonusMultiplier = (1 + CritOnlyDamageBonusPercent / 100)
WeakspotOnlyDamageBonusMultiplier = (1 + WeakspotOnlyDamageBonusPercent / 100)
CritWeakspotDamageBonusMultiplier = (1 + (CritDamageBonusPercent + WeakspotDamageBonusPercent) / 100)

// KEYWORD-ONLY MULTIPLIERS (BOTH ELEMENTAL/STATUS AND PHYSICAL KEYWORDS)
KeywordDamageBonusMultiplier = (1 + KeywordDamageBonusPercent / 100)
KeywordCritOnlyDamageBonusMultiplier = (1 + KeywordCritOnlyDamageBonusPercent / 100)
KeywordWeakspotOnlyDamageBonusMultiplier = (1 + KeywordWeakspotOnlyDamageBonusPercent / 100)
KeywordCritWeakspotDamageBonusMultiplier = (1 + (KeywordCritOnlyDamageBonusPercent + KeywordWeakspotOnlyDamageBonusPercent) / 100)
// ELEMENTAL/STATUS KEYWORD ONLY MULTIPLIERS
ElementalDamageBonusMultiplier = (1 + ElementalDamageBonusPercent / 100)
StatusDamageBonusMultiplier = (1 + StatusDamageBonusPercent / 100)
// PHYSICAL KEYWORD ONLY MULTIPLIERS (none???)
AttackDamageBonusMultiplier = // <same as physical only>
WeaponDamageBonusMultiplier = // <same as physical only>
CritOnlyDamageBonusMultiplier = //  are these present in PHYSICAL KEYWORD multipliers or do they just use the Keyword* variants only?
WeakspotOnlyDamageBonusMultiplier = // are these present in PHYSICAL KEYWORD multipliers or do they just use the Keyword* variants only?

// COMMON ACROSS ALL
EnemyTypeDamageBonusMultiplier = (1 + EnemyTypeDamageBonusPercent / 100)
VulnerableEnemyDamageBonusMultiplier = (1 + VulnerableEnemyDamageBonusPercent / 100)
```

### Damage Formula — Physical

```js
BasePhysicalDamage = BaseWeaponDamage 
  * AttackDamageBonusMultiplier 
  * WeaponDamageBonusMultiplier  // unsure if AttackDamageBonusPercent + WeaponDamageBonusMultiplier are additive within same bucket or multiplicative across

PerProjectilePhysicalDamage = BasePhysicalDamage
  * CritWeakspotDamageBonusMultiplier // or CriOnlyDamageBonusMultiplier or WeakspotOnlyDamageBonusMultiplier
  * EnemyTypeDamageBonusMultiplier
  * VulnerableEnemyDamageBonusMultiplier
  * ...

PerShotPhysicalDamage = PerProjectilePhysicalDamage * ProjectilesPerShot
```

### Damage Formula — Keyword

#### Elemental/Status Damage Keywords

```js
BaseElementalKeywordDamage = [(KeywordFactorPercent / 100) * PsiIntensity]
  * ElementalDamageBonusMultiplier
  * StatusDamageBonusMultiplier

PerProcTickElementalDamage = BaseElementalKeywordDamage
  * KeywordCritWeakspotDamageBonusMultiplier // or KeywordCritOnlyDamageBonusMultiplier or KeywordWeakspotOnlyDamageBonusMultiplier
  * KeywordDamageBonusMultiplier
  * EnemyTypeDamageBonusMultiplier
  * VulnerableEnemyDamageBonusMultiplier // unsure about this one for kw procs or if its accounted for only in physical damage value (e.g. BullsEye add vulnerability, but does the procs damage exist or is it a KeywordFactorPercent of 0 effectively under the hood?) 
  * ... // do these need to be accounted via special mechanics mostly for non-direct damaging effect like fire rate (FastGunner) and Bounce (very complex since it ricochets to other enemies but also possibly the same target and highly mod dependent in mechanic). I'm thinking we should modelize our domain around whether keywords are Elemental or Physical or Utility or something else? Do we simply capture the ensemble of interactions via Effect[] for each weapon and only rely on our Keyword data model for the determination of BaseDamage to use and KeywordFactorPercent? Or should we go more OOP specific and have each keyword subclass define their own calculate variant that carefully selects the various multiplier buckets conditionally and very dedicatedly while also accounting for complex loadout /player state dependencies like mods, bufffs, etc?
```

Psi Intensity is aggregated from armor pieces and scales by rarity, star level, and character level.
All other stats are aggregated from across ALL equipments (weapon, armor, mods) and also scale by similar dimensions (but no exactly the same).

#### Physical Damage Keywords

Physical KW procs use similar formula:

```js
BasePhysicalKeywordDamage = [(KeywordFactorPercent / 100) * BaseWeaponDamage]
  * AttackDamageBonusMultiplier 
  * WeaponDamageBonusMultiplier
  = (KeywordFactorPercent / 100) * BasePhysicalDamage // i think?? confirm via websearch?


PerProcTickPhysicalDamage = BasePhysicalKeywordDamage
  * KeywordCritWeakspotDamageBonusMultiplier // or KeywordCritOnlyDamageBonusMultiplier or KeywordWeakspotOnlyDamageBonusMultiplier
  * KeywordDamageBonusMultiplier
  * EnemyTypeDamageBonusMultiplier
  * VulnerableEnemyDamageBonusMultiplier // unsure about this one for kw procs or if its accounted for only in physical damage value (e.g. BullsEye add vulnerability, but does the procs damage exist or is it a KeywordFactorPercent of 0 effectively under the hood?)
  * ... // do these need to be accounted via special mechanics mostly for non-direct damaging effect like fire rate (FastGunner) and Bounce (very complex since it ricochets to other enemies but also possibly the same target and highly mod dependent in mechanic). I'm thinking we should modelize our domain around whether keywords are Elemental or Physical or Utility or something else? Do we simply capture the ensemble of interactions via Effect[] for each weapon and only rely on our Keyword data model for the determination of BaseDamage to use and KeywordFactorPercent? Or should we go more OOP specific and have each keyword subclass define their own calculate variant that carefully selects the various multiplier buckets conditionally and very dedicatedly while also accounting for complex loadout /player state dependencies like mods, bufffs, etc?
```
### DPS Formulas

> NOTE: Please update this section to use consistent semantic naming from formula sections that use clean PascalCase and properly suffix Percent to designate a percent and the bonus concept and a multiplier. Also take care of being more specific like 'damage_per_shot' should be what, the PerShotPhysicalDamage??

```
Expected DPS    = E[damage_per_shot] * effective_fire_rate / 60
Burst DPS       = E[damage_per_shot] * mag_size / time_to_empty_mag
Sustained DPS   = E[damage_per_shot] * mag_size * N / (N * time_to_empty + (N-1) * reload_time)
```

Where `E[damage_per_shot]` is the probability-weighted average across 4 scenarios: (no crit, no weakspot), (crit, no weakspot), (no crit, weakspot), (crit, weakspot).

### Armor System

6 slots: helmet, mask, top, gloves, pants, boots. Each provides HP, Psi Intensity, and Pollution Resist — scaling by rarity and star/level via lookup tables. Calibration applies per-stat.

### Mod System

7 mod slots (one per armor piece + one weapon mod). ~98 total mods across:
- **Helmet (8):** Offensive stat buffs (crit, elemental, weakspot)
- **Mask (19):** Keyword-specific damage boosts
- **Top (9):** Defensive (damage reduction, shields)
- **Gloves (8):** Flat stat boosts
- **Pants (12):** Conditional offensive buffs
- **Weapon (42):** Keyword-specific enhancements (~4 per keyword)

Mods use a unified effect system with types: `increase_stat`, `decrease_stat`, `set_flag`, `on_event`, `conditional_effect`, `while_active`, `per_stack`, `per_stat`, `per_bullets_consumed`.

Effects can have durations, stack caps, cooldowns, and reset conditions.

### Gear Set Bonuses

Armor sets grant scaling bonuses at piece-count thresholds (1pc, 2pc, 3pc, 4pc). Bonuses use the same effect system as mods — can include flat stats, event-triggered stacking buffs, and conditional effects.

---

## Requirements

| Area | Decision |
|---|---|
| **Mechanics scope** | Physical + Elemental damage, Status/DoT/Procs. Armor/defense and range falloff deferred. |
| **Stat sheet inputs** | Weapon stats, Psi Intensity + elemental, gear/mods/perks, consumables (v2) |
| **Simulation type** | Deterministic (expected value) default + event-driven Monte Carlo (Level 2: stacking/durations/cooldowns) |
| **Comparison model** | Build profiles — save/load N builds, compare from a list |
| **UI direction** | Data-dense dashboard (tables, charts, DPS graphs), responsive for mobile |
| **Data management** | Hybrid — forked preset database + manual override/custom entry |
| **Persistence** | localStorage auto-save + JSON export/import for sharing |
| **Consumables** | Deferred to v2 |

---

## Data Source

Forked from [lReDragol/OnceHuman_Tools](https://github.com/lReDragol/OnceHuman_Tools/tree/master/data/menu/calc/bd_json) — restructured to fit our schema. Contains:
- ~40 weapons with full stats and keyword mechanics
- ~98 mods across 6 slots with structured effect data
- Armor stat lookup tables by rarity/star/level
- Gear set definitions with tiered bonuses

### Useful Reference URLs (see local version downloaded in [/Simulator/src/data/raw/](/Simulator/src/data/raw/))
- https://github.com/lReDragol/OnceHuman_Tools/tree/master/data/menu/calc/bd_json/
- https://github.com/lReDragol/OnceHuman_Tools/blob/master/data/menu/calc/bd_json/all_armor_stats.json
- https://github.com/lReDragol/OnceHuman_Tools/blob/master/data/menu/calc/bd_json/armor_sets.json
- https://github.com/lReDragol/OnceHuman_Tools/blob/master/data/menu/calc/bd_json/items_and_sets.json
- https://github.com/lReDragol/OnceHuman_Tools/blob/master/data/menu/calc/bd_json/mods_config.json
- https://github.com/lReDragol/OnceHuman_Tools/blob/master/data/menu/calc/bd_json/weapon_list.json
- https://github.com/lReDragol/OnceHuman_Tools/blob/master/data/menu/calc/config_manager.py
- https://github.com/lReDragol/OnceHuman_Tools/blob/master/data/menu/calc/context_module.py
- https://github.com/lReDragol/OnceHuman_Tools/blob/master/data/menu/calc/mechanics.py
- https://github.com/lReDragol/OnceHuman_Tools/blob/master/data/menu/calc/player.py

---

## Phased Implementation Plan

> NOTE: Subject to change. Not strictly followed. Many initial plan phases diverged considerably. Here only for historical context.

### Phase 0: Data Prep
- Fork lReDragol JSON data into `Simulator/DataEngine/`
- Restructure to fit our schemas (weapon, armor, mod, set)
- Add `keyword` field to weapons (extracted from mechanics descriptions)

### Phase 1: Core Damage Engine (Deterministic)
- Multiplier bucket system: additive within, multiplicative across
- Weapon scaling (star x level x calibration)
- Per-shot physical damage with all buckets
- Expected DPS, Burst DPS, Sustained DPS with correct crit-chance weighting
- Shotgun multi-projectile support
- Validation against in-game damage numbers

### Phase 2: Build Profile System + Basic UI
- Build profile data model (weapon + armor + mods + conditions)
- localStorage save/load + JSON export/import
- Dashboard layout: selectors, stat summary, DPS output

### Phase 3: Mod Effect Engine
- Static effect processor (increase/decrease/set_flag)
- Conditional effects (HP thresholds, distance, etc.)
- Gear set bonus processor
- Wire into damage pipeline

### Phase 4: Elemental/Status Damage
- Psi Intensity aggregation from armor
- Elemental damage formula per keyword
- Combined physical + elemental DPS

### Phase 5: Event-Driven Simulation (Level 2)
- Tick-based combat loop
- Shot events, crit rolls, proc triggers
- Buff/stack management with durations and cooldowns
- Magazine cycling and reload timing
- DPS distribution output (min/avg/max)

### Phase 6: Build Comparison + Visualization
- N-build comparison table
- DPS bar charts, stat radar charts
- Timeline chart: DPS over time (burst → sustain curve)

### Phase 7: Polish + Future (Level 3 Sim)
- Shot-by-shot sim with kill triggers, multi-target
- Consumable/food/drink system
- Mobile layout refinement
- Performance optimization

---
