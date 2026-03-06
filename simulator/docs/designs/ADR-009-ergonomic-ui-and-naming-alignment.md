# ADR-009: Ergonomic UI Overhaul & In-Game Terminology Alignment

**Status:** Proposed
**Date:** 2026-03-05
**Deciders:** Tatum (Project Lead), Gemini CLI (UX Architect)

## 1. Context

The current Simulator UI (v0.4.0-diegetic) suffers from two ergonomic defects:
1.  **Naming Dissonance**: Labels like "Lead Flow" (Fire Rate), "Raw Base" (Attack), and "Blueprint Fidelity" (Star Level) try too hard to be diegetic and diverge from the established in-game terminology seen in the character sheet.
2.  **Layout Clutter**: The `TechnicalSchematic` panel is over-burdened with global and local controls (Item selection, Mods, Substats, Star tuning, Tier tuning, Calibration matrix). This leads to visual overlap and high cognitive load.

The in-game UI (per `LoadoutUI/VariousLoadoutPanelWeaponModArmorHoverDetailsUI.png`) uses a "Slot Grid" pattern where clicking a gear piece opens a dedicated modification/detail view.

## 2. Decision

### 2.1. Terminology Alignment (Source Truth)
Standardize all internal and external labels to match the in-game character sheet.

| Old Diegetic Label | New Standard Label | In-Game Mapping |
|-------------------|--------------------|-----------------|
| Raw Base          | Attack             | Attack          |
| Lead Flow         | Fire Rate          | Fire Rate       |
| Capacity          | Magazine Capacity  | Magazine Capacity |
| Atk Bonus         | Attack %           | (Internal)      |
| Wpn Bonus         | Weapon DMG Bonus   | Weapon DMG Bonus |
| Crit Prob         | Crit Rate          | Crit Rate       |
| Crit Mult         | Crit DMG           | Crit DMG        |
| Weakspot          | Weakspot DMG       | Weakspot DMG    |
| Status DMG        | Status DMG Bonus   | Status DMG Bonus |
| Element DMG       | Elemental DMG Bonus| Elemental DMG Bonus |
| Blueprint Fidelity| Star Level         | Stars           |
| Production Tier   | Tier               | Tier (I-V)      |
| Logic Core        | Mod                | Mod             |
| Chassis_ID        | Item               | Weapon/Armor    |

### 2.2. Ergonomic "Master-Detail" Loadout Pattern
Abolish the "One Large Schematic" approach in favor of a **Gear Hub** and a **Tuning Panel**.

1.  **Gear Hub**: A clean 2x4 grid representing the 7 gear slots (Weapon, Helmet, Mask, Top, Gloves, Pants, Boots). Each slot shows its current icon/rarity and name.
2.  **Tuning Panel**: A dedicated view that appears when a slot is selected. It contains the specific controls for that item:
    *   Item Selection (Dropdown)
    *   Mod Selection (Dropdown)
    *   Substat Nodes (The 4-point schematic)
    *   Tuning Sliders (Star, Tier, Calibration)
3.  **Ammunition Relocation**: Move the Ammunition selector from the "Encounter" panel into the **Weapon Tuning Panel**, aligning with the in-game "Accessory/Ammo" placement.

### 2.3. Layout Stabilization
Ensure the middle column (Stats + Static Prediction) and the right column (Analytics) do not overlap by using strict container bounds and improved spacing.

## 3. Verbatim Implementation Specification

### 3.1. Standardized Terminology (`DynamicStatDisplay.tsx`)

```typescript
// simulator/src/components/DynamicStatDisplay.tsx

// ... inside renderStat mappings ...
{/* Primary Output */}
<div className="space-y-1">
    <div className="text-[6px] font-black text-primary/40 uppercase tracking-[0.3em] mb-2 border-b border-primary/10 pb-1">Basic_Stats</div>
    {renderStat("Attack", StatType.DamagePerProjectile, "", "text-foreground", Cpu)}
    {renderStat("Fire Rate", StatType.FireRate, " RPM", "text-foreground", Zap)}
    {renderStat("Magazine Capacity", StatType.MagazineCapacity, "", "text-foreground", Activity)}
    {renderStat("Attack %", StatType.AttackPercent, "%", "text-orange-400", Shield)}
    {renderStat("Weapon DMG Bonus", StatType.WeaponDamagePercent, "%", "text-orange-400", Target)}
</div>

{/* Probability Matrix */}
<div className="space-y-1">
    <div className="text-[6px] font-black text-blue-400/40 uppercase tracking-[0.3em] mb-2 border-b border-blue-400/10 pb-1">Battle_Stats</div>
    {renderStat("Crit Rate", StatType.CritRatePercent, "%", "text-blue-400", Target)}
    {renderStat("Crit DMG", StatType.CritDamagePercent, "%", "text-blue-400", Zap)}
    {renderStat("KW Crit Rate", StatType.KeywordCritRatePercent, "%", "text-blue-500", Target)}
    {renderStat("KW Crit DMG", StatType.KeywordCritDamagePercent, "%", "text-blue-500", Zap)}
    {renderStat("Weakspot DMG", StatType.WeakspotDamagePercent, "%", "text-yellow-400", Target)}
</div>

{/* Elemental Resonance */}
<div className="space-y-1">
    <div className="text-[6px] font-black text-purple-400/40 uppercase tracking-[0.3em] mb-2 border-b border-purple-400/10 pb-1">Keyword_DMG_Bonus</div>
    {renderStat("Psi Intensity", StatType.PsiIntensity, "", "text-purple-400", Activity)}
    {renderStat("Status DMG Bonus", StatType.StatusDamagePercent, "%", "text-purple-300", Flame)}
    {renderStat("Elemental DMG Bonus", StatType.ElementalDamagePercent, "%", "text-purple-300", Wind)}
    {renderStat("Burn DMG Bonus", StatType.BurnDamagePercent, "%", "text-red-400", Flame)}
    {renderStat("Burn Limit", StatType.MaxBurnStacks, "", "text-red-500", Info)}
</div>
```

### 3.2. Gear Hub Component (`GearHub.tsx`)

```typescript
// simulator/src/components/GearHub.tsx

import React from 'react';
import { GearSlot, WeaponSlot, ArmorSlot, Rarity } from '../types/enums';
import { cn } from '@/lib/utils';
import { Box } from 'lucide-react';

interface GearHubProps {
    activeSlot: GearSlot;
    onSlotSelect: (slot: GearSlot) => void;
    loadoutNames: Record<GearSlot, string>;
    loadoutRarities: Record<GearSlot, Rarity | undefined>;
}

export const GearHub: React.FC<GearHubProps> = ({ activeSlot, onSlotSelect, loadoutNames, loadoutRarities }) => {
    const slots = [
        { id: WeaponSlot.Main, label: 'Weapon' },
        { id: ArmorSlot.Helmet, label: 'Helmet' },
        { id: ArmorSlot.Mask, label: 'Mask' },
        { id: ArmorSlot.Top, label: 'Top' },
        { id: ArmorSlot.Gloves, label: 'Gloves' },
        { id: ArmorSlot.Pants, label: 'Pants' },
        { id: ArmorSlot.Boots, label: 'Boots' },
    ];

    const getRarityBorder = (rarity?: Rarity) => {
        if (rarity === Rarity.Legendary) return "border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.2)]";
        if (rarity === Rarity.Epic) return "border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]";
        return "border-white/10";
    };

    return (
        <div className="grid grid-cols-2 gap-2 p-1">
            {slots.map((slot) => (
                <button
                    key={slot.id}
                    onClick={() => onSlotSelect(slot.id)}
                    className={cn(
                        "h-16 flex flex-col items-start justify-center px-3 border rounded-sm transition-all relative overflow-hidden group",
                        activeSlot === slot.id ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(77,184,255,0.2)]" : "bg-black/40 hover:border-primary/40",
                        getRarityBorder(loadoutRarities[slot.id])
                    )}
                >
                    <span className="text-[6px] font-black text-muted-foreground uppercase tracking-widest mb-1 group-hover:text-primary transition-colors">
                        {slot.label}
                    </span>
                    <span className="text-[9px] font-bold text-foreground truncate w-full text-left uppercase tracking-tighter">
                        {loadoutNames[slot.id] || "Empty Slot"}
                    </span>
                    {activeSlot === slot.id && (
                        <div className="absolute top-0 right-0 w-1 h-full bg-primary animate-pulse" />
                    )}
                </button>
            ))}
        </div>
    );
};
```

### 3.3. Technical Schematic Refinement (`TechnicalSchematic.tsx`)

```typescript
// simulator/src/components/TechnicalSchematic.tsx

// ... labels update ...
<Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground flex justify-between items-center px-1">
    <span className="flex gap-1 items-center"><Box className="w-2.5 h-2.5" /> Item_Config</span>
</Label>

// ... sliders update ...
<span className="text-[7px] font-black text-muted-foreground uppercase tracking-wider">Stars</span>
// ...
<span className="text-[7px] font-black text-muted-foreground uppercase tracking-wider">Tier</span>
// ...
<span className="text-[7px] font-black text-muted-foreground uppercase tracking-wider">Calibration</span>

// ... Add Ammo Selector to Weapon slot ...
{slot === 'weapon_main' && (
    <div className="space-y-1 pt-2">
        <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-1">Ammunition</Label>
        <Select value={selectedAmmunition} onValueChange={onAmmunitionChange}>
            {/* select content items */}
        </Select>
    </div>
)}
```

## 4. Verification & Commit

### 4.1. Visual Regression Check
- `grep -F "Basic_Stats" simulator/src/components/DynamicStatDisplay.tsx`
- `grep -F "GearHub" simulator/src/App.tsx`
- Ensure `AmmunitionType` is no longer imported in `EncounterConditionsPanel.tsx`.

### 4.2. Functional Proof
- `npm run test` must show zero regressions.
- Verify that clicking a "Gear Hub" slot correctly updates the `activeSlot` and filters the `TechnicalSchematic` options.
