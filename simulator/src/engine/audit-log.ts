export interface AuditEntry {
    category: string;
    label: string;
    value: string | number | boolean;
    formula?: string;
    timestamp: number;
}

export class AuditLog {
    private entries: AuditEntry[] = [];
    private activeStrategy: string = 'unknown';

    setStrategy(strategy: string) {
        this.activeStrategy = strategy;
        this.log('Engine', 'Resolution Strategy', strategy);
    }

    getActiveStrategy(): string {
        return this.activeStrategy;
    }

    log(category: string, label: string, value: string | number | boolean, formula?: string) {
        this.entries.push({
            category,
            label,
            value,
            formula,
            timestamp: Date.now()
        });
    }

    getEntries() {
        return [...this.entries];
    }

    clear() {
        this.entries = [];
    }
}

// Global or Context-based instance
export const auditLog = new AuditLog();
