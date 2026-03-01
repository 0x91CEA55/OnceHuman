import React from 'react';
import { BaseEffect, IncreaseStatEffect, SetFlagEffect, DoTEffect, BuffEffect, StaticAttributeEffect, ExplosionEffect } from '../models/effect';

interface BuildBreakdownProps {
    effects: BaseEffect[];
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
    }, {} as Record<string, BaseEffect[]>);

    const sourceKeys = Object.keys(groups).sort();

    const getEffectColor = (eff: BaseEffect) => {
        if (eff instanceof IncreaseStatEffect || eff instanceof StaticAttributeEffect) return 'border-green-500/30 text-green-400 bg-green-500/5';
        if (eff instanceof SetFlagEffect) return 'border-blue-500/30 text-blue-400 bg-blue-500/5';
        if (eff instanceof DoTEffect) return 'border-red-500/30 text-red-400 bg-red-500/5';
        if (eff instanceof BuffEffect) return 'border-primary/30 text-primary bg-primary/5';
        if (eff instanceof ExplosionEffect) return 'border-orange-500/30 text-orange-400 bg-orange-500/5';
        return 'border-muted-foreground/30 text-muted-foreground';
    };

    const getEffectLabel = (eff: BaseEffect) => {
        if (eff instanceof IncreaseStatEffect || eff instanceof StaticAttributeEffect) return eff.stat.replace(/_/g, ' ');
        if (eff instanceof SetFlagEffect) return eff.flag.replace(/_/g, ' ');
        if (eff instanceof DoTEffect || eff instanceof BuffEffect) return eff.name;
        if (eff instanceof ExplosionEffect) return 'Explosion';
        return 'Mod';
    };

    const getEffectValue = (eff: BaseEffect) => {
        if (eff instanceof IncreaseStatEffect || eff instanceof StaticAttributeEffect) return `+${eff.value}`;
        if (eff instanceof SetFlagEffect) return 'Enabled';
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
                            <div className="text-[9px] font-black text-foreground/80 uppercase tracking-tighter bg-muted/50 px-1.5 py-0.5 rounded border border-white/5 group-hover:border-primary/20 transition-colors">
                                {source}
                            </div>
                            <div className="h-px bg-white/5 flex-grow"></div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-2">
                            {groups[source].map((eff, i) => (
                                <div 
                                    key={i} 
                                    title={eff.getDescription()}
                                    className={`flex items-center gap-1.5 border px-2 py-0.5 rounded-sm text-[9px] font-mono transition-all hover:scale-105 cursor-help ${getEffectColor(eff)}`}
                                >
                                    <span className="opacity-70 font-bold uppercase tracking-tighter">{getEffectLabel(eff)}</span>
                                    {getEffectValue(eff) && (
                                        <span className="font-black border-l border-current pl-1.5">{getEffectValue(eff)}</span>
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
