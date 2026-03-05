import { StatusManager } from '../engine/status-manager';
import { DamageIntent } from './damage';

export abstract class Entity {
    public statusManager: StatusManager;

    constructor(public id: string, public hp: number) {
        this.statusManager = new StatusManager();
    }

    abstract takeDamage(intent: DamageIntent, finalDamage: number, isCrit: boolean, isWeakspot: boolean): void;
    abstract isDead(): boolean;
}
