# Once Human endgame meta: mechanics, formulas, and optimization breakpoints

The current Once Human endgame meta revolves around **weapon-deviation-mod synergies** that exploit specific damage type interactions, with the January 21, 2026 mod revamp poised to restructure optimization priorities entirely. The single most important mechanical understanding for endgame is that **Forsaken Giant is completely immune to all elemental/status damage**—making physical and weapon-damage builds mandatory for this content.   Fast Gunner builds currently deliver the highest sustained single-target DPS (**65–100k+**), while Shrapnel and Bull’s Eye builds offer versatility across boss and mob content. Several widely-circulated claims in EN communities—notably the “PW90 immunity bypass” mechanic—are demonstrably false or unverifiable.

**Critical research limitation**: The Chinese search term “萤火突击” refers to a different game entirely (NetEase’s tactical extraction shooter Lost Light/Firefly Strike). Once Human’s Chinese name is “曙光先遣队,” and CN-specific theorycrafting documentation for this game is limited compared to EN sources from Game8, OhDex, and official dev blogs.

-----

## Weapon archetypes demand understanding damage type interactions

The distinction between **weapon damage**, **elemental damage**, and **status damage** is mechanically fundamental. All status effects (Burn, Frost Vortex, Power Surge) share critical limitations: they **cannot crit**, **cannot hit weakspots**, and scale with **Psi Intensity** rather than weapon damage. However, status effects **ignore distance decay**—a significant advantage in certain scenarios. 

### SOCR The Last Valor dominates Manibus through multi-hitbox exploitation

The Shrapnel mechanic explains SOCR’s effectiveness against multi-part bosses. Each bullet has a **4% base chance** to trigger Shrapnel, with critical hits counting as **two hits** toward the trigger threshold.   When Shrapnel activates, it deals **50–60% Attack as Weapon DMG to a different random unhit body part**. The documented formula:

```
Shrapnel DMG = 60% × (1 + Shrapnel DMG Factor Bonus) × (1 + Shrapnel Final DMG Bonus)
```

Shrapnel damage **can crit**, **can strike weakspots**, and decays with distance.  Against Manibus—which has multiple targetable tentacle hitboxes—each Shrapnel proc potentially damages multiple body parts. SOCR’s **~515 RPM fire rate** ensures consistent proc frequency despite the low individual trigger chance, yielding sustained DPS of **80k–180k** depending on gear optimization. The Beret armor piece increases parts hit by Shrapnel by +1, directly multiplying damage output.  

### Boom Boom burn mechanics create chain-reaction damage loops

KVD Boom Boom’s power comes from its explosion-on-kill mechanic combined with Pyro Dino deviation synergy. The burn damage formula:

```
Burn DMG = 12% × Psi Intensity × (1 + Burn DMG Factor Bonus) × (1 + Burn Final DMG Bonus)
```

Burn ticks every **0.5 seconds for 6 seconds**, stacking up to **5 times**  (8 with Flame Resonance mod).  The weapon has an **18% chance** to trigger Burn on hit.  Killing a burning target triggers a **300% Psi Intensity AoE Blaze DMG explosion**  with a 2-second cooldown, which applies 1 stack of Burn to all nearby enemies— creating self-perpetuating chain reactions.

**Pyro Dino amplification** is the hidden multiplier. The deviation increases Blaze DMG received by targets by up to **+39.2%** and triggers additional explosive eruptions when attacking already-burning enemies.  Community testing reports DPS increasing from ~40k without Pyro Dino to ~120k with proper rotation—a **3× multiplier**.  The optimal rotation: apply Bull’s Eye mark → deploy Pyro Dino → wait for Dino attack (activates damage amplification) → fire Boom Boom for potential one-shot on elites.  

### MPS5 Primal Rage achieves deviant-independent physical damage

Primal Rage’s effectiveness without deviation dependency stems from its self-buffing Fast Gunner mechanic. Each hit has a **35% chance** to gain a Fast Gunner stack, providing **+1% Fire Rate and +1% Attack** for 2 seconds. With a **750 RPM fire rate**, stacks accumulate rapidly. 

The unique life-drain mechanic adds another damage layer: when the magazine reaches 1 bullet, the weapon consumes **1% max HP** to continue firing. Each hit restores HP equal to **0.1% × Fast Gunner stacks**. Every **1% HP change grants 1% Weapon DMG boost** (capped at 80%, each stack independent).  This pure weapon damage scaling bypasses elemental immunities entirely, making Primal Rage effective against **status-immune bosses** where Burn, Frost, and Shock builds fail.

### AWS.338 Bullseye debuff mechanics explained

The Bull’s Eye effect has a **70% chance** to proc on weakspot hits,   with **100% guaranteed application** on the first hit after weapon switch.  The effect marks targets with a visible blue outline, inflicting **Vulnerability +8%** for 12 seconds.  With the Vulnerability Amplifier mod, this doubles to **+16% vulnerability**.  

Passive stacking compounds the damage: each weakspot hit grants **+15% Weakspot DMG** for 10 seconds (stacking 3–4 times for 45–60% total). Kills via weakspot grant **+15% Attack** for 20 seconds.  The Seasoned Hunter Boots create a “perpetual weakspot” loop—after triggering Bull’s Eye, the **next shot counts as a weakspot hit** even if you miss, while also providing **+30% Weakspot DMG** against marked targets.  Full buff rotation enables **100k+ headshot damage**.

-----

## The PW90 “immunity bypass” claim is demonstrably false

**There is no weapon called “PW90”** in Once Human. The weapon referenced is the **PDW90** (also called P90 in-game), an SMG with a Hunter’s Mark mechanic (20% chance on hit) providing +20% Crit Rate against marked enemies and auto-magazine-reload when marked enemies take AoE damage. 

**No documented mechanism shows PDW90 specifically “bypassing immunity.”** The confusion likely stems from general advice to use non-elemental builds against Forsaken Giant, which is immune to all status effects. The boss fight is mechanics-dependent rather than DPS-dependent—requiring players to shoot specific glowing red weak points during vulnerability windows.

-----

## Enemy resistance profiles reveal why weapon choice matters

### Forsaken Giant demands pure weapon damage builds

The Forsaken Giant (Mensdevoran) is **immune to ALL elemental status damage**: Burn, Frost, Frost Vortex, Shock, Power Surge, and Unstable Bomber effects deal **zero damage**.  Only direct weapon damage, Shrapnel, Bullseye, and Fast Gunner effects function. 

The boss features **heavy damage gating**—taking only ~1% damage outside vulnerability windows.   Damage windows require shooting specific glowing red weak points that cycle through phases:

- **Phase 1**: Shoulders (slam attacks), palms (sweep attacks), head (crying phase—hands cover face), stomach (vomiting phase—use Giant Flower Buds to stun and expose) 
- **Phase 2**: Platform destruction begins; summons Arbiters, Gnawers, Starspawns when HP drops by 1/3 
- **Phase 3**: AoE laser beams; grab attacks (stand at platform edge to avoid) 

Arbiter mobs are **initially invincible**—lure them to the Giant’s hand slam to break their shields.

### Shadow Hound requires phase-specific targeting

Shadow Hound (Rabizex) has **no elemental immunities** but features immunity phases requiring specific mechanics.  The boss has **no weak spot initially**—players must deplete 2 health bars before the inner head (weak spot) is exposed.

After extended fights, the boss enters an **invulnerable state** followed by **massive damage resistance**. To remove this: shoot the **two mouths/red spots on shoulders**  and destroy Duskorbs that spawn during this phase.

**Critical DPS check**: Shadow Hound leaps into the air and becomes a swirling black mass with a **white bar below HP**. Players must deplete this bar by shooting or the boss unleashes a **one-shot AoE wipe**. Success causes the boss to fall helplessly, providing a free damage window. 

### Why Frost Vortex underperforms against Shadow Hound

Frost Vortex builds (Abyss Glance) underperform against Shadow Hound for three reasons: the vortex **cannot hit weakspots** by design,  boss mobility moves it out of vortex range, and single-target DPS is inferior to Bullseye/Shrapnel builds. The weapon excels at **mob control and PvP** where AoE lockdown matters more than single-target burst. 

### Lunarspawns can be exploited through stat copying

Lunarspawns are **Morphic Deviants** that copy player stats—including gear, items, and Deviations.  The META counter: **switch to weak gear without mods before engaging**, let it copy weak stats, then re-equip good gear and fight. The Lonewolf Whisper deviation can stun them, creating damage windows. 

-----

## Post-December 2025 deviation overhaul introduced dual-skill combat

The Version 2.2.4 update (December 23, 2025) fundamentally changed combat deviations with a **two-skill active system**: 

**Battle Skills** enter cooldown after use, with unique effects per deviation:

- Zapamander: Lightning-fast sprint state
- By-the-Wind: One-way wind wall blocking bullets

**Ultimates** activate when Deviation Power reaches maximum, consuming energy based on effects:

- Mini Wonder: Morphs into a black hole, pulling all enemies inward
- Mitsuko: Sustained auto-tracking attacks
- Pyro Dino: Mind-controlled Pyro Cannon

**Critical mechanic**: Switching equipped Deviations **clears Deviation Power and resets Battle Skill cooldowns**.

### Trait mathematical analysis reveals Upper Hand as a trap

Power-boosting traits follow clear mathematical hierarchies. Assuming a base deviation power of ~100:

|Trait          |Effect                           |Result at Base 100|
|---------------|---------------------------------|------------------|
|Growing Pains 1|+30% Max Power, -5% Mood Recovery|130 power         |
|Growing Pains 2|+40% Max Power, -5% Mood Recovery|140 power         |
|Growing Pains 3|+50% Max Power, -5% Mood Recovery|150 power         |
|Stable Energy  |+30 flat Max Energy              |130 power         |
|Covert Energy 5|+35% Max Power                   |135 power         |

**Stable Energy equals Growing Pains 1 at base 100** but becomes superior on low-base-power deviations and inferior on high-base deviations.

**Upper Hand is mechanically problematic**. Its effect—“When Energy drops to 0, automatically consume Vitality to recover Energy”—creates **double-depletion scenarios**. The deviation becomes active again but with both low Power AND low Mood, affecting combat performance and creating cascading recovery issues. Experienced players prefer manual management over chaotic activation cycles.

### The 0.43s per power point relationship could not be verified

Community testing found **nearly identical recharge times** regardless of Activity Rating for combat deviations. Testing data showed Lonewolf’s Whisper with Activity Rating 2 recharged from 0 in ~1m38s versus ~1m40s with Activity Rating 4. For combat purposes, only the **Skill Rating (first number)** significantly affects performance—Activity Rating primarily impacts Territory deviation resource production.

-----

## January 21, 2026 mod revamp fundamentally changes optimization

The upcoming mod revamp replaces random sub-attribute generation with a **fixed attribute system** tied to mod types.  

### Current system optimization priorities

Current optimal mod setups by archetype:

- **Shrapnel builds**: Violent suffix (crit-related), Lone Wolf 4pc, prioritize Crit DMG > Weapon DMG > DMG to Great Ones > Magazine Capacity
- **Burn builds**: Burn suffix (+6% trigger chance per piece),  Shelterer 4pc + Grill Gloves, prioritize Status DMG ≈ Elemental DMG (both multiplicative)
- **Sniper/Bull’s Eye**: Precision suffix, Renegade 3pc for Archer Focus (+4% weakspot damage per consecutive shot, stacks to 10), prioritize Weakspot DMG > Crit Rate > Crit DMG
- **Frost Vortex**: Shelterer 4pc + Frost Tactical Vest + Bastille Shoes, prioritize Status DMG > Elemental DMG 

**Diminishing returns note**: Status DMG and Elemental DMG are both multiplicative multipliers. If you have 200% Status DMG and only 50% Elemental DMG, adding more Elemental DMG provides better value than additional Status DMG. 

### Post-revamp fixed attributes change farming strategy

All four sub-attributes will be **fixed to match the mod’s core traits**. Mod Level = Sum of sub-attribute levels (max Lv. 17). Sub-attribute levels range from 1–5 based on mod level. 

**Shiny Mods** become the new endgame goal—available only after obtaining Lv. 17 mods, they have identical sub-attributes but higher main attributes.  Worth farming only after completing Lv. 17 collection.

### Compensation structure rewards preparation

Before January 17 (PT), players should move all mods to Mod Backpack for accurate compensation calculation: 

- **Part 1**: Mod Dust based on Legendary Mods (Lv. 9+) acquired October 18, 2025 – January 18, 2026  (5,000+ mods = 50 Lv. 14–17 Random Crates)
- **Part 2**: Shiny Mod compensation based on Lv. 17 Mods in Backpack as of January 18, 2026 (75+ mods = 5 Shiny Mod Selection Crates + 20 Random Lv. 14–17 Crates)  

**Old mods are retained and remain usable** with their original features. Old mods at Lv. 14+ unlock new mods of the same type at Lv. 14.

-----

## Build archetype synergies quantified

### Fast Gunner delivers highest sustained single-target DPS

**Core weapon**: MG4 Predator (LMG) with 40% Fast Gunner trigger chance, stacking +1% Fire Rate and +1% Attack per stack. At multiples of 5 stacks, grants **Unlimited Ammo for 0.5 seconds**. Consecutive hits on same target boost Weapon DMG by 2%/hit up to 40–60%.

**Critical armor**: Oasis Mask increases max Fast Gunner stacks to **20** and doubles per-stack bonus to **+2%**, yielding potential +40% Fire Rate and Attack.

**Non-obvious finding**: Fast Gunner actually outperforms Shrapnel for sustained single-target DPS (tested **65–100k+ DPS vs 55–60k** for Shrapnel) but requires consistent weakspot targeting.

### Power Surge Thunderclap enables boss burst damage

The Thunderclap mod triggers after **20 Power Surge procs**, summoning Celestial Thunder dealing **200–250% Psi Intensity Shock DMG**. The Mayfly Goggles add **+1 Power Surge trigger count**, accelerating Thunderclap activation.  This makes Psi Intensity the top priority stat for this build rather than standard weapon damage metrics.

-----

## Data gaps and contested mechanics

Several mechanics remain **genuinely undocumented** even in testing communities:

1. **Numerical stunlock thresholds** for Lunarspawns and other enemies—not quantified in any source
1. **Specific resistance percentages** for enemies—the game does not surface precise resistance numbers
1. **Exact Psi Intensity scaling breakpoints** for Power Surge Thunderclap optimization
1. **Precise Shrapnel proc interactions** with specific armor piece combinations—testing ongoing

The **0.43s per power point relationship** and **PW90 immunity bypass mechanism** are not merely undocumented—they appear to be fabricated or misattributed claims circulating without empirical basis.

-----

## Conclusion

The Once Human endgame meta rewards mechanical understanding over tier-list following. The most impactful optimization insight is recognizing **damage type immunity patterns**—Forsaken Giant’s complete elemental immunity makes this single piece of knowledge worth more than any tier list.  Fast Gunner builds currently outperform the more popular Shrapnel builds for pure single-target DPS, representing an under-exploited optimization. The January 21, 2026 mod revamp will invalidate current farming strategies focused on RNG sub-attribute hunting, shifting optimization toward systematic mod type collection. Players should prioritize consolidating Lv. 17 mods in Mod Backpack before January 17 to maximize compensation rewards under the new system. 