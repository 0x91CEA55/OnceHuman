# Foundational Deep-Dive: In-Game Screenshot Audit

## 1. Intention & Rationale
The "Source Truth Uncertainty" extends beyond numerical values into the very terminology used to describe game mechanics. This deep-dive aims to establish a high-fidelity **Conceptual Schema** by extracting the exact textual descriptions from in-game screenshots. 

While numerical values (DMG, Fire Rate) are subject to scaling (Stars/Tiers) and should be used cautiously, the **Weapon Features**, **Set Effects**, and **Mod Descriptions** are absolute. They provide the "Rosetta Stone" for understanding how the game engine categorizes damage buckets and trigger conditions.

## 2. Target Data Points
*   **Canonical Terminology**: Extract exact wording (e.g., "Psi Intensity Blaze DMG", "Final DMG", "DMG Coefficient") to define our `StatType` and `DamageTrait` enums.
*   **Behavioral Logic**: Analyze the wording of "Weapon Features" to determine the order of operations (e.g., "automatically refills 1 bullet" vs "consumes 1 extra ammo").
*   **Keyword Classification**: Confirm which mods and weapons belong to which keyword buckets (Burn, Shrapnel, etc.) based on the game's visual iconography and categorization.
*   **Stat Sheet Alignment**: Ensure our simulation's output matches the layout and logic of the in-game "Detailed Stats" panel.

## 3. The "Missing Link" Mapping Strategy
Screenshots like `WeaponsOverview-FullStarsFullCalibsLvl5.png` show effects but not names. We will bridge this gap by:
1.  Performing OCR on the "Weapon Features" text.
2.  Using semantic similarity to match that text against the `mechanics.description` or `special_effects` fields in the `custom-datamine` JSON files.
3.  Definitively tagging each stat-block with its `weapon_id`.

---

## 4. Task & Implementation Tracking (Mandatory)

### Phase 0: Visual Extraction & Terminology Alignment
- [ ] **OCR & Document All Screenshots**:
    - [ ] `research/data/ingame-screenshots/Weapon/`: Extract all Weapon Features and base stats.
    - [ ] `research/data/ingame-screenshots/Armor/`: Extract all Set Bonuses (2-pc, 3-pc, 4-pc).
    - [ ] `research/data/ingame-screenshots/Mod/`: Extract all Mod descriptions and bucket hints.
    - [ ] `research/data/ingame-screenshots/LoadoutUI/`: Extract selection UI metadata and item presentation logic.
- [ ] **Cross-Reference Mapping**:
    - [ ] Create a mapping file `simulator/src/data/screenshot-map.json` linking OCR'd effect blocks to internal `weapon_id`s.
- [ ] **Schema Standardization**:
    - [ ] Update `simulator/src/types/enums.ts` to use 1:1 in-game terminology for all stats and traits.
- [ ] **Refine Audit Proposal**:
    - [ ] Incorporate "Innate Bonuses" and "Factor/Final" bucket distinctions discovered during the OCR phase into the `DamageResolutionStrategy`.
