import { World, EntityId } from '../world';
import { 
    resolve, 
    evaluateRolls, 
    buildResolutionContext, 
    statValuesFromSnapshot
} from '../../engine/resolver';
import { UNIVERSAL_BUCKETS, ROLL_REGISTRY } from '../../engine/bucket-registry';
import { DamageTrait, StatType } from '../../types/enums';
import { RngService } from '../../engine/rng';
import { BucketId, ContextFlag } from '../../types/resolution';
import { EncounterConditions } from '../../types/common';

export interface CombatResult {
    finalDamage: number;
    wasCrit: boolean;
    wasWeakspot: boolean;
    audit: Map<BucketId, number>;
    flagsSnapshot: Set<ContextFlag>;
}

/**
 * CombatSystem - Pure ECS system for resolving combat events.
 * Part of ADR-015 Phase 3 refactor.
 */
export function runCombatShot(
    world: World,
    attackerId: EntityId,
    conditions: EncounterConditions,
    rng: RngService
): CombatResult {
    const attackerStats = world.getComponent(attackerId, 'stats');
    const attackerFlags = world.getComponent(attackerId, 'flags');
    const attackerLoadout = world.getComponent(attackerId, 'loadout');

    if (!attackerStats || !attackerFlags || !attackerLoadout) {
        throw new Error(`Attacker ${attackerId} missing required components for combat`);
    }

    const baseWeaponDmg = attackerStats.snapshot[StatType.DamagePerProjectile] || 0;
    const statValues = new Map(statValuesFromSnapshot(attackerStats.snapshot));

    const traits = new Set([DamageTrait.Attack, DamageTrait.Weapon]);
    
    const initialFlags = new Map<ContextFlag, boolean>();
    attackerFlags.activeFlags.forEach(f => initialFlags.set(f as ContextFlag, true));

    // Support for weakspot hit rate from conditions
    const weakspotHitRate = conditions.weakspotHitRate * 100;
    statValues.set(StatType.WeakspotHitRatePercent, weakspotHitRate);

    const ctx = buildResolutionContext(
        traits,
        conditions.enemyType,
        statValues,
        initialFlags,
        new Set(), // unlockedKeywordCrits - should probably be in a component
        new Map()  // statContributions - if we want telemetry
    );

    evaluateRolls(ROLL_REGISTRY, ctx, rng);

    const { finalDamage, audit } = resolve(baseWeaponDmg, UNIVERSAL_BUCKETS, ctx, false, 1.0);

    const flagsSnapshot = new Set<ContextFlag>();
    ctx.flags.forEach((v, k) => { if (v) flagsSnapshot.add(k); });

    return {
        finalDamage,
        wasCrit: ctx.flags.get('wasCrit') ?? false,
        wasWeakspot: ctx.flags.get('wasWeakspot') ?? false,
        audit,
        flagsSnapshot
    };
}
