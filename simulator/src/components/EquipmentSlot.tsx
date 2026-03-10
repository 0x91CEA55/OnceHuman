import React from 'react';
import { GearSlot } from '../types/enums';
import { ACTIVE_REGISTRY } from '../data/generated/registry';
import { ARMOR } from '../data/armor';
import { MODS } from '../data/mods';
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { WeaponComponent, ArmorComponent, ModComponent } from '../ecs/types';

interface EquipmentSlotProps {
    label: string;
    slot: GearSlot;
    item?: WeaponComponent | ArmorComponent;
    mod?: ModComponent;
    onItemSelect: (id: string) => void;
    onModSelect: (id: string) => void;
}

export const EquipmentSlot: React.FC<EquipmentSlotProps> = ({
    label,
    slot,
    item,
    mod,
    onItemSelect,
    onModSelect
}) => {
    // Filter items based on slot
    const items = slot === 'weapon_main'
        ? Object.values(ACTIVE_REGISTRY).map(b => ({ id: b.key, name: b.name }))
        : Object.values(ARMOR).filter(a => a.slot === slot);

    // Filter mods based on slot
    const mods = Object.values(MODS).filter(m => m.slot === slot);

    return (
        <div className="bg-background/40 border border-primary/5 rounded-md p-3 space-y-3 hover:border-primary/20 transition-colors">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary/80">{label}</h3>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground uppercase">Base Item</Label>
                    <Select
                        value={item?.id || "none"}
                        onValueChange={(val) => onItemSelect(val === "none" ? "" : val)}
                    >
                        <SelectTrigger className="h-8 text-xs bg-background/50 border-primary/10">
                            <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {items.map(i => (
                                <SelectItem key={i.id} value={i.id}>
                                    {i.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground uppercase">Slot Mod</Label>
                    <Select
                        value={mod?.id || "none"}
                        onValueChange={(val) => onModSelect(val === "none" ? "" : val)}
                    >
                        <SelectTrigger className="h-8 text-xs bg-background/50 border-primary/10">
                            <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {mods.map(m => (
                                <SelectItem key={m.id} value={m.id}>
                                    {m.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {mod && (
                <>
                    <div className="pt-2 mt-2 border-t border-primary/5">
                        <p className="text-[10px] text-primary italic leading-relaxed">
                            {mod.description}
                        </p>
                    </div>
                    {/* Note: In ECS, substats are already baked into ModComponent as {type, value} 
                        but the selector needs the original SubstatData [type, tier] 
                        which isn't in the ModComponent POJO. This would require 
                        either passing it separately or updating the component.
                    */}
                </>
            )}
        </div>
    );
};
