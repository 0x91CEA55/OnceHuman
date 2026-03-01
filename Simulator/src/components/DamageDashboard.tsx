import React, { useMemo, useState } from 'react';
import { Player, PlayerStats } from '../models/player';
import { PhysicalDamagePipeline } from '../pipelines/physical';
import { KeywordDamagePipeline } from '../pipelines/keyword';
import { EncounterConditions, DamageProfile } from '../types/common';
import { StatType } from '../types/enums';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DamageEngine, SimulationLogEntry } from '../engine/damage-engine';
import { Play, History, Gauge, Zap } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { DynamicStatDisplay } from './DynamicStatDisplay';
import { StatusHUD } from './StatusHUD';
import { BaseEffect } from '../models/effect';

interface DamageDashboardProps {
    player: Player;
    conditions: EncounterConditions;
    onScrub?: (stats: Record<StatType, number> | null, buffs: { name: string, stacks: number }[], effects?: BaseEffect[]) => void;
}

export const DamageDashboard: React.FC<DamageDashboardProps> = ({ player, conditions, onScrub }) => {
    const [simDamage, setSimDamage] = useState<number | null>(null);
    const [simLogs, setSimLogs] = useState<SimulationLogEntry[]>([]);
    const [timelineIndex, setTimelineIndex] = useState(0);
    const [baseStatsSnapshot, setBaseStatsSnapshot] = useState<Record<StatType, number> | null>(null);

    const currentEntry = simLogs[timelineIndex];

    // Reactive Player for DPS calculation that follows the scrubber
    const scrubbedPlayer = useMemo(() => {
        if (!currentEntry) return player;
        // Create a temporary player with the stats from the scrubber
        const p = new Player(player.loadout, new PlayerStats(), player.currentHp);
        p.stats.applySnapshot(currentEntry.statsSnapshot);
        return p;
    }, [player, currentEntry]);

    React.useEffect(() => {
        if (simLogs.length > 0 && onScrub) {
            const entry = simLogs[timelineIndex];
            onScrub(
                entry.statsSnapshot, 
                entry.activeBuffs.map(b => ({ name: b.name, stacks: b.stacks })),
                entry.activeEffects
            );
        }
    }, [timelineIndex, simLogs, onScrub]);

    const physicalPipeline = useMemo(() => new PhysicalDamagePipeline(), []);
    const keywordPipeline = useMemo(() => new KeywordDamagePipeline(), []);

    // Calculate profiles based on scrubbed player
    const physicalProfile = useMemo(() => {
        return physicalPipeline.calculate(scrubbedPlayer, conditions);
    }, [scrubbedPlayer, conditions, physicalPipeline]);

    const keywordProfile = useMemo(() => {
        return keywordPipeline.calculate(scrubbedPlayer, conditions);
    }, [scrubbedPlayer, conditions, keywordPipeline]);

    // Dynamic fire rate/projectiles from scrubbed player
    const fireRate = scrubbedPlayer.stats.get(StatType.FireRate)?.value ?? 0;
    const projectiles = scrubbedPlayer.stats.get(StatType.ProjectilesPerShot)?.value ?? 1;
    
    const physicalDps = (physicalProfile.expected * projectiles) * (fireRate / 60);
    const keywordDps = (keywordProfile.expected * projectiles) * (fireRate / 60);

    const runSimulation = () => {
        // Capture base stats before sim
        setBaseStatsSnapshot(player.stats.snapshot());
        
        // Use a fresh player instance for sim to avoid polluting the UI base state
        const simPlayer = new Player(player.loadout, new PlayerStats(), player.currentHp);
        const engine = new DamageEngine(simPlayer, conditions);
        
        const totalDamage = engine.simulateMagDump();
        const logs = engine.getLogs();
        setSimDamage(totalDamage);
        setSimLogs(logs);
        setTimelineIndex(logs.length > 0 ? logs.length - 1 : 0);
    };

    const renderProfile = (title: string, profile: DamageProfile, dps: number, color: string) => (
        <Card className={`border-${color}/20 bg-${color}/5 overflow-hidden transition-colors`}>
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 bg-muted/20">
                <CardTitle className="text-[10px] font-black tracking-widest">{title}</CardTitle>
                <Badge className={`bg-${color} text-black font-bold border-none text-[9px]`}>
                    {Math.round(dps).toLocaleString()} DPS
                </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="flex items-baseline justify-between">
                    <span className="text-[9px] uppercase text-muted-foreground font-black tracking-tighter">Instantaneous Exp. DMG</span>
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
                            <span className="text-[8px] uppercase text-muted-foreground font-bold tracking-tighter">{item.label}</span>
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
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-primary/10 p-4 rounded-lg border border-primary/20">
                <div>
                    <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                        <Play className="w-4 h-4 fill-primary" />
                        REACTIVE DPS ENGINE
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Mag-Dump Simulation (High Fidelity)</p>
                </div>
                <div className="flex items-center gap-4">
                    {simDamage !== null && (
                        <div className="text-right">
                            <span className="text-[10px] uppercase text-muted-foreground block leading-none font-bold">Cumulative Total</span>
                            <span className="text-xl font-black text-primary font-mono">{Math.round(simDamage).toLocaleString()}</span>
                        </div>
                    )}
                    <Button onClick={runSimulation} size="sm" className="bg-primary text-primary-foreground font-black hover:bg-primary/90 shadow-[0_0_15px_rgba(77,184,255,0.3)] uppercase text-xs">
                        EXECUTE SIM
                    </Button>
                </div>
            </div>

            {simLogs.length > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <Card className="border-primary/20 bg-primary/5 p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Zap className="w-16 h-16 text-primary fill-primary" />
                        </div>
                        
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <Gauge className="w-4 h-4 text-primary" />
                                <span className="text-xs font-black uppercase tracking-widest text-primary">Simulation Scrubber</span>
                            </div>
                            
                            <div className="flex gap-4 items-center">
                                <div className="text-right border-r border-primary/20 pr-4">
                                    <span className="text-[8px] uppercase text-muted-foreground block font-bold tracking-tighter">Damage So Far</span>
                                    <span className="text-sm font-black text-primary font-mono">
                                        {Math.round(currentEntry?.accumulatedDamage || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="bg-primary/10 px-2 py-1 rounded border border-primary/20">
                                    <span className="text-[8px] uppercase text-muted-foreground block font-bold tracking-tighter">Timeline</span>
                                    <span className="text-sm font-black text-primary font-mono">
                                        T+{currentEntry?.timestamp.toFixed(2)}s
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <Slider 
                            value={[timelineIndex]} 
                            max={simLogs.length - 1} 
                            step={1} 
                            onValueChange={([val]) => setTimelineIndex(val)}
                            className="py-2"
                        />
                        
                        <div className="mt-6">
                            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2 flex items-center gap-2">
                                <span className="w-1 h-2 bg-primary/40"></span>
                                Active Status HUD
                            </div>
                            <StatusHUD 
                                buffs={currentEntry?.activeBuffs || []} 
                                dots={currentEntry?.activeDoTs || []} 
                            />
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 gap-4">
                        {baseStatsSnapshot && currentEntry && (
                            <DynamicStatDisplay 
                                key={`monitor-${timelineIndex}`}
                                baseStats={baseStatsSnapshot} 
                                currentStats={currentEntry.statsSnapshot} 
                            />
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {renderProfile("PHYSICAL (BULLET)", physicalProfile, physicalDps, "primary")}
                {player.loadout.weapon?.keyword && 
                    renderProfile(`${player.loadout.weapon.keyword.type.toUpperCase()}`, keywordProfile, keywordDps, "primary")
                }
            </div>

            {simLogs.length > 0 && (
                <Card className="border-primary/5 bg-black/20">
                    <CardHeader className="py-2 px-4 border-b border-primary/5 flex flex-row items-center gap-2">
                        <History className="w-3 h-3 text-muted-foreground" />
                        <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Simulation Timeline</CardTitle>
                    </CardHeader>
                    <ScrollArea className="h-[200px] p-4 font-mono text-[10px] leading-relaxed">
                        {simLogs.map((log, i) => (
                            <div 
                                key={i} 
                                onClick={() => setTimelineIndex(i)}
                                className={`mb-1 grid grid-cols-[60px_100px_1fr] gap-2 border-b border-white/5 pb-1 last:border-0 cursor-pointer transition-colors px-1 -mx-1 ${i === timelineIndex ? 'bg-primary/20 text-primary border-primary/20 shadow-[inset_0_0_10px_rgba(77,184,255,0.1)]' : 'hover:bg-white/5'}`}
                            >
                                <span className={i === timelineIndex ? 'text-primary font-black' : 'text-muted-foreground/50'}>{log.timestamp.toFixed(2)}s</span>
                                <span className="font-bold uppercase">[{log.event.toUpperCase()}]</span>
                                <span className={i === timelineIndex ? 'text-foreground font-medium' : 'text-foreground/70'}>{log.description}</span>
                            </div>
                        ))}
                    </ScrollArea>
                </Card>
            )}
            
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
