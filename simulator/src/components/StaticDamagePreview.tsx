import React, { useMemo, useEffect } from 'react';
import { StatsComponent, FlagComponent, LoadoutComponent } from '../ecs/types';
import { EncounterConditions } from '../types/common';
import { StatType, DamageTrait } from '../types/enums';
import { TriggerConditionType, TriggerDefinition } from '../types/trigger-types';
import { TraceNode } from '../types/telemetry';
import { DiegeticFrame } from './DiegeticFrame';
import { Target, Flame, Activity } from 'lucide-react';
import { resolveScenarioScan, KEYWORD_TRAIT_MAP } from '../engine/resolver';
import { telemetry } from '../engine/audit-log';
import { getKeywordMetadata, canKeywordCrit, canKeywordWeakspot } from '../data/keywords';
import { KEYWORD_TRIGGERS } from '../data/trigger-definitions';

interface StaticDamagePreviewProps {
    stats: StatsComponent;
    flags: FlagComponent;
    loadout: LoadoutComponent;
    conditions: EncounterConditions;
}

export const StaticDamagePreview: React.FC<StaticDamagePreviewProps> = ({ stats, flags, loadout, conditions }) => {
    const weapon = loadout.weapon;
    const baseDamage = stats.snapshot[StatType.DamagePerProjectile] || 0;
    
    const physicalTraits = useMemo(() => new Set([DamageTrait.Attack, DamageTrait.Weapon]), []);
    const physicalProfile = useMemo(() => 
        resolveScenarioScan(
            baseDamage, 
            stats, 
            flags,
            conditions.enemyType, 
            physicalTraits, 
            new Set(), 
            'Kinetic Scan',
            true,
            true,
            1.0,
            new Map(),
            conditions.weakspotHitRate
        ),
    [baseDamage, stats, flags, conditions.enemyType, physicalTraits, conditions.weakspotHitRate]);

    const keywordProfile = useMemo(() => {
        if (!weapon?.keyword) return null;
        const meta = getKeywordMetadata(weapon.keyword);
        if (!meta.baseStatType || meta.scalingFactor === undefined) return null;
        
        const traits = new Set(KEYWORD_TRAIT_MAP[weapon.keyword] || []);
        const kwBaseStatValue = stats.snapshot[meta.baseStatType] || 0;

        const canCrit = canKeywordCrit(weapon.keyword, (f) => flags.activeFlags.has(f));
        const canWeakspot = canKeywordWeakspot(weapon.keyword, (f) => flags.activeFlags.has(f));

        return resolveScenarioScan(
            kwBaseStatValue, 
            stats,
            flags,
            conditions.enemyType, 
            traits, 
            new Set(), 
            `${weapon.keyword} Proc Scan`,
            canCrit,
            canWeakspot,
            meta.scalingFactor,
            new Map(),
            conditions.weakspotHitRate
        );
    }, [weapon, stats, flags, conditions.enemyType, conditions.weakspotHitRate]);


    const fireRate = stats.snapshot[StatType.FireRate] || 0;
    const bulletsPerSecond = fireRate / 60;

    const expectedKeywordProcsPerShot = useMemo(() => {
        if (!weapon?.keyword) return 0;
        
        const triggers: TriggerDefinition[] = [];
        if (loadout.weapon) {
            const w = loadout.weapon;
            if (w.mod) triggers.push(...w.mod.triggerDefinitions);
            if (!w.overridesKeywordTriggers) {
                const kwTriggers = KEYWORD_TRIGGERS[w.keyword];
                if (kwTriggers) triggers.push(...kwTriggers);
            }
            triggers.push(...w.triggerDefinitions);
        }

        const mainTrigger = triggers.find(t => t.id.includes('on-hit'));
        const chanceCond = mainTrigger?.conditions.find(c => c.type === TriggerConditionType.Chance);
        
        if (chanceCond?.type === TriggerConditionType.Chance) {
            return chanceCond.probability;
        }
        return 0.10; 
    }, [weapon, loadout]);

    const staticDps = useMemo(() => {
        const physicalExpectedPerShot = physicalProfile.expected;
        const keywordExpectedPerShot = keywordProfile ? (expectedKeywordProcsPerShot * keywordProfile.expected) : 0;
        const totalExpectedPerShot = physicalExpectedPerShot + keywordExpectedPerShot;
        const dps = totalExpectedPerShot * bulletsPerSecond;

        return { dps, physicalExpectedPerShot, keywordExpectedPerShot };
    }, [physicalProfile, keywordProfile, expectedKeywordProcsPerShot, bulletsPerSecond]);

    useEffect(() => {
        const masterTrace: TraceNode = {
            id: `output_prediction_master:${Date.now()}`,
            label: 'Output Prediction HUD',
            finalValue: staticDps.dps,
            operation: 'scaling',
            contributors: [
                { label: 'Kinetic Component', value: staticDps.physicalExpectedPerShot, type: 'stat', childTrace: physicalProfile.masterTrace },
                { label: 'Keyword Component', value: staticDps.keywordExpectedPerShot, type: 'stat', childTrace: keywordProfile?.masterTrace },
                { label: 'Bullets/Sec', value: bulletsPerSecond, type: 'multiplier' }
            ],
            timestamp: Date.now()
        };
        telemetry.record(masterTrace);
    }, [staticDps, physicalProfile, keywordProfile, bulletsPerSecond]);

    const renderLine = (label: string, value: number, color: string) => (
        <div className="flex justify-between items-center py-0.5 border-b border-white/5 last:border-0 group/line relative">
            <span className="text-[7px] font-black text-muted-foreground uppercase">{label}</span>
            <span className={`text-[10px] font-mono font-bold tabular-nums ${color}`}>
                {Math.round(value).toLocaleString()}
            </span>
            {/* Tooltip on hover */}
            <div className="absolute left-0 -top-8 hidden group-hover/line:block bg-black border border-primary/20 p-1.5 z-50 shadow-xl min-w-[80px]">
                <div className="text-[6px] text-primary/60 font-black uppercase tracking-widest mb-0.5">Value_Precision</div>
                <div className="text-[9px] font-mono font-bold text-white">{value.toFixed(2)}</div>
            </div>
        </div>
    );

    return (
        <DiegeticFrame title="Output Prediction" subTitle="Damage Statistics" className="shadow-2xl shadow-orange-400/5">
            <div className="grid grid-cols-2 gap-4">
                {/* Physical Section */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 border-b border-primary/20 pb-0.5 mb-1">
                        <Target className="w-2.5 h-2.5 text-primary" />
                        <span className="text-[8px] font-black text-primary uppercase">Kinetic</span>
                    </div>
                    {renderLine("Normal", physicalProfile.noCritNoWs, "text-foreground")}
                    {renderLine("Crit", physicalProfile.critNoWs, "text-blue-400")}
                    {renderLine("Weakspot", physicalProfile.noCritWs, "text-yellow-400")}
                    {renderLine("Crit + WS", physicalProfile.critWs, "text-primary")}
                    <div className="pt-1 mt-1 border-t border-primary/10 flex justify-between items-center">
                        <span className="text-[7px] font-black text-primary/60 uppercase">Expected</span>
                        <span className="text-[10px] font-black text-primary font-mono tabular-nums">
                            {Math.round(physicalProfile.expected).toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* Keyword Section */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 border-b border-purple-400/20 pb-0.5 mb-1">
                        <Flame className="w-2.5 h-2.5 text-purple-400" />
                        <span className="text-[8px] font-black text-purple-400 uppercase">
                            {weapon?.keyword || "None"}
                        </span>
                    </div>
                    {keywordProfile ? (
                        <>
                            {renderLine("Normal", keywordProfile.noCritNoWs, "text-foreground")}
                            {renderLine("Crit", keywordProfile.critNoWs, "text-blue-400")}
                            {renderLine("Weakspot", keywordProfile.noCritWs, "text-yellow-400")}
                            {renderLine("Expected", keywordProfile.expected, "text-purple-300")}
                            <div className="pt-1 mt-1 border-t border-purple-400/10 flex justify-between items-center">
                                <span className="text-[7px] font-black text-purple-400/60 uppercase">Trigger</span>
                                <span className="text-[10px] font-black text-purple-400 font-mono tabular-nums">
                                    {(expectedKeywordProcsPerShot * 100).toFixed(0)}%
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex items-center justify-center opacity-20 italic text-[8px] uppercase font-bold tracking-widest pt-4">
                            Inactive
                        </div>
                    )}
                </div>
            </div>

            {/* Total Summary Footer */}
            <div className="mt-4 pt-3 border-t-2 border-white/5 grid grid-cols-2 gap-3">
                <div className="bg-primary/5 p-2 border border-primary/10 rounded flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-[7px] font-black text-primary uppercase">Expected/Hit</span>
                        <span className="text-[8px] text-muted-foreground font-bold uppercase">Avg Damage</span>
                    </div>
                    <span className="text-lg font-black text-primary font-mono tabular-nums">
                        {Math.round(staticDps.physicalExpectedPerShot + staticDps.keywordExpectedPerShot).toLocaleString()}
                    </span>
                </div>

                <div className="bg-orange-400/5 p-2 border border-orange-400/10 rounded flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-[7px] font-black text-orange-400 uppercase">Expected DPS</span>
                        <div className="flex gap-1 items-center">
                            <Activity className="w-2 h-2 text-orange-400 opacity-40" />
                            <span className="text-[8px] text-muted-foreground font-bold uppercase">Static Average</span>
                        </div>
                    </div>
                    <span className="text-lg font-black text-orange-400 font-mono tabular-nums">
                        {Math.round(staticDps.dps).toLocaleString()}
                    </span>
                </div>
            </div>
        </DiegeticFrame>
    );
};
