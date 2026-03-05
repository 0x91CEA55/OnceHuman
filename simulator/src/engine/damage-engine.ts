import { Player } from '../models/player';
import { Enemy } from '../models/enemy';
import { EncounterConditions } from '../types/common';
import { StatType, DamageTrait } from '../types/enums';
import { StatAggregator } from './stat-aggregator';
import { auditLog } from './audit-log';

import { runTriggerEvaluation, TriggerEvent, TriggerEvalContext } from './trigger-system';
import { runEffectExecution, EffectExecutionContext, StatusTickContext } from './effect-system';
import { TriggerType } from '../types/trigger-types';
import { TriggerCounterKey, CooldownKey } from '../types/keys';
import { RngService, MathRandomRng } from './rng';
import { STATUS_REGISTRY } from '../data/status-registry';
import { 
    resolve, 
    evaluateRolls, 
    buildResolutionContext, 
    statValuesFromSnapshot,
    KEYWORD_TRAIT_MAP
} from './resolver';
import { UNIVERSAL_BUCKETS, ROLL_REGISTRY } from './bucket-registry';
import { BucketId, ContextFlag } from '../types/resolution';

/**
 * ADR-005: Type-Safe Simulation Log
 * Abolishes string keys in favor of enums and includes mandatory snapshots.
 */
export interface SimulationLogEntry {
    readonly timestamp: number;
    readonly event: string;
    readonly description: string;
    readonly damage: number;
    readonly accumulatedDamage: number;
    readonly instantaneousDPS: number;
    readonly runningAverageDPS: number;
    /** Type-safe audit trail keyed by BucketId. */
    readonly bucketMultipliers: ReadonlyMap<BucketId, number>;
    /** Verifiable snapshot of flags active during this specific resolution event. */
    readonly flagsSnapshot: ReadonlySet<ContextFlag>;
    readonly statsSnapshot: Record<StatType, number>;
    readonly activeBuffs: { id: string, name: string, stacks: number, remaining: number }[];
    readonly activeDoTs: { id: string, name: string, stacks: number, remaining: number, nextTick: number }[];
    readonly activeEffects: any[]; 
}

export interface TelemetryTrack {
    timeAxis: number[];
    data: Partial<Record<StatType, number[]>>;
    cumulativeDamage: number[];
    instantaneousDPS: number[];
    runningAverageDPS: number[];
    variance?: Partial<Record<StatType, number[]>>; 
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
    private primaryTarget: Enemy;
    private allEnemies: Enemy[] = [];
    private currentTime: number = 0;
    private logs: SimulationLogEntry[] = [];
    private accumulatedDamage: number = 0;

    /** ADR-003: Per-simulation-run state. */
    private counters: Map<TriggerCounterKey, number> = new Map();
    private cooldowns: Map<CooldownKey, number> = new Map();
    private rng: RngService;

    // High-Fidelity DPS tracking
    private dpsWindow: { timestamp: number, damage: number }[] = [];
    private readonly DPS_WINDOW_SECONDS = 1.0;

    // Telemetry tracking
    private telemetryData: Partial<Record<StatType, number[]>> = {};
    private telemetryCumulativeDamage: number[] = [];
    private telemetryInstantaneousDPS: number[] = [];
    private telemetryRunningAverageDPS: number[] = [];
    private timeAxis: number[] = [];
    private lastSampleTime: number = -0.1;

    constructor(
        private player: Player,
        private conditions: EncounterConditions,
        _unusedStrategy?: any,
        rng?: RngService
    ) {
        this.rng = rng ?? new MathRandomRng();

        auditLog.log('Engine', 'Initialization', `Started DamageEngine with Universal data-driven paradigm`);

        this.primaryTarget = new Enemy('boss-1', 9999999);
        this.allEnemies = [this.primaryTarget];
    }

    /**
     * ADR-005: Public Simulation Entry Point
     * Provides a typed API for integration tests, abolishing 'as any' escapes.
     */
    public executeShot(shotNumber: number): SimulationLogEntry {
        return this.simulateShot(shotNumber);
    }

    simulateMagDump(): SimulationLogEntry[] {
        this.accumulatedDamage = 0;
        this.currentTime = 0;
        this.logs = [];
        this.dpsWindow = [];
        this.telemetryData = {};
        this.telemetryCumulativeDamage = [];
        this.telemetryInstantaneousDPS = [];
        this.telemetryRunningAverageDPS = [];
        this.timeAxis = [];
        this.lastSampleTime = -0.1;

        this.counters = new Map();
        this.cooldowns = new Map();

        this.primaryTarget.statusManager.clear();
        this.player.statusManager.clear();

        // Initial aggregate
        StatAggregator.aggregate(this.player, this.conditions, 1.0, true);

        const weapon = this.player.loadout.weapon;
        if (!weapon) return [];

        const fireRate = this.player.stats.get(StatType.FireRate)?.value ?? 100;
        const shotInterval = 60 / fireRate;
        const magSize = Math.floor(this.player.stats.get(StatType.MagazineCapacity)?.value ?? 30);

        for (let shotCount = 1; shotCount <= magSize; shotCount++) {
            const ammoPercent = (magSize - shotCount + 1) / magSize;
            
            // Set weakspot hit rate in player stats for the data-driven roll
            this.player.stats.set(StatType.WeakspotHitRatePercent, this.conditions.weakspotHitRate * 100);
            
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
                data: this.telemetryData,
                cumulativeDamage: this.telemetryCumulativeDamage,
                instantaneousDPS: this.telemetryInstantaneousDPS,
                runningAverageDPS: this.telemetryRunningAverageDPS
            }
        };
    }

    private calculateInstantaneousDPS(): number {
        const cutoff = this.currentTime - this.DPS_WINDOW_SECONDS;
        while (this.dpsWindow.length > 0 && this.dpsWindow[0].timestamp < cutoff) {
            this.dpsWindow.shift();
        }
        const windowDamage = this.dpsWindow.reduce((acc, entry) => acc + entry.damage, 0);
        return windowDamage / this.DPS_WINDOW_SECONDS;
    }

    private recordDamageEvent(amount: number) {
        this.accumulatedDamage += amount;
        this.dpsWindow.push({ timestamp: this.currentTime, damage: amount });
    }

    private simulateShot(shotNumber: number): SimulationLogEntry {
        const baseWeaponDmg = this.player.stats.get(StatType.DamagePerProjectile)?.value ?? 0;
        const statValues = statValuesFromSnapshot(this.player.stats.snapshot());

        // ADR-002: Build context and evaluate data-driven rolls (Crit, Weakspot, etc.)
        const traits = new Set([DamageTrait.Attack, DamageTrait.Weapon]);
        if (this.player.loadout.weapon) {
            const kwTraits = KEYWORD_TRAIT_MAP[this.player.loadout.weapon.keyword.type];
            if (kwTraits) kwTraits.forEach(t => traits.add(t));
        }
        
        // Map player-level flags (e.g. from Gilded Gloves) to resolution context
        const initialFlags = new Map<ContextFlag, boolean>();
        this.player.flags.forEach((v, k) => initialFlags.set(k as ContextFlag, v));

        const ctx = buildResolutionContext(
            traits,
            this.conditions.enemyType,
            statValues,
            initialFlags
        );

        // Execute rolls from ROLL_REGISTRY
        evaluateRolls(ROLL_REGISTRY, ctx, this.rng);

        // Resolve damage through UNIVERSAL_BUCKETS
        const { finalDamage, audit } = resolve(baseWeaponDmg, UNIVERSAL_BUCKETS, ctx);

        this.recordDamageEvent(finalDamage);
        
        // ADR-005: Capture snapshots for bit-perfect verification
        const flagsSnapshot = new Set<ContextFlag>();
        ctx.flags.forEach((v, k) => { if (v) flagsSnapshot.add(k); });

        const logEntry: SimulationLogEntry = {
            timestamp: this.currentTime,
            event: 'Shot',
            description: `Bullet #${shotNumber} deals ${Math.round(finalDamage)}`,
            damage: finalDamage,
            accumulatedDamage: this.accumulatedDamage,
            instantaneousDPS: this.calculateInstantaneousDPS(),
            runningAverageDPS: this.currentTime > 0 ? this.accumulatedDamage / this.currentTime : 0,
            statsSnapshot: this.player.stats.snapshot(),
            activeBuffs: [],
            activeDoTs: [],
            activeEffects: [],
            bucketMultipliers: new Map(audit),
            flagsSnapshot
        };

        this.logs.push(logEntry);

        // ADR-003: Fire Trigger event
        const triggerEvent: TriggerEvent = {
            triggerType: TriggerType.OnHit,
            isCrit: ctx.flags.get('wasCrit') ?? false,
            isWeakspot: ctx.flags.get('wasWeakspot') ?? false,
            passDepth: 0,
        };

        this.fireTriggers(triggerEvent);

        return logEntry;
    }

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
                this.recordDamageEvent(amount);
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
                    this.recordDamageEvent(amount);
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

        this.telemetryCumulativeDamage.push(this.accumulatedDamage);
        this.telemetryInstantaneousDPS.push(this.calculateInstantaneousDPS());
        this.telemetryRunningAverageDPS.push(this.currentTime > 0 ? this.accumulatedDamage / this.currentTime : 0);
    }

    getLogs() { return this.logs; }
    getAccumulatedDamage() { return this.accumulatedDamage; }

    private log(timestamp: number, event: string, description: string, damage: number = 0) {
        const logEntry: SimulationLogEntry = {
            timestamp,
            event,
            description,
            damage,
            accumulatedDamage: this.accumulatedDamage,
            instantaneousDPS: this.calculateInstantaneousDPS(),
            runningAverageDPS: timestamp > 0 ? this.accumulatedDamage / timestamp : 0,
            statsSnapshot: this.player.stats.snapshot(),
            activeBuffs: [],
            activeDoTs: [],
            activeEffects: [],
            bucketMultipliers: new Map(), // No buckets for generic events
            flagsSnapshot: new Set()
        };
        this.logs.push(logEntry);
    }
}
