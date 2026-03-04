import { Player } from '../models/player';
import { Enemy } from '../models/enemy';
import { EncounterConditions } from '../types/common';
import { StatType, DamageTrait } from '../types/enums';
import { StatAggregator } from './stat-aggregator';
import { DamageProcessor } from './damage-processor';
import { DamageResolutionStrategy } from './damage-resolution-strategy';
import { DamageIntent } from '../models/damage';
import { ConfigManager } from './config';
import { auditLog } from './audit-log';

import { runTriggerEvaluation, TriggerEvent, TriggerEvalContext } from './trigger-system';
import { runEffectExecution, EffectExecutionContext, StatusTickContext } from './effect-system';
import { TriggerType } from '../types/trigger-types';
import { TriggerCounterKey, CooldownKey } from '../types/keys';
import { RngService, MathRandomRng } from './rng';
import { STATUS_REGISTRY } from '../data/status-registry';
import { statValuesFromSnapshot } from './resolver';

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
    private processor: DamageProcessor;
    private primaryTarget: Enemy;
    private allEnemies: Enemy[] = [];
    private currentTime: number = 0;
    private logs: SimulationLogEntry[] = [];
    private accumulatedDamage: number = 0;

    /** ADR-003: Per-simulation-run state. Reset at start of each mag dump. */
    private counters: Map<TriggerCounterKey, number> = new Map();
    private cooldowns: Map<CooldownKey, number> = new Map();
    private rng: RngService;

    // Telemetry tracking
    private telemetryData: Partial<Record<StatType, number[]>> = {};
    private timeAxis: number[] = [];
    private lastSampleTime: number = -0.1;

    constructor(
        private player: Player,
        private conditions: EncounterConditions,
        strategy?: DamageResolutionStrategy,
        rng?: RngService
    ) {
        const activeStrategy = strategy || ConfigManager.getStrategy();
        this.processor = new DamageProcessor(activeStrategy);
        this.rng = rng ?? new MathRandomRng();

        auditLog.setStrategy(ConfigManager.getActiveStrategyType());
        auditLog.log('Engine', 'Initialization', `Started DamageEngine with ${ConfigManager.getActiveStrategyType()} strategy`);

        this.primaryTarget = new Enemy('boss-1', 9999999);
        this.allEnemies = [this.primaryTarget];
    }

    simulateMagDump(): SimulationLogEntry[] {
        this.accumulatedDamage = 0;
        this.currentTime = 0;
        this.logs = [];
        this.telemetryData = {};
        this.timeAxis = [];
        this.lastSampleTime = -0.1;

        // ADR-003: Reset per-run trigger state (fixes EveryNHits counter state pollution bug)
        this.counters = new Map();
        this.cooldowns = new Map();

        // Reset per-run status state
        this.primaryTarget.statusManager.clear();
        this.player.statusManager.clear();

        // Initial aggregate to get baseline mag size and fire rate
        StatAggregator.aggregate(this.player, this.conditions, 1.0, true);

        const weapon = this.player.loadout.weapon;
        if (!weapon) return [];

        const fireRate = this.player.stats.get(StatType.FireRate)?.value ?? 100;
        const shotInterval = 60 / fireRate;
        const magSize = Math.floor(this.player.stats.get(StatType.MagazineCapacity)?.value ?? 30);

        for (let shotCount = 1; shotCount <= magSize; shotCount++) {
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
        // Primary shot damage via existing DamageProcessor (ADR-002 primary migration: future work)
        const baseWeaponDmg = this.player.stats.get(StatType.DamagePerProjectile)?.value ?? 0;

        const intent = new DamageIntent(baseWeaponDmg, this.player, this.primaryTarget)
            .addTrait(DamageTrait.Attack)
            .addTrait(DamageTrait.Weapon)
            .enableCrit()
            .enableWeakspot();

        const damage = this.processor.resolve(intent);
        this.accumulatedDamage += damage;
        this.log(this.currentTime, 'Shot', `Bullet #${shotNumber} deals ${Math.round(damage)}`, damage, intent);

        // ADR-003: Fire OnHit trigger event
        // trigger-system handles OnCrit/OnWeakspotHit internally via isCrit/isWeakspot flags
        const triggerEvent: TriggerEvent = {
            triggerType: TriggerType.OnHit,
            isCrit: intent.isCrit,
            isWeakspot: intent.isWeakspot,
            passDepth: 0,
        };

        this.fireTriggers(triggerEvent);
    }

    /**
     * Evaluates all TriggerDefinitions for the given event and executes fired effects.
     * ADR-003: Replaces CombatEventBus.emit() + TriggeredEffect.evaluate()/execute().
     */
    private fireTriggers(event: TriggerEvent): void {
        const triggerDefs = this.player.loadout.getAllTriggerDefinitions();
        const statValues = statValuesFromSnapshot(this.player.stats.snapshot());

        const evalCtx: TriggerEvalContext = {
            encounterEnemyType: this.conditions.enemyType,
            targetDistanceMeters: this.conditions.targetDistanceMeters,
            currentTimeSeconds: this.currentTime,
            targetActiveDoTs: this.primaryTarget.statusManager.activeDoTs,
            targetActiveBuffs: this.primaryTarget.statusManager.activeBuffs,
            counters: this.counters,
            cooldowns: this.cooldowns,
            rng: this.rng,
        };

        const firedTriggers = runTriggerEvaluation(
            triggerDefs,
            event,
            evalCtx,
            (triggerId, depth) => {
                auditLog.log('TriggerDepth', 'Exceeded', `${triggerId} at depth ${depth}`);
            }
        );

        if (firedTriggers.length === 0) return;

        const effCtx: EffectExecutionContext = {
            statValues,
            encounterEnemyType: this.conditions.enemyType,
            currentTimeSeconds: this.currentTime,
            cooldowns: this.cooldowns,
            targetDoTs: this.primaryTarget.statusManager.activeDoTs,
            targetBuffs: this.primaryTarget.statusManager.activeBuffs,
            playerBuffs: this.player.statusManager.activeBuffs,
            dotRegistry: (id) => STATUS_REGISTRY.getDot(id as any),
            buffRegistry: (id) => STATUS_REGISTRY.getBuff(id as any),
            recordDamage: (amount, label, _traits) => {
                this.accumulatedDamage += amount;
                this.log(this.currentTime, 'Effect Damage', `${label}: ${Math.round(amount)}`, amount);
            },
            logEvent: (evt, desc) => this.log(this.currentTime, evt, desc),
        };

        for (const fired of firedTriggers) {
            runEffectExecution(fired.effects, effCtx);
        }
    }

    private advanceTime(dt: number) {
        const targetTime = this.currentTime + dt;
        const step = 0.01;

        while (this.currentTime < targetTime) {
            this.currentTime += step;

            const statValues = statValuesFromSnapshot(this.player.stats.snapshot());

            const tickCtx: StatusTickContext = {
                currentTimeSeconds: this.currentTime,
                statValues,
                encounterEnemyType: this.conditions.enemyType,
                recordDamage: (amount, label) => {
                    this.accumulatedDamage += amount;
                    this.log(this.currentTime, 'DoT Tick', `${label}: ${Math.round(amount)}`, amount);
                },
                logEvent: (evt, desc) => this.log(this.currentTime, evt, desc),
                dotRegistry: (id) => STATUS_REGISTRY.getDot(id as any),
                buffRegistry: (id) => STATUS_REGISTRY.getBuff(id as any),
            };

            this.player.statusManager.tick(step, tickCtx);
            for (const enemy of this.allEnemies) {
                enemy.statusManager.tick(step, tickCtx);
            }

            if (this.currentTime - this.lastSampleTime >= 0.1) {
                this.sampleTelemetry();
                this.lastSampleTime = this.currentTime;
            }
        }
        this.currentTime = targetTime;
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
            activeBuffs: [],
            activeDoTs: [],
            activeEffects: [],
            bucketMultipliers: intent?.bucketMultipliers ?? {}
        });
    }
}
