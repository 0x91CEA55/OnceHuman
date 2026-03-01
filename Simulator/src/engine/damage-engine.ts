import { Player } from '../models/player';
import { Enemy } from '../models/enemy';
import { EncounterConditions, CombatEvent as LegacyCombatEvent } from '../types/common';
import { StatType, EventTrigger, DamageTrait } from '../types/enums';
import { CombatContext, CombatState } from '../models/effect';
import { StatAggregator } from './stat-aggregator';
import { StatusManager } from './status-manager';
import { CombatEventBus, CombatEvent } from './event-bus';
import { DamageProcessor } from './damage-processor';
import { DamageIntent } from '../models/damage';

export interface SimulationLogEntry {
    timestamp: number;
    event: string;
    description: string;
    damage?: number;
    accumulatedDamage: number;
    statsSnapshot: Record<StatType, number>;
    activeBuffs: { id: string, name: string, stacks: number, remaining: number }[];
    activeDoTs: { id: string, name: string, stacks: number, remaining: number, nextTick: number }[];
    activeEffects: any[]; // Snapshot of effects active at this moment
}

export class DamageEngine {
    private statusManager = new StatusManager(null as any); // To be fixed
    private combatState = new CombatState();
    private eventBus = new CombatEventBus();
    private processor = new DamageProcessor();
    
    private target: Enemy;
    private currentTime: number = 0;
    private logs: SimulationLogEntry[] = [];
    private accumulatedDamage: number = 0;

    constructor(
        private player: Player, 
        private conditions: EncounterConditions
    ) {
        this.target = new Enemy('boss-1', 9999999);
        this.statusManager = this.target.statusManager; // The target takes the statuses usually, but for now we keep it simple
        
        // Setup Event Bus Triggers
        this.setupEventHandlers();
    }

    private setupEventHandlers() {
        // Every time an event fires, we check the player's triggers
        const triggers = [
            EventTrigger.OnHit, 
            EventTrigger.OnCrit, 
            EventTrigger.OnWeakspotHit, 
            EventTrigger.OnReload, 
            EventTrigger.OnKill
        ];

        for (const trigger of triggers) {
            this.eventBus.subscribe(trigger, (event) => {
                const ctx = this.createContext();
                const allEffects = this.player.loadout.getAllTriggeredEffects();
                
                for (const effect of allEffects) {
                    // Map the new CombatEvent to the legacy one for conditions temporarily
                    const legacyEvent: LegacyCombatEvent = {
                        shotNumber: 0,
                        damageProfile: { expected: event.damage || 0 } as any // Hacky mock for legacy compatibility
                    };
                    
                    if (effect.trigger.type === trigger && effect.evaluate(ctx, legacyEvent)) {
                        effect.execute(ctx, legacyEvent);
                    }
                }
            });
        }
    }

    simulateMagDump(): number {
        this.reset();
        
        const magSize = Math.floor(this.player.stats.get(StatType.MagazineCapacity)?.value ?? 0);
        const rpm = this.player.stats.get(StatType.FireRate)?.value ?? 60;
        const timeBetweenShots = 60 / rpm;

        this.log(0, 'Start', `Beginning mag dump simulation with ${magSize} rounds.`);

        for (let shotCount = 1; shotCount <= magSize; shotCount++) {
            const ammoPercent = (magSize - shotCount + 1) / magSize;
            StatAggregator.aggregate(this.player, this.conditions, ammoPercent, true);

            this.simulateShot(shotCount);

            // Sample Kill Event
            if (shotCount % 10 === 0) {
                this.eventBus.emit({
                    type: EventTrigger.OnKill,
                    source: this.player,
                    target: this.target,
                    depth: 0
                });
            }

            this.advanceTime(timeBetweenShots);
        }

        const maxFinalTickTime = this.currentTime + 10; 
        while (this.statusManager.hasActiveStatus() && this.currentTime < maxFinalTickTime) {
            this.advanceTime(0.1);
        }

        this.log(this.currentTime, 'End', `Simulation complete. Total Damage: ${Math.round(this.accumulatedDamage)}`);
        return this.accumulatedDamage;
    }

    private simulateShot(shotNumber: number) {
        // Physical Bullet Hit
        const baseWeaponDmg = this.player.stats.get(StatType.DamagePerProjectile)?.value ?? 0;
        
        const intent = new DamageIntent(baseWeaponDmg, this.player, this.target)
            .addTrait(DamageTrait.Physical)
            .addTrait(DamageTrait.Weapon)
            .enableCrit()
            .enableWeakspot();

        const damage = this.processor.resolve(intent);
        this.accumulatedDamage += damage;
        this.log(this.currentTime, 'Shot', `Bullet #${shotNumber} deals ${Math.round(damage)}`, damage);

        const hitEvent: CombatEvent = {
            type: EventTrigger.OnHit,
            source: this.player,
            target: this.target,
            intent: intent,
            damage: damage,
            depth: 0
        };

        this.eventBus.emit(hitEvent);
        
        // Let processor resolve crit for event emitting if needed, but for now we just assume a chance
        // This is a simplification; realistically processor should return an outcome object
        const critRate = (this.player.stats.get(StatType.CritRatePercent)?.value ?? 0) / 100;
        if (Math.random() < critRate) {
             this.eventBus.emit({
                ...hitEvent,
                type: EventTrigger.OnCrit
             });
        }
    }

    private advanceTime(dt: number) {
        const targetTime = this.currentTime + dt;
        const step = 0.01; 

        while (this.currentTime < targetTime) {
            this.currentTime += step;
            this.statusManager.tick(step, this.createContext());
        }
        this.currentTime = targetTime;
    }

    private createContext(): CombatContext {
        return {
            player: this.player,
            conditions: this.conditions,
            currentTime: this.currentTime,
            recordDamage: (amt: number, src: string) => {
                this.accumulatedDamage += amt;
                this.log(this.currentTime, 'Damage', src, amt);
            },
            logEvent: (evt: string, desc: string) => this.log(this.currentTime, evt, desc),
            statusManager: this.statusManager,
            state: this.combatState,
            eventBus: this.eventBus
        };
    }

    private reset() {
        this.currentTime = 0;
        this.accumulatedDamage = 0;
        this.logs = [];
        this.target = new Enemy('boss-1', 9999999);
        this.statusManager = this.target.statusManager;
        this.player.statusManager.clear();
        this.combatState = new CombatState();
        StatAggregator.aggregate(this.player, this.conditions, 1.0, true);
    }

    private log(timestamp: number, event: string, description: string, damage?: number) {
        // Must take snapshot after all state changes for this event are complete
        const statsSnapshot = this.player.stats.snapshot();
        const activeBuffs = this.player.statusManager.getActiveBuffs().map(b => ({
            id: b.definition.id,
            name: b.definition.name,
            stacks: b.currentStacks,
            remaining: b.remainingDuration
        }));
        const activeDoTs = this.target.statusManager.getActiveDoTs().map(d => ({
            id: d.definition.id,
            name: d.definition.name,
            stacks: d.currentStacks,
            remaining: d.remainingDuration,
            nextTick: d.nextTickTime - timestamp
        }));
        const activeEffects = [...this.player.activeEffects];

        this.logs.push({ 
            timestamp, 
            event, 
            description, 
            damage,
            accumulatedDamage: this.accumulatedDamage,
            statsSnapshot,
            activeBuffs,
            activeDoTs,
            activeEffects
        });
    }

    getLogs() { return this.logs; }
}
