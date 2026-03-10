import React from 'react';
import { EncounterConditions } from '../types/common';
import { EnemyType, EncounterTopology } from '../types/enums';
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"

interface EncounterConditionsPanelProps {
    conditions: EncounterConditions;
    onChange: (conditions: EncounterConditions) => void;
}

export const EncounterConditionsPanel: React.FC<EncounterConditionsPanelProps> = ({ 
    conditions, 
    onChange
}) => {
    const update = (patch: Partial<EncounterConditions>) => {
        onChange(Object.assign(new EncounterConditions(), conditions, patch));
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* 1. Header Meta (Target & Topology) */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-0.5">Target_Type</Label>
                    <Select 
                        value={conditions.enemyType} 
                        onValueChange={(val) => update({ enemyType: val as EnemyType })}
                    >
                        <SelectTrigger className="h-7 text-[10px] bg-black/40 border-primary/10 hover:border-primary/30 transition-colors uppercase font-bold px-2">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-primary/20">
                            {Object.values(EnemyType).map(type => (
                                <SelectItem key={type} value={type} className="text-xs uppercase font-bold">{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-0.5">Topology</Label>
                    <Select 
                        value={conditions.topology} 
                        onValueChange={(val) => update({ topology: val as EncounterTopology })}
                    >
                        <SelectTrigger className="h-7 text-[10px] bg-black/40 border-primary/10 hover:border-primary/30 transition-colors uppercase font-bold px-2">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-primary/20">
                            {Object.values(EncounterTopology).map((t: EncounterTopology) => (
                                <SelectItem key={t} value={t} className="text-xs uppercase font-bold">{t.replace('-', ' ')}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* 2. Grid-Condensed Sliders */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1 border-t border-white/5 mt-1">
                {/* Distance */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center px-0.5">
                        <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Dist</Label>
                        <span className="text-[9px] font-mono font-black text-primary">{conditions.targetDistanceMeters}m</span>
                    </div>
                    <Slider 
                        value={[conditions.targetDistanceMeters]} 
                        min={1} max={50} step={1}
                        onValueChange={([val]) => update({ targetDistanceMeters: val })}
                        className="py-1"
                    />
                </div>

                {/* WS Success */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center px-0.5">
                        <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">WS_Prob</Label>
                        <span className="text-[9px] font-mono font-black text-primary">{(conditions.weakspotHitRate * 100).toFixed(0)}%</span>
                    </div>
                    <Slider 
                        value={[conditions.weakspotHitRate * 100]} 
                        min={0} max={100} step={1}
                        onValueChange={([val]) => update({ weakspotHitRate: val / 100 })}
                        className="py-1"
                    />
                </div>

                {/* Integrity HP */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center px-0.5">
                        <Label className="text-[8px] font-black uppercase tracking-widest text-red-400/80">HP</Label>
                        <span className="text-[9px] font-mono font-black text-red-400">{conditions.playerHpPercent}%</span>
                    </div>
                    <Slider 
                        value={[conditions.playerHpPercent]} 
                        min={1} max={100} step={1}
                        onValueChange={([val]) => update({ playerHpPercent: val })}
                        className="py-1"
                    />
                </div>

                {/* Shield Static */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center px-0.5">
                        <Label className="text-[8px] font-black uppercase tracking-widest text-blue-400/80">Shield</Label>
                        <span className="text-[9px] font-mono font-black text-blue-400">{conditions.playerShieldPercent}%</span>
                    </div>
                    <Slider 
                        value={[conditions.playerShieldPercent]} 
                        min={0} max={100} step={1}
                        onValueChange={([val]) => update({ playerShieldPercent: val })}
                        className="py-1"
                    />
                </div>
            </div>

            {/* 3. Logic Override Toggle */}
            <div className="flex items-center space-x-2 bg-primary/5 p-1.5 rounded-sm border border-primary/10 hover:border-primary/20 transition-all cursor-pointer group" onClick={() => update({ isTargetVulnerable: !conditions.isTargetVulnerable })}>
                <Checkbox id="vulnerable" checked={conditions.isTargetVulnerable} className="h-3 w-3" />
                <label htmlFor="vulnerable" className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground group-hover:text-primary transition-colors cursor-pointer leading-none">
                    Target_Vulnerability_Override_Logic
                </label>
            </div>
        </div>
    );
};
