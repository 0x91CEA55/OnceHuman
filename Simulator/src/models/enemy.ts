import { Entity } from './entity';
import { DamageIntent } from './damage';

export class Enemy extends Entity {
    constructor(id: string, hp: number) {
        super(id, hp);
    }

    takeDamage(_intent: DamageIntent, finalDamage: number, _isCrit: boolean, _isWeakspot: boolean): void {
        this.hp -= finalDamage;
    }

    isDead(): boolean {
        return this.hp <= 0;
    }
}
