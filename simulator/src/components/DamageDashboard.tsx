import React, { useMemo, useState } from 'react';
import { Player, PlayerStats } from '../models/player';
import { EncounterConditions } from '../types/common';
import { StatType, DamageTrait } from '../types/enums';
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DamageEngine, MonteCarloResult, SimulationLogEntry } from '../engine/damage-engine';
import { Activity, Scale } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { StatusHUD } from './StatusHUD';
import { BaseEffect } from '../models/effect';
import { DamageTimeSeriesChart, DpsDistributionChart } from './AnalyticsCharts';
import { MultiplierBalanceChart } from './MultiplierBalanceChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { resolveScenarioScan, KEYWORD_TRAIT_MAP } from '../engine/resolver';

interface DamageDashboardProps {
    player: Player;
    conditions: EncounterConditions;
    onScrub?: (stats: Record<StatType, number> | null, buffs: { name: string, stacks: number }[], effects?: BaseEffect[], index?: number) => void;
    onLogsUpdate?: (logs: SimulationLogEntry[]) => void;
}

export const DamageDashboard: React.FC<DamageDashboardProps> = ({ 
    player, 
    conditions, 
    onScrub, 
    onLogsUpdate 
}) => {
    const [mcResult, setMcResult] = useState<MonteCarloResult | null>(null);
    const [timelineIndex, setTimelineIndex] = useState(0);
    const [isSimulating, setIsSimulating] = useState(false);
    const [progress, setProgress] = useState(0);

    const simLogs = mcResult?.sampleLogs || [];
    const currentEntry = simLogs[timelineIndex];

    const scrubbedPlayer = useMemo(() => {
        if (!currentEntry) return player;
        const p = new Player(player.loadout, new PlayerStats(), player.currentHp);
        p.stats.applySnapshot(currentEntry.statsSnapshot);
        return p;
    }, [player, currentEntry]);

    React.useEffect(() => {
        if (simLogs.length > 0 && onScrub && mcResult) {
            const entry = simLogs[timelineIndex];
            const telemetryTimeAxis = mcResult.telemetry.timeAxis;
            let closestTelemetryIndex = 0;
            let minDiff = Infinity;
            
            for (let i = 0; i < telemetryTimeAxis.length; i++) {
                const diff = Math.abs(telemetryTimeAxis[i] - entry.timestamp);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestTelemetryIndex = i;
                }
            }

            onScrub(
                entry.statsSnapshot, 
                entry.activeBuffs.map(b => ({ name: b.name, stacks: b.stacks })),
                entry.activeEffects,
                closestTelemetryIndex
            );
        }
    }, [timelineIndex, simLogs, onScrub, mcResult]);

    const weapon = scrubbedPlayer.loadout.weapon;
    const baseDamage = scrubbedPlayer.stats.get(StatType.DamagePerProjectile)?.value ?? 0;

    const physicalTraits = useMemo(() => new Set([DamageTrait.Attack, DamageTrait.Weapon]), []);
    const physicalProfile = useMemo(() => 
        resolveScenarioScan(baseDamage, scrubbedPlayer, conditions.enemyType, physicalTraits),
    [baseDamage, scrubbedPlayer, conditions.enemyType, physicalTraits]);

    const keywordProfile = useMemo(() => {
        if (!weapon?.keyword || !weapon.keyword.baseStatType || weapon.keyword.scalingFactor === undefined) return null;
        const traits = new Set(KEYWORD_TRAIT_MAP[weapon.keyword.type] || []);
        const kwBase = (scrubbedPlayer.stats.get(weapon.keyword.baseStatType)?.value ?? 0) * weapon.keyword.scalingFactor;
        return resolveScenarioScan(kwBase, scrubbedPlayer, conditions.enemyType, traits);
    }, [weapon, scrubbedPlayer, conditions.enemyType]);

    const runMonteCarloSim = async () => {
        setIsSimulating(true);
        setProgress(0);
        await new Promise(resolve => setTimeout(resolve, 50));
        const simPlayer = new Player(player.loadout, new PlayerStats(), player.currentHp);
        const engine = new DamageEngine(simPlayer, conditions);
        const result = await engine.runMonteCarlo(500, (p) => setProgress(Math.round(p * 100))); 
        setMcResult(result);
        setTimelineIndex(result.sampleLogs.length > 0 ? result.sampleLogs.length - 1 : 0);
        if (onLogsUpdate) onLogsUpdate(result.sampleLogs);
        setIsSimulating(false);
    };

    const renderPowerReadout = (title: string, profile: any, color: string) => (
        <div className={`border-l-2 pl-3 py-1 bg-${color}/5 border-${color}/40 group`}>
            <div className="flex justify-between items-start">
                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">{title}</span>
                <span className={`text-[10px] font-mono font-black text-${color}`}>
                    {Math.round(profile.expected).toLocaleString()} EXP_DMG
                </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                <div className="flex justify-between">
                    <span className="text-[7px] uppercase font-bold text-muted-foreground">Normal</span>
                    <span className="text-[8px] font-mono font-bold text-foreground">{Math.round(profile.noCritNoWs).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-[7px] uppercase font-bold text-primary">Crit+WS</span>
                    <span className="text-[8px] font-mono font-bold text-primary">{Math.round(profile.critWs).toLocaleString()}</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-3 rounded relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/40"></div>
                <div className="flex gap-4 items-center">
                    <div className="p-2 bg-primary/10 rounded border border-primary/20">
                        <Activity className="w-4 h-4 text-primary animate-pulse" />
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black text-foreground tracking-widest uppercase flex items-center gap-2">
                            Monte Carlo Engine
                            <Badge variant="outline" className={`h-4 text-[7px] px-1 ${isSimulating ? 'border-yellow-500 text-yellow-500 animate-pulse' : 'border-primary/30 text-primary'}`}>
                                {isSimulating ? `PROCESSING ${progress}%` : 'STABLE'}
                            </Badge>
                        </h4>
                        <div className="flex gap-3 mt-0.5">
                            <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-tighter">Samples: 500</span>
                            <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-tighter">Variance: ±{mcResult ? Math.round(mcResult.standardDeviation / 1000) : '--'}k</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    {mcResult && (
                        <div className="text-right border-r border-white/5 pr-6">
                            <span className="text-[8px] uppercase text-muted-foreground block font-black tracking-widest">AVG_TOTAL_DMG</span>
                            <span className="text-xl font-black text-primary font-mono tabular-nums leading-none">
                                {Math.round(mcResult.averageDamage).toLocaleString()}
                            </span>
                        </div>
                    )}
                    <Button onClick={runMonteCarloSim} disabled={isSimulating} size="sm" className="bg-primary text-black font-black hover:bg-primary/90 shadow-[0_0_15px_rgba(77,184,255,0.2)] uppercase text-[10px] h-8 px-4 rounded-none border-r-2 border-b-2 border-black/40 min-w-[120px]">
                        {isSimulating ? `RUNNING...` : 'EXECUTE RUN'}
                    </Button>
                </div>
            </div>

            {mcResult && (
                <div className="space-y-4">
                    <Tabs defaultValue="timeline" className="w-full">
                        <div className="flex justify-between items-center mb-2 px-1">
                            <TabsList className="bg-black/40 border border-white/5 h-7 p-0.5 rounded-none">
                                <TabsTrigger value="timeline" className="text-[8px] font-black h-6 rounded-none data-[state=active]:bg-primary data-[state=active]:text-black uppercase">01. Timeline</TabsTrigger>
                                <TabsTrigger value="distribution" className="text-[8px] font-black h-6 rounded-none data-[state=active]:bg-primary data-[state=active]:text-black uppercase">02. Probability</TabsTrigger>
                            </TabsList>
                            <div className="flex gap-4 items-center bg-black/40 px-3 py-1 border border-white/5">
                                <div className="flex flex-col">
                                    <span className="text-[6px] text-muted-foreground uppercase font-black">Timeline_Pos</span>
                                    <span className="text-[9px] font-black text-primary font-mono uppercase">T+{currentEntry?.timestamp.toFixed(2)}s</span>
                                </div>
                                <div className="w-px h-4 bg-white/10"></div>
                                <div className="flex flex-col">
                                    <span className="text-[6px] text-muted-foreground uppercase font-black">Acc_Damage</span>
                                    <span className="text-[9px] font-black text-foreground font-mono uppercase">{Math.round(currentEntry?.accumulatedDamage || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <TabsContent value="timeline" className="mt-0 space-y-3 animate-in fade-in duration-300">
                            <div className="bg-black/40 border border-white/5 p-4 relative">
                                <div className="absolute top-2 right-4 text-[6px] font-mono text-primary/40 uppercase tracking-widest">TS_STREAM_ACTIVE</div>
                                <DamageTimeSeriesChart logs={simLogs} currentIndex={timelineIndex} onPointClick={setTimelineIndex} />
                                <div className="mt-4">
                                    <Slider value={[timelineIndex]} max={simLogs.length - 1} step={1} onValueChange={([val]) => setTimelineIndex(val)} className="py-2" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="lg:col-span-2">
                                    <div className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2 flex items-center gap-2 px-1">
                                        <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div> Signal Monitor: Active Status HUD
                                    </div>
                                    <StatusHUD buffs={currentEntry?.activeBuffs || []} dots={currentEntry?.activeDoTs || []} />
                                </div>
                                <div className="space-y-3 bg-white/[0.02] border border-white/5 p-3 relative overflow-hidden">
                                    <div className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3 flex gap-1 items-center">
                                        <Scale className="w-2 h-2 text-primary" /> Efficiency & Output Readout
                                    </div>
                                    
                                    {/* Multiplier Radar Chart */}
                                    <div className="mb-4 bg-black/40 border border-white/5 pt-2">
                                        <div className="text-[6px] font-black text-primary/40 uppercase tracking-widest text-center mb-[-10px] relative z-10">Bucket_Balance_Analysis</div>
                                        <MultiplierBalanceChart multipliers={currentEntry?.bucketMultipliers || new Map()} />
                                    </div>

                                    <div className="space-y-2">
                                        {renderPowerReadout("Kinetic", physicalProfile, "primary")}
                                        {keywordProfile && renderPowerReadout(weapon?.keyword?.type || "KW", keywordProfile, "primary")}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="distribution" className="mt-0 animate-in fade-in duration-300">
                            <div className="bg-black/40 border border-white/5 p-6">
                                <div className="mb-6 flex justify-between items-start">
                                    <div>
                                        <h5 className="text-[9px] font-black uppercase tracking-widest text-primary mb-1">Luck Probability Distribution</h5>
                                        <p className="text-[7px] text-muted-foreground uppercase font-medium tracking-tighter">Variance across 500 automated iterations // Sample_Rate: 0.1s</p>
                                    </div>
                                    <div className="bg-primary/5 border border-primary/20 p-2 text-right">
                                        <span className="text-[6px] text-primary uppercase font-black block">Standard_Deviation</span>
                                        <span className="text-xs font-mono font-black text-foreground">±{Math.round(mcResult.standardDeviation).toLocaleString()} DMG</span>
                                    </div>
                                </div>
                                <DpsDistributionChart result={mcResult} />
                                <div className="mt-6 grid grid-cols-3 gap-2">
                                    <div className="p-2 border border-white/5 bg-black/20 flex flex-col">
                                        <span className="text-[6px] text-red-400 font-black uppercase tracking-tighter">Min_Performance</span>
                                        <span className="text-xs font-mono font-black text-foreground uppercase">{Math.round(mcResult.minDamage).toLocaleString()}</span>
                                    </div>
                                    <div className="p-2 border border-primary/20 bg-primary/5 flex flex-col shadow-[inset_0_0_10px_rgba(77,184,255,0.05)]">
                                        <span className="text-[6px] text-primary font-black uppercase tracking-tighter">Median_Target</span>
                                        <span className="text-xs font-mono font-black text-white uppercase">{Math.round(mcResult.averageDamage).toLocaleString()}</span>
                                    </div>
                                    <div className="p-2 border border-white/5 bg-black/20 flex flex-col">
                                        <span className="text-[6px] text-green-400 font-black uppercase tracking-tighter">Max_Output</span>
                                        <span className="text-xs font-mono font-black text-foreground uppercase">{Math.round(mcResult.maxDamage).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            )}

            {!mcResult && (
                <div className="h-[400px] border border-dashed border-white/5 flex flex-col items-center justify-center bg-black/20 opacity-40">
                    <Activity className="w-12 h-12 text-muted-foreground mb-4 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Awaiting Execution Sequence...</span>
                </div>
            )}
        </div>
    );
};
