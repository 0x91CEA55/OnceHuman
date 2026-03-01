import { BaseDamagePipeline } from '../pipelines/base';
import { Player } from '../models/player';
import { EncounterConditions, DamageProfile } from '../types/common';
import { StatType, FlagType } from '../types/enums';
import { auditLog } from '../engine/audit-log';

export class PhysicalDamagePipeline extends BaseDamagePipeline {
    private getAttackMultiplier(player: Player): number {
        const val = player.stats.get(StatType.AttackPercent)?.value ?? 0;
        const mult = 1 + (val / 100);
        auditLog.log('Pipeline', 'Attack Multiplier', mult, `1 + ${val}%`);
        return mult;
    }

    private getWeaponDamageMultiplier(player: Player): number {
        const val = player.stats.get(StatType.WeaponDamagePercent)?.value ?? 0;
        const mult = 1 + (val / 100);
        auditLog.log('Pipeline', 'Weapon Damage Multiplier', mult, `1 + ${val}%`);
        return mult;
    }

    calculate(player: Player, conditions: EncounterConditions): DamageProfile {
        const weaponBase = player.loadout.weapon?.stats.damagePerProjectile.value ?? 
                          player.stats.get(StatType.DamagePerProjectile)?.value ?? 0;
        
        auditLog.log('Pipeline', 'Base Weapon Damage', weaponBase);

        const attackMult = this.getAttackMultiplier(player);
        const weaponDmgMult = this.getWeaponDamageMultiplier(player);
        const enemyDmg = this.getEnemyMultiplier(player, conditions);
        const vulnerabilityDmg = this.getVulnerabilityMultiplier(player, conditions);

        const baseDamage = weaponBase * attackMult * weaponDmgMult * enemyDmg * vulnerabilityDmg;
        auditLog.log('Pipeline', 'Final Base Damage', baseDamage.toFixed(2), 'Base * Atk * Wpn * Enemy * Vuln');

        return this.calculateDamageProfile({
            baseDamage,
            critRatePercent: player.stats.get(StatType.CritRatePercent)?.value ?? 0,
            critDmgPercent: player.stats.get(StatType.CritDamagePercent)?.value ?? 0,
            wsRatePercent: conditions.weakspotHitRate * 100,
            wsDmgPercent: player.stats.get(StatType.WeakspotDamagePercent)?.value ?? 0,
            canCrit: true,
            canWs: !player.hasFlag(FlagType.CannotDealWeakspotDamage)
        });
    }
}
