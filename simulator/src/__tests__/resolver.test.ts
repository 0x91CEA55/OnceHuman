/**
 * ADR-002 Resolver Tests
 *
 * "The 113 Test" — verifies that Crit DMG + Weakspot DMG are ADDITIVE
 * in the HitAmplifier bucket, not separate multiplicative factors.
 *
 * Background: In Once Human, a shot that both crits AND hits a weakspot
 * does NOT multiply CritDMG × WeakspotDMG. Instead they ADD together:
 *   HitAmplifier = 1 + (CritDMG% + WeakspotDMG%) / 100
 *
 * With CritDMG=50% and WeakspotDMG=63%: HitAmplifier = 1 + 113/100 = 2.13
 * NOT: 1.50 × 1.63 = 2.445
 *
 * See: simulator/docs/designs/ADR-002-universal-bucket-topology.md §The 113 Test
 */

import { resolve, buildResolutionContext } from '../engine/resolver';
import { UNIVERSAL_BUCKETS } from '../engine/bucket-registry';
import { StatType, DamageTrait, EnemyType } from '../types/enums';
import { BucketId } from '../types/resolution';

describe('ADR-002: UNIVERSAL_BUCKETS resolver', () => {

    test('The 113 Test — CritDMG + WeakspotDMG are additive in HitAmplifier', () => {
        const statValues = new Map<StatType, number>([
            [StatType.CritDamagePercent, 50],
            [StatType.WeakspotDamagePercent, 63],
        ]);

        const ctx = buildResolutionContext(
            new Set([DamageTrait.Weapon]),
            EnemyType.Normal,
            true,   // wasCrit
            true,   // wasWeakspot
            statValues,
        );

        const { finalDamage, audit } = resolve(100, UNIVERSAL_BUCKETS, ctx);

        // HitAmplifier = 1 + (50 + 63) / 100 = 2.13
        const hitAmplifier = audit.get(BucketId.HitAmplifier)!;
        expect(hitAmplifier).toBeCloseTo(2.13, 5);

        // Final: 100 × 2.13 = 213
        expect(finalDamage).toBeCloseTo(213, 5);
    });

    test('The 113 Test — separate multiplier math would give 244.5 (this is WRONG per game bible)', () => {
        // This is the incorrect calculation that the 113 Test guards against.
        // 100 × 1.50 × 1.63 = 244.5 — this would be WRONG.
        // Keeping this as a documented counter-example, not an assertion.
        const incorrectResult = 100 * 1.50 * 1.63;
        expect(incorrectResult).toBeCloseTo(244.5, 5);

        // The CORRECT result is 213, not 244.5.
        // If a future change makes HitAmplifier separate buckets, this test suite will catch it.
    });

    test('Crit-only shot applies CritDMG but not WeakspotDMG', () => {
        const statValues = new Map<StatType, number>([
            [StatType.CritDamagePercent, 50],
            [StatType.WeakspotDamagePercent, 63],
        ]);

        const ctx = buildResolutionContext(
            new Set<DamageTrait>(),
            EnemyType.Normal,
            true,   // wasCrit
            false,  // NOT wasWeakspot
            statValues,
        );

        const { finalDamage, audit } = resolve(100, UNIVERSAL_BUCKETS, ctx);

        // HitAmplifier = 1 + 50/100 = 1.50 (only CritDMG applies)
        const hitAmplifier = audit.get(BucketId.HitAmplifier)!;
        expect(hitAmplifier).toBeCloseTo(1.50, 5);
        expect(finalDamage).toBeCloseTo(150, 5);
    });

    test('No-crit no-weakspot shot — HitAmplifier bucket resolves to 1.0', () => {
        const statValues = new Map<StatType, number>([
            [StatType.CritDamagePercent, 50],
            [StatType.WeakspotDamagePercent, 63],
        ]);

        const ctx = buildResolutionContext(
            new Set<DamageTrait>(),
            EnemyType.Normal,
            false, // no crit
            false, // no weakspot
            statValues,
        );

        const { finalDamage, audit } = resolve(100, UNIVERSAL_BUCKETS, ctx);

        const hitAmplifier = audit.get(BucketId.HitAmplifier)!;
        expect(hitAmplifier).toBeCloseTo(1.0, 5);
        expect(finalDamage).toBeCloseTo(100, 5);
    });

    test('Keyword Factor bucket is only active when the keyword trait is present', () => {
        const statValues = new Map<StatType, number>([
            [StatType.BurnDamageFactor, 75],
        ]);

        // Without Burn trait — BurnFactor bucket should not apply
        const ctxNoBurn = buildResolutionContext(
            new Set<DamageTrait>(),
            EnemyType.Normal,
            false,
            false,
            statValues,
        );
        const { finalDamage: noBurnDmg } = resolve(100, UNIVERSAL_BUCKETS, ctxNoBurn);
        expect(noBurnDmg).toBeCloseTo(100, 5);

        // With Burn trait — BurnFactor = 1 + 75/100 = 1.75
        const ctxBurn = buildResolutionContext(
            new Set([DamageTrait.Burn]),
            EnemyType.Normal,
            false,
            false,
            statValues,
        );
        const { finalDamage: burnDmg } = resolve(100, UNIVERSAL_BUCKETS, ctxBurn);
        expect(burnDmg).toBeCloseTo(175, 5);
    });

    test('Vulnerability bucket always applies regardless of traits', () => {
        const statValues = new Map<StatType, number>([
            [StatType.VulnerabilityPercent, 20],
        ]);

        const ctx = buildResolutionContext(
            new Set<DamageTrait>(),
            EnemyType.Normal,
            false,
            false,
            statValues,
        );

        const { finalDamage, audit } = resolve(100, UNIVERSAL_BUCKETS, ctx);
        const vuln = audit.get(BucketId.Vulnerability)!;
        expect(vuln).toBeCloseTo(1.20, 5);
        expect(finalDamage).toBeCloseTo(120, 5);
    });
});
