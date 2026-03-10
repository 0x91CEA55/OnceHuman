import { EntityId, ComponentMap, ComponentType, createEntityId } from './types';

export type { EntityId };
export { createEntityId };

/**
 * The World manages entities and their components.
 */
export class World {
    private entities = new Set<EntityId>();
    private components: { [K in ComponentType]: Map<EntityId, ComponentMap[K]> } = {
        health: new Map(),
        resources: new Map(),
        stats: new Map(),
        status: new Map(),
        flags: new Map(),
        loadout: new Map(),
    };

    createEntity(id?: string): EntityId {
        const entityId = createEntityId(id || `entity-${Math.random().toString(36).substring(2, 11)}`);
        this.entities.add(entityId);
        return entityId;
    }

    addComponent<K extends ComponentType>(entityId: EntityId, type: K, component: ComponentMap[K]): void {
        this.components[type].set(entityId, component);
    }

    getComponent<K extends ComponentType>(entityId: EntityId, type: K): ComponentMap[K] | undefined {
        return this.components[type].get(entityId) as ComponentMap[K] | undefined;
    }

    removeComponent(entityId: EntityId, type: ComponentType): void {
        this.components[type].delete(entityId);
    }

    query<K extends ComponentType>(...types: K[]): Map<EntityId, { [P in K]: ComponentMap[P] }> {
        const results = new Map<EntityId, { [P in K]: ComponentMap[P] }>();
        for (const entityId of this.entities) {
            const result: any = {};
            let hasAll = true;
            for (const type of types) {
                const comp = this.getComponent(entityId, type);
                if (comp) {
                    result[type] = comp;
                } else {
                    hasAll = false;
                    break;
                }
            }
            if (hasAll) {
                results.set(entityId, result);
            }
        }
        return results;
    }

    clear(): void {
        this.entities.clear();
        for (const type in this.components) {
            this.components[type as ComponentType].clear();
        }
    }
}
