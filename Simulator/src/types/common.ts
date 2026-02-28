import { EnemyType } from './enums';

export interface EncounterConditions {
  enemyType: EnemyType;
  targetDistanceMeters: number;
  playerHpPercent: number;
  isTargetVulnerable: boolean;
  weakspotHitRate: number; 
}

export interface DamageProfile {
  noCritNoWs: number;
  critNoWs: number;
  noCritWs: number;
  critWs: number;
  expected: number;
}

export interface ShotDamage {
  bulletDmg: DamageProfile;
  kwProcDmg?: DamageProfile;
}
