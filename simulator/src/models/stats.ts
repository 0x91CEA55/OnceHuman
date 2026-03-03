import { StatType } from '../types/enums';

export abstract class Stat {
    abstract readonly type: StatType;
    constructor(public value: number) { }

    add(other: number): void {
        this.value += other;
    }
}

export class CritRateStat extends Stat {
    readonly type = StatType.CritRatePercent;
    override add(other: number): void {
        this.value = Math.min(100, this.value + other);
    }
}

export class MagazineCapacityStat extends Stat {
    readonly type = StatType.MagazineCapacity;
    override add(other: number): void {
        this.value = Math.round(this.value + other);
    }
}

export class GenericStat extends Stat {
    constructor(public readonly type: StatType, value: number) {
        super(value);
    }
}
