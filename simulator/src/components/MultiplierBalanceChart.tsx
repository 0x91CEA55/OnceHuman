import React from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts';

interface MultiplierBalanceChartProps {
    multipliers: Record<string, number>;
}

export const MultiplierBalanceChart: React.FC<MultiplierBalanceChartProps> = ({ multipliers }) => {
    // Ensure we handle both combined and separate attack/weapon buckets if they exist
    const attackVal = multipliers.attack || 1.0;
    
    const data = [
        { subject: 'Status', A: multipliers.status || 1.0 },
        { subject: 'Elemental', A: multipliers.elemental || 1.0 },
        { subject: 'Base/Atk', A: attackVal },
        { subject: 'Keyword', A: multipliers.keyword || 1.0 },
        { subject: 'Crit', A: multipliers.crit || 1.0 },
    ];

    return (
        <div className="h-[180px] w-full relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-24 h-24 rounded-full border border-primary/5 bg-primary/5 animate-pulse" />
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="60%" data={data}>
                    <PolarGrid stroke="#ffffff10" />
                    <PolarAngleAxis 
                        dataKey="subject" 
                        tick={{ fill: '#4db8ff', fontSize: 7, fontWeight: 'black' }} 
                    />
                    <PolarRadiusAxis 
                        angle={30} 
                        domain={[1.0, 'auto']} 
                        tick={false} 
                        axisLine={false} 
                    />
                    <Radar
                        name="Multipliers"
                        dataKey="A"
                        stroke="#4db8ff"
                        fill="#4db8ff"
                        fillOpacity={0.3}
                        isAnimationActive={false}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};
