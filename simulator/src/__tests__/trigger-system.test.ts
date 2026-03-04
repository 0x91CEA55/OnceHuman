/**
 * ADR-003 Trigger System Tests
 *
 * "The Jaws State Pollution Test" — verifies that EveryNHits counter state
 * does NOT persist between Monte Carlo iterations.
 *
 * Background: The old EveryNShotsTrigger stored `private counter = 0` directly
 * on the shared trigger class instance. Since TriggerDefinitions are module-level
 * constants, the counter was shared across ALL Monte Carlo iterations. This caused
 * the first shot of iteration N+1 to fire at the WRONG position if iteration N
 * ended mid-cycle.
 *
 * ADR-003 fix: EveryNHits counter lives in the engine's Map<TriggerCounterKey, number>
 * which is initialized with `new Map()` at the start of each mag dump.
 *
 * See: simulator/docs/designs/ADR-003-trigger-effect-execution-model.md §Verification
 */

import { triggerMatches, runTriggerEvaluation, TriggerEvent, TriggerEvalContext } from '../engine/trigger-system';
import { TriggerType } from '../types/trigger-types';
import { triggerCounterKey } from '../types/keys';
import { EnemyType } from '../types/enums';
import { SeededRng } from '../engine/rng';

// ─────────────────────────────────────────────────────────────────────────────
// Test helpers (inline — no circular deps)
// ─────────────────────────────────────────────────────────────────────────────

/** Creates a fresh TriggerEvalContext with zero-initialized counters. */
function makeEvalCtx(seed: number = 42): TriggerEvalContext {
    return {
        encounterEnemyType: EnemyType.Normal,
        targetDistanceMeters: 10,
        currentTimeSeconds: 0,
        targetActiveDoTs: [],
        targetActiveBuffs: [],
        counters: new Map(),
        cooldowns: new Map(),
        rng: new SeededRng(seed),
    };
}

/** Fires N OnHit events and returns the 0-indexed shot numbers where the trigger fired. */
function collectFiredShots(
    trigger: Parameters<typeof triggerMatches>[0],
    n: number,
    ctx: TriggerEvalContext,
): number[] {
    const fired: number[] = [];
    const event: TriggerEvent = { triggerType: TriggerType.OnHit, isCrit: false, isWeakspot: false, passDepth: 0 };
    for (let i = 0; i < n; i++) {
        if (triggerMatches(trigger, event, ctx)) fired.push(i);
    }
    return fired;
}

// ─────────────────────────────────────────────────────────────────────────────
// DE.50 Jaws trigger definition inline (avoids importing data layer in test)
// ─────────────────────────────────────────────────────────────────────────────

const JAWS_EVERY3_TRIGGER = {
    type: TriggerType.EveryNHits,
    n: 3,
    critsCountDouble: true,
    counterKey: triggerCounterKey('test:jaws:hit-counter'),
} as const;

describe('ADR-003: Trigger System', () => {

    describe('EveryNHits — basic counter behaviour', () => {
        test('fires on hit #3, #6, #9 with n=3', () => {
            const ctx = makeEvalCtx();
            const fired = collectFiredShots(JAWS_EVERY3_TRIGGER, 9, ctx);
            expect(fired).toEqual([2, 5, 8]); // 0-indexed: shots 3, 6, 9
        });

        test('critical hit counts as 2 toward the counter', () => {
            const ctx = makeEvalCtx();
            const fired: number[] = [];
            const shots: Array<{ isCrit: boolean }> = [
                { isCrit: false }, // +1 → counter=1
                { isCrit: true },  // +2 → counter=3 ← fires, resets
                { isCrit: false }, // +1 → counter=1
                { isCrit: false }, // +1 → counter=2
                { isCrit: false }, // +1 → counter=3 ← fires, resets
            ];

            for (let i = 0; i < shots.length; i++) {
                const event: TriggerEvent = {
                    triggerType: TriggerType.OnHit,
                    isCrit: shots[i].isCrit,
                    isWeakspot: false,
                    passDepth: 0,
                };
                if (triggerMatches(JAWS_EVERY3_TRIGGER, event, ctx)) fired.push(i);
            }

            expect(fired).toEqual([1, 4]); // shot #2 (crit) and shot #5
        });
    });

    describe('The Jaws State Pollution Test', () => {
        test('CRITICAL: counter resets to zero between simulations (fresh Map each run)', () => {
            const trigger = {
                type: TriggerType.EveryNHits,
                n: 3,
                critsCountDouble: true,
                counterKey: triggerCounterKey('test:pollution:counter'),
            } as const;

            // Simulation A — fires 9 shots, counter ends at 0 (9 is divisible by 3)
            const ctxA = makeEvalCtx(1);
            const firedA = collectFiredShots(trigger, 9, ctxA);
            expect(firedA).toEqual([2, 5, 8]);

            // Simulation B — fresh context, should fire at identical positions
            const ctxB = makeEvalCtx(1);
            const firedB = collectFiredShots(trigger, 9, ctxB);
            expect(firedB).toEqual([2, 5, 8]);

            // Simulation C — 8 shots, counter ends at 2 (NOT divisible by 3)
            const ctxC = makeEvalCtx(1);
            const firedC = collectFiredShots(trigger, 8, ctxC);
            expect(firedC).toEqual([2, 5]); // Only fires at shot 3 and 6

            // Simulation D — fresh context despite C leaving counter at 2
            // OLD BUG: the shared EveryNShotsTrigger.counter would be 2 here,
            //          so the first shot would FIRE (2+1=3 >= 3).
            // ADR-003 FIX: new Map() → counter is 0, first fire at shot #3.
            const ctxD = makeEvalCtx(1);
            const firedD = collectFiredShots(trigger, 9, ctxD);
            expect(firedD).toEqual([2, 5, 8]); // Must match ctxA, not ctxC spillover
        });

        test('counter state is isolated per counterKey — different triggers do not share state', () => {
            const triggerA = {
                type: TriggerType.EveryNHits,
                n: 3,
                critsCountDouble: false,
                counterKey: triggerCounterKey('test:key-isolation:counter-a'),
            } as const;

            const triggerB = {
                type: TriggerType.EveryNHits,
                n: 4,
                critsCountDouble: false,
                counterKey: triggerCounterKey('test:key-isolation:counter-b'),
            } as const;

            const ctx = makeEvalCtx();
            const firedA: number[] = [];
            const firedB: number[] = [];
            const event: TriggerEvent = { triggerType: TriggerType.OnHit, isCrit: false, isWeakspot: false, passDepth: 0 };

            for (let i = 0; i < 12; i++) {
                if (triggerMatches(triggerA, event, ctx)) firedA.push(i);
                if (triggerMatches(triggerB, event, ctx)) firedB.push(i);
            }

            // n=3 fires at: 2, 5, 8, 11
            expect(firedA).toEqual([2, 5, 8, 11]);
            // n=4 fires at: 3, 7, 11
            expect(firedB).toEqual([3, 7, 11]);
        });
    });

    describe('OnCrit / OnWeakspotHit — evaluated from the OnHit event', () => {
        test('OnCrit trigger fires only when isCrit=true on an OnHit event', () => {
            const onCritTrigger = { type: TriggerType.OnCrit } as const;
            const ctx = makeEvalCtx();

            const hitEvent: TriggerEvent = { triggerType: TriggerType.OnHit, isCrit: false, isWeakspot: false, passDepth: 0 };
            const critEvent: TriggerEvent = { triggerType: TriggerType.OnHit, isCrit: true, isWeakspot: false, passDepth: 0 };

            expect(triggerMatches(onCritTrigger, hitEvent, ctx)).toBe(false);
            expect(triggerMatches(onCritTrigger, critEvent, ctx)).toBe(true);
        });

        test('OnWeakspotHit trigger fires only when isWeakspot=true on an OnHit event', () => {
            const onWsTrigger = { type: TriggerType.OnWeakspotHit } as const;
            const ctx = makeEvalCtx();

            const hitEvent: TriggerEvent = { triggerType: TriggerType.OnHit, isCrit: false, isWeakspot: false, passDepth: 0 };
            const wsEvent: TriggerEvent = { triggerType: TriggerType.OnHit, isCrit: false, isWeakspot: true, passDepth: 0 };

            expect(triggerMatches(onWsTrigger, hitEvent, ctx)).toBe(false);
            expect(triggerMatches(onWsTrigger, wsEvent, ctx)).toBe(true);
        });
    });

    describe('Max pass depth guard', () => {
        test('runTriggerEvaluation returns empty array when passDepth >= MAX_EFFECT_PASS_DEPTH', () => {
            const onHitDef = {
                id: 'test:depth-check',
                trigger: { type: TriggerType.OnHit } as const,
                conditions: [],
                effects: [],
            };

            const ctx = makeEvalCtx();
            const deepEvent: TriggerEvent = {
                triggerType: TriggerType.OnHit,
                isCrit: false,
                isWeakspot: false,
                passDepth: 3, // >= MAX_EFFECT_PASS_DEPTH
            };

            const onDepthExceeded = jest.fn();
            const fired = runTriggerEvaluation([onHitDef], deepEvent, ctx, onDepthExceeded);

            expect(fired).toHaveLength(0);
            expect(onDepthExceeded).toHaveBeenCalledWith('test:depth-check', 3);
        });
    });
});
