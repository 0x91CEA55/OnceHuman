import { World } from '../world';
import { EntityId } from '../types';
import { StatusTickContext, tickDoTs, tickBuffs } from './effect-system';
import { TelemetrySnapshot, sampleTelemetry } from './telemetry-system';

export interface SimulationStepOptions {
    dt: number;
    step: number;
    playerId: EntityId;
    primaryTargetId: EntityId;
    telemetry: TelemetrySnapshot;
    lastSampleTime: number;
    accumulatedDamage: number;
    calculateInstantaneousDPS: () => number;
}

export function advanceTime(
    world: World,
    currentTime: number,
    options: SimulationStepOptions,
    tickCtxBase: Omit<StatusTickContext, 'currentTimeSeconds'>
): { currentTime: number; lastSampleTime: number } {
    let current = currentTime;
    let lastSampleTime = options.lastSampleTime;
    const targetTime = current + options.dt;
    const step = options.step;

    while (current < targetTime) {
        current += step;

        const tickCtx: StatusTickContext = {
            ...tickCtxBase,
            currentTimeSeconds: current,
        };

        const statusEntities = world.query('status');
        for (const [_, components] of statusEntities) {
            const status = components.status;
            tickDoTs(status.activeDoTs, step, tickCtx);
            tickBuffs(status.activeBuffs, step, tickCtx);
        }

        if (current - lastSampleTime >= 0.1) {
            const statsQuery = world.query('stats');
            sampleTelemetry(
                current,
                options.accumulatedDamage,
                options.calculateInstantaneousDPS(),
                options.playerId,
                statsQuery,
                options.telemetry
            );
            lastSampleTime = current;
        }
    }

    return { currentTime: current, lastSampleTime };
}
