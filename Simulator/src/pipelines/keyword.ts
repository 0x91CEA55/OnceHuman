import { BaseDamagePipeline } from './base';
import { Player } from '../models/player';
import { EncounterConditions, DamageProfile } from '../types/common';
import { StatType, KeywordType, FlagType } from '../types/enums';
import { Stat } from '../models/stats';

export interface Keyword {
    type: KeywordType;
    scalingFactor: number | undefined;
    baseStatType: StatType | undefined;
    dmgStatType: StatType | undefined;

    getExpectedProcsPerShot(player: Player, damageProfile: DamageProfile): number;
}

export class Burn implements Keyword {
    constructor(
        public type: KeywordType = KeywordType.Burn,
        public scalingFactor: number | undefined = 0.12,
        public baseStatType: StatType | undefined = StatType.PsiIntensity,
        public dmgStatType: StatType | undefined = StatType.BurnDamagePercent
    ) {}
    getExpectedProcsPerShot(player: Player, damageProfile: DamageProfile): number {
        throw new Error('Method not implemented.');
    }
}

export class Shrapnel implements Keyword {
    constructor(
        public type = KeywordType.Shrapnel,
        public scalingFactor: number | undefined = 0.6,
        public baseStatType: StatType | undefined = StatType.DamagePerProjectile,
        public dmgStatType: StatType | undefined = StatType.ShrapnelDamagePercent
    ) {}
    getExpectedProcsPerShot(player: Player, damageProfile: DamageProfile): number {
        throw new Error('Method not implemented.');
    }
}

export class FrostVortex implements Keyword {
    constructor(
        public type = KeywordType.FrostVortex,
        public scalingFactor: number = 0.5,
        public baseStatType: StatType | undefined = StatType.PsiIntensity,
        public dmgStatType: StatType | undefined = StatType.FrostVortexDamagePercent
    ) {}
    getExpectedProcsPerShot(player: Player, damageProfile: DamageProfile): number {
        throw new Error('Method not implemented.');
    }
}

export class PowerSurge implements Keyword {
    constructor(
        public type = KeywordType.PowerSurge,
        public scalingFactor: number = 1.0,
        public baseStatType: StatType | undefined = StatType.PsiIntensity,
        public dmgStatType: StatType | undefined = StatType.PowerSurgeDamagePercent
    ) {}
    getExpectedProcsPerShot(player: Player, damageProfile: DamageProfile): number {
        throw new Error('Method not implemented.');
    }
}

export class UnstableBomber implements Keyword {
    constructor(
        public type = KeywordType.UnstableBomber,
        public scalingFactor: number = 0.7,
        public baseStatType: StatType | undefined = StatType.PsiIntensity,
        public dmgStatType: StatType | undefined = StatType.UnstableBomberDamagePercent
    ) {}
    getExpectedProcsPerShot(player: Player, damageProfile: DamageProfile): number {
        throw new Error('Method not implemented.');
    }
}

export class Bounce implements Keyword {
    constructor(
        public type = KeywordType.Bounce,
        public scalingFactor: number | undefined = undefined,
        public baseStatType: StatType | undefined = undefined,
        public dmgStatType: StatType | undefined = StatType.BounceDamagePercent
    ) {}
    getExpectedProcsPerShot(player: Player, damageProfile: DamageProfile): number {
        throw new Error('Method not implemented.');
    }
}

export class FortressWarfare implements Keyword {
    constructor(
        public type = KeywordType.FortressWarfare,
        public scalingFactor: number | undefined = undefined,
        public baseStatType: StatType | undefined = undefined,
        public dmgStatType: StatType | undefined = undefined
    ) {}
    getExpectedProcsPerShot(player: Player, damageProfile: DamageProfile): number {
        throw new Error('Method not implemented.');
    }
}

export class FastGunner implements Keyword {
    constructor(
        public type = KeywordType.FastGunner,
        public scalingFactor: number | undefined = undefined,
        public baseStatType: StatType | undefined = undefined,
        public dmgStatType: StatType | undefined = undefined
    ) {}
    getExpectedProcsPerShot(player: Player, damageProfile: DamageProfile): number {
        throw new Error('Method not implemented.');
    }
}

export class BullsEye implements Keyword {
    constructor(
        public type = KeywordType.BullsEye,
        public scalingFactor: number | undefined = undefined,
        public baseStatType: StatType | undefined = undefined,
        public dmgStatType: StatType | undefined = undefined,
        public vulnerabilityStatType: StatType | undefined = StatType.BullsEyeDamagePercent
    ) {}
    getExpectedProcsPerShot(player: Player, damageProfile: DamageProfile): number {
        throw new Error('Method not implemented.');
    }
}

export class KeywordDamagePipeline extends BaseDamagePipeline {
    private getStatusMultiplier(player: Player): number {
        const value = player.stats.get(StatType.StatusDamagePercent)?.value ?? 0
        return 1 + (value / 100);
    }

    private getElementalMultiplier(player: Player): number {
        const value = player.stats.get(StatType.ElementalDamagePercent)?.value ?? 0
        return 1 + (value / 100);
    }

    private getKeywordSpecificMultiplier(player: Player): number {
        const statType = player.loadout.weapon?.keyword?.dmgStatType;
        return statType ? 1 + (player.stats.get(statType)?.value ?? 0) / 100 : 1.0;
    }

    calculate(player: Player, conditions: EncounterConditions): DamageProfile {
        const kw = player.loadout.weapon?.keyword;
        if (!kw) {
            return { noCritNoWs: 0, critNoWs: 0, noCritWs: 0, critWs: 0, expected: 0 };
        }
        const scalingFactor = kw.scalingFactor ?? 0;
        const baseStat = kw.baseStatType ? player.stats.get(kw.baseStatType)?.value ?? 0 : 0;

        const multiplier =
            this.getStatusMultiplier(player)
            * this.getElementalMultiplier(player)
            * this.getKeywordSpecificMultiplier(player)
            * this.getEnemyMultiplier(player, conditions)
            * this.getVulnerabilityMultiplier(player, conditions);

        const finalBaseDmg = baseStat * scalingFactor * multiplier;

        return this.calculateDamageProfile(
            finalBaseDmg,
            (player.stats.get(StatType.CritRatePercent)?.value ?? 0 ) + (player.stats.get(StatType.KeywordCritRatePercent)?.value ?? 0),
            (player.stats.get(StatType.CritDamagePercent)?.value ?? 0) + (player.stats.get(StatType.KeywordCritDamagePercent)?.value ?? 0),
            conditions.weakspotHitRate,
            player.stats.get(StatType.WeakspotDamagePercent)?.value ?? 0,
            player.hasFlag(FlagType.KeywordCanCrit),
            player.hasFlag(FlagType.KeywordCanWeakspot)
        );
    }
}
