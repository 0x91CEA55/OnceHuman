import { BaseDamagePipeline } from './base';
import { Player } from '../models/player';
import { EncounterConditions, DamageProfile } from '../types/common';
import { StatType, KeywordType, FlagType } from '../types/enums';
import { TriggeredEffect, OnHitTrigger, ChanceCondition, EveryNShotsTrigger } from '../models/trigger';
import { DoTEffect } from '../models/effect';

export interface Keyword {
    type: KeywordType;
    scalingFactor: number | undefined;
    baseStatType: StatType | undefined;
    dmgStatType: StatType | undefined;
    baseTriggerChance: number;
    canCrit: boolean;
    canWeakspot: boolean;

    getTriggeredEffects(): TriggeredEffect[];
    getExpectedProcsPerShot(player: Player, damageProfile: DamageProfile): number;
}

export class Burn implements Keyword {
    constructor(
        public type: KeywordType = KeywordType.Burn,
        public scalingFactor: number | undefined = 0.12,
        public baseStatType: StatType | undefined = StatType.PsiIntensity,
        public dmgStatType: StatType | undefined = StatType.BurnDamagePercent,
        public baseTriggerChance: number = 0.18,
        public canCrit: boolean = false,
        public canWeakspot: boolean = false
    ) {}

    getTriggeredEffects(): TriggeredEffect[] {
        return [
            // 1. Base Burn DoT
            new TriggeredEffect(
                new OnHitTrigger(),
                [new DoTEffect(
                    'status-burn', 
                    'Burn', 
                    0.5, 
                    6, 
                    5, 
                    StatType.MaxBurnStacks, 
                    StatType.BurnDurationPercent
                )],
                [new ChanceCondition(this.baseTriggerChance)]
            )
        ];
    }

    getExpectedProcsPerShot(_player: Player, _damageProfile: DamageProfile): number {
        return this.baseTriggerChance;
    }
}

export class Shrapnel implements Keyword {
    constructor(
        public type = KeywordType.Shrapnel,
        public scalingFactor: number | undefined = 0.6,
        public baseStatType: StatType | undefined = StatType.DamagePerProjectile,
        public dmgStatType: StatType | undefined = StatType.ShrapnelDamagePercent,
        public baseTriggerChance: number = 0.04,
        public canCrit: boolean = true,
        public canWeakspot: boolean = false
    ) {}

    getTriggeredEffects(): TriggeredEffect[] {
        return [
            new TriggeredEffect(
                new OnHitTrigger(),
                [],
                [new ChanceCondition(this.baseTriggerChance)]
            )
        ];
    }

    getExpectedProcsPerShot(player: Player, _damageProfile: DamageProfile): number {
        const critRate = (player.stats.get(StatType.CritRatePercent)?.value ?? 0) / 100;
        return this.baseTriggerChance * (1 + critRate);
    }
}

export class FrostVortex implements Keyword {
    constructor(
        public type = KeywordType.FrostVortex,
        public scalingFactor: number = 0.5,
        public baseStatType: StatType | undefined = StatType.PsiIntensity,
        public dmgStatType: StatType | undefined = StatType.FrostVortexDamagePercent,
        public baseTriggerChance: number = 0.10,
        public canCrit: boolean = false,
        public canWeakspot: boolean = false
    ) {}

    getTriggeredEffects(): TriggeredEffect[] {
        return [
            new TriggeredEffect(
                new OnHitTrigger(),
                [new DoTEffect('status-vortex', 'Frost Vortex', 0.5, 4, 1)],
                [new ChanceCondition(this.baseTriggerChance)]
            )
        ];
    }

    getExpectedProcsPerShot(_player: Player, _damageProfile: DamageProfile): number {
        return this.baseTriggerChance;
    }
}

export class PowerSurge implements Keyword {
    constructor(
        public type = KeywordType.PowerSurge,
        public scalingFactor: number = 1.0,
        public baseStatType: StatType | undefined = StatType.PsiIntensity,
        public dmgStatType: StatType | undefined = StatType.PowerSurgeDamagePercent,
        public baseTriggerChance: number = 0.15,
        public canCrit: boolean = true,
        public canWeakspot: boolean = false
    ) {}

    getTriggeredEffects(): TriggeredEffect[] {
        return [
            new TriggeredEffect(
                new OnHitTrigger(),
                [],
                [new ChanceCondition(this.baseTriggerChance)]
            )
        ];
    }

    getExpectedProcsPerShot(_player: Player, _damageProfile: DamageProfile): number {
        return this.baseTriggerChance;
    }
}

export class UnstableBomber implements Keyword {
    constructor(
        public type = KeywordType.UnstableBomber,
        public scalingFactor: number = 0.7,
        public baseStatType: StatType | undefined = StatType.PsiIntensity,
        public dmgStatType: StatType | undefined = StatType.UnstableBomberDamagePercent,
        public baseTriggerChance: number = 1.0,
        public canCrit: boolean = true,
        public canWeakspot: boolean = true
    ) {}

    getTriggeredEffects(): TriggeredEffect[] {
        return [
            new TriggeredEffect(
                new EveryNShotsTrigger(4),
                [],
                []
            )
        ];
    }

    getExpectedProcsPerShot(_player: Player, _damageProfile: DamageProfile): number {
        return 0.25;
    }
}

export class Bounce implements Keyword {
    constructor(
        public type = KeywordType.Bounce,
        public scalingFactor: number | undefined = 0.6,
        public baseStatType: StatType | undefined = StatType.DamagePerProjectile,
        public dmgStatType: StatType | undefined = StatType.BounceDamagePercent,
        public baseTriggerChance: number = 0.30,
        public canCrit: boolean = true,
        public canWeakspot: boolean = false
    ) {}

    getTriggeredEffects(): TriggeredEffect[] {
        return [
            new TriggeredEffect(
                new OnHitTrigger(),
                [],
                [new ChanceCondition(this.baseTriggerChance)]
            )
        ];
    }

    getExpectedProcsPerShot(_player: Player, _damageProfile: DamageProfile): number {
        return this.baseTriggerChance;
    }
}

export class FortressWarfare implements Keyword {
    constructor(
        public type = KeywordType.FortressWarfare,
        public scalingFactor: number | undefined = undefined,
        public baseStatType: StatType | undefined = undefined,
        public dmgStatType: StatType | undefined = undefined,
        public baseTriggerChance: number = 0,
        public canCrit: boolean = false,
        public canWeakspot: boolean = false
    ) {}

    getTriggeredEffects(): TriggeredEffect[] { return []; }
    getExpectedProcsPerShot(_player: Player, _damageProfile: DamageProfile): number { return 0; }
}

export class FastGunner implements Keyword {
    constructor(
        public type = KeywordType.FastGunner,
        public scalingFactor: number | undefined = undefined,
        public baseStatType: StatType | undefined = undefined,
        public dmgStatType: StatType | undefined = undefined,
        public baseTriggerChance: number = 0.35,
        public canCrit: boolean = false,
        public canWeakspot: boolean = false
    ) {}

    getTriggeredEffects(): TriggeredEffect[] {
        return [
            new TriggeredEffect(
                new OnHitTrigger(),
                [new DoTEffect('buff-fastgunner', 'Fast Gunner', 100, 2, 10)], // Using DoTEffect as a generic stackable buff for now, or should use BuffEffect?
                [new ChanceCondition(this.baseTriggerChance)]
            )
        ];
    }

    getExpectedProcsPerShot(_player: Player, _damageProfile: DamageProfile): number {
        return this.baseTriggerChance;
    }
}

export class BullsEye implements Keyword {
    constructor(
        public type = KeywordType.BullsEye,
        public scalingFactor: number | undefined = undefined,
        public baseStatType: StatType | undefined = undefined,
        public dmgStatType: StatType | undefined = undefined,
        public vulnerabilityStatType: StatType | undefined = StatType.BullsEyeDamagePercent,
        public baseTriggerChance: number = 0.70,
        public canCrit: boolean = false,
        public canWeakspot: boolean = false
    ) {}

    getTriggeredEffects(): TriggeredEffect[] {
        return [
            new TriggeredEffect(
                new OnHitTrigger(), 
                [new DoTEffect('status-bullseye', 'Bull\'s Eye', 100, 10, 1)],
                [new ChanceCondition(this.baseTriggerChance)]
            )
        ];
    }

    getExpectedProcsPerShot(_player: Player, _damageProfile: DamageProfile): number {
        return this.baseTriggerChance;
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
        const value = statType ? (player.stats.get(statType)?.value ?? 0) : 0;
        return 1 + (value / 100);
    }

    private getAttackMultiplier(player: Player): number {
        const value = player.stats.get(StatType.AttackPercent)?.value ?? 0;
        return 1 + (value / 100);
    }

    calculate(player: Player, conditions: EncounterConditions): DamageProfile {
        const kw = player.loadout.weapon?.keyword;
        if (!kw || kw.scalingFactor === undefined || kw.baseStatType === undefined) {
            return { noCritNoWs: 0, critNoWs: 0, noCritWs: 0, critWs: 0, expected: 0 };
        }
        const scalingFactor = kw.scalingFactor;
        const baseStat = player.stats.get(kw.baseStatType)?.value ?? 0;

        let multiplier =
            this.getStatusMultiplier(player)
            * this.getElementalMultiplier(player)
            * this.getKeywordSpecificMultiplier(player)
            * this.getEnemyMultiplier(player, conditions)
            * this.getVulnerabilityMultiplier(player, conditions);

        if (kw.baseStatType === StatType.DamagePerProjectile) {
            multiplier *= this.getAttackMultiplier(player);
        }

        const finalBaseDmg = baseStat * scalingFactor * multiplier;

        const critRate = (player.stats.get(StatType.CritRatePercent)?.value ?? 0) + (player.stats.get(StatType.KeywordCritRatePercent)?.value ?? 0);
        const critDmg = (player.stats.get(StatType.CritDamagePercent)?.value ?? 0) + (player.stats.get(StatType.KeywordCritDamagePercent)?.value ?? 0);
        const wsDmg = player.stats.get(StatType.WeakspotDamagePercent)?.value ?? 0;

        return this.calculateDamageProfile({
            baseDamage: finalBaseDmg,
            critRatePercent: critRate,
            critDmgPercent: critDmg,
            wsRatePercent: conditions.weakspotHitRate * 100,
            wsDmgPercent: wsDmg,
            canCrit: kw.canCrit || player.hasFlag(FlagType.KeywordCanCrit),
            canWs: kw.canWeakspot || player.hasFlag(FlagType.KeywordCanWeakspot)
        });
    }
}
