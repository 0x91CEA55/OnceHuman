import React from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts';
import { BucketId } from '../types/resolution';

interface MultiplierBalanceChartProps {
    /** Type-safe bucket multipliers from the simulation log. */
    multipliers: ReadonlyMap<BucketId, number> | Record<string, number>;
}

export const MultiplierBalanceChart: React.FC<MultiplierBalanceChartProps> = ({ multipliers }) => {
    
    // Helper to get value from either Map or Record (for transition/flexibility)
    const getVal = (id: BucketId): number => {
        if (multipliers instanceof Map) {
            return multipliers.get(id) || 1.0;
        }
        const record = multipliers as Record<string, number>;
        return record[id] || 1.0;
    };

    const data = [
        { subject: 'Status', A: getVal(BucketId.StatusDamage) },
        { subject: 'Elemental', A: getVal(BucketId.ElementalDamage) },
        { subject: 'Attack', A: getVal(BucketId.AttackPercent) },
        { subject: 'Weapon', A: getVal(BucketId.WeaponDamage) },
        { subject: 'HitAmp', A: getVal(BucketId.HitAmplifier) },
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
