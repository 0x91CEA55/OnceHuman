# Phase 0+1: Data Schemas & Core Damage Engine — Low-Level Design

> Companion to the high-level plan at `~/.claude/plans/fuzzy-splashing-sun.md`.
> Sources tagged per Architect Protocol: `[empirical]`, `[agent-output]`, `[training-prior]`, `[user-stated]`.

---

## 1. Reference Implementation Analysis

Source: [lReDragol/OnceHuman_Tools/data/menu/calc/](https://github.com/lReDragol/OnceHuman_Tools/tree/master/data/menu/calc) `[agent-output]`

### 1.1 Physical Damage Pipeline (from `context_module.py::DamageCalculator`)

The reference code applies damage in **5 sequential multiplicative steps**:

```
Step 1: base = damage_per_projectile                                    (from weapon stats)
Step 2: base *= (1 + (weapon_damage_% + status_damage_%) / 100)        (Bucket A: weapon + status)
Step 3: base *= (1 + enemy_type_bonus / 100)                           (Bucket B: vs normal/elite/boss)
Step 4: if crit_roll: base *= (1 + crit_damage_% / 100)               (Bucket C: crit — conditional)
Step 5: if weakspot:  base *= (1 + weakspot_damage_% / 100)           (Bucket D: weakspot — conditional)
```

**Per-shot damage (multi-projectile weapons):**
```
per_shot = per_projectile * projectiles_per_shot
```

### 1.2 Critical Discrepancy: Crit × Weakspot Interaction

| Source | Crit + Weakspot Model | Example (base=100, crit=50%, ws=30%) |
|---|---|---|
| lReDragol code `[agent-output]` | **Multiplicative** — separate buckets | `100 * 1.5 * 1.3 = 195` |
| Gemini community synthesis `[agent-output]` | **Additive** — same bucket | `100 * (1 + 0.5 + 0.3) = 180` |

**Resolution required:** In-game testing on training dummy with known base damage, crit damage, and weakspot damage values. Hit a weakspot with a crit and compare observed damage to both formulas.

**For now:** We implement the **lReDragol multiplicative model** (working code > community synthesis) but flag this as `[unverified]` and build the engine so switching to additive is a one-line change.

### 1.3 Stat Aggregation Flow (from `player.py::Player`)

```
player.base_stats = {}                          // manually set or from defaults

// Weapon equip:
player.stats += weapon.get_stats()              // scaled by star * level * calibration

// Armor equip (per piece):
player.stats += armor_piece.get_stats()         // hp, psi_intensity, pollution_resist

// Mod processing (per equipped mod):
for effect in mod.effects:
    if effect.type == "increase_stat":  stats[stat] += value
    if effect.type == "decrease_stat":  stats[stat] -= value
    if effect.type == "set_flag":       stats[flag] = bool
```

Conditional/event/stack-based effects are NOT applied during static stat aggregation — they're resolved at simulation time.

### 1.4 Missing Stats in DamageCalculator

The following stats appear in mod data but aren't consumed by the reference DamageCalculator:

| Stat | Where It Appears | Probable Bucket |
|---|---|---|
| `attack_percent` | Mods: Most Wanted, Light Cannon, Unbreakable | Likely additive with weapon_damage_% (Bucket A) |
| `vulnerability_percent` | Mods: Cryo Blast, Vulnerability Amplifier | Target debuff — separate bucket (Bucket E) |
| `elemental_damage_percent` | Mods: Elemental Havoc, Elemental Overload | Elemental pipeline only |
| `psi_intensity_damage_percent` | Mod: Blaze Amplifier | Elemental pipeline only |

**Hypothesis `[training-prior]`:** `attack_percent` is probably bundled into Bucket A with `weapon_damage_percent`. The reference code may just not have implemented it separately yet, or it may flow through the mod effect system and land in `weapon_damage_percent`.

---

## 2. Data Schemas

Forked from lReDragol JSON, restructured for our needs.

### 2.1 Weapon Schema

```jsonc
{
  "id": "string",                       // unique key, e.g. "de50_jaws"
  "name": "string",                     // display name
  "type": "enum",                       // pistol | shotgun | smg | assault_rifle | sniper_rifle | crossbow | launcher
  "rarity": "enum",                     // common | rare | epic | legendary
  "blueprint_fragment_type": "string?", // Wanderer | Operator | Beyonder | Stranger | Juggernaut | Huntsman | null
  "keyword": "enum",                    // burn | frost_vortex | power_surge | unstable_bomber | shrapnel | fast_gunner | bulls_eye | fortress_warfare | bounce
  "base_stats": {
    "damage_per_projectile": "number",  // base damage per bullet/pellet
    "projectiles_per_shot": "integer",  // 1 for most, 6+ for shotguns
    "fire_rate": "number",              // rounds per minute
    "magazine_capacity": "integer",
    "crit_rate_percent": "number",      // base crit chance %
    "crit_damage_percent": "number",    // base crit damage bonus %
    "weakspot_damage_percent": "number",// base weakspot bonus %
    "stability": "number",
    "accuracy": "number",
    "range": "number",
    "reload_time_seconds": "number",
    "reload_speed_points": "number"
  },
  "mechanics": {                        // keyword-specific effects
    "description": "string",
    "effects": "Effect[]"               // see §2.5
  }
}
```

**Scaling formula:**
```
final_stat = base_stat * STAR_MULT[star] * LEVEL_MULT[level] * (1 + CALIBRATION_BONUS[calibration])

STAR_MULT   = { 1: 1.0, 2: 1.1, 3: 1.2, 4: 1.3, 5: 1.4, 6: 1.5 }
LEVEL_MULT  = { 1: 1.0, 2: 1.05, 3: 1.10, 4: 1.15, 5: 1.20 }
CALIB_BONUS = { 0: 0.00, 1: 0.02, 2: 0.04, 3: 0.06, 4: 0.08, 5: 0.10, 6: 0.12 }
```

Integer stats (`projectiles_per_shot`, `magazine_capacity`) are `Math.round()`'d after scaling.

### 2.2 Armor Piece Schema

```jsonc
{
  "id": "string",                       // e.g. "lonewolf_hood"
  "name": "string",
  "type": "enum",                       // helmet | mask | top | gloves | pants | boots
  "rarity": "enum",                     // common | rare | epic | legendary
  "set_id": "string?",                  // links to set bonus, e.g. "lonewolf_set"
  "base_stats_by_star_level": {
    // Lookup table: [star][level] -> { hp, psi_intensity, pollution_resist }
    // Sourced from all_armor_stats.json per type per rarity
  }
}
```

**Scaling:** Armor stats come from a pre-computed lookup table (not the `star * level * calibration` formula used for weapons). Each `[star][level]` combo maps to exact hp/psi/pollution values. Calibration applies as a per-stat multiplier on top.

**Calibration for armor:**
```
final_stat = lookup[star][level][stat] * (1 + armor_calibration_bonus[stat][calibration])
```
(Calibration bonus tables are per-stat, not uniform like weapons.)

### 2.3 Mod Schema

```jsonc
{
  "name": "string",
  "slot": "enum",                       // helmet | mask | top | gloves | pants | weapon
  "category": "string?",               // for weapon mods: keyword category (burn, frost_vortex, etc.)
  "description": "string",             // human-readable
  "effects": "Effect[]"                // see §2.5
}
```

### 2.4 Gear Set Schema

```jsonc
{
  "set_id": "string",
  "name": "string",
  "max_items": "integer",              // typically 6
  "bonuses": [
    {
      "required_items": "integer",     // piece count threshold (1, 2, 3, 4)
      "effects": "Effect[]"
    }
  ]
}
```

### 2.5 Unified Effect Schema

All mods, weapon mechanics, and set bonuses use the same effect structure:

```jsonc
// Effect types and their fields:

// --- Static stat modifications ---
{ "type": "increase_stat", "stat": "string|string[]", "value": "number|number[]" }
{ "type": "decrease_stat", "stat": "string|string[]", "value": "number|number[]" }
{ "type": "set_flag", "flag": "string", "value": "boolean" }

// --- Event-triggered effects ---
{
  "type": "on_event",
  "event": "string",                   // hit, crit_hit, hit_weakspot, reload, reload_empty_mag,
                                        // kill, trigger_burn, trigger_power_surge, mag_empty, etc.
  "chance_percent": "number?",          // probability of triggering (default: 100)
  "effects": "Effect[]",               // nested effects to apply
  "duration_seconds": "number?",        // how long the effect lasts
  "max_stacks": "number?",             // stack cap
  "cooldown_seconds": "number?"         // minimum time between triggers
}

// --- Conditional effects ---
{
  "type": "conditional_effect",
  "condition": "string",               // enemy_has_burn, hp > X%, target_is_marked,
                                        // enemies_within_distance, target_hp > X%, etc.
  "effects": "Effect[]"
}

// --- Active-status effects ---
{ "type": "while_active", "status": "string", "effects": "Effect[]" }

// --- Scaling effects ---
{ "type": "per_stack", "stack_source": "string", "effects": "Effect[]" }
{ "type": "per_stat", "stat": "string", "value": "number", "effects": "Effect[]" }
{ "type": "per_bullets_consumed", "bullets": "integer", "effects": "Effect[]" }

// --- Duration/reset modifiers ---
{ "type": "set_duration", "duration_seconds": "number", "max_stacks": "number?" }
{ "type": "reset_on_event", "event": "string" }
```

### 2.6 Build Profile Schema

This is our own — represents a complete saved build:

```jsonc
{
  "id": "string",                       // uuid
  "name": "string",                     // user-assigned name
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "weapon": {
    "id": "string",                     // weapon_list id
    "star": "integer",                  // 1-6
    "level": "integer",                 // 1-5
    "calibration": "integer"            // 0-6
  },
  "armor": {
    "helmet":  { "id": "string", "star": "integer", "level": "integer", "calibration": "integer" },
    "mask":    { "id": "string", "star": "integer", "level": "integer", "calibration": "integer" },
    "top":     { "id": "string", "star": "integer", "level": "integer", "calibration": "integer" },
    "gloves":  { "id": "string", "star": "integer", "level": "integer", "calibration": "integer" },
    "pants":   { "id": "string", "star": "integer", "level": "integer", "calibration": "integer" },
    "boots":   { "id": "string", "star": "integer", "level": "integer", "calibration": "integer" }
  },
  "mods": {
    "helmet": "string?",                // mod name or null
    "mask":   "string?",
    "top":    "string?",
    "gloves": "string?",
    "pants":  "string?",
    "weapon": "string?"
  },
  "conditions": {                       // scenario toggles
    "weakspot_active": "boolean",
    "weakspot_hit_rate": "number",      // 0-100%, for expected value calc
    "enemy_type": "enum",               // normal | elite | boss
    "hp_percent": "number",             // player HP % (for conditional mods)
    "target_distance": "number",        // meters (for distance-based mods)
    "enemies_within_7m": "integer"      // count (for proximity mods)
  }
}
```

### 2.7 Stat Dictionary

All stat keys used across the system, with their units and which calculation bucket they feed:

```
// --- Bucket A: Weapon + Attack + Status ---
weapon_damage_percent          // from mods, weapon keywords
attack_percent                 // from mods (Most Wanted, Light Cannon, etc.)
status_damage_percent          // from mods (Status Enhancement, etc.)

// --- Bucket B: Enemy Type ---
damage_bonus_normal            // vs normal enemies
damage_bonus_elite             // vs elite enemies
damage_bonus_boss              // vs boss enemies

// --- Bucket C: Crit (conditional on crit roll) ---
crit_rate_percent              // probability of crit (from weapon base + mods)
crit_damage_percent            // bonus damage on crit (from weapon base + mods)

// --- Bucket D: Weakspot (conditional on hit location) ---
weakspot_damage_percent        // bonus damage on weakspot hit (from weapon base + mods)

// --- Bucket E: Target Vulnerability (debuff) ---
vulnerability_percent          // from Bull's Eye, Cryo Blast

// --- Elemental Pipeline (separate from physical) ---
elemental_damage_percent       // global elemental bonus
psi_intensity                  // base stat from armor, scales elemental damage
psi_intensity_damage_percent   // modifier on psi intensity

// --- Weapon Mechanics ---
fire_rate                      // RPM (can be modified by fire_rate_percent)
fire_rate_percent              // modifier
magazine_capacity              // integer
magazine_capacity_percent      // modifier
reload_time_seconds            // base reload time
reload_speed_percent           // modifier (reduces reload time)

// --- Keyword-Specific ---
burn_duration_percent           // Burn DoT duration modifier
max_burn_stacks                 // Burn stack cap
power_surge_damage_percent      // Power Surge proc damage modifier
power_surge_trigger_chance_percent
unstable_bomber_damage_percent  // Unstable Bomber proc damage modifier
frost_vortex_damage_percent     // Frost Vortex damage modifier
shrapnel_damage_percent         // Shrapnel damage modifier
bounce_damage_percent           // Bounce ricochet damage modifier
fast_gunner_max_stacks          // Fast Gunner stack cap
```

---

## 3. Core Damage Engine — Deterministic Calculator

### 3.1 Stat Aggregation

Before any damage calculation, aggregate all static stats from the build:

```
function aggregateStats(build, weaponDB, armorDB, modsDB, setsDB):

  stats = {}

  // 1. Weapon base stats (scaled)
  weapon = weaponDB[build.weapon.id]
  for each stat in weapon.base_stats:
    stats[stat] = weapon.base_stats[stat]
                  * STAR_MULT[build.weapon.star]
                  * LEVEL_MULT[build.weapon.level]
                  * (1 + CALIB_BONUS[build.weapon.calibration])
    if stat is integer_stat: stats[stat] = round(stats[stat])

  // 2. Armor stats (per piece)
  for each slot in [helmet, mask, top, gloves, pants, boots]:
    piece = build.armor[slot]
    if piece:
      armorStats = armorDB[piece.id].base_stats_by_star_level[piece.star][piece.level]
      for each stat in armorStats:
        calibBonus = armorCalibrationTable[stat][piece.calibration] or 0
        stats[stat] += round(armorStats[stat] * (1 + calibBonus))

  // 3. Mod flat effects (only static increase/decrease/set_flag)
  for each slot in [helmet, mask, top, gloves, pants, weapon]:
    mod = modsDB[build.mods[slot]]
    if mod:
      for each effect in mod.effects:
        if effect.type == "increase_stat":
          applyStatIncrease(stats, effect.stat, effect.value)
        if effect.type == "decrease_stat":
          applyStatDecrease(stats, effect.stat, effect.value)
        if effect.type == "set_flag":
          stats[effect.flag] = effect.value

  // 4. Gear set bonuses (count pieces, activate thresholds)
  setCounts = countEquippedSetPieces(build.armor, armorDB)
  for each set in setsDB:
    count = setCounts[set.set_id] or 0
    for each bonus in set.bonuses:
      if count >= bonus.required_items:
        for each effect in bonus.effects:
          if effect is static: applyStatEffect(stats, effect)

  // 5. Conditional mod effects (based on build.conditions)
  for each mod with conditional_effects:
    if condition matches build.conditions:
      apply effects to stats

  return stats
```

### 3.2 Physical Damage Per Projectile

```
function physicalDamagePerProjectile(stats, isCrit, isWeakspot):

  base = stats.damage_per_projectile

  // Bucket A: Weapon + Attack + Status
  bucketA = 1 + (stats.weapon_damage_percent
               + stats.attack_percent
               + stats.status_damage_percent) / 100

  // Bucket B: Enemy Type
  enemyBonus = stats[`damage_bonus_${enemyType}`] or 0
  bucketB = 1 + enemyBonus / 100

  // Bucket C: Crit (conditional)
  bucketC = 1
  if isCrit:
    bucketC = 1 + stats.crit_damage_percent / 100

  // Bucket D: Weakspot (conditional)
  bucketD = 1
  if isWeakspot:
    // UNVERIFIED: lReDragol uses multiplicative, Gemini says additive with crit
    // Implementing multiplicative (separate bucket) per reference code
    bucketD = 1 + stats.weakspot_damage_percent / 100

  // Bucket E: Vulnerability (target debuff)
  bucketE = 1 + stats.vulnerability_percent / 100

  return base * bucketA * bucketB * bucketC * bucketD * bucketE
```

### 3.3 Physical Damage Per Shot

```
function physicalDamagePerShot(stats, isCrit, isWeakspot):
  perProjectile = physicalDamagePerProjectile(stats, isCrit, isWeakspot)
  return perProjectile * stats.projectiles_per_shot
```

### 3.4 Expected Physical Damage Per Shot

Probability-weighted average over crit and weakspot scenarios:

```
function expectedDamagePerShot(stats, conditions):

  cc = stats.crit_rate_percent / 100          // crit chance as decimal
  wsRate = conditions.weakspot_hit_rate / 100  // weakspot hit rate as decimal (0 if not targeting weakspot)

  // 4 scenarios weighted by joint probability:
  //   (no crit, no ws), (crit, no ws), (no crit, ws), (crit, ws)

  dmg_noCrit_noWS = physicalDamagePerShot(stats, false, false)
  dmg_crit_noWS   = physicalDamagePerShot(stats, true,  false)
  dmg_noCrit_ws   = physicalDamagePerShot(stats, false, true)
  dmg_crit_ws     = physicalDamagePerShot(stats, true,  true)

  expected = dmg_noCrit_noWS * (1 - cc) * (1 - wsRate)
           + dmg_crit_noWS   * cc       * (1 - wsRate)
           + dmg_noCrit_ws   * (1 - cc) * wsRate
           + dmg_crit_ws     * cc       * wsRate

  return expected
```

**Why 4 scenarios, not 2?** Because under the multiplicative model (lReDragol), `crit + weakspot` is not a simple sum. The cross-term matters:
```
  crit_ws = base * bucketA * bucketB * (1 + critDmg%) * (1 + wsDmg%) * bucketE
```
This is different from `noCrit_ws + crit_noWS - noCrit_noWS`.

Under the additive model (Gemini), crit and ws would be in the same bucket and the 4-scenario approach would still be correct — it just wouldn't matter since `(1 + crit + ws) == (1 + crit) * (1 + ws) - crit*ws` would be a different relationship.

**The 4-scenario approach is model-agnostic** and works correctly regardless of which crit×ws model turns out to be correct.

### 3.5 DPS Formulas

```
// Effective fire rate (after modifiers)
effectiveFireRate = stats.fire_rate * (1 + stats.fire_rate_percent / 100)
shotsPerSecond = effectiveFireRate / 60

// Effective magazine (after modifiers)
effectiveMagSize = round(stats.magazine_capacity * (1 + stats.magazine_capacity_percent / 100))

// Effective reload time (after modifiers — reload_speed reduces time)
effectiveReloadTime = stats.reload_time_seconds * (1 - stats.reload_speed_percent / 100)
// (Clamped to minimum, e.g., 0.5s)

// --- Expected DPS (infinite ammo, no reloads) ---
expectedDPS = expectedDamagePerShot(stats, conditions) * shotsPerSecond

// --- Burst DPS (one magazine, no reload) ---
timeToEmpty = effectiveMagSize / shotsPerSecond
burstDPS = expectedDamagePerShot(stats, conditions) * effectiveMagSize / timeToEmpty
// Note: burstDPS == expectedDPS when fire rate is constant (no fire_rate_percent_first_half_mag etc.)

// --- Sustained DPS (N magazines with reloads) ---
// Default N = 3 but configurable
N = 3
totalDamage = expectedDamagePerShot(stats, conditions) * effectiveMagSize * N
totalTime = N * timeToEmpty + (N - 1) * effectiveReloadTime
// Note: (N-1) reloads, not N — you don't reload after the last mag
sustainedDPS = totalDamage / totalTime
```

**Bug in existing `src/index.html`:** Uses `N * reloadTime` instead of `(N-1) * reloadTime`. After 3 mags you do NOT reload a 4th time. The reference formula should use `N-1` reloads.

**Second bug (previously identified):** Burst/sustained DPS use `damagePerShot` with full crit bonus instead of `expectedDamagePerShot`.

### 3.6 Stat Modifier Application Order

Some mods modify fire_rate, magazine_capacity, or reload_speed. These must be applied BEFORE DPS calculation:

```
1. Aggregate base stats (§3.1)
2. Apply static mod effects (increase/decrease/set_flag)
3. Evaluate conditional mod effects based on build.conditions
4. Compute derived stats:
   - effectiveFireRate
   - effectiveMagSize
   - effectiveReloadTime
   - total crit_rate (weapon base + mod bonuses, capped at 100)
   - total crit_damage (weapon base + mod bonuses)
   - total weakspot_damage (weapon base + mod bonuses)
5. Compute damage per projectile (§3.2)
6. Compute expected DPS (§3.4 + §3.5)
```

---

## 4. Elemental Damage Pipeline (Stub — Phase 4)

Elemental/status damage uses a completely different base stat (Psi Intensity) and separate multiplier buckets. Detailed in Phase 4 low-level design, but key formula structure for reference:

```
elementalDmgPerTick = (totalPsiIntensity * keywordPercent / 100)
                    * (1 + elemental_damage_percent / 100)
                    * (1 + status_damage_percent / 100)
                    * (1 + specific_keyword_damage_percent / 100)
                    * (1 + damage_vs_enemy_type / 100)
```

Where `totalPsiIntensity = sum(armor_piece.psi_intensity for each equipped piece)`.

---

## 5. Unresolved Questions & Validation Tasks

### Must verify in-game:

| # | Question | Test Method |
|---|---|---|
| 1 | Is crit × weakspot multiplicative or additive? | Hit training dummy on weakspot with crit. Compare observed damage to both formulas. |
| 2 | Does `attack_percent` stack additively with `weapon_damage_percent`? | Equip mod with attack_% bonus, check if it lands in same bucket. |
| 3 | Is `vulnerability_percent` a separate multiplicative bucket? | Apply Bull's Eye + Vulnerability Amplifier, measure damage increase. |
| 4 | Does `status_damage_percent` apply to physical bullet damage? | lReDragol code adds it to Bucket A for physical damage — verify this isn't a bug. |
| 5 | Sustained DPS: N reloads or N-1 reloads? | This is a modeling choice, not a game mechanic. N-1 is more accurate for "damage during N mags". |
| 6 | Weapon scaling: do ALL stats scale, or only damage? | lReDragol scales everything (fire rate, mag size, etc.) — verify in-game. |

### Design decisions pending:

| # | Decision | Current Default | Alternative |
|---|---|---|---|
| 1 | Crit × Weakspot model | Multiplicative (lReDragol) | Additive (Gemini community) |
| 2 | status_damage_% in physical pipeline | Yes (lReDragol) | No — elemental only |
| 3 | Sustained DPS reload count | N-1 (no reload after last mag) | N (always reload) |
| 4 | Weakspot as toggle vs hit-rate | Both — toggle for simple, hit-rate % for expected value | Toggle only |
