import { Player } from '../models/player';
import { EncounterConditions, DamageProfile } from '../types/common';
import { EnemyType, StatType } from '../types/enums';

export interface DamageCalculationParams {
    baseDamage: number;
    critRatePercent: number;
    critDmgPercent: number;
    wsRatePercent: number;
    wsDmgPercent: number;
    canCrit: boolean;
    canWs: boolean;
}

export abstract class BaseDamagePipeline {
    private static readonly ENEMY_STAT_MAP: Record<EnemyType, StatType> = {
        [EnemyType.Normal]: StatType.DamageBonusNormal,
        [EnemyType.Elite]: StatType.DamageBonusElite,
        [EnemyType.Boss]: StatType.DamageBonusBoss,
    };

    protected getEnemyMultiplier(player: Player, conditions: EncounterConditions): number {
        const statType = BaseDamagePipeline.ENEMY_STAT_MAP[conditions.enemyType];
        const bonus = player.stats.get(statType)?.value ?? 0;
        return 1 + (bonus / 100);
    }

    protected getVulnerabilityMultiplier(player: Player, conditions: EncounterConditions): number {
        return conditions.isTargetVulnerable
            ? (1 + ((player.stats.get(StatType.VulnerabilityPercent)?.value ?? 0) / 100))
            : 1.0;
    }

    protected calculateDamageProfile(params: DamageCalculationParams): DamageProfile {
        const { baseDamage, critRatePercent, critDmgPercent, wsRatePercent, wsDmgPercent, canCrit, canWs } = params;
        
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
