import React from 'react';
import { EncounterConditions } from '../types/common';
import { EnemyType } from '../types/enums';
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
    const handleUpdate = (updates: Partial<EncounterConditions>) => {
        onChange({ ...conditions, ...updates });
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Enemy Type</Label>
                <Select 
                    value={conditions.enemyType} 
                    onValueChange={(val) => handleUpdate({ enemyType: val as EnemyType })}
                >
                    <SelectTrigger className="bg-background/50 border-primary/10">
                        <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.values(EnemyType).map(type => (
                            <SelectItem key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Weakspot Hit Rate</Label>
                    <span className="text-xs font-mono text-primary">{Math.round(conditions.weakspotHitRate * 100)}%</span>
                </div>
                <Slider 
                    min={0} 
                    max={1} 
                    step={0.01} 
                    value={[conditions.weakspotHitRate]}
                    onValueChange={([val]) => handleUpdate({ weakspotHitRate: val })}
                    className="py-2"
                />
            </div>

            <div className="space-y-4">
                <div className="flex justify-between">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Target Distance</Label>
                    <span className="text-xs font-mono text-primary">{conditions.targetDistanceMeters}m</span>
                </div>
                <Slider 
                    min={1} 
                    max={100} 
                    step={1} 
                    value={[conditions.targetDistanceMeters]}
                    onValueChange={([val]) => handleUpdate({ targetDistanceMeters: val })}
                    className="py-2"
                />
            </div>

            <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                    id="vulnerable-check"
                    checked={conditions.isTargetVulnerable}
                    onCheckedChange={(checked) => handleUpdate({ isTargetVulnerable: !!checked })}
                />
                <Label 
                    htmlFor="vulnerable-check"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                    Target is Vulnerable
                </Label>
            </div>
        </div>
    );
};
