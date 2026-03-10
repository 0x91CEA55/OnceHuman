import { TraceNode } from '../types/telemetry';
import { useEffect, useState } from 'react';

export type TelemetryListener = (entries: TraceNode[]) => void;

export class TelemetryManager {
    private static instance: TelemetryManager;
    private entries: TraceNode[] = [];
    private listeners: TelemetryListener[] = [];

    private constructor() {}

    static getInstance(): TelemetryManager {
        if (!TelemetryManager.instance) {
            TelemetryManager.instance = new TelemetryManager();
        }
        return TelemetryManager.instance;
    }

    clear() {
        this.entries = [];
        this.notify();
    }

    record(node: TraceNode) {
        this.entries.push(node);
        this.notify();
    }

    getEntries(): TraceNode[] {
        return [...this.entries];
    }

    subscribe(listener: TelemetryListener): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        const snapshot = [...this.entries];
        this.listeners.forEach(l => l(snapshot));
    }

    /**
     * Legacy shim for AuditLog compatibility.
     */
    log(category: string, label: string, value: string | number | boolean, source?: string) {
        this.record({
            id: `${category}:${label}:${Date.now()}`,
            label: `${category} > ${label}`,
            finalValue: typeof value === 'number' ? value : 0,
            operation: 'identity',
            contributors: source ? [{ label: source, value: 0, type: 'constant' }] : [],
            timestamp: Date.now()
        });
    }

    warn(category: string, message: string) {
        this.log('WARNING', category, message);
    }
}

export const telemetry = TelemetryManager.getInstance();
export const auditLog = telemetry; // Legacy export alias

/**
 * React hook to consume the telemetry stream reactively.
 */
export function useTelemetry() {
    const [entries, setEntries] = useState<TraceNode[]>(telemetry.getEntries());

    useEffect(() => {
        return telemetry.subscribe(setEntries);
    }, []);

    return entries;
}
