import { DamageIntent } from '../models/damage';
import { DamageResolutionStrategy } from './damage-resolution-strategy';

export class DamageProcessor {
    constructor(private strategy: DamageResolutionStrategy) {}

    resolve(intent: DamageIntent): number {
        const finalDamage = this.strategy.resolve(intent);
        
        // Apply damage to target
        intent.target.takeDamage(intent, finalDamage, false, false); 
        
        return finalDamage;
    }
}
