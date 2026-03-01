import React, { useMemo } from 'react';
import { Player } from '../models/player';
import { PhysicalDamagePipeline } from '../pipelines/physical';
import { KeywordDamagePipeline } from '../pipelines/keyword';
import { EncounterConditions, DamageProfile } from '../types/common';
import { StatType } from '../types/enums';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface DamageDashboardProps {
    player: Player;
    conditions: EncounterConditions;
}

export const DamageDashboard: React.FC<DamageDashboardProps> = ({ player, conditions }) => {
    const physicalPipeline = useMemo(() => new PhysicalDamagePipeline(), []);
    const keywordPipeline = useMemo(() => new KeywordDamagePipeline(), []);

    const physicalProfile = useMemo(() => {
        return physicalPipeline.calculate(player, conditions);
    }, [player, conditions, physicalPipeline]);

    const keywordProfile = useMemo(() => {
        return keywordPipeline.calculate(player, conditions);
    }, [player, conditions, keywordPipeline]);

    // DPS Calculation
    const fireRate = player.stats.get(StatType.FireRate)?.value ?? 0;
    const projectiles = player.stats.get(StatType.ProjectilesPerShot)?.value ?? 1;
    
    const physicalDps = (physicalProfile.expected * projectiles) * (fireRate / 60);
    const keywordDps = (keywordProfile.expected * projectiles) * (fireRate / 60);

    const renderProfile = (title: string, profile: DamageProfile, dps: number, color: string) => (
        <Card className={`border-${color}/20 bg-${color}/5 overflow-hidden`}>
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 bg-muted/20">
                <CardTitle className="text-sm font-bold tracking-tight">{title}</CardTitle>
                <Badge className={`bg-${color} text-black font-bold border-none`}>
                    {Math.round(dps).toLocaleString()} DPS
                </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="flex items-baseline justify-between">
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold">Expected Per Shot</span>
                    <span className={`text-2xl font-black font-mono text-${color}`}>
                        {Math.round(profile.expected).toLocaleString()}
                    </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { label: "Non-Crit", value: profile.noCritNoWs },
                        { label: "Crit", value: profile.critNoWs },
                        { label: "Weakspot", value: profile.noCritWs },
                        { label: "Crit+WS", value: profile.critWs, highlight: true },
                    ].map((item, i) => (
                        <div key={i} className={`p-2 rounded border border-white/5 flex flex-col ${item.highlight ? 'bg-white/5 border-primary/20' : ''}`}>
                            <span className="text-[9px] uppercase text-muted-foreground">{item.label}</span>
                            <span className={`text-xs font-mono font-bold ${item.highlight ? 'text-primary' : 'text-foreground'}`}>
                                {Math.round(item.value).toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
                {renderProfile("PHYSICAL (BULLET)", physicalProfile, physicalDps, "primary")}
                {player.loadout.weapon?.keyword && keywordProfile.expected > 0 && 
                    renderProfile(`${player.loadout.weapon.keyword.type.toUpperCase()}`, keywordProfile, keywordDps, "primary")
                }
            </div>
            
            <div className="bg-muted/30 p-3 rounded-md border border-primary/5">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Calculated for <span className="text-foreground font-bold">{conditions.enemyType}</span> target 
                    at <span className="text-foreground font-bold">{conditions.targetDistanceMeters}m</span>, 
                    assuming <span className="text-foreground font-bold">{conditions.weakspotHitRate * 100}%</span> weakspot hit accuracy.
                </p>
            </div>
        </div>
    );
};
