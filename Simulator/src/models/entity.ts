import { StatusManager } from '../engine/status-manager';
import { DamageIntent } from './damage';

export abstract class Entity {
    public statusManager: StatusManager;

    constructor(public id: string, public hp: number) {
        // StatusManager will need a reference to its owner entity now, we'll update it later
        this.statusManager = new StatusManager(this);
    }

    abstract takeDamage(intent: DamageIntent, finalDamage: number, isCrit: boolean, isWeakspot: boolean): void;
    abstract isDead(): boolean;
}
