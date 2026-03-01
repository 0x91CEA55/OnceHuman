import React from 'react';
import { GearSlot, ModKey } from '../types/enums';
import { WEAPONS } from '../data/weapons';
import { ARMOR } from '../data/armor';
import { MODS } from '../data/mods';
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ModSubstatSelector } from './ModSubstatSelector';
import { Substat } from '../models/substat';

interface EquipmentSlotProps {
    label: string;
    slot: GearSlot;
    selectedItemId?: string;
    selectedModId?: string;
    selectedSubstats?: [Substat, Substat, Substat, Substat];
    onItemSelect: (id: string) => void;
    onModSelect: (id: string) => void;
    onSubstatChange: (substats: [Substat, Substat, Substat, Substat]) => void;
}

export const EquipmentSlot: React.FC<EquipmentSlotProps> = ({
    label,
    slot,
    selectedItemId,
    selectedModId,
    selectedSubstats,
    onItemSelect,
    onModSelect,
    onSubstatChange
}) => {
    // Filter items based on slot
    const items = slot === 'weapon_main' 
        ? Object.values(WEAPONS)
        : Object.values(ARMOR).filter(a => a.slot === slot);

    // Filter mods based on slot
    const mods = Object.values(MODS).filter(m => m.slot === slot);

    const selectedMod = selectedModId ? MODS[selectedModId as ModKey] : undefined;

    return (
        <div className="bg-background/40 border border-primary/5 rounded-md p-3 space-y-3 hover:border-primary/20 transition-colors">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary/80">{label}</h3>
            
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground uppercase">Base Item</Label>
                    <Select 
                        value={selectedItemId || "none"} 
                        onValueChange={(val) => onItemSelect(val === "none" ? "" : val)}
                    >
                        <SelectTrigger className="h-8 text-xs bg-background/50 border-primary/10">
                            <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {items.map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                    {item.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground uppercase">Slot Mod</Label>
                    <Select 
                        value={selectedModId || "none"} 
                        onValueChange={(val) => onModSelect(val === "none" ? "" : val)}
                    >
                        <SelectTrigger className="h-8 text-xs bg-background/50 border-primary/10">
                            <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {mods.map(mod => (
                                <SelectItem key={mod.id} value={mod.id}>
                                    {mod.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {selectedMod && (
                <>
                    <div className="pt-2 mt-2 border-t border-primary/5">
                        <p className="text-[10px] text-primary italic leading-relaxed">
                            {selectedMod.description}
                        </p>
                    </div>
                    {selectedSubstats && (
                        <ModSubstatSelector 
                            substats={selectedSubstats} 
                            onChange={onSubstatChange} 
                        />
                    )}
                </>
            )}
        </div>
    );
};
