import React from 'react';
import { GearSlot, WeaponSlot, ArmorSlot } from '../types/enums';
import { Sword, Shield, HardHat, Footprints, MousePointer2, Layers, VenetianMask } from 'lucide-react';

interface SlotDockProps {
    activeSlot: GearSlot;
    onSlotSelect: (slot: GearSlot) => void;
    slotStatus: Record<string, boolean>; // Whether slot has an item equipped
}

export const SlotDock: React.FC<SlotDockProps> = ({ activeSlot, onSlotSelect, slotStatus }) => {
    const slots = [
        { id: WeaponSlot.Main, icon: Sword, label: 'Weapon' },
        { id: ArmorSlot.Helmet, icon: HardHat, label: 'Helmet' },
        { id: ArmorSlot.Mask, icon: VenetianMask, label: 'Mask' },
        { id: ArmorSlot.Top, icon: Shield, label: 'Top' },
        { id: ArmorSlot.Gloves, icon: MousePointer2, label: 'Gloves' },
        { id: ArmorSlot.Pants, icon: Layers, label: 'Pants' },
        { id: ArmorSlot.Boots, icon: Footprints, label: 'Boots' },
    ];

    return (
        <div className="flex justify-between items-center bg-black/40 border border-primary/10 p-1.5 rounded-sm backdrop-blur-md">
            {slots.map((slot) => {
                const Icon = slot.icon;
                const isActive = activeSlot === slot.id;
                const isEquipped = slotStatus[slot.id];

                return (
                    <button
                        key={slot.id}
                        onClick={() => onSlotSelect(slot.id as GearSlot)}
                        className={`
                            relative flex flex-col items-center justify-center w-10 h-10 transition-all duration-300 group
                            ${isActive ? 'bg-primary/20 border-primary/40' : 'hover:bg-white/5 border-transparent'}
                            border rounded-sm
                        `}
                        title={slot.label}
                    >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                        
                        {/* Status Active Indicator */}
                        {isEquipped && (
                            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_5px_#4db8ff]"></div>
                        )}

                        {/* Active Selection Underline */}
                        {isActive && (
                            <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary"></div>
                        )}
                    </button>
                );
            })}
        </div>
    );
};
