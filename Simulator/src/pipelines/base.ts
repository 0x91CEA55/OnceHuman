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
        wsRatePercent: number, // Expecting 0-100
        wsDmgPercent: number,
        canCrit: boolean,
        canWs: boolean
    ): DamageProfile {
        const critRate = canCrit ? Math.min(critRatePercent, 100) / 100 : 0;
        const wsRate = canWs ? Math.min(wsRatePercent, 100) / 100 : 0;
        const critDmg = critDmgPercent / 100;
        const wsDmg = wsDmgPercent / 100;

        const noCritNoWs = baseDamage;
        const critNoWs = canCrit ? baseDamage * (1 + critDmg) : baseDamage;
        const noCritWs = canWs ? baseDamage * (1 + wsDmg) : baseDamage;
        
        // Crit + Weakspot: Additive (1 + crit% + ws%)
        const critWs = (canCrit && canWs) 
            ? baseDamage * (1 + critDmg + wsDmg) 
            : (canCrit ? critNoWs : (canWs ? noCritWs : baseDamage));

        const expected =
            noCritNoWs * (1 - critRate) * (1 - wsRate) +
            critNoWs * critRate * (1 - wsRate) +
            noCritWs * (1 - critRate) * wsRate +
            critWs * critRate * wsRate;

        return { noCritNoWs, critNoWs, noCritWs, critWs, expected };
    }
}
