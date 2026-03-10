import React, { useEffect, useState } from 'react';
import { SimulationLogEntry } from '../engine/simulation-runner';

interface TerminalFooterProps {
    logs: SimulationLogEntry[];
}

export const TerminalFooter: React.FC<TerminalFooterProps> = ({ logs }) => {
    const [visibleLogs, setVisibleLogs] = useState<SimulationLogEntry[]>([]);

    // Keep only the last 10 interesting events for the ticker
    useEffect(() => {
        const filtered = logs
            .filter(l => l.event !== 'Start' && l.event !== 'End')
            .slice(-15);
        setVisibleLogs(filtered);
    }, [logs]);

    if (logs.length === 0) return (
        <footer className="fixed bottom-0 left-0 w-full h-8 bg-black border-t border-primary/20 flex items-center px-6 overflow-hidden z-[100]">
            <div className="flex items-center gap-4 animate-pulse">
                <span className="text-[10px] font-mono text-primary/40 uppercase tracking-widest">
                    [SYSTEM_IDLE]: Awaiting Tactical Engagement Data...
                </span>
            </div>
        </footer>
    );

    return (
        <footer className="fixed bottom-0 left-0 w-full h-8 bg-black border-t border-primary/20 flex items-center px-6 overflow-hidden z-[100] backdrop-blur-md">
            <div className="flex items-center gap-2 mr-8 flex-shrink-0 border-r border-white/10 pr-4 h-full">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-foreground uppercase tracking-tighter">Live Telemetry</span>
            </div>
            
            <div className="flex gap-12 whitespace-nowrap animate-marquee">
                {visibleLogs.map((log, i) => (
                    <div key={i} className="flex items-center gap-3 font-mono">
                        <span className="text-primary text-[10px] font-bold">[SIM_TR {Math.round(log.timestamp * 100).toString().padStart(4, '0')}]:</span>
                        <span className="text-foreground text-[10px] uppercase font-medium">{log.event}</span>
                        <span className="text-muted-foreground text-[10px]">--&gt;</span>
                        <span className="text-primary/80 text-[10px] font-bold">
                            {log.damage ? `${Math.round(log.damage).toLocaleString()} DMG` : log.description}
                        </span>
                    </div>
                ))}
                {/* Duplicate for infinite effect if needed, but flex-gap works for now */}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    display: flex;
                    animation: marquee 30s linear infinite;
                }
            `}} />
        </footer>
    );
};
