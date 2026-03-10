import React from 'react';
import { GearSlot, WeaponSlot, ArmorSlot, Rarity } from '../types/enums';
import { cn } from '@/lib/utils';
import { LoadoutComponent } from '../ecs/types';

interface GearHubProps {
    activeSlot: GearSlot;
    onSlotSelect: (slot: GearSlot) => void;
    loadout: LoadoutComponent;
}

export const GearHub: React.FC<GearHubProps> = ({ activeSlot, onSlotSelect, loadout }) => {
    const slots = [
        { id: WeaponSlot.Main, label: 'Weapon', component: loadout.weapon },
        { id: ArmorSlot.Helmet, label: 'Helmet', component: loadout.helmet },
        { id: ArmorSlot.Mask, label: 'Mask', component: loadout.mask },
        { id: ArmorSlot.Top, label: 'Top', component: loadout.top },
        { id: ArmorSlot.Gloves, label: 'Gloves', component: loadout.gloves },
        { id: ArmorSlot.Pants, label: 'Pants', component: loadout.pants },
        { id: ArmorSlot.Boots, label: 'Boots', component: loadout.boots },
    ];

    const getRarityBorder = (rarity?: Rarity) => {
        if (rarity === Rarity.Legendary) return "border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.15)]";
        if (rarity === Rarity.Epic) return "border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.15)]";
        return "border-white/5";
    };

    const getRarityBg = (rarity?: Rarity) => {
        if (rarity === Rarity.Legendary) return "bg-orange-500/5";
        if (rarity === Rarity.Epic) return "bg-purple-500/5";
        return "bg-black/40";
    };

    return (
        <div className="grid grid-cols-2 gap-2 p-1">
            {slots.map((slot) => {
                const component = slot.component;
                const rarity = component?.rarity;
                const name = component?.name;

                return (
                    <button
                        key={slot.id}
                        onClick={() => onSlotSelect(slot.id)}
                        className={cn(
                            "h-14 flex flex-col items-start justify-center px-3 border rounded-sm transition-all relative overflow-hidden group",
                            activeSlot === slot.id ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(77,184,255,0.2)]" : cn(getRarityBg(rarity), "hover:border-primary/40"),
                            getRarityBorder(rarity)
                        )}
                    >
                        <span className={cn(
                            "text-[6px] font-black uppercase tracking-widest mb-0.5 transition-colors",
                            activeSlot === slot.id ? "text-primary" : "text-muted-foreground group-hover:text-primary/70"
                        )}>
                            {slot.label}
                        </span>
                        <span className="text-[9px] font-bold text-foreground truncate w-full text-left uppercase tracking-tighter leading-tight">
                            {name || "Empty Slot"}
                        </span>
                        {activeSlot === slot.id && (
                            <div className="absolute top-0 right-0 w-1 h-full bg-primary animate-pulse" />
                        )}
                    </button>
                );
            })}
        </div>
    );
};
