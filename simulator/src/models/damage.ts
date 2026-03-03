import { DamageTrait } from '../types/enums';
import { Entity } from './entity';

export interface DamageBehavior {
    canCrit: boolean;
    canWeakspot: boolean;
    critRateBonus: number;
    critDamageBonus: number;
    weakspotDamageBonus: number;
}

export class DamageIntent {
    // Multipliers tracked by category for UI visualization
    public bucketMultipliers: Record<string, number> = {};
    private traits: Set<DamageTrait> = new Set();
    public behavior: DamageBehavior = {
        canCrit: false,
        canWeakspot: false,
        critRateBonus: 0,
        critDamageBonus: 0,
        weakspotDamageBonus: 0
    };

    constructor(
        public readonly baseValue: number,
        public readonly source: Entity,
        public readonly target: Entity,
        public readonly isProc: boolean = false,
        public readonly procCoefficient: number = 1.0,
        public readonly label: string = 'Damage',
        public isCrit: boolean = false,
        public isWeakspot: boolean = false
    ) {}

    addTrait(trait: DamageTrait) {
        this.traits.add(trait);
        return this;
    }
    
    hasTrait(trait: DamageTrait): boolean {
        return this.traits.has(trait);
    }
    
    getTraits(): DamageTrait[] {
        return Array.from(this.traits);
    }

    /**
     * Adds a multiplier to a specific bucket (e.g., 'status', 'crit').
     * If the bucket exists, it multiplies the value (multiplicative across buckets).
     */
    addMultiplier(value: number, bucket: string = 'generic') {
        if (!this.bucketMultipliers[bucket]) {
            this.bucketMultipliers[bucket] = 1.0;
        }
        this.bucketMultipliers[bucket] *= value;
        return this;
    }

    enableCrit(rateBonus: number = 0, dmgBonus: number = 0) {
        this.behavior.canCrit = true;
        this.behavior.critRateBonus += rateBonus;
        this.behavior.critDamageBonus += dmgBonus;
        return this;
    }

    enableWeakspot(dmgBonus: number = 0) {
        this.behavior.canWeakspot = true;
        this.behavior.weakspotDamageBonus += dmgBonus;
        return this;
    }

    resolve(): number {
        // Resolve all buckets multiplicatively
        const totalMultiplier = Object.values(this.bucketMultipliers).reduce((acc, m) => acc * m, 1);
        return this.baseValue * totalMultiplier;
    }
}
