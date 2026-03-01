import { EnemyType } from './enums';

export class EncounterConditions {
    constructor(
        public enemyType: EnemyType = EnemyType.Normal,
        public targetDistanceMeters: number = 10,
        public playerHpPercent: number = 100,
        public isTargetVulnerable: boolean = false,
        public weakspotHitRate: number = 0.5
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
        public readonly shotNumber?: number,
        public readonly damageProfile?: DamageProfile,
        public readonly targetEntityId?: string
    ) {}
}
