import { EnemyType, EncounterTopology } from './enums';
import { IPlayer, ILoadout, AggregationContext as IAggregationContext, IEffect } from './domain-interfaces';

export type { IPlayer, ILoadout, IEffect };
export type AggregationContext = IAggregationContext;

export interface ResourceComponent {
    readonly sanity: number;
    readonly maxSanity: number;
    readonly deviantPower: number;
    readonly maxDeviantPower: number;
}

export class EncounterConditions {
    constructor(
        public enemyType: EnemyType = EnemyType.Normal,
        public targetDistanceMeters: number = 10,
        public playerHpPercent: number = 100,
        /** @deprecated Use resources.sanity instead */
        public playerSanityPercent: number = 100,
        public playerShieldPercent: number = 0,
        public playerSanity: number = 100,
        public maxPlayerSanity: number = 100,
        public playerDeviantPower: number = 100,
        public maxPlayerDeviantPower: number = 100,
        public isTargetVulnerable: boolean = false,
        public weakspotHitRate: number = 0.5,
        public topology: EncounterTopology = EncounterTopology.SingleTarget
    ) {}
}

export class DamageProfile {
    constructor(
        public noCritNoWs: number = 0,
        public critNoWs: number = 0,
        public noCritWs: number = 0,
        public critWs: number = 0,
        public expected: number = 0
    ) {}
}

export class ShotDamage {
    constructor(
        public bulletDmg: DamageProfile,
        public kwProcDmg?: DamageProfile
    ) {}
}

export class CombatEvent {
    constructor(
        public readonly type: string,
        public readonly shotNumber?: number,
        public readonly damageProfile?: DamageProfile,
        public readonly targetEntityId?: string
    ) {}
}
