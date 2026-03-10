import React from 'react';
import { IncreaseStatEffect, SetFlagEffect, DoTEffect, BuffEffect, StaticAttributeEffect, ExplosionEffect } from '../ecs/effects';
import { IEffect } from '../types/common';
import { StatType } from '../types/enums';

interface BuildBreakdownProps {
    effects: IEffect[];
}

export const BuildBreakdown: React.FC<BuildBreakdownProps> = ({ effects }) => {
    // Group effects by source
    const groups = effects.reduce((acc, effect) => {
        const source = effect.source || 'Intrinsic';
        if (!acc[source]) acc[source] = [];
        // Avoid duplicate descriptions in the same source
        const desc = effect.getDescription();
        if (!acc[source].find(e => e.getDescription() === desc)) {
            acc[source].push(effect);
        }
        return acc;
    }, {} as Record<string, IEffect[]>);

    const sourceKeys = Object.keys(groups).sort();

    const getEffectTheme = (eff: IEffect) => {
        // Keyword / Status Theme (Purple)
        if (eff instanceof DoTEffect || eff instanceof BuffEffect || eff instanceof ExplosionEffect) {
            return 'border-purple-500/30 text-purple-400 bg-purple-500/5';
        }

        // Stat-specific Themes
        if (eff instanceof IncreaseStatEffect || eff instanceof StaticAttributeEffect) {
            const s = eff.stat;

            // Keyword Specific (Purple)
            if (
                s.includes('keyword') || 
                s.includes('burn') || 
                s.includes('vortex') || 
                s.includes('surge') || 
                s.includes('shrapnel') || 
                s.includes('bomber') || 
                s.includes('bounce') ||
                s === StatType.ElementalDamagePercent || 
                s === StatType.StatusDamagePercent
            ) {
                return 'border-purple-500/30 text-purple-400 bg-purple-500/5';
            }

            // Crit Theme (Red)
            if (s === StatType.CritRatePercent || s === StatType.CritDamagePercent) {
                return 'border-red-500/30 text-red-400 bg-red-500/5';
            }
            // Normal / Attack Theme (Blue)
            if (
                s === StatType.AttackPercent || 
                s === StatType.WeaponDamagePercent || 
                s === StatType.DamagePerProjectile ||
                s === StatType.ProjectilesPerShot ||
                s === StatType.FireRate
            ) {
                return 'border-blue-500/30 text-blue-400 bg-blue-500/5';
            }
            // Weakspot Theme (Yellow)
            if (s === StatType.WeakspotDamagePercent || s === StatType.WeakspotHitRatePercent) {
                return 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5';
            }
            // Defense / Utility (Cyan)
            if (s === StatType.PsiIntensity) {
                return 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5';
            }
        }

        // Generic Flag (Keyword related flags to Purple)
        if (eff instanceof SetFlagEffect) {
            if (eff.flag.includes('keyword')) {
                return 'border-purple-500/30 text-purple-400 bg-purple-500/5';
            }
            return 'border-primary/30 text-primary bg-primary/5';
        }

        return 'border-muted-foreground/30 text-muted-foreground bg-white/5';
    };

    const getEffectLabel = (eff: IEffect) => {
        if (eff instanceof IncreaseStatEffect || eff instanceof StaticAttributeEffect) {
            return eff.stat.replace(/_/g, ' ').replace(' Percent', '%');
        }
        if (eff instanceof SetFlagEffect) return eff.flag.replace(/_/g, ' ');
        if (eff instanceof DoTEffect || eff instanceof BuffEffect) return eff.name;
        if (eff instanceof ExplosionEffect) return 'Explosion';
        return 'Mod';
    };

    const getEffectValue = (eff: IEffect) => {
        if (eff instanceof IncreaseStatEffect || eff instanceof StaticAttributeEffect) {
            const val = Math.round(eff.value * 100) / 100;
            return val > 0 ? `+${val}` : `${val}`;
        }
        if (eff instanceof SetFlagEffect) return 'Active';
        if (eff instanceof ExplosionEffect) return `${eff.scalingFactor}x`;
        return '';
    };

    return (
        <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 flex items-center gap-2">
                <span className="w-1 h-3 bg-primary/40 inline-block"></span>
                Active Bonus Matrix
            </h3>
            {sourceKeys.length === 0 && <p className="text-[10px] text-muted-foreground italic">System Idle. No active augmentations detected.</p>}
            
            <div className="grid grid-cols-1 gap-4">
                {sourceKeys.map(source => (
                    <div key={source} className="space-y-2 group">
                        <div className="flex items-center gap-2">
                            <div className="text-[9px] font-black text-foreground/80 uppercase tracking-tighter bg-muted/20 px-1.5 py-0.5 rounded border border-white/5 group-hover:border-primary/20 transition-colors">
                                {source}
                            </div>
                            <div className="h-px bg-white/5 flex-grow"></div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-2">
                            {groups[source].map((eff, i) => (
                                <div 
                                    key={i} 
                                    title={eff.getDescription()}
                                    className={`flex items-center gap-1.5 border px-2 py-0.5 rounded-sm text-[8px] font-mono transition-all hover:scale-105 cursor-help ${getEffectTheme(eff)}`}
                                >
                                    <span className="opacity-70 font-bold uppercase tracking-tighter">{getEffectLabel(eff)}</span>
                                    {getEffectValue(eff) && (
                                        <span className="font-black border-l border-current pl-1.5 ml-0.5">{getEffectValue(eff)}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
