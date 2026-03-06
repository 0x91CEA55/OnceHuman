import React, { useMemo, useEffect } from 'react';
import { Player } from '../models/player';
import { EncounterConditions } from '../types/common';
import { StatType, DamageTrait } from '../types/enums';
import { TriggerConditionType } from '../types/trigger-types';
import { TraceNode } from '../types/telemetry';
import { DiegeticFrame } from './DiegeticFrame';
import { Target, Zap, Flame, Activity } from 'lucide-react';
import { resolveScenarioScan, KEYWORD_TRAIT_MAP } from '../engine/resolver';
import { telemetry } from '../engine/audit-log';

interface StaticDamagePreviewProps {
    player: Player;
    conditions: EncounterConditions;
}

export const StaticDamagePreview: React.FC<StaticDamagePreviewProps> = ({ player, conditions }) => {
    const weapon = player.loadout.weapon;
    const baseDamage = player.stats.get(StatType.DamagePerProjectile)?.value ?? 0;
    
    const physicalTraits = useMemo(() => new Set([DamageTrait.Attack, DamageTrait.Weapon]), []);
    const physicalProfile = useMemo(() => 
        resolveScenarioScan(baseDamage, player, conditions.enemyType, physicalTraits, new Set(), 'Kinetic_Bullet_Scan'),
    [baseDamage, player, conditions.enemyType, physicalTraits]);

    const keywordProfile = useMemo(() => {
        if (!weapon?.keyword || !weapon.keyword.baseStatType || weapon.keyword.scalingFactor === undefined) return null;
        const traits = new Set(KEYWORD_TRAIT_MAP[weapon.keyword.type] || []);
        const kwBase = (player.stats.get(weapon.keyword.baseStatType)?.value ?? 0) * weapon.keyword.scalingFactor;
        
        // ADR-013: pass canCrit and canWeakspot flags from keyword model
        return resolveScenarioScan(
            kwBase, 
            player, 
            conditions.enemyType, 
            traits, 
            new Set(), 
            `${weapon.keyword.type.toUpperCase()}_Proc_Scan`,
            weapon.keyword.canCrit,
            weapon.keyword.canWeakspot
        );
    }, [weapon, player, conditions.enemyType]);

    const fireRate = player.stats.get(StatType.FireRate)?.value ?? 0;
    const bulletsPerSecond = fireRate / 60;

    const expectedKeywordProcsPerShot = useMemo(() => {
        if (!weapon?.keyword) return 0;
        const triggers = weapon.getAllTriggerDefinitions();
        const mainTrigger = triggers.find(t => t.id.includes('on-hit'));
        const chanceCond = mainTrigger?.conditions.find(c => c.type === TriggerConditionType.Chance);
        
        if (chanceCond?.type === TriggerConditionType.Chance) {
            return chanceCond.probability;
        }
        return 0.10; 
    }, [weapon]);

    const staticDps = useMemo(() => {
        const physicalExpectedPerShot = physicalProfile.expected;
        const keywordExpectedPerShot = keywordProfile ? (expectedKeywordProcsPerShot * keywordProfile.expected) : 0;
        const totalExpectedPerShot = physicalExpectedPerShot + keywordExpectedPerShot;
        const dps = totalExpectedPerShot * bulletsPerSecond;

        return { dps, physicalExpectedPerShot, keywordExpectedPerShot };
    }, [physicalProfile, keywordProfile, expectedKeywordProcsPerShot, bulletsPerSecond]);

    // Record Master Telemetry Trace
    useEffect(() => {
        const masterTrace: TraceNode = {
            id: `output_prediction_master:${Date.now()}`,
            label: 'Output Prediction HUD',
            finalValue: staticDps.dps,
            operation: 'scaling',
            contributors: [
                { 
                    label: 'Kinetic Component (Exp/Shot)', 
                    value: staticDps.physicalExpectedPerShot, 
                    type: 'stat',
                    childTrace: physicalProfile.masterTrace 
                },
                { 
                    label: 'Keyword Component (Exp/Shot)', 
                    value: staticDps.keywordExpectedPerShot, 
                    type: 'stat',
                    childTrace: keywordProfile?.masterTrace 
                },
                { label: 'Fire Rate (Bullets/Sec)', value: bulletsPerSecond, type: 'multiplier' }
            ],
            timestamp: Date.now()
        };

        telemetry.record(masterTrace);
    }, [staticDps, physicalProfile, keywordProfile, bulletsPerSecond]);

    const renderDamageState = (label: string, value: number, color: string) => (
        <div className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{label}</span>
            <span className={`text-[11px] font-mono font-black tabular-nums ${color}`}>
                {Math.round(value).toLocaleString()}
            </span>
        </div>
    );

    return (
        <DiegeticFrame title="Output Prediction" subTitle="Bit-Perfect Formula Resolver" className="shadow-2xl shadow-orange-400/5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Physical Output */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3 border-b border-primary/20 pb-1">
                        <Target className="w-3 h-3 text-primary" />
                        <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Kinetic_Output</span>
                    </div>
                    {renderDamageState("Normal", physicalProfile.noCritNoWs, "text-foreground")}
                    {renderDamageState("Critical", physicalProfile.critNoWs, "text-blue-400")}
                    {renderStat("Weakspot", physicalProfile.noCritWs, "text-yellow-400")}
                    {renderDamageState("Crit + WS", physicalProfile.critWs, "text-primary")}
                    <div className="pt-2 mt-2 border-t border-primary/10">
                        <div className="flex justify-between items-center">
                            <span className="text-[8px] font-black text-primary/60 uppercase">Expected_Avg</span>
                            <span className="text-sm font-black text-primary font-mono tabular-nums">
                                {Math.round(physicalProfile.expected).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Keyword Output */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3 border-b border-purple-400/20 pb-1">
                        <Flame className="w-3 h-3 text-purple-400" />
                        <span className="text-[9px] font-black text-purple-400 uppercase tracking-[0.2em]">
                            {weapon?.keyword?.type.toUpperCase() || "NO_KEYWORD"}_LOGIC
                        </span>
                    </div>
                    {keywordProfile ? (
                        <>
                            {renderDamageState("Proc Normal", keywordProfile.noCritNoWs, "text-foreground")}
                            {weapon?.keyword?.canCrit && renderDamageState("Proc Critical", keywordProfile.critNoWs, "text-blue-400")}
                            {weapon?.keyword?.canWeakspot && renderDamageState("Proc Weakspot", keywordProfile.noCritWs, "text-yellow-400")}
                            {renderDamageState("Proc Expected", keywordProfile.expected, "text-purple-300")}
                            <div className="pt-2 mt-2 border-t border-purple-400/10">
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-black text-purple-400/60 uppercase">Trigger_Prob</span>
                                    <span className="text-[11px] font-black text-purple-400 font-mono tabular-nums">
                                        {(expectedKeywordProcsPerShot * 100).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex items-center justify-center opacity-20 italic text-[10px] uppercase font-bold tracking-widest">
                            No_Keyword_Detected
                        </div>
                    )}
                </div>
            </div>

            {/* Global Efficiency Footer */}
            <div className="mt-6 pt-4 border-t-2 border-white/5 grid grid-cols-2 gap-4">
                <div className="bg-primary/5 p-3 border border-primary/10 rounded flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-[7px] font-black text-primary uppercase tracking-widest">Effective_Attack</span>
                        <div className="flex gap-1 items-center">
                            <Zap className="w-2.5 h-2.5 text-primary opacity-40" />
                            <span className="text-[10px] text-muted-foreground font-bold italic uppercase">Alpha_Strike</span>
                        </div>
                    </div>
                    <span className="text-xl font-black text-primary font-mono tabular-nums">
                        {Math.round(physicalProfile.noCritNoWs).toLocaleString()}
                    </span>
                </div>

                <div className="bg-orange-400/5 p-3 border border-orange-400/10 rounded flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-[7px] font-black text-orange-400 uppercase tracking-widest">Predicted_DPS</span>
                        <div className="flex gap-1 items-center">
                            <Activity className="w-2.5 h-2.5 text-orange-400 opacity-40" />
                            <span className="text-[10px] text-muted-foreground font-bold italic uppercase">Static_Avg</span>
                        </div>
                    </div>
                    <span className="text-xl font-black text-orange-400 font-mono tabular-nums">
                        {Math.round(staticDps.dps).toLocaleString()}
                    </span>
                </div>
            </div>
        </DiegeticFrame>
    );
};

const renderStat = (label: string, value: number, color: string) => (
    <div className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{label}</span>
        <span className={`text-[11px] font-mono font-black tabular-nums ${color}`}>
            {Math.round(value).toLocaleString()}
        </span>
    </div>
);
