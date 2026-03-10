import { EntityId, StatsComponent } from '../types';
import { StatType } from '../../types/enums';

export interface TelemetrySnapshot {
    timeAxis: number[];
    data: Partial<Record<StatType, number[]>>;
    cumulativeDamage: number[];
    instantaneousDPS: number[];
    runningAverageDPS: number[];
}

export function sampleTelemetry(
    currentTime: number,
    accumulatedDamage: number,
    instantaneousDPS: number,
    playerId: EntityId,
    statsQuery: Map<EntityId, { stats: StatsComponent }>,
    currentTelemetry: TelemetrySnapshot
): void {
    const playerResult = statsQuery.get(playerId);
    if (!playerResult) return;
    const playerStats = playerResult.stats;

    currentTelemetry.timeAxis.push(currentTime);

    for (const stat of Object.values(StatType)) {
        const val = playerStats.snapshot[stat as StatType] ?? 0;
        if (!currentTelemetry.data[stat as StatType]) {
            currentTelemetry.data[stat as StatType] = [];
        }
        currentTelemetry.data[stat as StatType]!.push(val);
    }

    currentTelemetry.cumulativeDamage.push(accumulatedDamage);
    currentTelemetry.instantaneousDPS.push(instantaneousDPS);
    currentTelemetry.runningAverageDPS.push(currentTime > 0 ? accumulatedDamage / currentTime : 0);
}
