/**
 * Keyword Domain Models — pure data producers.
 * 
 * Each Keyword class produces TriggerDefinition[] via getTriggerDefinitions()
 * and provides metadata for static damage predictions.
 */

import { Player } from './player';
import { DamageProfile } from '../types/common';
import { StatType, KeywordType } from '../types/enums';
import { TriggerDefinition } from '../types/trigger-types';
import { KEYWORD_TRIGGERS } from '../data/trigger-definitions';

export interface Keyword {
    readonly type: KeywordType;
    readonly scalingFactor: number | undefined;
    readonly baseStatType: StatType | undefined;
    readonly baseTriggerChance: number;
    readonly canCrit: boolean;
    /** 
     * ADR-013: Defines if this keyword's damage instances can benefit from weakspot bonuses. 
     * Bullet-based (Bounce, Shrapnel) can, Elemental (Burn, Surge) generally cannot.
     */
    readonly canWeakspot: boolean;

    /** Returns TriggerDefinitions for this keyword. */
    getTriggerDefinitions(): TriggerDefinition[];
    getExpectedProcsPerShot(player: Player, damageProfile: DamageProfile): number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyword Implementations
// ─────────────────────────────────────────────────────────────────────────────

export class Burn implements Keyword {
    constructor(
        public readonly type: KeywordType = KeywordType.Burn,
        public readonly scalingFactor: number | undefined = 0.12,
        public readonly baseStatType: StatType | undefined = StatType.PsiIntensity,
        public readonly baseTriggerChance: number = 0.18,
        public readonly canCrit: boolean = false,
        public readonly canWeakspot: boolean = false
    ) {}

    getTriggerDefinitions(): TriggerDefinition[] {
        return KEYWORD_TRIGGERS[KeywordType.Burn];
    }

    getExpectedProcsPerShot(_player: Player, _damageProfile: DamageProfile): number {
        return this.baseTriggerChance;
    }
}

export class Shrapnel implements Keyword {
    constructor(
        public readonly type = KeywordType.Shrapnel,
        public readonly scalingFactor: number | undefined = 0.6,
        public readonly baseStatType: StatType | undefined = StatType.DamagePerProjectile,
        public readonly baseTriggerChance: number = 0.04,
        public readonly canCrit: boolean = true,
        public readonly canWeakspot: boolean = true
    ) {}

    getTriggerDefinitions(): TriggerDefinition[] {
        return KEYWORD_TRIGGERS[KeywordType.Shrapnel];
    }

    getExpectedProcsPerShot(player: Player, _damageProfile: DamageProfile): number {
        const critRate = (player.stats.get(StatType.CritRatePercent)?.value ?? 0) / 100;
        return this.baseTriggerChance * (1 + critRate);
    }
}

export class FrostVortex implements Keyword {
    constructor(
        public readonly type = KeywordType.FrostVortex,
        public readonly scalingFactor: number | undefined = 0.5,
        public readonly baseStatType: StatType | undefined = StatType.PsiIntensity,
        public readonly baseTriggerChance: number = 0.10,
        public readonly canCrit: boolean = false,
        public readonly canWeakspot: boolean = false
    ) {}

    getTriggerDefinitions(): TriggerDefinition[] {
        return KEYWORD_TRIGGERS[KeywordType.FrostVortex];
    }

    getExpectedProcsPerShot(_player: Player, _damageProfile: DamageProfile): number {
        return this.baseTriggerChance;
    }
}

export class PowerSurge implements Keyword {
    constructor(
        public readonly type = KeywordType.PowerSurge,
        public readonly scalingFactor: number | undefined = 1.0,
        public readonly baseStatType: StatType | undefined = StatType.PsiIntensity,
        public readonly baseTriggerChance: number = 0.15,
        public readonly canCrit: boolean = true,
        public readonly canWeakspot: boolean = false
    ) {}

    getTriggerDefinitions(): TriggerDefinition[] {
        return KEYWORD_TRIGGERS[KeywordType.PowerSurge];
    }

    getExpectedProcsPerShot(_player: Player, _damageProfile: DamageProfile): number {
        return this.baseTriggerChance;
    }
}

export class UnstableBomber implements Keyword {
    constructor(
        public readonly type = KeywordType.UnstableBomber,
        public readonly scalingFactor: number | undefined = 0.7,
        public readonly baseStatType: StatType | undefined = StatType.PsiIntensity,
        public readonly baseTriggerChance: number = 1.0,
        public readonly canCrit: boolean = true,
        public readonly canWeakspot: boolean = false
    ) {}

    getTriggerDefinitions(): TriggerDefinition[] {
        return KEYWORD_TRIGGERS[KeywordType.UnstableBomber];
    }

    getExpectedProcsPerShot(_player: Player, _damageProfile: DamageProfile): number {
        return 0.25;
    }
}

export class Bounce implements Keyword {
    constructor(
        public readonly type = KeywordType.Bounce,
        public readonly scalingFactor: number | undefined = 0.6,
        public readonly baseStatType: StatType | undefined = StatType.DamagePerProjectile,
        public readonly baseTriggerChance: number = 0.30,
        public readonly canCrit: boolean = true,
        public readonly canWeakspot: boolean = true
    ) {}

    getTriggerDefinitions(): TriggerDefinition[] {
        return KEYWORD_TRIGGERS[KeywordType.Bounce];
    }

    getExpectedProcsPerShot(_player: Player, _damageProfile: DamageProfile): number {
        return this.baseTriggerChance;
    }
}

export class FortressWarfare implements Keyword {
    constructor(
        public readonly type = KeywordType.FortressWarfare,
        public readonly scalingFactor: number | undefined = undefined,
        public readonly baseStatType: StatType | undefined = undefined,
        public readonly baseTriggerChance: number = 0,
        public readonly canCrit: boolean = false,
        public readonly canWeakspot: boolean = false
    ) {}

    getTriggerDefinitions(): TriggerDefinition[] {
        return KEYWORD_TRIGGERS[KeywordType.FortressWarfare];
    }

    getExpectedProcsPerShot(_player: Player, _damageProfile: DamageProfile): number {
        return 0;
    }
}

export class FastGunner implements Keyword {
    constructor(
        public readonly type: KeywordType = KeywordType.FastGunner,
        public readonly scalingFactor: number | undefined = undefined,
        public readonly baseStatType: StatType | undefined = undefined,
        public readonly baseTriggerChance: number = 0.35,
        public readonly canCrit: boolean = false,
        public readonly canWeakspot: boolean = false
    ) {}

    getTriggerDefinitions(): TriggerDefinition[] {
        return KEYWORD_TRIGGERS[KeywordType.FastGunner];
    }

    getExpectedProcsPerShot(_player: Player, _damageProfile: DamageProfile): number {
        return this.baseTriggerChance;
    }
}

export class BullsEye implements Keyword {
    constructor(
        public readonly type: KeywordType = KeywordType.BullsEye,
        public readonly scalingFactor: number | undefined = undefined,
        public readonly baseStatType: StatType | undefined = undefined,
        public readonly baseTriggerChance: number = 0.70,
        public readonly canCrit: boolean = false,
        public readonly canWeakspot: boolean = false
    ) {}

    getTriggerDefinitions(): TriggerDefinition[] {
        return KEYWORD_TRIGGERS[KeywordType.BullsEye];
    }

    getExpectedProcsPerShot(_player: Player, _damageProfile: DamageProfile): number {
        return this.baseTriggerChance;
    }
}
