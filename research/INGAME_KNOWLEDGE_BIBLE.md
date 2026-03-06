# OnceHuman In-Game Knowledge Bible

> **The Living Record of Source Truth**
> This document is the authoritative synthesis of all in-game screenshot datamining and qualitative research. It serves as the primary reference for defining the simulator's domain models and damage formulas.

---

## I. Global Terminology & Stat Definitions
*Source: research/data/ingame-screenshots/LoadoutUI/VariousLoadoutPanelWeaponModArmorHoverDetailsUI.png*

### 1. Primary Offense
*   **Attack**: Base offensive power for physical/weapon damage.
*   **Psi Intensity**: Primary scaling factor for Status and Elemental damage (e.g., Power Surge, Burn).
*   **Crit Rate / Crit DMG**: Multipliers for critical hits.
*   **Weakspot DMG**: Multiplier applied when hitting enemy weakpoints.

### 2. Keywords & Bucket Classifications
*   **Status DMG Bonus**: Global multiplier for all status-related damage (Burn, Frost Vortex, etc.).
*   **Elemental DMG Bonus**: Categories: **Blaze**, **Frost**, and **Shock**. (Note: "Flammable" and "Blast" are occasionally used interchangeably with "Blaze" and "Blast/Explosion" depending on translation/typos in set descriptions).
*   **Keyword DMG Bonus**: Specific multipliers (e.g., "Burn DMG Bonus"). Standard mods often abbreviate this to "[Keyword] DMG" (e.g., "Unstable Bomber DMG +5%", "Frost Vortex DMG +10%").
*   **DMG Factor**: (e.g., "Burn DMG Factor") - Multiplier for specific keyword effects. Often listed as a percentage (e.g., +15.0%).
*   **Final DMG**: (e.g., "Bounce Final DMG") - Appears to be a separate multiplicative bucket from "DMG Factor". **Examples**: `Pinpoint Strike` ("Unstable Bomber final DMG + 35%"), `Delayed Blast` ("the bomb's final DMG +25%"), `Break Bounce` ("the bullet's final DMG +25%"), and `Sleek Leather Jacket` ("Unstable Bomber Final DMG +2%").
*   **Ultimate DMG**: **(FLAG: Unique Wording)** An obscure multiplier, highly likely to be its own multiplicative bucket or a translation variant of Final DMG. **Example**: `First Electrocution` ("Power Surge's Ultimate DMG + 35%").
*   **DMG Coefficient**: (e.g., "Shrapnel DMG Coefficient") - Multiplier applied to base values. **Examples**: `Viper Mask` ("Unstable Bomber DMG coefficient +1%"), `Gas-tight Helmet` ("Shrapnel DMG Coefficient +150%"), `Mayfly Goggles` ("Power Surge DMG Coefficient -30%"), and `Gas Mask Hood` ("Power Surge DMG Coefficient +15%").

### 3. Set-Specific Mechanics & States
*   **Lone Shadow**: Stacking buff from Lonewolf Set granting Crit DMG.
*   **Archer's Focus**: Stacking buff from Renegade Set granting Weakspot DMG.
*   **Deviant Energy**: Stacking buff from Shelterer Set granting Elemental DMG.
*   **Bastille State**: Immobile stance from Bastille Set granting Weapon DMG, with severe Stamina penalties upon exit.
*   **Powered Armor**: Defensive stacks from Stormweaver Set granting DMG Reduction, consumable by rolling for AoE damage and healing.
*   **Bullet Saver**: Effect from Agent Set triggered by precise kills, granting Weakspot DMG.
*   **Deviant Power / Energy**: Resource consumed by Battle Skills, interacted with by Dark Resonance Set for Gun and Status DMG scaling.
*   **Sanity**: Survival metric. Low Sanity usually reduces Max HP, but Treacherous Tides mitigates this and scales damage based on Sanity drops.

---

## II. Weapon Features & Innate Logic
*Mapping of Blueprint IDs to their exact in-game feature descriptions. Base stats represent Tier V, 6-Star, Full Calibrations baselines as seen in `WeaponsOverview-FullStarsFullCalibsLvl5.png`.*

| Blueprint ID | Name | Feature Text (OCR Exact) | Base Stats (T5/6-Star, Full Calib) | Source |
|----|------|--------------------|------------|-------|
| `de50_jaws` | DE.50 - Jaws | Every 3 weapon hits trigger Unstable Bomber. When a weapon shot crits, it counts as 2 hits. When a weapon shot crits, there is a 30% chance to trigger Unstable Bomber. Unlocks the crit capability for Unstable Bomber, increasing its Crit Rate by +35% (stacks with character's Crit Rate). | DMG 939, FR 190, MAG 9, CR 6%, CD 25%, WS 60% | WeaponsOverview-FullStarsFullCalibsLvl5.png |
| `dbsg_doombringer` | DBSG - Doombringer | When the weapon hits, there is a 30% chance to apply The Bull's Eye to the target. Within 8 meters, this chance increases to 80%.<br>. When all bullets hit a non-Metas unit under the The Bull's Eye status, Attack ++12%, Reload Efficiency+8% for 15 seconds, stackable up to 3layers.<br>. After applying The Bull's Eye to the target, DMG Reduction +5% for 8seconds, stackable up to4 layers. | DMG 452x6, FR 180, MAG 2, CR 10%, CD 30%, WS 25% | WeaponsOverview-FullStarsFullCalibsLvl5.png |
| `mps7_outer_space` | MPS7 - Outer Space | When the weapon hits, there is a 30% chance to apply Power Surge to the target.<br>Upon hitting a target affected by Power Surge 12 time(s), summon lightning at the target's location, dealing 500% Shock Elemental DMG based on Psi Intensity (40% DMG against Meta-Humans).<br>After reloading, the weapon gains a Power Surge bonus 40% for 6seconds.<br>Shock Elemental DMG+30%. | DMG 240, FR 850, MAG 35, CR 8%, CD 30%, WS 50% | WeaponsOverview-FullStarsFullCalibsLvl5.png |
| `kam_abyss_glance` | KAM - Abyss Glance | When a weapon hits, trigger Frost Vortex with a cooldown of 7 seconds (Vortex triggered on Metas deals 30% damage).<br>When a weapon hits, Frost Vortex cooldown reduction 0.5 seconds.<br>Hitting non-Metas units within Frost Vortex increases the final damage of Frost Vortex created by yourself by +5%, up to 10 stacks.<br>Frost Elemental DMG +30%, Frost Vortex damage frequency +100%. | DMG 285, FR 600, MAG 50, CR 6%, CD 30%, WS 55% | WeaponsOverview-FullStarsFullCalibsLvl5.png |
| `aws338_bullseye` | AWS.338 - Bullseye | When hitting a Weakspot with a weapon, there is a 70% chance to apply The Bull's Eye to the target.<br>After switching weapons, the first weapon hit will apply The Bull's Eye to the target.<br>After hitting a non-Meta-Human unit with a weapon, Weakspot DMG +25% for 10 seconds, stacking up to 4 stacks. Switching weapons removes half the stacks.<br>After defeating a non-Meta-Human unit with a Weakspot shot, Attack +15% for 20 seconds. | DMG 2310, FR 40, MAG 5, CR 2%, CD 26%, WS 95% | WeaponsOverview-FullStarsFullCalibsLvl5.png |
| `mg4_conflicting_memories` | MG4 - Conflicting Memories | Trigger Shrapnel after hitting the target 12 time(s) (deals 60% Shrapnel DMG to Metas).<br>. For every 25 rounds in the magazine, Shrapnel triggers on 1 additional body part(s), up to 6.<br>. If magazine capacity exceeds 90 rounds, for every additional 15 rounds, Shrapnel DMG multiplier +10%.<br>. Magazine capacity +40 | DMG 235, FR 700, MAG 75, CR 8%, CD 30%, WS 35% | WeaponsOverview-FullStarsFullCalibsLvl5.png |
| `g17_hazardous_object` | G17 - Hazardous Object | Hitting enemies grants a 20% chance to trigger Unstable Bomber.<br>Reload action is replaced by throwing your weapon, consuming all ammo to deal Unstable Bomber DMG in a 3m radius (50% + consumed ammo X 18% of Psi Intensity, capping at 480%, dealing 28% DMG against Meta-Humans).<br>Throwing the weapon grants 75% chance to recover 75%of consumed ammo, 25%chance to recover 25%of consumed ammo. | DMG 438, FR 410, MAG 13, CR 8%, CD 28%, WS 55% | WeaponsOverview-FullStarsFullCalibsLvl5.png |
| `acs12_corrosion` | ACS12 - Corrosion | When a weapon hits, there is a 80% chance to trigger Power Surge, but it will no longer inflict Power Surge status on non-Meta-Human units.<br>Unlocks the ability for Power Surge to deal Crit Hits, Power Surge Crit Rate +25% (stacks with character Crit Rate).<br>After triggering Power Surge against non-Meta-Human units, Power Surge Crit DMG +40% for 6 seconds, stackable up to 5 times.<br>Power Surge DMG Factor +15%. | DMG 262x5, FR 180, MAG 18, CR 8%, CD 27%, WS 15% | WeaponsOverview-FullStarsFullCalibsLvl5.png |
| `mps5_kumawink` | MPS5 - Kumawink | When the weapon hits a target, there is a 25% chance to trigger Bounce.<br>When Bounce hits, triggers a ricochet, dealing 100% of Bounce damage to the target that triggered Bounce.<br>After reloading, can additionally trigger 1 instances of Bounce when Bounce is activated, lasting 6 seconds. Removed upon weapon swap.<br>Bounce damage multiplier +75%, single Bounce target +3. | DMG 270, FR 750, MAG 30, CR 8%, CD 30%, WS 55% | WeaponsOverview-FullStarsFullCalibsLvl5.png |
| `socr_the_last_valor` | SOCR - The Last Valor | Hitting 4 times with the weapon triggers Shrapnel.<br>When the weapon lands a Crit Hit, it counts as 2 hits.<br>After a Crit Hit, triggering Shrapnel will additionally trigger 1 times, lasting 1s.<br>Shrapnel Crit DMG +30%. | DMG 330, FR 515, MAG 30, CR 6%, CD 27%, WS 60% | WeaponsOverview-FullStarsFullCalibsLvl5.png |
| `hamr_brahminy` | HAMR - Brahminy | When the weapon hits a target, there is a 75% chance to trigger Bounce (dealing 35% Bounce DMG to Metas).<br>. Bounce count +2.<br>. Unlocks the hitting scene to trigger Bounce ability, with DMG reduced by 30% (reduced by 95% if the target is a Meta).<br>. Bounce weakspot weight +100% | DMG 1596, FR 85, MAG 8, CR 2%, CD 30%, WS 80% | WeaponsOverview-FullStarsFullCalibsLvl5.png |
| `kvd_boom_boom` | KVD - Boom! Boom! | When the weapon hits a target, there is a 18% chance to apply Burn to the target.<br>When hitting a target, it triggers an explosion, dealing 300%Psi Intensity Blaze DMG to enemies within a 5meter radius of the target, with a cooldown of 2 seconds (deals 40% DMG to Meta-Humans).<br>This explosion will apply 1 stack(s) of Burn to non-Meta-Human units.<br>. Blaze Elemental DMG+30% | DMG 319, FR 500, MAG 100, CR 10%, CD 30%, WS 40% | WeaponsOverview-FullStarsFullCalibsLvl5.png |
| `pdw90_holographic_resonance` | PDW90 - Holographic Resonance | On hit, 20% chance to apply The Bull's Eye.<br>Every 12 hits, triggers AoE DMG dealing Weapon DMG equal to 800%attack to enemies within an 8008m radius (damage against Metas 30%).<br>When hitting targets with The Bull's Eye with AoE DMG, reloads 3% ammo, up to 15% per instance.<br>Crit Rate +20%against targets under The Bull's Eye status. | DMG 171, FR 900, MAG 50, CR 8%, CD 45%, WS 30% | WeaponsOverview-FullStarsFullCalibsLvl5.png |
| `acs12_pyroclasm_starter` | ACS12 - Pyroclasm Starter | When the weapon hits a target, 27% chance to apply Burn to the objective.<br>When the weapon hits a target, 20% chance to generate a Deviant Particle nearby (picking it up enters Charging state, lasting 60 seconds).<br>When reloading, consumes all Charges and replaces ammunition with Dragon's Breath Rounds: Deals Blaze Elemental Status DMG equal to 95% of Attack (Burn DMG bonus applies).<br>Blaze DMG +20%, gains additional increase when consuming Charges, +8% per stack, stackable up to 4 stacks until next reload. | DMG 262x5, FR 180, MAG 18, CR 8%, CD 27%, WS 15% | WeaponsOverview-FullStarsFullCalibsLvl5.png |
| `mps5_primal_rage` | MPS5 - Primal Rage | When a weapon hits a target, there is a 35% chance to trigger Fast Gunner<br>. , consuming 1% of max HP. When the current magazine has 1 bullets remaining, shoot reserve ammo (non-lethal)<br>. When a weapon hits a target, restore 0.1%*Fast Gunner stacks of lost HP<br>. When HP changes by 1%, weapon DMG increases by +1% for 5 seconds. Each stack has an independent timer and can stack up to 80 stacks. | DMG 270, FR 750, MAG 30, CR 8%, CD 30%, WS 55% | WeaponsOverview-FullStarsFullCalibsLvl5.png |
| `m416_silent_anabasis` | M416 - Silent Anabasis | When the weapon hits, there is a 12% chance to trigger Frost Vortex.<br>. When the weapon hits, it generates Ice Crystals with a cooldown of 1.5 seconds. The Ice Crystals last for 15 seconds (Ice Crystals deal 40% damage to Metas). Upon expiration, the Ice Crystals explode, dealing 100% Psi Intensity as Frost Vortex damage to nearby objectives.<br>. Hitting an Ice Crystal with a weapon causes it to detonate prematurely, increasing the damage multiplier from 100% to 350%.<br>. Frost Elemental DMG +30%. For each Ice Crystal shattered, Frost Elemental DMG gains an additional +8%, lasting 15 seconds, stacking up to 3 stacks. | DMG 240, FR 750, MAG 36, CR 6%, CD 27%, WS 60% | WeaponsOverview-FullStarsFullCalibsLvl5.png |
| `kv-sbr_little_jaws` | KV-SBR - Little Jaws | When the weapon hits, it triggers Unstable Bomber, with a 0.9s cooldown (deals 40% damage against Meta-Humans).<br>. Unstable Bomber delay +0.2s.<br>. Each time an enemy affected by Unstable Bomber is hit, the current Unstable Bomber Final DMG +20%.<br>. For every +0.1s of Unstable Bomber delay, Unstable Bomber DMG +15%. | DMG 209, FR 1000, MAG 30, CR 10%, CD 30%, WS 45% | WeaponsOverview-FullStarsFullCalibsLvl5.png |
| `tec9_additional_rules` | TEC9 - Additional Rules | When shooting hits a target, trigger Fortress Warfare, with a cooldown of 10 seconds.<br>. After using Deviant skill, bullets deal 120% Attack as Elemental Status DMG (type depends on the Deviation)<br>. Reloading an empty magazine restores 25% magazine capacity as Deviant Power, up to a maximum of 20 points per reload<br>. In Fortress state, Crit Rate +15% | DMG 449, FR 450, MAG 30, CR 10%, CD 30%, WS 45% | WeaponsOverview-FullStarsFullCalibsLvl5.png |
| `octopus_grilled_rings` | EBR-14: Octopus! Grilled Rings! | When the weapon hits a target, 50% chance to apply burn to target.<br>At max stacks, Burn targets generate a fire ring, spreading Burn DMG to enemies within 6 meters at Burn frequency.<br>Burn DMG +75%, max Burn stacks -3.<br>Burn crit rate and Burn crit DMG +20% | DMG 471, FR 300, MAG 20, CR 5%, CD 40%, WS 50% | raw.json (Verified Source Truth) |

---

## III. Armor Sets & Global Bonuses
*Source: research/data/ingame-screenshots/Armor/SetEffectsOverview.png*

| Set Name | 1-Piece Bonus | 2-Piece Bonus | 3-Piece Bonus | 4-Piece Bonus |
|----------|---------------|---------------|---------------|---------------|
| Lonewolf Set | Magazine Capacity Bonus 10.0% | Crit Rate 5.0% | After landing 2 critical weapon hits, gain 1stacks of Lone Shadow. Lone Shadow grants Crit DMG +6% for 30s. Max stacks: 8. | Increase max Lone Shadow stacks to 10. Crit Rate +8% for 2s after reloading. |
| Savior Set | Medicine Cooldown Haste 0.2 | While shielded, Weapon DMG and Status DMG dealt increases by +10%. | Consumes 8% of current HP upon hit to generate a temporary shield equal to 5% of Max HP, lasting 30s (Cooldown: 0.5s; when shield exceeds 40%, hits landed will refresh shield duration and damage boost timer without deducting HP). When HP is consumed, Weapon and Status DMG +5%, stacking up to 4 stack(s), lasting 12s. | Automatically uses the least potent treatment in the backpack when HP is below 30% (Cooldown: 40s). |
| Treacherous Tides Set | Weapon DMG Reduction 10.0% | When HP is below 70%, weapon and Status DMG +12%. | The HP reduction from low Sanity is decreased by 40%. Weapon and Status DMG +10% and further increases as your Sanity drops, up to +28% (at 30% max Sanity). | Generates a shield equal to 20% of Max HP when HP is below 40% of the Max. Cooldown: 8s. |
| Renegade Set | Reload Speed 10.0% | Weakspot DMG 10.0% | Gain 1 stack of Archer's Focus upon hitting the same enemy consecutively. Archer's Focus: Weakspot DMG +4%, stacking up to 10 stacks. Archer's Focus stacks are halved upon changing targets. | When reloading, for every 1% of weakspot hit from the previous magazine, load an extra 0.6% bullets, up to 30%. |
| Shelterer Set | Status DMG Reduction 15.0% | Element DMG (Blaze, Frost, Shock, Blast) +8% | Each weapon hit grants 1 stack of Deviant Energy. Every stack grants +1% Elemental DMG (Blaze, Frost, Shock, Flammable). Effect can stack up to 20 stacks. Reloading removes half of the total stacks. | Increase max Deviant Energy stack by 10. Grant 2 additional stacks when hitting a weakspot. |
| Bastille Set | Weapon DMG +10% when HP is above 70%. | Reload Speed 15.0% | Stay crouched and immobile for 0.5s to enter the Bastille state. While in the Bastille state, gain Weapon DMG +40%. After exiting the Bastille state, you cannot sprint and your Stamina consumption is increased by +100% for 3s. | 3s after exiting Bastille state, gain 1 stack of Armor per second, up to 60 stacks. While in Bastille state, each stack of Armor provides a Shield equal to 1% of max HP. |
| Stormweaver Set | Roll Stamina Cost -20% | Magazine Capacity Bonus 15.0% | Taking DMG grants a stack of Powered Armor, DMG Reduction +4% for 10s. Effect can stack up to 6 stacks. | Rolling consumes 3 stacks of Powered Armor and triggers an explosion that knocks back surrounding enemies. For each enemy hit, HP +5%, up to +20% (cooldown: 10s). |
| Agent Set | Head DMG Reduction 10.0% | Weakspot DMG 10.0% | Gain Bullet Saver effect with every precise kill, Weakspot DMG +15% for 8s. Effect can stack up to 3 stacks. | Reload Efficiency +20% after defeating a target, Fire Rate +10% when killing with a Weakspot hit. Effect removed when reloading or switching weapons. |
| Heavy Duty Set | HP Bonus 10.0% | Elemental DMG (Blaze, Frost, Shock, Blast) +8% | After killing an enemy, increase Movement Speed by 20% for 2s and Elemental DMG (Blaze, Frost, Shock, Blast) by 40%, decay over 8s. | Within 5m, each enemy grants you DMG Reduction +4%. Effect can stack up to 4 stacks. |
| Falcon Set | Roll Stamina Cost -20% | Crit DMG 12.0% | When Stamina is above 90%, Crit Rate + 5%, Crit DMG +20%. | Max Stamina +25. Recover 30 Stamina instantly with a kill. |
| Snow Panther Set | Torso DMG Reduction 10.0% | Melee, Status, and Weapon DMG +8% when a ally player is within 10 meters or within allied Territory. | When you are within allied territory and help defeat an enemy, Melee, Status, and Weapon DMG +8% for 10 seconds, stacking up to 3 stacks. | When within allied territory, sentry turrets within a 7-meter radius deal +50%more DMG. |
| Dark Resonance Set | Using ultimate grants 10% temporary Shield for 10seconds | When Deviant Power is not full, weapon and Status DMG +12% | For every 1 Energy consumed, Gun and Status DMG +0.6%, up to +30% | Consumes 30 Deviant Power when using Battle Skill, reduces cooldown by 50% |

### Key Armor & Unique Effects
*Source: research/data/ingame-screenshots/Armor/KeyArmorOverview-1.png, KeyArmorOverview-2.png*

| ID | Name | Slot | Tier | Unique Effect / Features (OCR) |
|----|------|------|------|--------------------------------|
| `oasis_mask` | Oasis Mask | Mask | Tier V | [Fast Gunner] Increases Fire Rate and DMG. Fast Gunner max stacks 10. Attack +1% per stack. |
| `dust_mask` | Dust Mask | Mask | Tier V | [Fast Gunner] Increases Fire Rate and DMG. When triggering Fast Gunner, there is a 70% chance to automatically reload 1 bullet(s) with Attack +20%. |
| `viper_mask` | Viper Mask | Mask | Tier V | Unstable Bomber's range +50%. For every 2% Unstable Bomber range bonus, Unstable Bomber DMG coefficient +1%. **(FLAG: DMG coefficient)** |
| `cage_helmet` | Cage Helmet | Helmet | Tier V | When triggering Shrapnel, additionally triggers 1 times. |
| `gas_tight_helmet` | Gas-tight Helmet | Helmet | Tier V | [Shrapnel] Deals DMG to extra parts of the enemy. Limit the maximum hit parts of Shrapnel to 1. Shrapnel DMG Coefficient +150%. **(FLAG: DMG Coefficient)** |
| `beret` | Beret | Helmet | Tier V | Shrapnel hit parts +1. |
| `mayfly_goggles` | Mayfly Goggles | Helmet | Tier V | When triggering Power Surge, additionally triggers 1 times. Power Surge DMG Coefficient -30%. **(FLAG: DMG Coefficient)** |
| `charmed_mag_top` | Charmed Mag Top | Top | Tier V | When in Fast Gunner status, the lower the Player's current ammo, the higher the chance to trigger an extra bullet when firing. The maximum chance is 40%. |
| `explosive_front_top` | Explosive Front Top | Top | Tier V | Unstable Bomber detonation delay +0.3s. Unstable Bomber DMG multiplier +30%. **(FLAG: DMG multiplier)** |
| `snowdrift_top` | Snowdrift Top | Top | Tier V | When picking up Deviant Particles, gains an additional charge stack, and Weapon and Status DMG +25% for 25s. |
| `covert_walker_shirt` | Covert Walker Shirt | Top | Tier V | Frost Vortex collapses in the center, continuously pulling enemies within 1.5x the range of Frost Vortex (now pulls Players instead of applying strong control effects). |
| `overloaded_pants` | Overloaded Pants | Bottom | Tier V | After triggering Power Surge for 20 time(s), the next 6 shot(s) will consume reserve ammo directly, and Shock Elemental DMG +20%. Cooldown: 4s. Triggering Power Surge during the cooldown does not count toward this effect. |
| `sharp_blade_pants` | Sharp Blade Pants | Bottom | Tier V | When triggering Bounce, additionally trigger 1 more times. |
| `hot_dog_shorts` | Hot Dog Shorts | Bottom | Tier V | Bounce count +2. |
| `tattoo_pants` | Tattoo Pants | Bottom | Tier V | Bounce can hit allies without dealing DMG, with a 70% chance to automatically refill 1 bullet(s). |
| `gilded_gloves` | Gilded Gloves | Gloves | Tier V | Unlocks the Crit Hit ability for Burn (can utilize character's Crit Rate). Burn Crit Rate, Burn Crit DMG +20%. |
| `hardy_gloves` | Hardy Gloves | Gloves | Tier V | When Burn reaches max stacks, remove Burn and trigger an Explosion, dealing 300% Hyper-sensitive Blaze DMG in a small area. |
| `bbq_gloves` | BBQ Gloves | Gloves | Tier V | Gain Burn frequency increase based on Burn stacks, up to 100%. |
| `fire_rune_boots` | Fire Rune Boots | Boots | Tier V | When any target nearby is inflicted with Burn, there's a 50% chance to generate a Deviant Particle. Picking it up increases Blaze DMG +30% for 15s. |
| `hard_tactical_boots` | Hard Tactical Boots | Boots | Tier V | [Fortress Warfare] Periodically grants nearby allies a DMG Boost. Automatically refill 1 bullet(s) and Fire Rate +15% while in Fortress Warfare. |
| `bloodstained_tracker_boots` | Bloodstained Tracker Boots | Boots | Tier V | When applying The Bull's Eye to an objective already marked by The Bull's Eye, your Attack +20% for 5s, and The Bull's Eye spreads to one other nearby objective. |
| `pivot_step_leather_boots` | Pivot Step Leather Boots | Boots | Tier V | Resets Battle Skill cooldown after using Deviation Ultimate. |
| `gas_mask_hood` | Gas Mask Hood | Mask | Tier V | After triggering Power Surge, Crit Rate +35%, Power Surge DMG Coefficient +15%, lasting 6s. **(FLAG: DMG Coefficient)** |
| `yellow_paint_mask` | Yellow Paint Mask | Mask | Tier V | Defeating enemies will generate EMP, dealing Power Surge 1 time to enemies in the area. |
| `shaman_vulture_top` | Shaman Vulture Top | Top | Tier V | After triggering Unstable Bomber, Crit Rate +35% for 3s. |
| `sleek_leather_jacket` | Sleek Leather Jacket | Top | Tier V | For every 1m distance between the Player and the Unstable Bomber's trigger point, Unstable Bomber Final DMG +2%. **(FLAG: Final DMG)** |
| `frost_tactical_vest` | Frost Tactical Vest | Top | Tier V | When Frost Vortex is created, additional Ice Spikes are generated, dealing Frost DMG equal to 120% Psi Intensity within a certain area. |
| `doyens_cloak` | Doyen's Cloak | Top | Tier V | [Frost Vortex] Creates an area that deals periodic Frost Elemental DMG and slows enemies. When the Frozen effect on an objective ends, it takes Frost DMG equal to 50% of the total DMG dealt to it during the Frozen duration. |
| `leather_boots` | Leather Boots | Boots | Tier V | Recover 2.5% HP per second and recovery doubles when HP is below 50% while in Fortress Warfare. |
| `earthly_boots` | Earthly Boots | Boots | Tier V | Additional DMG +30% to enemies under The Bull's Eye. |
| `cowboy_boots` | Cowboy Boots | Boots | Tier V | Fortress Warfare only affects self. When in Fortress Warfare, Attack +25%. |
| `tactical_combat_shoes` | Tactical Combat Shoes | Boots | Tier V | When hitting a target marked by The Bull's Eye, there is a 40% chance to automatically refill 1 bullet(s) and restore 1% of lost HP. |
| `old_huntsman_boots` | Old Huntsman Boots | Boots | Tier V | After marking the objective with The Bull's Eye, the next 1 bullet(s) hitting a marked target will count as Weakspot hits. Weakspot DMG +30% to enemies affected by The Bull's Eye. |

---

## IV. Knowledge Acquisition Log
*Audit trail of when and where information was gathered.*

| Date | Source Directory | Findings Summary | Committer |
|----|------|--------------------|-----------|
| 2026-03-02 | `research/data/ingame-screenshots/` | Initial Pass: LoadoutUI and Weapon Features (IDs: Jaws, Doombringer, etc.) | Gemini CLI |
| 2026-03-02 | `research/data/ingame-screenshots/Armor/` | Extracted exact text for 12 Armor Set bonuses and identified new mechanics/keywords | Knowledge Extractor |
| 2026-03-02 | `research/data/ingame-screenshots/Armor/` | Visual datamining for 33 Key Armor unique effects; identified DMG Coefficient and Final DMG multipliers | Knowledge Extractor |
| 2026-03-02 | `research/data/ingame-screenshots/Mod/` | Extracted mod descriptions; updated damage buckets with Final DMG, Ultimate DMG (Flagged), and DMG Coefficient | Knowledge Extractor |
| 2026-03-02 | `research/data/ingame-screenshots/Weapon/` | Final Weapon Datamining Pass: Extracted 18 missing weapons with exact textual fidelity and T5/6-Star baselines | Knowledge Extractor |

---

## V. Mod Encyclopedia
*Compiled from `WeaponModsOverview.png` and `ArmorModsOverview.png`.*

### Weapon Mods
*Note: Most weapon mods utilize the standard "[Keyword] DMG" terminology.*

#### Burn
*   **Burning Wrath**: Triggering Burn has a 25% chance to grant +1 Burn stack(s).
*   **Blaze Blessing**: When defeating an enemy affected by Burn, recover 5% HP.
*   **Embers**: When Burn is removed, stacks only -50%.
*   **Flame Resonance**: Max Burn stack +2, Burn duration -20.0%

#### Frost Vortex
*   **Frosty Blessing**: When Frost Vortex disappears, restore 10% HP.
*   **Cryo Catalyst**: Frost Vortex DMG +10%. After triggering a frost construct (Ice Spikes, Ice Missiles, Ice Crystals), Frost Vortex DMG +5% for 6s.
*   **Cryo Blast**: After triggering Frost Vortex, increases Frost Vortex DMG by +4%, up to 5 stacks, lasting 4s.
*   **Shattering Ice**: When an enemy at the center of the Frost Vortex is defeated, deal 50% Psi Intensity Ice DMG to enemies within 1m once.

#### Fortress Warfare
*   **Final Territory**: When Fortress Warfare ends, Weapon DMG +10%, Movement Speed +10% for 10s.
*   **Portable Territory**: After leaving Fortress Warfare, the status will remain for 2s.
*   **Durable Territory**: Every hit landed while in Fortress Warfare state will extend the Fortress Warfare effect by 1s, up to 5s.
*   **United We Stand**: Same Legendary Mods required: 0/3

#### Fast Gunner
*   **Shoot Out**: When triggering Fast Gunner, Weapon DMG +1.5% for 10s, up to 20 stack(s).
*   **Cowboy**: After reloading an empty magazine, Fast Gunner trigger chance +100% (based on the weapon's Trigger Chance) for 5s. When Fast...
*   **Shooting Blitz**: Fast Gunner duration +4s. When Fast Gunner is active, Weapon DMG +15%.
*   **Precision Rush**: When Fast Gunner is active, increase Weakspot DMG for 3s, up to +45%.

#### Shrapnel
*   **Shield Breaker**: When hitting a shielded enemy, Shrapnel DMG +60% for 1s.
*   **Shrapnel Smash**: Triggering Shrapnel grants Shrapnel Crit Rate +2% for 2s. Effect can stack up to 15 time(s).
*   **Shrapnel Souvenir**: When Shrapnel hits a Weakspot, automatically refills 1 bullet(s) from inventory.
*   **Shatter Them All**: The more parts Shrapnel hits, the higher the Shrapnel DMG. Each part + 15%, up to 45%.

#### Power Surge
*   **Surge Amplifier**: Inflicting Power Surge grants Power Surge DMG +5% for 3s, up to 4 stack(s).
*   **Static Shock**: Power Surge Status duration -50%, and Power Surge DMG +20%.
*   **Shock Diffusion**: When triggering Power Surge, apply the Power Surge Status to 1 enemy(s) within 10m of the target (prioritizes enemies that are not affecte...
*   **Shock Rampage**: Inflicting Power Surge grants +5% Power Surge Trigger Chance (based on weapon's Trigger Chance) for 5s, up to 4 stack(s).

#### The Bull's Eye
*   **Vulnerability Amplifier**: The Bull's Eye adds Vulnerability +8%.
*   **Spreading Marks**: When a marked enemy is defeated, The Bull's Eye will spread to 1 enemy(s) within 15m.
*   **Hunter's Perk**: Marked enemies DMG vs. Metas -20%.
*   **Recover Mark**: When defeating marked enemies, recover 15% HP and 25% Stamina.

#### Unstable Bomber
*   **Heavy Explosives**: Unstable Bomber inflicts stagger on enemies and deals 40% less damage to you.
*   **Bombardier Souvenir**: When triggering Unstable Bomber, automatically refill 10% of your magazine.
*   **Reckless Bomber**: For every 1% Crit Rate, Unstable Bomber DMG +0.5%.
*   **Super Charged**: Triggering Unstable Bomber grants Unstable Bomber DMG +5% for 3s. Effect can stack up to 6 times.

#### Bounce
*   **Bounce Rampage**: The more selectable targets Bounce has, the higher the Bounce DMG, up to +45% (15% per target).
*   **Boomerang Bullet**: Each time Bounce is triggered, its trigger chance +2% (based on the weapon's trigger chance), lasting for 5s and stacking up to 10 t...
*   **Multi-Bounce**: The more Bounces, the higher the damage, up to +45% (7.5% per Bounce).
*   **Super Bullet**: Bounce Crit Rate +10%, Bounce Crit DMG +25%.

### Armor Mods (Masks & Key Effects)
*Focusing on Mask mods which introduce complex DMG buckets and keyword modifiers.*

#### Power Surge
*   **Thunderclap**: After triggering Power Surge 20 times, the next hit summons Celestial Thunder (Shock DMG of 200% Psi Intensity).
*   **(FLAG: Unique Bucket)** **First Electrocution**: For enemies without Power Surge status, Power Surge's Ultimate DMG + 35%.

#### Unstable Bomber
*   **Targeted Strike**: When hitting marked enemies, Crit Rate +10%, and Crit DMG +25%. *(Note: General mod but found in same pool)*
*   **Pinpoint Strike**: When Unstable Bomber hits only one enemy, Unstable Bomber final DMG + 35%.
*   **Delayed Blast**: Before the bomb explodes, for every 4 hits taken, the bomb's final DMG +25%.

#### Fast Gunner / Weapon DMG
*   **Explosive Barrage**: When in Fast Gunner state, Crit Rate + 10%, and Weapon DMG +10%.
*   **Blitzkrieg**: Fast Gunner stacks +5 and additional Fire Rate +1% for each stack.

#### Bounce
*   **Precision Bounce**: After triggering Bounce 6 times, the next bullet's Bounce DMG +125%.
*   **Break Bounce**: When a bullet hits an enemy above 50% HP, the bullet's final DMG +25%.

#### Shrapnel
*   **Explosive Shrapnel**: The 20th Shrapnel is explosive and deals +300% DMG as a critical hit.
*   **Shrapnel Carnage**: Shrapnel Weakspot Hit Weight +100%, Shrapnel Weakspot DMG +25%.

#### General / Other
*   **Lifeforce Boost**: HP +12.0%
*   **Frost Construct**: Frost Constructs (Ice Spikes, Ice Missiles, Ice Crystals) deal +10% damage; if the target is in the Frozen state, damage is +10%.
*   **Blaze Amplifier**: Every stack of Burn grants +3% Psi Intensity DMG.
*   **Most Wanted**: Every time an enemy is marked, Attack +5% for 8s. Effect can stack up to 3 times.
*   **Retrusion Explosion**: When hitting Burning enemies, Crit Rate +8%, and Crit DMG +20%.
*   **Unbreakable**: Fortress Warfare Range -30%. While in Fortress Warfare state, Attack +15%.
*   **Light Cannon**: No Super Armor inside Fortress Warfare. While in Fortress Warfare state, Attack +15%.

### Armor Mods (Generic Categories)
*Additional armor mods categorized by slot, offering broad stat modifiers.*

**Helmet**
*   **Lifeforce Boost**: HP +12.0%
*   **Quick Toss**: After using a throwable, Fire Rate +15% for 8s; reload 50% of the magazine for the previously equipped weapon (triggered every 12s).
*   **Weapon Symphony**: After switching weapons, Fire Rate +10% and Weapon DMG +25%. This effect decreases by 10% per second, up to a maximum decrease ...
*   **Elemental Havoc**: Elemental DMG +10%. When HP is above 90%, +10% additionally.
*   **Momentum Up**: Fire Rate +10% for the first 50% of the magazine and Weapon DMG +30% for the next 50% of the magazine.
*   **Fateful Strike**: Cannot deal Weakspot DMG. Crit Rate +10% and Crit DMG +30%.
*   **Work of Proficiency**: When reloading with an empty magazine, Reload Efficiency +5%, Elemental DMG +20%. Resets with the next reload.
*   **Mag Expansion**: When reloading an empty magazine, Magazine Capacity +30%.
*   **First-Move Advantage**: After reloading, Crit Rate +10%, Crit DMG +20% for 2s.
*   **Deviation Expert**: Range -25%, Fire Rate +10%, Status DMG +20%
*   **Precise Strike**: Hitting a weakspot grants Weakspot DMG +12% for 3s. Effect can stack 3 times.

**Tops**
*   **Lifeforce Boost**: HP +12.0%
*   **Ardent Shield**: While the shield is active, you gain 15% DMG Reduction. When the shield exceeds 1,000, single instances of DMG will not penetrate the ...
*   **Status Immune**: When HP is lower than 60%, purge all Deviated States (cooldown: 15s)
*   **Enduring Shield**: When out of combat, gain 1 stack of Safe Haven every 5s, stacking up to 5 times. For every 5 damage received, remove 1 stack of ...
*   **Resist Advantage**: When out of combat, gain 1 stack of 10% DMG Reduction every 5s. Effect can stack up to 5 times. Taking DMG removes 1 stack.
*   **Head Guard**: Weakspot DMG Reduction +15%; Weakspot DMG Reduction +15% further when HP is above 60%.
*   **Head-on Conflict**: Having enemies within 7 meters around you grants 10% DMG Reduction. Taking melee DMG from enemies grants an extra 10% DMG Red...
*   **Critical Rescue**: DMG Reduction +20% and Healing Received +20% when HP is below 30%.
*   **Rejuvenating**: When Shield is above 30% of Max HP, defeating an enemy recovers 20% of Max HP. Excess recovery is converted into Shield last...
*   **Quick Comeback**: When using a healing shot, Movement Speed +20% for 2s and refills the magazine from the inventory to 100%.
*   **Healing Fortification**: When using a healing shot, DMG Reduction +40% for 2s.

**Bottoms**
*   **Unstoppable**: Weakspot DMG +20% when a bullet hits a target more than 20 meters away. For every additional 1 meter(s) away from the target, ...
*   **Melee Momentum**: Melee DMG +20%. After a melee kill, recover 30% of max Stamina.
*   **Abnormal Increase**: When the magazine is empty, Status DMG +10% for 12s. Effect can stack up to 3 times.
*   **Deadshot**: Each Crit Hit by non-melee weapons grants +5% Crit DMG, up to 45%. The effect is removed upon the next reload.
*   **Bullet Siphon**: Weapon DMG +5%. Every 5 bullets consumed in the magazine grants +4% Weapon DMG, capped at 20%.
*   **Lifeforce Boost**: HP +12.0%
*   **Three Strikes**: For the first three hits after reloading (not exceeding 50% of magazine capacity), Weakspot DMG +50%.
*   **Reload Rampage**: After killing an enemy, refill 2 bullets from reserves (no more than 50% of the Magazine Capacity). Weapon DMG and Status DMG +...
*   **Critical Surge**: When the magazine is empty, Crit DMG +15% for 12s. Stacks independently, up to 3 stack(s).
*   **Elemental Resonance**: For each instance of Elemental DMG dealt from the previous magazine, the next magazine gains Elemental DMG +1% for 15s upon reloading.
*   **Precision Charge**: For every 10% Weakspot hit rate of the previous magazine, Elemental DMG +4%, up to 24%, lasting for 10s. Reloading resets the ca...

**Shoes**
*   **Lifeforce Boost**: HP +12.0%
*   **Power of Striving**: Weapon and Status DMG + 10%. Stamina loss grants an additional DMG boost, up to +20%.
*   **Against All Odds**: Weapon and Status DMG +10%. For every +5% Max HP consumed, gains an additional +5%, lasting 5s, stacking up to 3 stack(s).
*   **Slow and Steady**: Melee, Weapon, Status DMG +10%. When HP is above 90%, grants +10% additional DMG.
*   **Secluded Strike**: Having no enemies within 7 meters around you grants +15% Weapon and Status DMG.
*   **Ferocious Charge**: Killing enemies within 10 meters grants Melee, Weapon, Status DMG +20% for 8s.
*   **Rush Hour**: Every 10% HP loss grants +4% Melee, Weapon, and Status DMG.
*   **Ruthless Reaper**: After getting 2 kill(s), refill 100% of your magazine from your reserves.
*   **Covered Advance**: Taking no DMG within 4s grants +20% Melee, Weapon, and Status DMG for 30s. The effect resets when the duration ends.

**Gloves**
*   **Lifeforce Boost**: HP +12.0%
*   **Elemental Overload**: Element DMG (Blaze, Frost, Shock, Blast) +18%.
*   **Melee Amplifier**: Melee DMG +20.0%
*   **Weapon Amplifier**: Weapon DMG +15.0%
*   **Status Enhancement**: Status DMG +20.0%
*   **Weakspot DMG Boost**: Weakspot DMG +25.0%
*   **Crit Amplifier**: Crit Rate +10.0%, Crit DMG +15.0%.
*   **Crit Boost**: Crit Rate +15.0%
