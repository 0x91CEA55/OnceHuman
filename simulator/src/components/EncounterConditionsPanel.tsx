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
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* Enemy Configuration */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target_Type</Label>
                    <span className="text-[8px] font-mono text-primary/60">ENUM_VAL</span>
                </div>
                <Select 
                    value={conditions.enemyType} 
                    onValueChange={(val) => update({ enemyType: val as EnemyType })}
                >
                    <SelectTrigger className="h-8 text-xs bg-black/40 border-primary/10 hover:border-primary/30 transition-colors uppercase font-bold">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-primary/20">
                        {Object.values(EnemyType).map(type => (
                            <SelectItem key={type} value={type} className="text-xs uppercase font-bold">{type}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Topology Selection */}
            <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Engagement_Topology</Label>
                <Select 
                    value={conditions.topology} 
                    onValueChange={(val) => update({ topology: val as EncounterTopology })}
                >
                    <SelectTrigger className="h-8 text-xs bg-black/40 border-primary/10 hover:border-primary/30 transition-colors uppercase font-bold">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-primary/20">
                        {Object.values(EncounterTopology).map((t: EncounterTopology) => (
                            <SelectItem key={t} value={t} className="text-xs uppercase font-bold">{t.replace('-', ' ')}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Multi-Slider Matrix */}
            <div className="space-y-4 pt-2">
                <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Distance</Label>
                        <span className="text-[10px] font-mono font-black text-primary">{conditions.targetDistanceMeters}m</span>
                    </div>
                    <Slider 
                        value={[conditions.targetDistanceMeters]} 
                        min={1} max={50} step={1}
                        onValueChange={([val]) => update({ targetDistanceMeters: val })}
                        className="py-2"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-red-400/80">Integrity_HP</Label>
                        <span className="text-[10px] font-mono font-black text-red-400">{conditions.playerHpPercent}%</span>
                    </div>
                    <Slider 
                        value={[conditions.playerHpPercent]} 
                        min={1} max={100} step={1}
                        onValueChange={([val]) => update({ playerHpPercent: val })}
                        className="py-2"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-blue-400/80">Shield_Static</Label>
                        <span className="text-[10px] font-mono font-black text-blue-400">{conditions.playerShieldPercent}%</span>
                    </div>
                    <Slider 
                        value={[conditions.playerShieldPercent]} 
                        min={0} max={100} step={1}
                        onValueChange={([val]) => update({ playerShieldPercent: val })}
                        className="py-2"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">WS_Success_Prob</Label>
                        <span className="text-[10px] font-mono font-black text-primary">{(conditions.weakspotHitRate * 100).toFixed(0)}%</span>
                    </div>
                    <Slider 
                        value={[conditions.weakspotHitRate * 100]} 
                        min={0} max={100} step={1}
                        onValueChange={([val]) => update({ weakspotHitRate: val / 100 })}
                        className="py-2"
                    />
                </div>
            </div>

            {/* Boolean Logic Toggles */}
            <div className="pt-2 border-t border-primary/10 mt-2 space-y-3">
                <div className="flex items-center space-x-2 bg-primary/5 p-2 rounded-sm border border-primary/10 hover:border-primary/30 transition-colors cursor-pointer group" onClick={() => update({ isTargetVulnerable: !conditions.isTargetVulnerable })}>
                    <Checkbox id="vulnerable" checked={conditions.isTargetVulnerable} />
                    <label htmlFor="vulnerable" className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground group-hover:text-primary transition-colors cursor-pointer">
                        Target_Vulnerability_Override
                    </label>
                </div>
            </div>
        </div>
    );
};
