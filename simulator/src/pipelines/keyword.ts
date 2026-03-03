import { BaseDamagePipeline } from './base';
import { Player } from '../models/player';
import { EncounterConditions, DamageProfile } from '../types/common';
import { StatType, KeywordType, DamageTrait } from '../types/enums';
import { TriggeredEffect, OnHitTrigger, ChanceCondition, EveryNShotsTrigger } from '../models/trigger';
import { DoTEffect, BuffEffect, IncreaseStatEffect, ExplosionEffect } from '../models/effect';

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
                    0.12,
                    StatType.PsiIntensity,
                    DamageTrait.Burn,
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
                [new DoTEffect(
                    'status-vortex', 
                    'Frost Vortex', 
                    0.5, 
                    4, 
                    1,
                    0.50,
                    StatType.PsiIntensity,
                    DamageTrait.FrostVortex
                )],
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
                [new ExplosionEffect(this.scalingFactor || 0.7, StatType.PsiIntensity, 0, "Unstable Bomber")],
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
        public type: KeywordType = KeywordType.FastGunner,
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
                [new BuffEffect(
                    'buff-fastgunner', 
                    'Fast Gunner', 
                    2, 
                    10, 
                    [new IncreaseStatEffect(StatType.FireRate, 10)]
                )], 
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
        public type: KeywordType = KeywordType.BullsEye,
        public scalingFactor: number | undefined = undefined,
        public baseStatType: StatType | undefined = undefined,
        public dmgStatType: StatType | undefined = StatType.BullsEyeDamagePercent,
        public baseTriggerChance: number = 0.70,
        public canCrit: boolean = false,
        public canWeakspot: boolean = false
    ) {}

    getTriggeredEffects(): TriggeredEffect[] {
        return [
            new TriggeredEffect(
                new OnHitTrigger(), 
                [new BuffEffect(
                    'status-bullseye', 
                    'Bull\'s Eye', 
                    10, 
                    1,
                    [new IncreaseStatEffect(StatType.VulnerabilityPercent, 8)]
                )],
                [new ChanceCondition(this.baseTriggerChance)]
            )
        ];
    }

    getExpectedProcsPerShot(_player: Player, _damageProfile: DamageProfile): number {
        return this.baseTriggerChance;
    }
}

export class KeywordDamagePipeline extends BaseDamagePipeline {
    calculate(player: Player, _conditions: EncounterConditions): DamageProfile {
        const kw = player.loadout.weapon?.keyword;
        if (!kw || kw.scalingFactor === undefined || kw.baseStatType === undefined) {
            return { noCritNoWs: 0, critNoWs: 0, noCritWs: 0, critWs: 0, expected: 0 };
        }
        
        return { noCritNoWs: 0, critNoWs: 0, noCritWs: 0, critWs: 0, expected: 0 }; // Placeholder
    }
}
