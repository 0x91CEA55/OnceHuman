import { StatType } from '../types/enums';

export interface StatContribution {
    value: number;
    source: string;
}

export abstract class Stat {
    abstract readonly type: StatType;
    public contributions: StatContribution[] = [];

    constructor(public baseValue: number, public initialSource: string = 'Baseline') {
        if (baseValue !== 0 || initialSource === 'Baseline') {
            this.contributions.push({ value: baseValue, source: initialSource });
        }
    }

    get value(): number {
        return this.contributions.reduce((sum, c) => sum + c.value, 0);
    }

    add(other: number, source: string = 'Unknown'): void {
        if (other === 0) return;
        this.contributions.push({ value: other, source });
    }

    reset(initialValue: number = 0, initialSource: string = 'Baseline'): void {
        this.baseValue = initialValue;
        this.contributions = [];
        if (initialValue !== 0 || initialSource === 'Baseline') {
            this.contributions.push({ value: initialValue, source: initialSource });
        }
    }
}

export class CritRateStat extends Stat {
    readonly type = StatType.CritRatePercent;
    override get value(): number {
        return Math.min(100, super.value);
    }
}

export class MagazineCapacityStat extends Stat {
    readonly type = StatType.MagazineCapacity;
    override get value(): number {
        return Math.round(super.value);
    }
}

export class GenericStat extends Stat {
    constructor(public readonly type: StatType, value: number, source: string = 'Baseline') {
        super(value, source);
    }
}
