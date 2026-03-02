import React, { useMemo } from 'react';

interface StatusItem {
    id: string;
    name: string;
    stacks: number;
    remaining: number;
    nextTick?: number;
}

interface StatusHUDProps {
    buffs: StatusItem[];
    dots: StatusItem[];
}

const ActiveWaveform: React.FC<{ color: string, active: boolean }> = ({ color, active }) => {
    const points = useMemo(() => {
        const p = [];
        for (let i = 0; i <= 20; i++) {
            const x = (i / 20) * 100;
            const y = 15 + Math.sin(i * 0.8) * 10;
            p.push(`${x},${y}`);
        }
        return p.join(' L ');
    }, []);

    return (
        <div className="absolute inset-0 opacity-20 pointer-events-none">
            <svg width="100%" height="100%" viewBox="0 0 100 30" preserveAspectRatio="none">
                <path 
                    d={`M 0,15 L ${points}`} 
                    fill="none" 
                    stroke={color} 
                    strokeWidth="0.5" 
                    className={active ? "animate-pulse" : ""}
                />
            </svg>
        </div>
    );
};

export const StatusHUD: React.FC<StatusHUDProps> = ({ buffs, dots }) => {
    if (buffs.length === 0 && dots.length === 0) return null;

    const renderStatus = (item: StatusItem, type: 'buff' | 'dot') => {
        const isBuff = type === 'buff';
        const accentColor = isBuff ? '#4db8ff' : '#f87171';
        const colorClass = isBuff ? 'text-primary' : 'text-red-400';
        
        return (
            <div key={item.id} className="relative min-w-[140px] bg-black/60 border border-white/5 p-2 overflow-hidden group transition-all hover:border-primary/30">
                {/* Hardware Brackets */}
                <div className="absolute top-0 left-0 w-1 h-1 border-t border-l" style={{ borderColor: accentColor }}></div>
                <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r" style={{ borderColor: accentColor }}></div>
                
                {/* Background Telemetry Wave */}
                <ActiveWaveform color={accentColor} active={true} />

                {/* Header: Name & Stacks */}
                <div className="flex justify-between items-start relative z-10 mb-2">
                    <div className="flex flex-col">
                        <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest leading-none">Status_Type::{type.toUpperCase()}</span>
                        <span className={`text-[11px] font-black uppercase tracking-tighter ${colorClass}`}>{item.name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[7px] font-black text-muted-foreground uppercase leading-none">Stacks</span>
                        <span className={`text-xs font-black px-1.5 ${isBuff ? 'bg-primary text-black' : 'bg-red-500 text-white'}`}>
                            {item.stacks.toString().padStart(2, '0')}
                        </span>
                    </div>
                </div>
                
                {/* Data Grid */}
                <div className="grid grid-cols-2 gap-2 relative z-10 border-t border-white/5 pt-1.5">
                    <div className="flex flex-col">
                        <span className="text-[6px] text-muted-foreground uppercase font-black tracking-widest">Expiration</span>
                        <span className="text-[9px] text-foreground font-mono font-bold leading-none">
                            {item.remaining.toFixed(2)}s
                        </span>
                    </div>
                    
                    {!isBuff && item.nextTick !== undefined && (
                        <div className="flex flex-col items-end border-l border-white/5 pl-2">
                            <span className="text-[6px] text-muted-foreground uppercase font-black tracking-widest">Frequency</span>
                            <span className="text-[9px] text-red-300 font-mono font-bold leading-none">
                                {Math.max(0, item.nextTick).toFixed(2)}Hz
                            </span>
                        </div>
                    )}
                </div>

                {/* Diegetic Callout */}
                <div className="mt-2 flex items-center gap-1 opacity-40">
                    <div className={`w-1 h-1 rounded-full ${isBuff ? 'bg-primary' : 'bg-red-500'} animate-pulse`}></div>
                    <span className="text-[5px] font-mono text-muted-foreground tracking-tighter uppercase">Signal_Lock: 100% // Trace_Active</span>
                </div>

                {/* Progress Bar (Gilded) */}
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-white/5">
                    <div 
                        className={`h-full ${isBuff ? 'bg-primary shadow-[0_0_5px_#4db8ff]' : 'bg-red-500 shadow-[0_0_5px_#f87171]'} transition-all duration-100`} 
                        style={{ width: `${Math.min(100, (item.remaining / 10) * 100)}%` }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-3">
                {buffs.map(b => renderStatus(b, 'buff'))}
                {dots.map(d => renderStatus(d, 'dot'))}
            </div>
        </div>
    );
};
