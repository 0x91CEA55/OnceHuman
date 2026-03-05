import { DamageTrait } from '../types/enums';
import { Entity } from './entity';
import { BucketId } from '../types/resolution';

export interface DamageBehavior {
    canCrit: boolean;
    canWeakspot: boolean;
    critRateBonus: number;
    critDamageBonus: number;
    weakspotDamageBonus: number;
    procCoefficient: number;
}

export class DamageIntent {
    public bucketMultipliers: Map<BucketId, number> = new Map();
    public finalDamage: number = 0;
    public wasCrit: boolean = false;
    public wasWeakspot: boolean = false;

    constructor(
        public baseValue: number,
        public source: Entity,
        public target: Entity,
        public traits: Set<DamageTrait>,
        public behavior: DamageBehavior = {
            canCrit: true,
            canWeakspot: true,
            critRateBonus: 0,
            critDamageBonus: 0,
            weakspotDamageBonus: 0,
            procCoefficient: 1.0
        }
    ) {}

    addMultiplier(value: number, bucket: BucketId): void {
        const current = this.bucketMultipliers.get(bucket) ?? 1.0;
        this.bucketMultipliers.set(bucket, current * value);
    }

    resolve(): number {
        // Resolve all buckets multiplicatively
        let totalMultiplier = 1.0;
        this.bucketMultipliers.forEach(m => totalMultiplier *= m);
        return this.baseValue * totalMultiplier;
    }
}
