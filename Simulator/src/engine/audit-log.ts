export interface AuditEntry {
    category: string;
    label: string;
    value: any;
    formula?: string;
    timestamp: number;
}

export class AuditLog {
    private entries: AuditEntry[] = [];

    log(category: string, label: string, value: any, formula?: string) {
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
