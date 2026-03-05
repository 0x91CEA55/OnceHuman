import { Player } from '../models/player';
import { AggregationContext, EncounterConditions } from '../types/common';
import { auditLog } from './audit-log';
import { AMMUNITION } from '../data/ammunition';
import { StatType } from '../types/enums';
import { STATUS_REGISTRY } from '../data/status-registry';

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

        // Feed context values into player stats for effect evaluation
        player.stats.set(StatType.SanityPercent, conditions.playerSanityPercent);
        player.stats.set(StatType.ShieldPercent, conditions.playerShieldPercent);

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
            for (const buffInstance of player.statusManager.getActiveBuffs()) {
                const def = STATUS_REGISTRY.getBuff(buffInstance.definitionId);
                if (!def) continue;
                for (const contrib of def.statContributions) {
                    player.stats.add(contrib.stat, contrib.valuePerStack * buffInstance.currentStacks);
                }
            }
        }

        if (!skipAudit && !staticOnly) {
            auditLog.log('Aggregation', 'Complete', 'All stats unified');
        }
    }
}
