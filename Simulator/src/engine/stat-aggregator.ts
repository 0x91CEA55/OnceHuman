import { Player } from '../models/player';
import { AggregationContext, EncounterConditions } from '../types/common';
import { auditLog } from './audit-log';
import { AMMUNITION } from '../data/ammunition';
import { StatType } from '../types/enums';

export class StatAggregator {
    /**
     * Unified entry point for aggregating all player stats.
     * Coordinate between static gear data and transient simulation state.
     * 
     * @param staticOnly If true, only applies baseline gear/stars/calibration. Skips temporal statuses.
     */
    static aggregate(player: Player, conditions: EncounterConditions, ammoPercent: number = 1.0, skipAudit: boolean = false, staticOnly: boolean = false): void {
        if (!skipAudit) {
            auditLog.clear();
            auditLog.log('Aggregation', 'Start', 'Resetting stats');
        }

        // 1. Prepare
        player.stats.reset();
        player.resetFlags();
        
        // Only clear active effects list if we are doing a full run (not static baseline)
        if (!staticOnly) {
            player.activeEffects = []; 
        }

        const ctx: AggregationContext = {
            player: player,
            conditions: conditions,
            ammoPercent: ammoPercent,
            loadout: player.loadout
        };

        // 2. Delegate to Loadout Strategy (Base Stats, Star Scaling, Calibration, Intrinsics, Sets)
        player.loadout.apply(ctx);

        // 3. Apply Ammunition Multipliers (Considered Static for the current loadout)
        const ammo = AMMUNITION[player.selectedAmmunition];
        if (ammo) {
            const attack = player.stats.get(StatType.AttackPercent);
            if (attack) attack.value *= ammo.damageMultiplier;
            
            const psi = player.stats.get(StatType.PsiIntensity);
            if (psi) psi.value *= ammo.psiMultiplier;
        }

        // 4. Apply Active Temporal Buffs (Statuses) - SKIP if calculating the static baseline
        if (!staticOnly && player.statusManager) {
            const activeBuffs = player.statusManager.getActiveBuffs();
            for (const buff of activeBuffs) {
                for (const effect of buff.definition.effects) {
                    player.activeEffects.push(effect);
                    effect.applyStatic(player, conditions, buff.currentStacks);
                }
            }
        }

        if (!skipAudit && !staticOnly) {
            auditLog.log('Aggregation', 'Complete', 'All stats unified');
        }
    }
}
