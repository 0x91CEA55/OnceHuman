import { Player } from '../models/player';
import { Enemy } from '../models/enemy';
import { EncounterConditions } from '../types/common';
import { StatType, EventTrigger, DamageTrait } from '../types/enums';
import { CombatContext, CombatState } from '../models/effect';
import { StatAggregator } from './stat-aggregator';
import { StatusManager } from './status-manager';
import { CombatEventBus, CombatEvent } from './event-bus';
import { DamageProcessor } from './damage-processor';
import { DamageResolutionStrategy } from './damage-resolution-strategy';
import { DamageIntent } from '../models/damage';
import { ConfigManager } from './config';
import { auditLog } from './audit-log';

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
    bucketMultipliers: Record<string, number>;
}

export interface TelemetryTrack {
    timeAxis: number[];
    data: Partial<Record<StatType, number[]>>;
    variance?: Partial<Record<StatType, number[]>>; // Standard Deviation cloud
}

export interface MonteCarloResult {
    averageDamage: number;
    minDamage: number;
    maxDamage: number;
    standardDeviation: number;
    iterations: number;
    allTotals: number[];
    sampleLogs: SimulationLogEntry[];
    telemetry: TelemetryTrack;
}

export class DamageEngine {
    private statusManager = new StatusManager(null as any); 
    private combatState = new CombatState();
    private eventBus = new CombatEventBus();
    private processor: DamageProcessor;
    
    private primaryTarget: Enemy;
    private allEnemies: Enemy[] = [];
    private currentTime: number = 0;
    private logs: SimulationLogEntry[] = [];
    private accumulatedDamage: number = 0;
    
    // Telemetry tracking
    private telemetryData: Partial<Record<StatType, number[]>> = {};
    private timeAxis: number[] = [];
    private lastSampleTime: number = -0.1;

    constructor(
        private player: Player, 
        private conditions: EncounterConditions,
        private strategy?: DamageResolutionStrategy
    ) {
        // Integrate with ConfigManager and AuditLog
        const activeStrategy = this.strategy || ConfigManager.getStrategy();
        this.processor = new DamageProcessor(activeStrategy);
        
        // Audit logging for the engine configuration
        auditLog.setStrategy(ConfigManager.getActiveStrategyType());
        auditLog.log('Engine', 'Initialization', `Started DamageEngine with ${ConfigManager.getActiveStrategyType()} strategy`);

        this.primaryTarget = new Enemy('boss-1', 9999999);
        this.allEnemies = [this.primaryTarget];
        this.statusManager = this.primaryTarget.statusManager; 
        this.setupEventHandlers();
    }

    private setupEventHandlers() {
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
                    if (effect.trigger.type === trigger) {
                        const success = effect.evaluate(ctx, event);
                        if (success) {
                            effect.execute(ctx, event);
                        }
                    }
                }
            });
        }
    }

    simulateMagDump(): SimulationLogEntry[] {
        // console.error("SIMULATING MAG DUMP");
        this.accumulatedDamage = 0;
        this.currentTime = 0;
        this.logs = [];
        this.combatState = new CombatState(); // Fresh state for each run
        this.telemetryData = {};
        this.timeAxis = [];
        this.lastSampleTime = -0.1;
        
        // Initial aggregate to get baseline mag size and fire rate
        StatAggregator.aggregate(this.player, this.conditions, 1.0, true);

        const weapon = this.player.loadout.weapon;
        if (!weapon) return [];

        const fireRate = this.player.stats.get(StatType.FireRate)?.value ?? 100;
        const shotInterval = 60 / fireRate;
        const magSize = Math.floor(this.player.stats.get(StatType.MagazineCapacity)?.value ?? 30);
        // console.error(`MAG SIZE: ${magSize}`);

        for (let shotCount = 1; shotCount <= magSize; shotCount++) {
            // Re-aggregate stats before each shot to account for dynamic buffs
            // ammoPercent is remaining ammo (1.0 at start, 0.0 at end)
            const ammoPercent = (magSize - shotCount + 1) / magSize;
            StatAggregator.aggregate(this.player, this.conditions, ammoPercent);
            
            this.simulateShot(shotCount);
            this.advanceTime(shotInterval);
        }

        return this.logs;
    }

    async runMonteCarlo(iterations: number = 500, onProgress?: (p: number) => void): Promise<MonteCarloResult> {
        const allTotals: number[] = [];
        let sampleLogs: SimulationLogEntry[] = [];

        for (let i = 0; i < iterations; i++) {
            const logs = this.simulateMagDump();
            if (i === 0) sampleLogs = logs; 
            
            allTotals.push(this.accumulatedDamage);
            
            if (onProgress && i % 20 === 0) {
                onProgress(i / iterations);
                // Simple yield
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        const average = allTotals.reduce((a, b) => a + b, 0) / iterations;
        const min = Math.min(...allTotals);
        const max = Math.max(...allTotals);
        
        const squareDiffs = allTotals.map(v => Math.pow(v - average, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / iterations;
        const stdDev = Math.sqrt(avgSquareDiff);

        if (onProgress) onProgress(1.0);

        return {
            averageDamage: average,
            minDamage: min,
            maxDamage: max,
            standardDeviation: stdDev,
            iterations,
            allTotals,
            sampleLogs,
            telemetry: {
                timeAxis: this.timeAxis,
                data: this.telemetryData
            }
        };
    }

    private simulateShot(shotNumber: number) {
        const baseWeaponDmg = this.player.stats.get(StatType.DamagePerProjectile)?.value ?? 0;
        
        const intent = new DamageIntent(baseWeaponDmg, this.player, this.primaryTarget)
            .addTrait(DamageTrait.Attack)
            .addTrait(DamageTrait.Weapon)
            .enableCrit()
            .enableWeakspot();

        const damage = this.processor.resolve(intent);
        this.accumulatedDamage += damage;
        this.log(this.currentTime, 'Shot', `Bullet #${shotNumber} deals ${Math.round(damage)}`, damage, intent);

        const hitEvent: CombatEvent = {
            type: EventTrigger.OnHit,
            source: this.player,
            target: this.primaryTarget,
            intent: intent,
            damage: damage,
            isCrit: intent.isCrit,
            isWeakspot: intent.isWeakspot,
            depth: 0
        };

        this.eventBus.emit(hitEvent);
        
        if (intent.isCrit) {
             this.eventBus.emit({
                ...hitEvent,
                type: EventTrigger.OnCrit
             });
        }

        if (intent.isWeakspot) {
            this.eventBus.emit({
                ...hitEvent,
                type: EventTrigger.OnWeakspotHit
            });
        }
    }

    private advanceTime(dt: number) {
        const targetTime = this.currentTime + dt;
        const step = 0.01; 

        while (this.currentTime < targetTime) {
            this.currentTime += step;
            
            const ctx = this.createContext();
            this.player.statusManager.tick(step, ctx);
            for (const enemy of this.allEnemies) {
                enemy.statusManager.tick(step, ctx);
            }

            if (this.currentTime - this.lastSampleTime >= 0.1) {
                this.sampleTelemetry();
                this.lastSampleTime = this.currentTime;
            }
        }
        this.currentTime = targetTime;
    }

    private createContext(): CombatContext {
        return {
            player: this.player,
            conditions: this.conditions,
            currentTime: this.currentTime,
            recordDamage: (amt: number, src: string, intent?: DamageIntent) => {
                this.accumulatedDamage += amt;
                const desc = `${src} deals ${Math.round(amt).toLocaleString()} damage`;
                this.log(this.currentTime, 'Damage', desc, amt, intent);
            },
            logEvent: (evt: string, desc: string) => this.log(this.currentTime, evt, desc),
            statusManager: this.statusManager,
            state: this.combatState,
            eventBus: this.eventBus,
            getNearbyTargets: (_target: Enemy, _radius: number) => {
                // In current sim, only one enemy.
                return [];
            }
        };
    }

    private sampleTelemetry() {
        this.timeAxis.push(this.currentTime);
        for (const stat of Object.values(StatType)) {
            const val = this.player.stats.get(stat as StatType)?.value ?? 0;
            if (!this.telemetryData[stat as StatType]) this.telemetryData[stat as StatType] = [];
            this.telemetryData[stat as StatType]!.push(val);
        }
    }

    getLogs() { return this.logs; }
    getAccumulatedDamage() { return this.accumulatedDamage; }

    private log(timestamp: number, event: string, description: string, damage?: number, intent?: DamageIntent) {
        this.logs.push({
            timestamp,
            event,
            description,
            damage,
            accumulatedDamage: this.accumulatedDamage,
            statsSnapshot: this.player.stats.snapshot(),
            activeBuffs: [], // TODO: Get from status manager
            activeDoTs: [],
            activeEffects: [],
            bucketMultipliers: intent?.bucketMultipliers ?? {}
        });
    }
}
