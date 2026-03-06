import React from 'react';
import { GearSlot, ModKey, StatType, CalibrationStyle, AmmunitionType } from '../types/enums';
import { ACTIVE_REGISTRY } from '../data/generated/registry';
import { ARMOR } from '../data/armor';
import { MODS } from '../data/mods';
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Substat } from '../models/substat';
import { ModSubstatSelector } from './ModSubstatSelector';
import { cn } from '../lib/utils';
import { Box, Layers, Settings2 } from 'lucide-react';
import { AMMUNITION } from '../data/ammunition';

interface TechnicalSchematicProps {
    slot: GearSlot;
    selectedItemId?: string;
    selectedModId?: string;
    selectedSubstats?: [Substat, Substat, Substat, Substat];
    onItemSelect: (id: string) => void;
    onModSelect: (id: string) => void;
    onSubstatChange: (substats: [Substat, Substat, Substat, Substat]) => void;
    starLevel?: number;
    onStarLevelChange?: (star: number) => void;
    tierLevel?: number;
    onTierLevelChange?: (tier: number) => void;
    calibrationLevel?: number;
    onCalibrationLevelChange?: (level: number) => void;
    calibrationStyle?: CalibrationStyle;
    onCalibrationStyleChange?: (style: CalibrationStyle) => void;
    weaponDamageBonus?: number;
    onWeaponDamageBonusChange?: (val: number) => void;
    secondaryStatType?: StatType;
    onSecondaryStatTypeChange?: (type: StatType) => void;
    secondaryStatValue?: number;
    onSecondaryStatValueChange?: (val: number) => void;
    selectedAmmunition?: AmmunitionType;
    onAmmunitionChange?: (type: AmmunitionType) => void;
}

export const TechnicalSchematic: React.FC<TechnicalSchematicProps> = ({
    slot,
    selectedItemId,
    selectedModId,
    selectedSubstats,
    onItemSelect,
    onModSelect,
    onSubstatChange,
    starLevel = 1,
    onStarLevelChange,
    tierLevel = 5,
    onTierLevelChange,
    calibrationLevel = 0,
    onCalibrationLevelChange,
    calibrationStyle = CalibrationStyle.None,
    onCalibrationStyleChange,
    weaponDamageBonus = 0,
    onWeaponDamageBonusChange,
    secondaryStatType = StatType.CritDamagePercent,
    onSecondaryStatTypeChange,
    secondaryStatValue = 0,
    onSecondaryStatValueChange,
    selectedAmmunition,
    onAmmunitionChange
}) => {
    const items = slot === 'weapon_main'
        ? Object.values(ACTIVE_REGISTRY).map(b => ({ id: b.key, name: b.name, rarity: b.rarity }))
        : Object.values(ARMOR).filter(a => a.slot === slot);

    const mods = Object.values(MODS).filter(m => m.slot === slot);
    const selectedItem = items.find(i => i.id === selectedItemId);
    const selectedMod = selectedModId ? MODS[selectedModId as ModKey] : undefined;

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Primary Selection Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground flex justify-between items-center px-1">
                        <span className="flex gap-1 items-center"><Box className="w-2.5 h-2.5" /> Item_Config</span>
                    </Label>
                    <Select value={selectedItemId || "none"} onValueChange={(val) => onItemSelect(val === "none" ? "" : val)}>
                        <SelectTrigger className="h-9 text-[11px] font-bold bg-black/40 border-primary/10 hover:border-primary/30 transition-colors uppercase tracking-tight">
                            <SelectValue placeholder="No Hardware Installed" />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-primary/20">
                            <SelectItem value="none" className="text-[10px] uppercase font-bold">Empty Slot</SelectItem>
                            {items.map(item => (
                                <SelectItem key={item.id} value={item.id} className="text-[10px] uppercase font-bold">
                                    {item.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground flex justify-between items-center px-1">
                        <span className="flex gap-1 items-center"><Layers className="w-2.5 h-2.5" /> Mod</span>
                    </Label>
                    <Select value={selectedModId || "none"} onValueChange={(val) => onModSelect(val === "none" ? "" : val)}>
                        <SelectTrigger className="h-9 text-[11px] font-bold bg-black/40 border-primary/10 hover:border-primary/30 transition-colors uppercase tracking-tight">
                            <SelectValue placeholder="No Mod Installed" />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-primary/20">
                            <SelectItem value="none" className="text-[10px] uppercase font-bold">Empty Slot</SelectItem>
                            {mods.map(mod => (
                                <SelectItem key={mod.id} value={mod.id} className="text-[10px] uppercase font-bold">
                                    {mod.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Star & Tier Tuning Matrix */}
            {selectedItem && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <div className="bg-primary/5 border border-primary/10 p-2 rounded-sm flex justify-between items-center animate-in slide-in-from-top-2 duration-300">
                        <div className="flex flex-col">
                            <span className="text-[7px] font-black text-muted-foreground uppercase tracking-wider">Stars</span>
                            <div className="flex gap-1 mt-1">
                                {[1, 2, 3, 4, 5, 6].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => onStarLevelChange?.(s)}
                                        className={cn(
                                            "w-4 h-4 text-[10px] flex items-center justify-center font-black transition-all border",
                                            starLevel >= s ? "bg-primary text-black border-primary shadow-[0_0_8px_rgba(77,184,255,0.4)]" : "text-primary/40 border-primary/20 hover:border-primary/60"
                                        )}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-mono font-black text-primary">+{((starLevel - 1) * 5).toFixed(0)}%</span>
                            <div className="text-[6px] text-muted-foreground uppercase">Base_Dmg</div>
                        </div>
                    </div>

                    <div className="bg-blue-400/5 border border-blue-400/10 p-2 rounded-sm flex justify-between items-center animate-in slide-in-from-top-2 duration-300">
                        <div className="flex flex-col">
                            <span className="text-[7px] font-black text-muted-foreground uppercase tracking-wider">Tier</span>
                            <div className="flex gap-1 mt-1">
                                {[1, 2, 3, 4, 5].map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => onTierLevelChange?.(t)}
                                        className={cn(
                                            "w-4 h-4 text-[10px] flex items-center justify-center font-black transition-all border",
                                            tierLevel === t ? "bg-blue-400 text-black border-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.4)]" : "text-blue-400/40 border-blue-400/20 hover:border-blue-400/60"
                                        )}
                                    >
                                        {['I', 'II', 'III', 'IV', 'V'][t - 1]}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-mono font-black text-blue-400">LVL_{tierLevel * 10 - 10 || 1}</span>
                            <div className="text-[6px] text-muted-foreground uppercase">Tech_Stage</div>
                        </div>
                    </div>

                    {slot === 'weapon_main' && (
                        <div className="bg-orange-400/5 border border-orange-400/10 p-2 rounded-sm flex justify-between items-center animate-in slide-in-from-top-2 duration-300 col-span-2 md:col-span-1">
                            <div className="flex flex-col w-full">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[7px] font-black text-muted-foreground uppercase tracking-wider">Calibration</span>
                                    <span className="text-[10px] font-mono font-black text-orange-400">+{calibrationLevel}</span>
                                </div>
                                <input
                                    type="range" min="0" max="10" step="1"
                                    value={calibrationLevel}
                                    onChange={(e) => onCalibrationLevelChange?.(parseInt(e.target.value))}
                                    className="w-full h-1 bg-orange-400/20 rounded-lg appearance-none cursor-pointer accent-orange-400"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Calibration Matrix (Only for Weapons) */}
            {slot === 'weapon_main' && selectedItem && (
                <div className="bg-orange-400/5 border border-orange-400/10 p-4 rounded-sm space-y-4 animate-in slide-in-from-bottom-2 duration-500">
                    <div className="flex items-center gap-2 border-b border-orange-400/20 pb-2 mb-2">
                        <Settings2 className="w-3 h-3 text-orange-400" />
                        <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">Calibration_Matrix</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[8px] font-black uppercase text-muted-foreground px-1">Style_Blueprint</Label>
                            <Select value={calibrationStyle} onValueChange={(val) => onCalibrationStyleChange?.(val as CalibrationStyle)}>
                                <SelectTrigger className="h-8 text-[10px] font-bold bg-black/40 border-orange-400/20 uppercase">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-black border-orange-400/20">
                                    {Object.values(CalibrationStyle).map(style => (
                                        <SelectItem key={style} value={style} className="text-[10px] uppercase font-bold">{style}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[8px] font-black uppercase text-muted-foreground px-1">Ammunition</Label>
                            <Select value={selectedAmmunition} onValueChange={(val) => onAmmunitionChange?.(val as AmmunitionType)}>
                                <SelectTrigger className="h-8 text-[10px] font-bold bg-black/40 border-orange-400/20 uppercase">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-black border-orange-400/20">
                                    {Object.values(AMMUNITION).map(ammo => (
                                        <SelectItem key={ammo.type} value={ammo.type} className="text-[10px] uppercase font-bold">{ammo.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[8px] font-black uppercase text-muted-foreground px-1 flex justify-between">
                                <span>RNG_Base_DMG</span>
                                <span className="text-orange-400">+{weaponDamageBonus}%</span>
                            </Label>
                            <input
                                type="range" min="0" max="20" step="0.5"
                                value={weaponDamageBonus}
                                onChange={(e) => onWeaponDamageBonusChange?.(parseFloat(e.target.value))}
                                className="w-full h-1 bg-orange-400/20 rounded-lg appearance-none cursor-pointer accent-orange-400"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[8px] font-black uppercase text-muted-foreground px-1">Secondary_Affix</Label>
                            <div className="flex gap-2">
                                <Select value={secondaryStatType} onValueChange={(val) => onSecondaryStatTypeChange?.(val as StatType)}>
                                    <SelectTrigger className="h-8 text-[9px] font-bold bg-black/40 border-orange-400/20 uppercase flex-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-black border-orange-400/20 text-[9px]">
                                        <SelectItem value={StatType.CritDamagePercent}>CRIT_DMG</SelectItem>
                                        <SelectItem value={StatType.WeakspotDamagePercent}>WEAKSPOT_DMG</SelectItem>
                                        <SelectItem value={StatType.StatusDamagePercent}>STATUS_DMG</SelectItem>
                                        <SelectItem value={StatType.ElementalDamagePercent}>ELEMENT_DMG</SelectItem>
                                    </SelectContent>
                                </Select>
                                <input
                                    type="number"
                                    value={secondaryStatValue}
                                    onChange={(e) => onSecondaryStatValueChange?.(parseFloat(e.target.value))}
                                    className="w-12 h-8 bg-black/40 border border-orange-400/20 rounded text-[10px] font-mono font-black text-center text-orange-400 focus:outline-none focus:border-orange-400/60"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Substat Nodes & Mod Summary */}
            {selectedMod && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-5 bg-primary/5 border border-primary/10 p-4 rounded-sm relative overflow-hidden group min-h-[140px] flex flex-col justify-center animate-in slide-in-from-left-2 duration-500">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                            <Layers className="w-12 h-12 text-primary" />
                        </div>
                        <h4 className="text-[10px] font-black text-primary uppercase tracking-widest border-b border-primary/20 pb-1 mb-2">{selectedMod.name}</h4>
                        <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                            {selectedMod.description}
                        </p>
                    </div>

                    <div className="md:col-span-7 flex justify-center py-4 animate-in slide-in-from-right-2 duration-500">
                        {selectedSubstats && (
                            <ModSubstatSelector
                                substats={selectedSubstats}
                                onChange={onSubstatChange}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
