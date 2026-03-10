import { StatType } from './enums';

export interface StatContribution {
    value: number;
    source: string;
}

export type TraceOperation = 'sum' | 'product' | 'scaling' | 'identity' | 'roll';

export interface TraceNode {
    id: string;
    label: string;
    finalValue: number;
    baseValue?: number;
    operation: TraceOperation;
    contributors: Array<TraceContributor>;
    timestamp: number;
}

export interface TraceContributor {
    label: string;
    value: number;
    source?: string;
    type: 'stat' | 'constant' | 'multiplier' | 'flag';
    isPercentage?: boolean;
    childTrace?: TraceNode;
}

export interface TelemetryRegistry {
    stats: Map<StatType, TraceNode>;
    resolutions: Map<string, TraceNode>;
}
