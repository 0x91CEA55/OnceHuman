/**
 * Keyword pipeline — pure data producers.
 *
 * Each Keyword class now produces TriggerDefinition[] via getTriggerDefinitions()
 * instead of TriggeredEffect[] via getTriggeredEffects().
 *
 * The trigger data itself lives in data/trigger-definitions.ts.
 * The Keyword interface is kept for Weapon to declare its keyword type.
 */

import { BaseDamagePipeline } from './base';
import { Player } from '../models/player';
import { EncounterConditions, DamageProfile } from '../types/common';
import { StatType, KeywordType } from '../types/enums';
import { TriggerDefinition } from '../types/trigger-types';
import { KEYWORD_TRIGGERS } from '../data/trigger-definitions';

export interface Keyword {
    type: KeywordType;
    scalingFactor: number | undefined;
    baseStatType: StatType | undefined;
    baseTriggerChance: number;
    canCrit: boolean;
    canWeakspot: boolean;

    /** Returns TriggerDefinitions for this keyword. Replaces getTriggeredEffects(). */
    getTriggerDefinitions(): TriggerDefinition[];
    getExpectedProcsPerShot(player: Player, damageProfile: DamageProfile): number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyword Implementations — thin wrappers around KEYWORD_TRIGGERS data
// ─────────────────────────────────────────────────────────────────────────────

export class Burn implements Keyword {
    constructor(
        public type: KeywordType = KeywordType.Burn,
        public scalingFactor: number | undefined = 0.12,
        public baseStatType: StatType | undefined = StatType.PsiIntensity,
        public baseTriggerChance: number = 0.18,
        public canCrit: boolean = false,
        public canWeakspot: boolean = false
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
        public type = KeywordType.Shrapnel,
        public scalingFactor: number | undefined = 0.6,
        public baseStatType: StatType | undefined = StatType.DamagePerProjectile,
        public baseTriggerChance: number = 0.04,
        public canCrit: boolean = true,
        public canWeakspot: boolean = false
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
        public type = KeywordType.FrostVortex,
        public scalingFactor: number | undefined = 0.5,
        public baseStatType: StatType | undefined = StatType.PsiIntensity,
        public baseTriggerChance: number = 0.10,
        public canCrit: boolean = false,
        public canWeakspot: boolean = false
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
        public type = KeywordType.PowerSurge,
        public scalingFactor: number | undefined = 1.0,
        public baseStatType: StatType | undefined = StatType.PsiIntensity,
        public baseTriggerChance: number = 0.15,
        public canCrit: boolean = true,
        public canWeakspot: boolean = false
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
        public type = KeywordType.UnstableBomber,
        public scalingFactor: number | undefined = 0.7,
        public baseStatType: StatType | undefined = StatType.PsiIntensity,
        public baseTriggerChance: number = 1.0,
        public canCrit: boolean = true,
        public canWeakspot: boolean = true
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
        public type = KeywordType.Bounce,
        public scalingFactor: number | undefined = 0.6,
        public baseStatType: StatType | undefined = StatType.DamagePerProjectile,
        public baseTriggerChance: number = 0.30,
        public canCrit: boolean = true,
        public canWeakspot: boolean = false
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
        public type = KeywordType.FortressWarfare,
        public scalingFactor: number | undefined = undefined,
        public baseStatType: StatType | undefined = undefined,
        public baseTriggerChance: number = 0,
        public canCrit: boolean = false,
        public canWeakspot: boolean = false
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
        public type: KeywordType = KeywordType.FastGunner,
        public scalingFactor: number | undefined = undefined,
        public baseStatType: StatType | undefined = undefined,
        public baseTriggerChance: number = 0.35,
        public canCrit: boolean = false,
        public canWeakspot: boolean = false
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
        public type: KeywordType = KeywordType.BullsEye,
        public scalingFactor: number | undefined = undefined,
        public baseStatType: StatType | undefined = undefined,
        public baseTriggerChance: number = 0.70,
        public canCrit: boolean = false,
        public canWeakspot: boolean = false
    ) {}

    getTriggerDefinitions(): TriggerDefinition[] {
        return KEYWORD_TRIGGERS[KeywordType.BullsEye];
    }

    getExpectedProcsPerShot(_player: Player, _damageProfile: DamageProfile): number {
        return this.baseTriggerChance;
    }
}

/** Legacy placeholder — kept for DamageDashboard.tsx compatibility. */
export class KeywordDamagePipeline extends BaseDamagePipeline {
    calculate(player: Player, _conditions: EncounterConditions): DamageProfile {
        const kw = player.loadout.weapon?.keyword;
        if (!kw || kw.scalingFactor === undefined || kw.baseStatType === undefined) {
            return { noCritNoWs: 0, critNoWs: 0, noCritWs: 0, critWs: 0, expected: 0 };
        }
        return { noCritNoWs: 0, critNoWs: 0, noCritWs: 0, critWs: 0, expected: 0 };
    }
}
