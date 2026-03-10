import React from 'react';
import { StatType } from '../types/enums';
import { DiegeticFrame } from './DiegeticFrame';
import { Activity, Zap, Cpu, Target, Shield, Flame, Wind, Info, LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface DynamicStatDisplayProps {
    baseStats: Record<StatType, number>;
    currentStats: Record<StatType, number>;
}

export const DynamicStatDisplay: React.FC<DynamicStatDisplayProps> = ({ 
    baseStats, 
    currentStats
}) => {
    const renderStat = (label: string, type: StatType, unit: string = "", color: string = "text-foreground", Icon: LucideIcon) => {
        const base = baseStats[type] || 0;
        const current = currentStats[type] || 0;
        const diff = current - base;

        return (
            <div className="flex items-center justify-between py-1 group transition-colors hover:bg-white/5 px-1 rounded-sm">
                <div className="flex items-center gap-2">
                    <div className={cn("w-4 h-4 flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity", color)}>
                        <Icon className="w-3 h-3" />
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{label}</span>
                </div>
                <div className="flex items-baseline gap-1.5 font-mono">
                    <span className={cn("text-[11px] font-black tabular-nums", color)}>
                        {type.toString().includes('Percent') ? current.toFixed(1) : Math.round(current).toLocaleString()}
                        <span className="text-[8px] ml-0.5 opacity-60 font-medium">{unit}</span>
                    </span>
                    {Math.abs(diff) > 0.01 && (
                        <span className={cn("text-[8px] font-bold tabular-nums px-1 rounded-[2px]", diff > 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                            {diff > 0 ? "+" : ""}{type.toString().includes('Percent') ? diff.toFixed(1) : Math.round(diff)}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <DiegeticFrame title="Combat Attributes" subTitle="Real-Time Data Stream">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Basic Stats */}
                <div className="space-y-1">
                    <div className="text-[6px] font-black text-primary/40 uppercase tracking-[0.3em] mb-2 border-b border-primary/10 pb-1">Basic_Stats</div>
                    {renderStat("Attack", StatType.DamagePerProjectile, "", "text-foreground", Cpu)}
                    {renderStat("Fire Rate", StatType.FireRate, " RPM", "text-foreground", Zap)}
                    {renderStat("Magazine Capacity", StatType.MagazineCapacity, "", "text-foreground", Activity)}
                    {renderStat("Attack %", StatType.AttackPercent, "%", "text-orange-400", Shield)}
                    {renderStat("Weapon DMG Bonus", StatType.WeaponDamagePercent, "%", "text-orange-400", Target)}
                </div>

                {/* Battle Stats */}
                <div className="space-y-1">
                    <div className="text-[6px] font-black text-blue-400/40 uppercase tracking-[0.3em] mb-2 border-b border-blue-400/10 pb-1">Battle_Stats</div>
                    {renderStat("Crit Rate", StatType.CritRatePercent, "%", "text-blue-400", Target)}
                    {renderStat("Crit DMG", StatType.CritDamagePercent, "%", "text-blue-400", Zap)}
                    {renderStat("KW Crit Rate", StatType.KeywordCritRatePercent, "%", "text-blue-500", Target)}
                    {renderStat("KW Crit DMG", StatType.KeywordCritDamagePercent, "%", "text-blue-500", Zap)}
                    {renderStat("Weakspot DMG", StatType.WeakspotDamagePercent, "%", "text-yellow-400", Target)}
                </div>

                {/* Keyword DMG Bonus */}
                <div className="space-y-1">
                    <div className="text-[6px] font-black text-purple-400/40 uppercase tracking-[0.3em] mb-2 border-b border-purple-400/10 pb-1">Keyword_DMG_Bonus</div>
                    {renderStat("Psi Intensity", StatType.PsiIntensity, "", "text-purple-400", Activity)}
                    {renderStat("Status DMG Bonus", StatType.StatusDamagePercent, "%", "text-purple-300", Flame)}
                    {renderStat("Elemental DMG Bonus", StatType.ElementalDamagePercent, "%", "text-purple-300", Wind)}
                    {renderStat("Burn DMG Bonus", StatType.BurnDamageFactor, "%", "text-red-400", Flame)}
                    {renderStat("Burn Limit", StatType.MaxBurnStacks, "", "text-red-500", Info)}
                </div>
            </div>
        </DiegeticFrame>
    );
};
