import React from 'react';
import { EncounterConditions } from '../types/common';
import { EnemyType } from '../types/enums';
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Target, Ruler, Radio, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EncounterConditionsPanelProps {
    conditions: EncounterConditions;
    onChange: (conditions: EncounterConditions) => void;
}

export const EncounterConditionsPanel: React.FC<EncounterConditionsPanelProps> = ({
    conditions,
    onChange
}) => {
    const handleUpdate = (updates: Partial<EncounterConditions>) => {
        onChange({ ...conditions, ...updates });
    };

    return (
        <div className="space-y-4 px-1">
            {/* Row 1: Enemy Type & Vulnerability Toggle */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground flex gap-1 items-center">
                        <Radio className="w-2 h-2 text-primary" /> Object_Class
                    </Label>
                    <Select 
                        value={conditions.enemyType} 
                        onValueChange={(val) => handleUpdate({ enemyType: val as EnemyType })}
                    >
                        <SelectTrigger className="h-6 text-[9px] bg-black/40 border-white/5 font-black uppercase hover:border-primary/30 transition-all rounded-none px-2">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-primary/20">
                            {Object.values(EnemyType).map(type => (
                                <SelectItem key={type} value={type} className="text-[9px] font-bold uppercase">
                                    {type}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground flex gap-1 items-center">
                        <ShieldAlert className={cn("w-2 h-2 transition-colors", conditions.isTargetVulnerable ? "text-red-500" : "text-muted-foreground/40")} /> Override
                    </Label>
                    <label 
                        htmlFor="vulnerable-check"
                        className="flex items-center justify-between h-6 bg-black/40 border border-white/5 px-2 cursor-pointer hover:bg-red-500/5 hover:border-red-500/30 transition-all group"
                    >
                        <span className={cn("text-[8px] font-black uppercase tracking-tighter transition-colors", conditions.isTargetVulnerable ? "text-red-400" : "text-muted-foreground/40")}>
                            {conditions.isTargetVulnerable ? "VULN_ON" : "VULN_OFF"}
                        </span>
                        <Checkbox 
                            id="vulnerable-check"
                            checked={conditions.isTargetVulnerable}
                            onCheckedChange={(checked) => handleUpdate({ isTargetVulnerable: !!checked })}
                            className="w-3 h-3 border-white/20 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500 rounded-none"
                        />
                    </label>
                </div>
            </div>

            {/* Row 2: Weakspot & Distance */}
            <div className="grid grid-cols-2 gap-4 pt-1">
                {/* Weakspot Hit Rate */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground flex gap-1 items-center">
                            <Target className="w-2 h-2 text-primary" /> Precision
                        </Label>
                        <span className="text-[9px] font-mono font-black text-foreground">{Math.round(conditions.weakspotHitRate * 100)}%</span>
                    </div>
                    <Slider 
                        min={0} 
                        max={1} 
                        step={0.01} 
                        value={[conditions.weakspotHitRate]}
                        onValueChange={([val]) => handleUpdate({ weakspotHitRate: val })}
                        className="py-0.5"
                    />
                </div>

                {/* Target Distance */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground flex gap-1 items-center">
                            <Ruler className="w-2 h-2 text-primary" /> Distance
                        </Label>
                        <span className="text-[9px] font-mono font-black text-foreground">{conditions.targetDistanceMeters}m</span>
                    </div>
                    <Slider 
                        min={1} 
                        max={100} 
                        step={1} 
                        value={[conditions.targetDistanceMeters]}
                        onValueChange={([val]) => handleUpdate({ targetDistanceMeters: val })}
                        className="py-0.5"
                    />
                </div>
            </div>
            
            {/* Metadata Footer Line */}
            <div className="pt-1 border-t border-white/5 flex justify-between">
                <span className="text-[5px] font-mono text-primary/20 uppercase tracking-[0.2em]">Environmental_Sim_Core</span>
                <span className="text-[5px] font-mono text-primary/20 uppercase tracking-[0.2em]">OBJ_ID::{conditions.enemyType.toUpperCase()}</span>
            </div>
        </div>
    );
};
