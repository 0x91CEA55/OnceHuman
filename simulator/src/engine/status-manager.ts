/**
 * StatusManager — pure state container for ADR-003.
 *
 * Holds DoTInstance[] and BuffInstance[] for an entity.
 * Apply/tick logic has moved to effect-system.ts (tickDoTs, tickBuffs, applyDoTInstance, applyBuffInstance).
 * This class is intentionally thin — DamageEngine accesses the lists directly via EffectExecutionContext.
 */

import { DoTInstance, BuffInstance } from '../types/status-types';
import { tickDoTs, tickBuffs, StatusTickContext } from './effect-system';

export class StatusManager {
    public readonly activeDoTs: DoTInstance[] = [];
    public readonly activeBuffs: BuffInstance[] = [];

    tick(dt: number, ctx: StatusTickContext): void {
        tickDoTs(this.activeDoTs, dt, ctx);
        tickBuffs(this.activeBuffs, dt, ctx);
    }

    clear(): void {
        this.activeDoTs.length = 0;
        this.activeBuffs.length = 0;
    }

    hasActiveStatus(): boolean {
        return this.activeDoTs.length > 0 || this.activeBuffs.length > 0;
    }

    getActiveBuffs(): BuffInstance[] {
        return this.activeBuffs;
    }

    getActiveDoTs(): DoTInstance[] {
        return this.activeDoTs;
    }
}
