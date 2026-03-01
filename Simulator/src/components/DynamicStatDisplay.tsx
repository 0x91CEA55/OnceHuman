import React, { useMemo } from 'react';
import { StatType } from '../types/enums';
import { TelemetryTrack } from '../engine/damage-engine';
import { DiegeticFrame } from './DiegeticFrame';
import { Activity, Zap, Cpu, Target, Shield, Flame, Wind, Info } from 'lucide-react';

interface MicroPulseProps {
    data: number[];
    variance: number[];
    color: string;
    currentIndex: number;
    totalPoints: number;
}

const MicroPulse: React.FC<MicroPulseProps> = ({ data, variance, color, currentIndex, totalPoints }) => {
    const { pathData, cloudData } = useMemo(() => {
        if (!data || data.length < 2) return { pathData: "", cloudData: "" };
        const min = Math.min(...data.map((v, i) => v - (variance[i] || 0)));
        const max = Math.max(...data.map((v, i) => v + (variance[i] || 0)));
        const range = max - min || 1;
        const width = 80; // Increased width for 3-col layout
        const height = 16;
        const points = data.map((val, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((val - min) / range) * height;
            return `${x},${y}`;
        });
        const upperPoints = data.map((val, i) => {
            const v = variance[i] || 0;
            const x = (i / (data.length - 1)) * width;
            const y = height - ((val + v - min) / range) * height;
            return `${x},${y}`;
        });
        const lowerPoints = data.map((val, i) => {
            const v = variance[i] || 0;
            const x = (i / (data.length - 1)) * width;
            const y = height - ((val - v - min) / range) * height;
            return `${x},${y}`;
        }).reverse();
        return {
            pathData: `M ${points.join(" L ")}`,
            cloudData: `M ${upperPoints.join(" L ")} L ${lowerPoints.join(" L ")} Z`
        };
    }, [data, variance]);

    const scrubberX = (currentIndex / totalPoints) * 80;

    return (
        <div className="w-[80px] h-[16px] relative opacity-40 group-hover:opacity-100 transition-opacity">
            <svg width="80" height="16" viewBox="0 0 80 16" className="overflow-visible">
                <path d={cloudData} fill={color} fillOpacity={0.15} stroke="none" />
                <path d={pathData} fill="none" stroke={color} strokeWidth="1" />
                <circle cx={scrubberX} cy={8} r="1.5" fill="#fff" className="animate-pulse shadow-[0_0_5px_white]" />
            </svg>
        </div>
    );
};

interface DynamicStatDisplayProps {
    baseStats: Record<StatType, number>;
    currentStats: Record<StatType, number>;
    telemetry?: TelemetryTrack;
    scrubbedIndex?: number;
}

export const DynamicStatDisplay: React.FC<DynamicStatDisplayProps> = ({ 
    baseStats, 
    currentStats, 
    telemetry, 
    scrubbedIndex = 0 
}) => {
    const isGlitching = (type: StatType, val: number) => {
        if (type === StatType.WeaponDamagePercent && val > 150 && (currentStats[StatType.CritRatePercent] || 0) < 20) return true;
        if (type === StatType.CritDamagePercent && val > 250 && (currentStats[StatType.CritRatePercent] || 0) < 15) return true;
        return false;
    };

    const renderStat = (label: string, type: StatType, suffix: string = "", color: string = "text-foreground", Icon?: any) => {
        const baseValue = baseStats[type] || 0;
        const currentValue = currentStats[type] || 0;
        const diff = currentValue - baseValue;
        const statTelemetry = telemetry?.data[type] || [];
        const statVariance = telemetry?.variance?.[type] || [];
        const glitch = isGlitching(type, currentValue);

        const hexColor = color.includes('primary') ? '#4db8ff' : 
                         color.includes('orange') ? '#fb923c' : 
                         color.includes('blue') ? '#60a5fa' :
                         color.includes('purple') ? '#c084fc' :
                         color.includes('red') ? '#f87171' : '#ffffff';

        return (
            <div className={`flex flex-col py-2 border-b border-white/[0.03] group hover:bg-primary/5 px-2 -mx-2 transition-all rounded relative ${glitch ? 'animate-flicker' : ''}`}>
                <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-1.5">
                        {Icon && <Icon className={Icon === Shield ? "w-2.5 h-2.5 text-blue-400" : "w-2.5 h-2.5 opacity-40"} />}
                        <span className={`text-[7px] text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-[0.2em] font-black ${glitch ? 'text-red-400' : ''}`}>
                            {label}
                        </span>
                    </div>
                    {statTelemetry.length > 0 && (
                        <MicroPulse 
                            data={statTelemetry} 
                            variance={statVariance}
                            color={hexColor} 
                            currentIndex={scrubbedIndex}
                            totalPoints={telemetry?.timeAxis.length || 1}
                        />
                    )}
                </div>

                <div className="flex items-baseline gap-2">
                    <span className={`text-[13px] font-mono font-black tabular-nums ${color}`}>
                        {Math.round(currentValue)}{suffix}
                    </span>
                    {diff !== 0 && (
                        <span className={`text-[9px] font-black ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {diff > 0 ? '▲' : '▼'}{Math.round(Math.abs(diff))}
                        </span>
                    )}
                    <div className="flex-grow"></div>
                    <span className="text-[6px] font-mono text-white/5 uppercase tracking-tighter self-end mb-0.5">Stream_Active</span>
                </div>
            </div>
        );
    };

    return (
        <DiegeticFrame title="03. Combat Attribute HUD" subTitle="High-Density Telemetry Matrix" className="shadow-2xl shadow-primary/5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-10 gap-y-1">
                {/* Primary Output */}
                <div className="space-y-1">
                    <div className="text-[6px] font-black text-primary/40 uppercase tracking-[0.3em] mb-2 border-b border-primary/10 pb-1">Core_Output</div>
                    {renderStat("Raw Base", StatType.DamagePerProjectile, "", "text-foreground", Cpu)}
                    {renderStat("Lead Flow", StatType.FireRate, " RPM", "text-foreground", Zap)}
                    {renderStat("Capacity", StatType.MagazineCapacity, "", "text-foreground", Activity)}
                    {renderStat("Atk Bonus", StatType.AttackPercent, "%", "text-orange-400", Shield)}
                    {renderStat("Wpn Bonus", StatType.WeaponDamagePercent, "%", "text-orange-400", Target)}
                </div>

                {/* Probability Matrix */}
                <div className="space-y-1">
                    <div className="text-[6px] font-black text-blue-400/40 uppercase tracking-[0.3em] mb-2 border-b border-blue-400/10 pb-1">Probability_Tuning</div>
                    {renderStat("Crit Prob", StatType.CritRatePercent, "%", "text-blue-400", Target)}
                    {renderStat("Crit Mult", StatType.CritDamagePercent, "%", "text-blue-400", Zap)}
                    {renderStat("KW Crit Rate", StatType.KeywordCritRatePercent, "%", "text-blue-500", Target)}
                    {renderStat("KW Crit DMG", StatType.KeywordCritDamagePercent, "%", "text-blue-500", Zap)}
                    {renderStat("Weakspot", StatType.WeakspotDamagePercent, "%", "text-yellow-400", Target)}
                </div>

                {/* Elemental Resonance */}
                <div className="space-y-1">
                    <div className="text-[6px] font-black text-purple-400/40 uppercase tracking-[0.3em] mb-2 border-b border-purple-400/10 pb-1">Resonance_Signal</div>
                    {renderStat("Psi Power", StatType.PsiIntensity, "", "text-purple-400", Activity)}
                    {renderStat("Status DMG", StatType.StatusDamagePercent, "%", "text-purple-300", Flame)}
                    {renderStat("Element DMG", StatType.ElementalDamagePercent, "%", "text-purple-300", Wind)}
                    {renderStat("Burn DMG", StatType.BurnDamagePercent, "%", "text-red-400", Flame)}
                    {renderStat("Burn Limit", StatType.MaxBurnStacks, "", "text-red-500", Info)}
                </div>
            </div>
        </DiegeticFrame>
    );
};
