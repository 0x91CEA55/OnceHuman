import React from 'react';
import { GearSlot, ModKey, Rarity, StatType, CalibrationStyle } from '../types/enums';
import { RAW_WEAPONS } from '../data/weapons';
import { ARMOR } from '../data/armor';
import { MODS } from '../data/mods';
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Substat, SubstatTier } from '../models/substat';
import { Cpu, ShieldCheck, Box, Activity, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const CALIBRATION_SECONDARY_OPTIONS = [
    { label: "Crit Rate", value: StatType.CritRatePercent },
    { label: "Crit DMG", value: StatType.CritDamagePercent },
    { label: "Weakspot DMG", value: StatType.WeakspotDamagePercent },
    { label: "Elemental DMG", value: StatType.ElementalDamagePercent },
    { label: "Status DMG", value: StatType.StatusDamagePercent },
];

const TIER_COLORS: Record<SubstatTier, string> = {
    [SubstatTier.None]: "bg-muted/20 border-transparent",
    [SubstatTier.White]: "bg-zinc-400 border-zinc-300",
    [SubstatTier.Green]: "bg-green-500 border-green-400",
    [SubstatTier.Blue]: "bg-blue-500 border-blue-400",
    [SubstatTier.Purple]: "bg-purple-500 border-purple-400",
    [SubstatTier.Gold]: "bg-yellow-500 border-yellow-400",
};

interface SubstatNodeProps {
    index: number;
    substat: Substat;
    onUpdate: (index: number, type?: StatType, tier?: SubstatTier) => void;
    position: 'tl' | 'tr' | 'bl' | 'br';
}

const SubstatNode: React.FC<SubstatNodeProps> = ({ index, substat, onUpdate, position }) => {
    const posClasses = {
        tl: "top-4 left-4",
        tr: "top-4 right-4 items-end text-right",
        bl: "bottom-4 left-4",
        br: "bottom-4 right-4 items-end text-right"
    };

    return (
        <div className={cn("absolute flex flex-col gap-1.5 z-20 w-[150px] bg-black/90 p-2.5 border border-primary/20 backdrop-blur-md rounded shadow-[0_0_15px_rgba(0,0,0,0.5)] group/node hover:border-primary/60 transition-all", posClasses[position])}>
            <div className="flex justify-between items-center w-full">
                <span className="text-[8px] font-black text-primary uppercase tracking-widest">Node_0{index + 1}</span>
                <span className={cn("text-[10px] font-mono font-black tabular-nums", substat.tier === SubstatTier.None ? "text-muted-foreground/30" : "text-primary")}>
                    {substat.tier === SubstatTier.None ? "OFF" : `+${substat.value.toFixed(1)}%`}
                </span>
            </div>

            <Select
                value={substat.type}
                onValueChange={(val) => onUpdate(index, val as StatType)}
            >
                <SelectTrigger className="h-7 text-[9px] bg-white/5 border-white/10 focus:ring-0 px-2 uppercase font-black text-foreground">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-primary/20">
                    {SUBSTAT_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="text-[10px] uppercase font-bold">
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <div className="flex justify-between items-center mt-1">
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((t) => (
                        <button
                            key={t}
                            onClick={() => onUpdate(index, undefined, t as SubstatTier)}
                            className={cn(
                                "w-3 h-3 rounded-full border transition-all",
                                TIER_COLORS[t as SubstatTier],
                                substat.tier === t ? "ring-1 ring-white ring-offset-1 ring-offset-black scale-110" : "opacity-20 hover:opacity-100"
                            )}
                        />
                    ))}
                </div>
                <button
                    onClick={() => onUpdate(index, undefined, SubstatTier.None)}
                    className="text-[7px] font-black text-muted-foreground hover:text-red-400 uppercase tracking-tighter"
                >
                    RESET
                </button>
            </div>
        </div>
    );
};

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
    calibrationStyle?: CalibrationStyle;
    onCalibrationStyleChange?: (style: CalibrationStyle) => void;
    weaponDamageBonus?: number;
    onWeaponDamageBonusChange?: (val: number) => void;
    secondaryStatType?: StatType;
    onSecondaryStatTypeChange?: (type: StatType) => void;
    secondaryStatValue?: number;
    onSecondaryStatValueChange?: (val: number) => void;
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
    calibrationStyle = CalibrationStyle.None,
    onCalibrationStyleChange,
    weaponDamageBonus = 0,
    onWeaponDamageBonusChange,
    secondaryStatType = StatType.CritDamagePercent,
    onSecondaryStatTypeChange,
    secondaryStatValue = 0,
    onSecondaryStatValueChange
}) => {
    const items = slot === 'weapon_main'
        ? Object.values(RAW_WEAPONS)
        : Object.values(ARMOR).filter(a => a.slot === slot);

    const mods = Object.values(MODS).filter(m => m.slot === slot);
    const selectedItem = items.find(i => i.id === selectedItemId);
    const selectedMod = selectedModId ? MODS[selectedModId as ModKey] : undefined;

    const handleSubstatUpdate = (index: number, type?: StatType, tier?: SubstatTier) => {
        if (!selectedSubstats) return;
        const newSubstats = [...selectedSubstats] as [Substat, Substat, Substat, Substat];
        const current = selectedSubstats[index];
        newSubstats[index] = new Substat(
            type ?? current.type,
            tier !== undefined ? tier : current.tier
        );
        onSubstatChange(newSubstats);
    };

    const getRarityColor = (rarity?: Rarity) => {
        switch (rarity) {
            case Rarity.Legendary: return 'text-orange-400';
            case Rarity.Epic: return 'text-purple-400';
            default: return 'text-muted-foreground';
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500 relative">
            {/* Top Bar: Item Selection */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground flex justify-between items-center px-1">
                        <span className="flex gap-1 items-center"><Box className="w-2.5 h-2.5" /> Chassis_ID</span>
                        <span className="text-primary/40 font-mono text-[7px] uppercase">{['I', 'II', 'III', 'IV', 'V'][tierLevel - 1]}_{starLevel}S</span>
                    </Label>
                    <Select
                        value={selectedItemId || "none"}
                        onValueChange={(val) => onItemSelect(val === "none" ? "" : val)}
                    >
                        <SelectTrigger className="h-8 text-[10px] bg-black/60 border-white/10 font-mono font-black hover:border-primary/40 transition-colors uppercase">
                            <SelectValue placeholder="Select Item" />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-primary/30">
                            <SelectItem value="none" className="text-[10px] font-bold">NONE</SelectItem>
                            {items.map(item => (
                                <SelectItem key={item.id} value={item.id} className="text-[10px] font-bold">
                                    {item.name.toUpperCase()}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1">
                    <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground flex gap-1 items-center px-1">
                        <Cpu className="w-2.5 h-2.5" /> Logic_Core
                    </Label>
                    <Select
                        value={selectedModId || "none"}
                        onValueChange={(val) => onModSelect(val === "none" ? "" : val)}
                    >
                        <SelectTrigger className="h-8 text-[10px] bg-black/60 border-white/10 font-mono font-black hover:border-primary/40 transition-colors uppercase">
                            <SelectValue placeholder="Select Mod" />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-primary/30">
                            <SelectItem value="none" className="text-[10px] font-bold">NONE</SelectItem>
                            {mods.map(mod => (
                                <SelectItem key={mod.id} value={mod.id} className="text-[10px] font-bold">
                                    {mod.name.toUpperCase()}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Star & Tier Tuning Matrix */}
            {selectedItem && (
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-primary/5 border border-primary/10 p-2 rounded-sm flex justify-between items-center animate-in slide-in-from-top-2 duration-300">
                        <div className="flex flex-col">
                            <span className="text-[7px] font-black text-muted-foreground uppercase tracking-wider">Blueprint_Fidelity</span>
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
                            <span className="text-[7px] font-black text-muted-foreground uppercase tracking-wider">Production_Tier</span>
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
                </div>
            )}

            {/* Calibration Matrix (Only for Weapons) */}
            {slot === 'weapon_main' && selectedItem && (
                <div className="bg-black/40 border border-primary/10 p-3 rounded-sm space-y-3 shadow-inner">
                    <div className="flex justify-between items-center">
                        <Label className="text-[8px] font-black uppercase tracking-[0.2em] text-primary/60 flex gap-1 items-center">
                            <Settings2 className="w-3 h-3" /> Calibration_Matrix
                        </Label>
                        <div className="text-[7px] font-mono text-primary/40 uppercase">Sync_Status: Optimized</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <span className="text-[7px] font-bold text-muted-foreground uppercase pl-1">Style_Profile</span>
                            <Select
                                value={calibrationStyle}
                                onValueChange={(val) => onCalibrationStyleChange?.(val as CalibrationStyle)}
                            >
                                <SelectTrigger className="h-7 text-[9px] bg-white/5 border-white/5 font-black uppercase">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-black border-primary/20">
                                    {Object.values(CalibrationStyle).map(style => (
                                        <SelectItem key={style} value={style} className="text-[9px] font-bold uppercase">
                                            {style.replace(/_/g, ' ')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[7px] font-bold text-muted-foreground uppercase">Weapon DMG %</span>
                                <span className="text-[9px] font-mono font-black text-primary">+{weaponDamageBonus.toFixed(1)}%</span>
                            </div>
                            <input
                                type="range" min="0" max="50" step="0.5"
                                value={weaponDamageBonus}
                                onChange={(e) => onWeaponDamageBonusChange?.(parseFloat(e.target.value))}
                                className="w-full h-1 bg-primary/20 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                        <div className="space-y-1">
                            <span className="text-[7px] font-bold text-muted-foreground uppercase pl-1">Secondary_Affix</span>
                            <Select
                                value={secondaryStatType}
                                onValueChange={(val) => onSecondaryStatTypeChange?.(val as StatType)}
                            >
                                <SelectTrigger className="h-7 text-[9px] bg-white/5 border-white/5 font-black uppercase">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-black border-primary/20">
                                    {CALIBRATION_SECONDARY_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value} className="text-[9px] font-bold uppercase">
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[7px] font-bold text-muted-foreground uppercase">Value %</span>
                                <span className="text-[9px] font-mono font-black text-primary">+{secondaryStatValue.toFixed(1)}%</span>
                            </div>
                            <input
                                type="range" min="0" max="50" step="0.5"
                                value={secondaryStatValue}
                                onChange={(e) => onSecondaryStatValueChange?.(parseFloat(e.target.value))}
                                className="w-full h-1 bg-primary/20 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Central Visual Area */}
            <div className="relative aspect-square w-full bg-black/60 border border-white/10 rounded-sm overflow-hidden group shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]">
                {/* SVG Measurement Grid Overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.15]">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="blueprintGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#blueprintGrid)" className="text-primary/20" />
                    </svg>
                </div>

                {/* Metadata Floating Labels (Diegetic UX) */}
                {selectedItem && (
                    <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col gap-3 items-end pointer-events-none opacity-40 z-30">
                        <div className="flex flex-col items-end border-r-2 border-primary/40 pr-2">
                            <span className="text-[5px] text-primary font-black uppercase tracking-widest">Logic_Sig</span>
                            <span className="text-[7px] text-foreground font-mono font-bold tracking-tighter">VERIFIED</span>
                        </div>
                        <div className="flex flex-col items-end border-r-2 border-primary/40 pr-2">
                            <span className="text-[5px] text-primary font-black uppercase tracking-widest">Latency</span>
                            <span className="text-[7px] text-foreground font-mono font-bold tracking-tighter">0.04ms</span>
                        </div>
                        <div className="flex flex-col items-end border-r-2 border-primary/40 pr-2">
                            <span className="text-[5px] text-primary font-black uppercase tracking-widest">Encryption</span>
                            <span className="text-[7px] text-foreground font-mono font-bold tracking-tighter">AES_2090</span>
                        </div>
                    </div>
                )}

                {/* Substat Nodes */}
                {selectedMod && selectedSubstats && (
                    <>
                        <SubstatNode index={0} substat={selectedSubstats[0]} onUpdate={handleSubstatUpdate} position="tl" />
                        <SubstatNode index={1} substat={selectedSubstats[1]} onUpdate={handleSubstatUpdate} position="tr" />
                        <SubstatNode index={2} substat={selectedSubstats[2]} onUpdate={handleSubstatUpdate} position="bl" />
                        <SubstatNode index={3} substat={selectedSubstats[3]} onUpdate={handleSubstatUpdate} position="br" />

                        {/* Connecting Lines */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M 20,20 L 50,50 M 80,20 L 50,50 M 20,80 L 50,50 M 80,80 L 50,50" stroke="var(--primary)" strokeWidth="0.3" fill="none" strokeDasharray="2,2" />
                            <circle cx="50" cy="50" r="20" stroke="var(--primary)" strokeWidth="0.1" fill="none" strokeDasharray="1,1" />
                            <circle cx="50" cy="50" r="5" stroke="var(--primary)" strokeWidth="0.5" fill="none" />
                        </svg>
                    </>
                )}

                {/* Main Visual Placeholder with Schematic Depth */}
                <div className="absolute inset-0 flex items-center justify-center">
                    {selectedItem ? (
                        <div className="relative w-48 h-48 border border-dashed border-primary/10 rounded-full flex items-center justify-center">
                            <div className="w-full h-full absolute inset-0 bg-primary/5 rounded-full blur-3xl opacity-20 animate-pulse"></div>

                            {/* Rotating Inner Depth Ring */}
                            <div className="absolute inset-4 border border-dashed border-primary/20 rounded-full animate-spin" style={{ animationDuration: '15s' }}></div>
                            {/* Rotating Outer Depth Ring */}
                            <div className="absolute inset-[-12px] border border-dotted border-primary/10 rounded-full animate-spin" style={{ animationDuration: '25s', animationDirection: 'reverse' }}></div>

                            <div className="text-primary/40 font-black text-[10px] uppercase tracking-[0.3em] text-center leading-relaxed relative z-10">
                                Schematic_Core<br />
                                <span className="text-[7px] text-primary/20">Sync_Active</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-muted-foreground/5 font-black text-4xl uppercase tracking-[0.5em] rotate-12 select-none">
                            NO_SIGNAL
                        </div>
                    )}
                </div>

                {/* Bottom Overlay Info */}
                {selectedItem && (
                    <div className="absolute bottom-[42%] left-0 w-full text-center pointer-events-none z-10">
                        <div className={`text-[8px] font-black uppercase tracking-[0.4em] ${getRarityColor(selectedItem.rarity)} mb-1`}>
                            {selectedItem.rarity}
                        </div>
                        <div className="text-sm font-black text-foreground tracking-tight uppercase px-4 leading-tight drop-shadow-lg">
                            {selectedItem.name}
                        </div>
                    </div>
                )}

                {/* Laser Tether to Mod Box (Internal SVG) */}
                {selectedMod && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M 50,50 L 50,100" stroke="var(--primary)" strokeWidth="0.5" strokeDasharray="1,2" opacity="0.2" />
                    </svg>
                )}
            </div>

            {/* Mod Description (The Tethered Label) */}
            {selectedMod && (
                <div className="bg-primary/5 border border-primary/20 p-3 rounded relative group/mod transition-all hover:bg-primary/10 overflow-hidden shadow-[0_0_20px_rgba(77,184,255,0.05)]">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/40"></div>
                    {/* Corner Tether Points */}
                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/40"></div>

                    <div className="flex gap-3 items-start">
                        <div className="p-1.5 bg-primary/20 rounded border border-primary/30 flex-shrink-0">
                            <ShieldCheck className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <div className="text-[9px] font-black uppercase text-primary tracking-[0.2em]">Augmentation_Logic_Output</div>
                                <div className="flex gap-1 items-center opacity-40">
                                    <Activity className="w-2 h-2 text-primary" />
                                    <span className="text-[6px] font-mono text-primary uppercase">Bit_Rate: 128kbps</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-foreground/90 leading-relaxed font-medium italic">
                                {selectedMod.description}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
/* diagnostic */
