import { Entity } from '../models/entity';
import { DamageIntent } from '../models/damage';
import { EventTrigger } from '../types/enums';

export interface CombatEvent {
    type: EventTrigger;
    source: Entity;
    target?: Entity;
    intent?: DamageIntent;
    damage?: number; // Final damage resolved
    isCrit?: boolean;
    isWeakspot?: boolean;
    depth: number;
}

export type EventHandler = (event: CombatEvent) => void;

export class CombatEventBus {
    private listeners: Map<EventTrigger, EventHandler[]> = new Map();
    private readonly MAX_DEPTH = 5;

    subscribe(type: EventTrigger, handler: EventHandler) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type)!.push(handler);
    }

    emit(event: CombatEvent) {
        if (event.depth >= this.MAX_DEPTH) {
            return; // Prevent infinite recursion
        }

        const handlers = this.listeners.get(event.type);
        if (handlers) {
            for (const handler of handlers) {
                handler(event);
            }
        }
    }

    clear() {
        this.listeners.clear();
    }
}
