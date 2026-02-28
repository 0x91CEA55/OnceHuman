import { BaseDamagePipeline } from '../pipelines/base';
import { Player } from '../models/player';
import { EncounterConditions, DamageProfile } from '../types/common';
import { StatType, FlagType } from '../types/enums';

export class PhysicalDamagePipeline extends BaseDamagePipeline {
    private getWeaponDamageMultiplier(player: Player): number {
        return 1 + ((player.stats.get(StatType.WeaponDamagePercent)?.value ?? 0) / 100);
    }

    calculate(player: Player, conditions: EncounterConditions): DamageProfile {
        const atk = player.stats.get(StatType.DamagePerProjectile)?.value ?? 0;
        const weaponDmg = this.getWeaponDamageMultiplier(player);
        const enemyDmg = this.getEnemyMultiplier(player, conditions);
        const vulnerabilityDmg = this.getVulnerabilityMultiplier(player, conditions);

        const baseDamage = atk * weaponDmg * enemyDmg * vulnerabilityDmg;

        return this.calculateDamageProfile(
            baseDamage,
            player.stats.get(StatType.CritRatePercent)?.value ?? 0,
            player.stats.get(StatType.CritDamagePercent)?.value ?? 0,
            conditions.weakspotHitRate,
            player.stats.get(StatType.WeakspotDamagePercent)?.value ?? 0,
            true,
            !player.hasFlag(FlagType.CannotDealWeakspotDamage)
        );
    }
}
