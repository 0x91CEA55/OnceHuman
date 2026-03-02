import React from 'react';
import {
  Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine, ComposedChart
} from 'recharts';
import { SimulationLogEntry, MonteCarloResult } from '../engine/damage-engine';

interface DamageTimeSeriesChartProps {
    logs: SimulationLogEntry[];
    currentIndex: number;
    onPointClick: (index: number) => void;
}

export const DamageTimeSeriesChart: React.FC<DamageTimeSeriesChartProps> = ({ logs, currentIndex, onPointClick }) => {
    // Filter logs to only show shots and ticks (damage events)
    const data = logs.map((log, index) => {
        // For visual clarity, we give 0-damage events a tiny "marker" height
        const visualDamage = (log.damage === 0 && (log.event === 'Damage' || log.event === 'Shot')) ? 5 : (log.damage || 0);
        
        return {
            index,
            timestamp: parseFloat(log.timestamp.toFixed(2)),
            instant: log.damage || 0,
            visualHeight: visualDamage,
            cumulative: log.accumulatedDamage,
            event: log.event,
            description: log.description
        };
    }).filter(d => d.event === 'Damage' || d.event === 'Shot' || d.event === 'Keyword' || d.event === 'Start' || d.event === 'End');

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const isBurn = data.description.toLowerCase().includes('burn');
            const isExplosion = data.description.toLowerCase().includes('explosion');
            
            let color = "#4db8ff"; // Default blue
            if (isBurn) color = "#f87171"; // Red for burn
            if (isExplosion) color = "#fb923c"; // Orange for explosion

            return (
                <div className="bg-black/90 border border-white/10 p-2 rounded shadow-xl text-[10px] font-mono" style={{ borderColor: `${color}40` }}>
                    <p className="font-bold mb-1" style={{ color }}>T+{data.timestamp}s // {data.event.toUpperCase()}</p>
                    <p className="text-foreground leading-relaxed">{data.description}</p>
                    <div className="mt-2 pt-1 border-t border-white/5 flex justify-between gap-4">
                        <span className="text-muted-foreground uppercase text-[8px]">Cumulative</span>
                        <span className="text-foreground font-bold">{Math.round(data.cumulative).toLocaleString()}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    const getBarColor = (entry: any, isSelected: boolean) => {
        if (isSelected) return '#ffffff';
        
        const desc = entry.description.toLowerCase();
        if (desc.includes('burn')) return '#f87171'; // Red for Burn
        if (desc.includes('explosion')) return '#fb923c'; // Orange for Explosion
        if (desc.includes('vortex')) return '#60a5fa'; // Light blue for Vortex
        
        return '#4db8ff80'; // Default bullet blue
    };

    return (
        <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart 
                    data={data} 
                    onMouseMove={(state) => {
                        if (state && state.activeTooltipIndex !== undefined && state.activeTooltipIndex !== null) {
                            const originalIndex = data[state.activeTooltipIndex as number].index;
                            if (state.isTooltipActive) onPointClick(originalIndex);
                        }
                    }}
                >
                    <defs>
                        <linearGradient id="colorCum" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4db8ff" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#4db8ff" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                        dataKey="timestamp" 
                        stroke="#ffffff20" 
                        fontSize={8} 
                        tickFormatter={(val) => `${val}s`}
                        minTickGap={30}
                        axisLine={false}
                    />
                    <YAxis yAxisId="left" hide />
                    <YAxis yAxisId="right" orientation="right" hide />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                    
                    <Area 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="cumulative" 
                        stroke="#4db8ff" 
                        fillOpacity={1} 
                        fill="url(#colorCum)" 
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                    />
                    
                    <Bar 
                        yAxisId="left"
                        dataKey="visualHeight" 
                        barSize={2}
                        isAnimationActive={false}
                    >
                        {data.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={getBarColor(entry, entry.index === currentIndex)} 
                            />
                        ))}
                    </Bar>

                    {/* Current Scrubber Position */}
                    {currentIndex < logs.length && (
                        <ReferenceLine 
                            x={parseFloat(logs[currentIndex].timestamp.toFixed(2))} 
                            stroke="#ffffff40" 
                            strokeDasharray="2 2" 
                            yAxisId="right"
                        />
                    )}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

interface DpsDistributionChartProps {
    result: MonteCarloResult;
}

export const DpsDistributionChart: React.FC<DpsDistributionChartProps> = ({ result }) => {
    const numBuckets = 20;
    const min = result.minDamage;
    const max = result.maxDamage;
    const range = max - min;
    const bucketSize = range / numBuckets || 1;

    const buckets = Array.from({ length: numBuckets }, (_, i) => {
        const start = min + i * bucketSize;
        const end = start + bucketSize;
        const count = result.allTotals.filter(t => t >= start && t < end).length;
        return {
            label: `${Math.round(start/1000)}k`,
            count,
            mid: (start + end) / 2
        };
    });

    return (
        <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buckets}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="label" stroke="#ffffff20" fontSize={8} axisLine={false} />
                    <YAxis stroke="#ffffff20" fontSize={8} hide />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#000', border: '1px solid #4db8ff20', fontSize: '10px', fontFamily: 'monospace' }}
                        itemStyle={{ color: '#4db8ff' }}
                        cursor={{ fill: '#ffffff05' }}
                    />
                    <Bar dataKey="count" fill="#4db8ff30" radius={[1, 1, 0, 0]}>
                        {buckets.map((entry, index) => {
                            const isAverage = result.averageDamage >= (entry.mid - bucketSize/2) && result.averageDamage < (entry.mid + bucketSize/2);
                            return <Cell key={`cell-${index}`} fill={isAverage ? '#4db8ff' : '#4db8ff30'} />;
                        })}
                    </Bar>
                    <ReferenceLine x={Math.floor((result.averageDamage - min) / bucketSize)} stroke="#ffffff40" strokeDasharray="2 2" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
