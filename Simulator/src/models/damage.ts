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
    private multipliers: number[] = [];
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
        public readonly label: string = 'Damage'
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

    addMultiplier(value: number) {
        this.multipliers.push(value);
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
        return this.baseValue * this.multipliers.reduce((acc, m) => acc * m, 1);
    }
}
