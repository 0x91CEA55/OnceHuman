import { Player } from '../models/player';
import { AggregationContext } from '../models/equipment';
import { EncounterConditions } from '../types/common';
import { auditLog } from './audit-log';

export class StatAggregator {
    /**
     * Unified entry point for aggregating all player stats.
     * Coordinate between static gear data and transient simulation state.
     */
    static aggregate(player: Player, conditions: EncounterConditions, ammoPercent: number = 1.0, skipAudit: boolean = false): void {
        if (!skipAudit) {
            auditLog.clear();
            auditLog.log('Aggregation', 'Start', 'Resetting stats');
        }

        // 1. Prepare
        player.stats.reset();
        player.resetFlags();
        player.activeEffects = []; // Clear current effects for visualization

        const ctx: AggregationContext = {
            player: player,
            conditions: conditions,
            ammoPercent: ammoPercent,
            loadout: player.loadout
        };

        // 2. Delegate to Loadout Strategy
        player.loadout.apply(ctx);

        // 3. Apply Active Temporal Buffs (Statuses) from StatusManager
        const activeBuffs = player.statusManager.getActiveBuffs();
        for (const buff of activeBuffs) {
            for (const effect of buff.definition.effects) {
                // Register effect for visualization
                player.activeEffects.push(effect);

                // Buffs are applied with stacks multiplier
                effect.applyStatic(player, conditions, buff.currentStacks);
                
                if (!skipAudit) {
                    auditLog.log('Effect', `Apply Status: ${buff.definition.name} (${buff.currentStacks}x)`, effect.getDescription());
                }
            }
        }

        if (!skipAudit) {
            auditLog.log('Aggregation', 'Complete', 'All stats unified');
        }
    }
}
