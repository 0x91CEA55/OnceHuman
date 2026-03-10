import React from 'react';
import { StatType } from '../types/enums';
import { SubstatTier, SubstatData, getSubstatValue } from '../data/substats';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from '@/lib/utils';

interface ModSubstatSelectorProps {
    substats: [SubstatData, SubstatData, SubstatData, SubstatData];
    onChange: (substats: [SubstatData, SubstatData, SubstatData, SubstatData]) => void;
}

const SUBSTAT_OPTIONS = [
    { label: "Crit DMG", value: StatType.CritDamagePercent },
    { label: "Weapon DMG", value: StatType.WeaponDamagePercent },
    { label: "Attack %", value: StatType.AttackPercent },
    { label: "Elemental DMG", value: StatType.ElementalDamagePercent },
    { label: "Status DMG", value: StatType.StatusDamagePercent },
    { label: "DMG vs Boss", value: StatType.DamageBonusBoss },
    { label: "DMG vs Elite", value: StatType.DamageBonusElite },
    { label: "DMG vs Normal", value: StatType.DamageBonusNormal },
    { label: "Weakspot DMG", value: StatType.WeakspotDamagePercent },
];

const TIER_COLORS: Record<SubstatTier, string> = {
    [SubstatTier.None]: "bg-muted/20 border-transparent",
    [SubstatTier.White]: "bg-zinc-400 border-zinc-300",
    [SubstatTier.Green]: "bg-green-500 border-green-400",
    [SubstatTier.Blue]: "bg-blue-500 border-blue-400",
    [SubstatTier.Purple]: "bg-purple-500 border-purple-400",
    [SubstatTier.Gold]: "bg-yellow-500 border-yellow-400",
};

export const ModSubstatSelector: React.FC<ModSubstatSelectorProps> = ({ substats, onChange }) => {
    const handleUpdate = (index: number, type?: StatType, tier?: SubstatTier) => {
        const newSubstats = [...substats] as [SubstatData, SubstatData, SubstatData, SubstatData];
        const current = substats[index];
        newSubstats[index] = {
            type: type ?? current.type,
            tier: tier !== undefined ? tier : current.tier
        };
        onChange(newSubstats);
    };

    return (
        <div className="space-y-3 pt-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Attribute Effects (Substats)</h4>
            <div className="grid grid-cols-1 gap-2">
                {substats.map((sub, i) => (
                    <div key={i} className="flex gap-2 items-center bg-black/20 p-1 rounded-sm border border-white/5">
                        <div className="flex-1">
                            <Select 
                                value={sub.type} 
                                onValueChange={(val) => handleUpdate(i, val as StatType)}
                            >
                                <SelectTrigger className="h-7 text-[10px] bg-transparent border-none focus:ring-0 px-2 uppercase font-semibold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SUBSTAT_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value} className="text-[10px] uppercase">
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="flex gap-1 pr-1">
                            {[SubstatTier.None, SubstatTier.White, SubstatTier.Green, SubstatTier.Blue, SubstatTier.Purple, SubstatTier.Gold].map((tier) => (
                                    <button
                                        key={tier}
                                        onClick={() => handleUpdate(i, undefined, tier as SubstatTier)}
                                        className={cn(
                                            "w-3 h-3 rounded-full border transition-all hover:scale-125",
                                            TIER_COLORS[tier as SubstatTier],
                                            sub.tier === tier ? "ring-1 ring-white ring-offset-1 ring-offset-black scale-110" : "opacity-40"
                                        )}
                                        title={SubstatTier[tier]}
                                    />
                                ))
                            }
                        </div>
                        
                        <div className="w-10 text-right pr-2">
                            <span className={cn(
                                "text-[10px] font-mono font-bold",
                                sub.tier === SubstatTier.None ? "text-muted-foreground/30" : "text-primary"
                            )}>
                                {sub.tier === SubstatTier.None ? "0.0" : getSubstatValue(sub.type, sub.tier).toFixed(1)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
