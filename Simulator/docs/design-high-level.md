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

### Damage Formula — Physical

Physical damage is computed through **multiplicative buckets** (additive within each bucket, multiplicative across):

```
Per-projectile damage = base_damage
  * (1 + weapon_damage_% + attack_% + status_damage_%) / 100     [Bucket A]
  * (1 + enemy_type_bonus / 100)                                  [Bucket B]
  * (1 + crit_damage_% / 100)          [Bucket C — if crit]
  * (1 + weakspot_damage_% / 100)      [Bucket D — if weakspot]
  * (1 + vulnerability_% / 100)        [Bucket E — target debuff]

Per-shot damage = per_projectile * projectiles_per_shot
```

> **Open question:** Whether Buckets C and D (crit + weakspot) are truly separate multiplicative buckets or additive in the same bucket requires in-game validation. Reference implementation (lReDragol) uses multiplicative; community consensus (Gemini research) claims additive. Engine is designed to support either model.

### Damage Formula — Elemental/Status

Elemental procs use a completely separate base stat:

```
Elemental damage per tick/proc = (Psi_Intensity * keyword_percent / 100)
  * (1 + elemental_damage_% / 100)
  * (1 + status_damage_% / 100)
  * (1 + specific_keyword_damage_% / 100)
  * (1 + damage_vs_enemy_type_% / 100)
```

Psi Intensity is aggregated from armor pieces and scales by rarity, star level, and character level.

### DPS Formulas

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

---

## Phased Implementation Plan

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

## Low-Level Design Documents

| Phase | Document | Status |
|---|---|---|
| 0+1 | [phase-0-1-data-engine.md](phase-0-1-data-engine.md) | Draft — pending review |
| 2 | Build profiles + UI | Not started |
| 3 | Mod effect engine | Not started |
| 4 | Elemental damage | Not started |
| 5 | Event-driven simulation | Not started |
