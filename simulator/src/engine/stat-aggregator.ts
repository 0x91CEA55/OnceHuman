import { Player } from '../models/player';
import { AggregationContext, EncounterConditions } from '../types/common';
import { telemetry } from './audit-log';
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
        // 1. Prepare
        player.stats.reset();
        player.resetFlags();

        // Feed context values into player stats for effect evaluation
        player.stats.set(StatType.SanityPercent, conditions.playerSanityPercent, 'Encounter Context');
        player.stats.set(StatType.ShieldPercent, conditions.playerShieldPercent, 'Encounter Context');

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

        // 3. Apply Ammunition Multipliers
        const ammo = AMMUNITION[player.selectedAmmunition];
        if (ammo) {
            // Weapon Damage Bonus (Additive to the bucket)
            if (ammo.weaponDamageBonus > 0) {
                player.stats.add(StatType.WeaponDamagePercent, ammo.weaponDamageBonus, `Ammunition: ${ammo.name}`);
            }

            // Psi Intensity Bonus (Percentage scaling)
            const psi = player.stats.get(StatType.PsiIntensity);
            if (psi && ammo.psiIntensityBonus > 0) {
                const bonusValue = Math.round(psi.baseValue * (ammo.psiIntensityBonus / 100));
                player.stats.add(StatType.PsiIntensity, bonusValue, `Ammunition: ${ammo.name} (+${ammo.psiIntensityBonus}%)`);
            }
        }

        // 4. Apply Active Temporal Buffs (Statuses) - SKIP if calculating the static baseline
        if (!staticOnly && player.statusManager) {
            for (const buffInstance of player.statusManager.getActiveBuffs()) {
                const def = STATUS_REGISTRY.getBuff(buffInstance.definitionId);
                if (!def) continue;
                for (const contrib of def.statContributions) {
                    const bonus = contrib.valuePerStack * buffInstance.currentStacks;
                    player.stats.add(contrib.stat, bonus, `Status: ${def.name} (${buffInstance.currentStacks} stacks)`);
                }
            }
        }

        if (!skipAudit) {
            // Record all non-trivial stats to telemetry
            player.stats.stats.forEach((_, type) => {
                const trace = telemetry.createStatTrace(player, type);
                if (trace.contributors.length > 1 || (trace.contributors.length === 1 && trace.contributors[0].label !== 'Baseline' && trace.contributors[0].value !== 0)) {
                    telemetry.record(trace);
                }
            });
        }
    }
}
