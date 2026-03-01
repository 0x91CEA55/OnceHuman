import React from 'react';
import { StatType } from '../types/enums';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DynamicStatDisplayProps {
    baseStats: Record<StatType, number>;
    currentStats: Record<StatType, number>;
}

export const DynamicStatDisplay: React.FC<DynamicStatDisplayProps> = ({ baseStats, currentStats }) => {
    const renderStat = (label: string, type: StatType, suffix: string = "", color?: string) => {
        const baseValue = baseStats[type] || 0;
        const currentValue = currentStats[type] || 0;
        const diff = currentValue - baseValue;

        return (
            <div className="flex justify-between py-1.5 border-b border-white/5 last:border-0 group hover:bg-primary/5 px-2 -mx-2 transition-colors rounded">
                <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-wider">{label}</span>
                <div className="flex items-center gap-2">
                    {diff > 0 && (
                        <span className="text-[10px] font-bold text-green-400">+{Math.round(diff)}{suffix}</span>
                    )}
                    {diff < 0 && (
                        <span className="text-[10px] font-bold text-red-400">{Math.round(diff)}{suffix}</span>
                    )}
                    <span className={`text-xs font-mono font-bold ${color || 'text-foreground'}`}>
                        {Math.round(currentValue)}{suffix}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <Card className="border-primary/20 bg-card/50">
            <CardHeader className="pb-3 border-b border-primary/10">
                <CardTitle className="text-xs font-bold tracking-[0.2em] text-primary uppercase">
                    Combat Attribute Monitor
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-0.5">
                {renderStat("Base Damage", StatType.DamagePerProjectile)}
                {renderStat("Fire Rate", StatType.FireRate, " RPM")}
                {renderStat("Magazine", StatType.MagazineCapacity)}
                {renderStat("Crit Rate", StatType.CritRatePercent, "%", "text-blue-400")}
                {renderStat("Crit Damage", StatType.CritDamagePercent, "%", "text-blue-400")}
                {renderStat("Weakspot DMG", StatType.WeakspotDamagePercent, "%", "text-yellow-400")}
                {renderStat("Weapon DMG", StatType.WeaponDamagePercent, "%", "text-orange-400")}
                {renderStat("Attack Bonus", StatType.AttackPercent, "%", "text-orange-400")}
                {renderStat("Psi Intensity", StatType.PsiIntensity, "", "text-purple-400")}
            </CardContent>
        </Card>
    );
};
