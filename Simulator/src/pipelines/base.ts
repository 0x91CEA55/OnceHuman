import { Player } from '../models/player';
import { EncounterConditions, DamageProfile } from '../types/common';
import { EnemyType, StatType } from '../types/enums';

export abstract class BaseDamagePipeline {
    protected getEnemyMultiplier(player: Player, conditions: EncounterConditions): number {
        let bonus = 0;
        if (conditions.enemyType === EnemyType.Normal) bonus = player.stats.get(StatType.DamageBonusNormal)?.value ?? 0;
        else if (conditions.enemyType === EnemyType.Elite) bonus = player.stats.get(StatType.DamageBonusElite)?.value ?? 0;
        else if (conditions.enemyType === EnemyType.Boss) bonus = player.stats.get(StatType.DamageBonusBoss)?.value ?? 0;
        return 1 + (bonus / 100);
    }

    protected getVulnerabilityMultiplier(player: Player, conditions: EncounterConditions): number {
        return conditions.isTargetVulnerable
            ? (1 + ((player.stats.get(StatType.VulnerabilityPercent)?.value ?? 0) / 100))
            : 1.0;
    }

    protected calculateDamageProfile(
        baseDamage: number,
        critRatePercent: number,
        critDmgPercent: number,
        wsRatePercent: number,
        wsDmgPercent: number,
        canCrit: boolean,
        canWs: boolean
    ): DamageProfile {
        const critRate = canCrit ? Math.min(critRatePercent, 1.0) / 100 : 0;
        const wsRate = canWs ? wsRatePercent / 100 : 0;
        const critDmg = canCrit ? critDmgPercent / 100 : 0;
        const wsDmg = canWs ? wsDmgPercent / 100 : 0;

        const noCritNoWs = baseDamage;
        const critNoWs = baseDamage * (1 + critDmg);
        const noCritWs = baseDamage * (1 + wsDmg);
        const critWs = baseDamage * (1 + critDmg + wsDmg);

        const expected =
            noCritNoWs * (1 - critRate) * (1 - wsRate) +
            critNoWs * critRate * (1 - wsRate) +
            noCritWs * (1 - critRate) * wsRate +
            critWs * critRate * wsRate;

        return { noCritNoWs, critNoWs, noCritWs, critWs, expected };
    }
}
