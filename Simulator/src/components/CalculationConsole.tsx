import React from 'react';
import { AuditEntry } from '../engine/audit-log';
import { ScrollArea } from "@/components/ui/scroll-area"

interface CalculationConsoleProps {
    entries: AuditEntry[];
}

export const CalculationConsole: React.FC<CalculationConsoleProps> = ({ entries }) => {
    return (
        <div className="flex flex-col h-[400px]">
            <div className="px-4 py-2 border-b border-white/5 bg-black/20 flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Calculation Log</h3>
                <span className="text-[10px] font-mono text-primary/50">{entries.length} entries</span>
            </div>
            <ScrollArea className="flex-1 p-4 font-mono text-[11px] leading-relaxed">
                {entries.length === 0 && <p className="text-muted-foreground italic">No logs available...</p>}
                {entries.map((entry, i) => (
                    <div key={i} className="mb-1 group border-l-2 border-transparent hover:border-primary/30 hover:bg-white/5 pl-2 -ml-2 transition-all">
                        <span className="text-muted-foreground/40 mr-2">[{new Date(entry.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
                        <span className={`font-bold mr-2 ${getCategoryColor(entry.category)}`}>[{entry.category.toUpperCase()}]</span>
                        <span className="text-foreground/80 mr-2">{entry.label}:</span>
                        <span className="text-primary font-bold">{String(entry.value)}</span>
                        {entry.formula && <span className="text-muted-foreground/40 ml-2 italic text-[10px]">({entry.formula})</span>}
                    </div>
                ))}
            </ScrollArea>
        </div>
    );
};

function getCategoryColor(category: string): string {
    switch (category.toLowerCase()) {
        case 'aggregation': return 'text-yellow-500';
        case 'weapon': return 'text-red-400';
        case 'armor': return 'text-green-400';
        case 'mod': return 'text-purple-400';
        case 'effect': return 'text-blue-400';
        case 'setbonus': return 'text-orange-400';
        default: return 'text-muted-foreground';
    }
}
