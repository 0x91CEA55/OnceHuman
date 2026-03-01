import React from 'react';

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

export const StatusHUD: React.FC<StatusHUDProps> = ({ buffs, dots }) => {
    if (buffs.length === 0 && dots.length === 0) return null;

    const renderStatus = (item: StatusItem, type: 'buff' | 'dot') => {
        const isBuff = type === 'buff';
        const colorClass = isBuff ? 'text-primary' : 'text-red-400';
        const barColorClass = isBuff ? 'bg-primary/40' : 'bg-red-500/40';
        const borderClass = isBuff ? 'border-primary/10' : 'border-red-500/10';

        return (
            <div key={item.id} className={`flex flex-col gap-1 min-w-[100px] bg-muted/20 p-2 rounded border ${borderClass} relative overflow-hidden group`}>
                <div className="flex justify-between items-center gap-2">
                    <span className={`text-[10px] font-black truncate uppercase ${colorClass}`}>{item.name}</span>
                    <span className={`text-[10px] font-black ${isBuff ? 'bg-primary text-black' : 'bg-red-500 text-white'} px-1.5 rounded-sm`}>
                        {item.stacks}
                    </span>
                </div>
                
                <div className="flex justify-between items-end mt-1">
                    <div className="flex flex-col">
                        <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">Expires</span>
                        <span className="text-[10px] text-foreground font-mono leading-none">{item.remaining.toFixed(1)}s</span>
                    </div>
                    
                    {!isBuff && item.nextTick !== undefined && (
                        <div className="flex flex-col items-end">
                            <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">Next Tick</span>
                            <span className="text-[10px] text-red-300 font-mono leading-none">{Math.max(0, item.nextTick).toFixed(2)}s</span>
                        </div>
                    )}
                </div>

                {/* Visual Countdown indicator - assumes max duration is 10s for visual scale */}
                <div 
                    className={`absolute bottom-0 left-0 h-[2px] ${barColorClass} transition-all duration-100`} 
                    style={{ width: `${Math.min(100, (item.remaining / 10) * 100)}%` }}
                />
            </div>
        );
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                {buffs.map(b => renderStatus(b, 'buff'))}
                {dots.map(d => renderStatus(d, 'dot'))}
            </div>
        </div>
    );
};
