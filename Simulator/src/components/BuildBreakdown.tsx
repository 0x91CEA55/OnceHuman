import React from 'react';
import { Effect } from '../models/effect';
import { EffectType } from '../types/enums';
import { Badge } from "@/components/ui/badge"

interface BuildBreakdownProps {
    effects: Effect[];
}

export const BuildBreakdown: React.FC<BuildBreakdownProps> = ({ effects }) => {
    // Group effects by source
    const groups = effects.reduce((acc, effect) => {
        const source = effect.source || 'Unknown';
        if (!acc[source]) acc[source] = [];
        acc[source].push(effect);
        return acc;
    }, {} as Record<string, Effect[]>);

    const sourceKeys = Object.keys(groups);

    return (
        <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <span className="w-1 h-3 bg-primary/50"></span>
                ACTIVE BONUSES
            </h3>
            {sourceKeys.length === 0 && <p className="text-xs text-muted-foreground italic">No active bonuses found.</p>}
            <div className="space-y-3">
                {sourceKeys.map(source => (
                    <div key={source} className="space-y-1.5">
                        <div className="text-[10px] font-bold text-primary/70 uppercase px-1">{source}</div>
                        <div className="flex flex-wrap gap-1.5">
                            {groups[source].map((eff, i) => (
                                <Badge key={i} variant="outline" className="bg-primary/5 border-primary/10 text-[10px] py-0 px-2 h-5 font-mono">
                                    {eff.type === EffectType.IncreaseStat ? (eff as any).stat : eff.type}: 
                                    <span className="text-primary ml-1">
                                        {eff.type === EffectType.IncreaseStat ? `+${(eff as any).value}` : String((eff as any).value || (eff as any).flag)}
                                    </span>
                                </Badge>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
