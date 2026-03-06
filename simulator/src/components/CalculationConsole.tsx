import React, { useState } from 'react';
import { TraceNode, TraceContributor } from '../types/telemetry';
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronRight, ChevronDown, Binary, Scale, Sigma } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalculationConsoleProps {
    entries: TraceNode[];
}

export const CalculationConsole: React.FC<CalculationConsoleProps> = ({ entries }) => {
    return (
        <div className="flex flex-col h-[500px]">
            <div className="px-4 py-2 border-b border-white/5 bg-black/20 flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex gap-2 items-center">
                    <Binary className="w-3 h-3" /> Telemetry Calculation Trace
                </h3>
                <span className="text-[10px] font-mono text-primary/50">{entries.length} sequences</span>
            </div>
            <ScrollArea className="flex-1 p-2 font-mono text-[11px] leading-relaxed">
                {entries.length === 0 && <p className="text-muted-foreground italic p-4 text-center">Awaiting data aggregation sequence...</p>}
                <div className="space-y-2">
                    {[...entries].reverse().map((entry, i) => (
                        <TraceItem key={`${entry.id}-${i}`} node={entry} depth={0} isRoot />
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};

const TraceItem: React.FC<{ node: TraceNode, depth: number, isRoot?: boolean }> = ({ node, depth, isRoot }) => {
    const [isExpanded, setIsExpanded] = useState(isRoot);
    const hasContributors = node.contributors.length > 0;

    const getOpIcon = () => {
        switch (node.operation) {
            case 'sum': return <Sigma className="w-2.5 h-2.5 text-yellow-500" />;
            case 'product': return <span className="text-[10px] text-blue-400 font-bold">×</span>;
            case 'scaling': return <Scale className="w-2.5 h-2.5 text-orange-400" />;
            default: return null;
        }
    };

    return (
        <div className={cn(
            "rounded-sm border border-transparent transition-all",
            isRoot ? "border-white/5 bg-white/[0.02] mb-3" : "ml-4"
        )}>
            <div 
                className={cn(
                    "flex items-center gap-2 p-1.5 cursor-pointer hover:bg-white/5 transition-colors group",
                    isRoot && "bg-black/20 border-b border-white/5"
                )}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100">
                    {hasContributors ? (
                        isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
                    ) : (
                        <div className="w-3 h-3" />
                    )}
                    {getOpIcon()}
                </div>
                
                <span className={cn(
                    "text-[10px] uppercase font-black tracking-tight",
                    isRoot ? "text-primary" : "text-muted-foreground"
                )}>
                    {node.label.replace(/stat:|damage_resolution:/, '')}
                </span>

                <div className="flex-1 border-b border-dashed border-white/5 mx-2 opacity-20"></div>

                <span className="font-black text-foreground tabular-nums">
                    {typeof node.finalValue === 'number' 
                        ? (node.finalValue % 1 === 0 ? node.finalValue.toLocaleString() : node.finalValue.toFixed(2)) 
                        : String(node.finalValue)}
                </span>
            </div>

            {isExpanded && hasContributors && (
                <div className="p-1 pb-2 space-y-0.5">
                    {node.contributors.map((contrib, idx) => (
                        <ContributorItem key={idx} contributor={contrib} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};

const ContributorItem: React.FC<{ contributor: TraceContributor, depth: number }> = ({ contributor, depth }) => {
    if (contributor.childTrace) {
        return <TraceItem node={contributor.childTrace} depth={depth} />;
    }

    return (
        <div className="ml-6 flex items-center justify-between py-0.5 px-2 hover:bg-white/5 rounded-sm group">
            <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-tight">
                    {contributor.label}
                </span>
                {contributor.source && (
                    <span className="text-[8px] text-primary/40 italic font-medium px-1 border border-primary/10 rounded-[2px] opacity-0 group-hover:opacity-100 transition-opacity">
                        {contributor.source}
                    </span>
                )}
            </div>
            <span className={cn(
                "text-[10px] font-mono font-bold tabular-nums",
                contributor.value > 0 ? "text-green-400" : contributor.value < 0 ? "text-red-400" : "text-muted-foreground"
            )}>
                {contributor.value > 0 ? '+' : ''}{contributor.value}{contributor.isPercentage ? '%' : ''}
            </span>
        </div>
    );
};
