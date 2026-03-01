import { Player } from '../models/player';
import { Enemy } from '../models/enemy';
import { EncounterConditions, CombatEvent as LegacyCombatEvent } from '../types/common';
import { StatType, EventTrigger, DamageTrait, EncounterTopology } from '../types/enums';
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
    private processor = new DamageProcessor();
    
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
        private conditions: EncounterConditions
    ) {
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
                    const legacyEvent: LegacyCombatEvent = {
                        shotNumber: 0,
                        damageProfile: { expected: event.damage || 0 } as any 
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

            if (shotCount % 10 === 0) {
                this.eventBus.emit({
                    type: EventTrigger.OnKill,
                    source: this.player,
                    target: this.primaryTarget,
                    depth: 0
                });
            }

            this.advanceTime(timeBetweenShots);
        }

        const maxFinalTickTime = this.currentTime + 10; 
        while (this.hasActiveStatus() && this.currentTime < maxFinalTickTime) {
            this.advanceTime(0.1);
        }

        this.log(this.currentTime, 'End', `Simulation complete. Total Damage: ${Math.round(this.accumulatedDamage)}`);
        return this.accumulatedDamage;
    }

    private hasActiveStatus(): boolean {
        if (this.player.statusManager.hasActiveStatus()) return true;
        for (const enemy of this.allEnemies) {
            if (enemy.statusManager.hasActiveStatus()) return true;
        }
        return false;
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
            depth: 0
        };

        this.eventBus.emit(hitEvent);
        
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
            getNearbyTargets: (target, _radius) => {
                if (this.conditions.topology === EncounterTopology.SingleTarget) return [];
                return this.allEnemies.filter(e => e.id !== target.id);
            }
        } as CombatContext; 
    }

    private reset() {
        this.currentTime = 0;
        this.accumulatedDamage = 0;
        this.logs = [];
        
        this.allEnemies = [];
        this.primaryTarget = new Enemy('primary-target', 9999999);
        this.allEnemies.push(this.primaryTarget);
        
        if (this.conditions.topology === EncounterTopology.Horde) {
            for (let i = 1; i <= 4; i++) {
                this.allEnemies.push(new Enemy(`horde-enemy-${i}`, 9999999));
            }
        } else if (this.conditions.topology === EncounterTopology.DuoElites) {
            this.allEnemies.push(new Enemy('elite-2', 9999999));
        }

        this.statusManager = this.primaryTarget.statusManager;
        this.player.statusManager.clear();
        for (const enemy of this.allEnemies) {
            enemy.statusManager.clear();
        }

        this.combatState = new CombatState();
        this.telemetryData = {};
        this.timeAxis = [];
        this.lastSampleTime = -0.1;
        StatAggregator.aggregate(this.player, this.conditions, 1.0, true);
    }

    private log(timestamp: number, event: string, description: string, damage?: number, intent?: DamageIntent) {
        const statsSnapshot = this.player.stats.snapshot();

        let bucketMultipliers: Record<string, number>;
        
        if (intent) {
            // Use multipliers from the intent for highest fidelity
            bucketMultipliers = { ...intent.bucketMultipliers };
        } else {
            // Fallback for non-intent events (Start/End/Buff Gain etc)
            const statusMult = 1 + (statsSnapshot[StatType.StatusDamagePercent] || 0) / 100;
            const elementalMult = 1 + (statsSnapshot[StatType.ElementalDamagePercent] || 0) / 100;
            const attackMult = 1 + (statsSnapshot[StatType.AttackPercent] || 0) / 100;
            const weaponMult = 1 + (statsSnapshot[StatType.WeaponDamagePercent] || 0) / 100;
            const kw = this.player.loadout.weapon?.keyword;
            const kwType = kw?.dmgStatType;
            const kwMult = kwType ? (1 + (statsSnapshot[kwType] || 0) / 100) : 1.0;

            bucketMultipliers = {
                status: statusMult,
                elemental: elementalMult,
                attack: attackMult * weaponMult,
                keyword: kwMult
            };
        }

        const activeBuffs = this.player.statusManager.getActiveBuffs().map(b => ({
            id: b.definition.id,
            name: b.definition.name,
            stacks: b.currentStacks,
            remaining: b.remainingDuration
        }));
        const activeDoTs = this.primaryTarget.statusManager.getActiveDoTs().map(d => ({
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
            activeEffects,
            bucketMultipliers
        });
    }

    private sampleTelemetry() {
        this.timeAxis.push(parseFloat(this.currentTime.toFixed(2)));
        const snap = this.player.stats.snapshot();
        for (const key of Object.values(StatType)) {
            if (!this.telemetryData[key]) this.telemetryData[key] = [];
            this.telemetryData[key]!.push(snap[key] || 0);
        }
    }

    getLogs() { return this.logs; }

    async runMonteCarlo(
        iterations: number = 100, 
        progressCallback?: (progress: number) => void
    ): Promise<MonteCarloResult> {
        const totals: number[] = [];
        let sampleLogs: SimulationLogEntry[] = [];
        const aggregateData: Partial<Record<StatType, number[][]>> = {};
        let finalTimeAxis: number[] = [];

        const chunkSize = 20; 
        for (let i = 0; i < iterations; i += chunkSize) {
            const currentChunkLimit = Math.min(i + chunkSize, iterations);
            
            for (let j = i; j < currentChunkLimit; j++) {
                this.simulateMagDump();
                totals.push(this.accumulatedDamage);
                
                if (j === 0) {
                    sampleLogs = [...this.logs];
                    finalTimeAxis = [...this.timeAxis];
                }

                for (const key of Object.values(StatType)) {
                    if (!aggregateData[key]) aggregateData[key] = [];
                    const samples = this.telemetryData[key] || [];
                    for (let t = 0; t < samples.length; t++) {
                        if (!aggregateData[key]![t]) aggregateData[key]![t] = [];
                        aggregateData[key]![t].push(samples[t]);
                    }
                }
            }

            if (progressCallback) progressCallback(currentChunkLimit / iterations);
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        const meanTelemetry: Partial<Record<StatType, number[]>> = {};
        const varianceTelemetry: Partial<Record<StatType, number[]>> = {};

        for (const key of Object.values(StatType)) {
            const timeSteps = aggregateData[key] || [];
            meanTelemetry[key] = [];
            varianceTelemetry[key] = [];

            for (const iterationValues of timeSteps) {
                const sum = iterationValues.reduce((a, b) => a + b, 0);
                const avg = sum / iterations;
                meanTelemetry[key]!.push(avg);

                const squareDiffs = iterationValues.map(v => Math.pow(v - avg, 2));
                const stdDev = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / iterations);
                varianceTelemetry[key]!.push(stdDev);
            }
        }

        const avgDamage = totals.reduce((a, b) => a + b, 0) / iterations;
        const squareDiffsDamage = totals.map(t => Math.pow(t - avgDamage, 2));
        const stdDevDamage = Math.sqrt(squareDiffsDamage.reduce((a, b) => a + b, 0) / iterations);

        return {
            averageDamage: avgDamage,
            minDamage: Math.min(...totals),
            maxDamage: Math.max(...totals),
            standardDeviation: stdDevDamage,
            iterations,
            allTotals: totals,
            sampleLogs,
            telemetry: {
                timeAxis: finalTimeAxis,
                data: meanTelemetry,
                variance: varianceTelemetry
            }
        };
    }
}
