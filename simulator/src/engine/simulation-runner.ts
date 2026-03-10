import { World, EntityId } from '../ecs/world';
import { runStatAggregation } from '../ecs/systems/stat-aggregator-system';
import { runCombatShot } from '../ecs/systems/combat-system';
import { advanceTime, SimulationStepOptions } from '../ecs/systems/simulation-loop';
import { runTriggerEvaluation, TriggerEvent, TriggerEvalContext } from '../ecs/systems/trigger-system';
import { runEffectExecution, EffectExecutionContext } from '../ecs/systems/effect-system';
import { TriggerType, TriggerDefinition } from '../types/trigger-types';
import { TriggerCounterKey, CooldownKey, dotId, buffId } from '../types/keys';
import { StatType, AmmunitionType } from '../types/enums';
import { EncounterConditions } from '../types/common';
import { RngService, MathRandomRng } from './rng';
import { STATUS_REGISTRY } from '../data/status-registry';
import { statValuesFromSnapshot } from './resolver';
import { TelemetrySnapshot } from '../ecs/systems/telemetry-system';
import { LoadoutComponent, ArmorComponent } from '../ecs/types';
import { KEYWORD_TRIGGERS } from '../data/trigger-definitions';

import { BucketId, ContextFlag } from '../types/resolution';

export interface SimulationLogEntry {
    timestamp: number;
    event: string;
    description: string;
    damage: number;
    accumulatedDamage: number;
    instantaneousDPS: number;
    runningAverageDPS: number;
    bucketMultipliers: ReadonlyMap<BucketId, number>;
    flagsSnapshot: ReadonlySet<ContextFlag>;
    statsSnapshot: Record<StatType, number>;
    activeBuffs: { id: string, name: string, stacks: number, remaining: number }[];
    activeDoTs: { id: string, name: string, stacks: number, remaining: number, nextTick: number }[];
    activeEffects: any[];
}

export interface MonteCarloResult {
    averageDamage: number;
    averageDuration: number;
    minDamage: number;
    maxDamage: number;
    standardDeviation: number;
    iterations: number;
    allTotals: number[];
    sampleLogs: SimulationLogEntry[];
    telemetry: TelemetrySnapshot;
}

export class SimulationRunner {
    public world: World = new World();
    public playerId: EntityId;
    public targetId: EntityId;
    
    private currentTime: number = 0;
    private accumulatedDamage: number = 0;
    private logs: SimulationLogEntry[] = [];
    private dpsWindow: { timestamp: number, damage: number }[] = [];
    private readonly DPS_WINDOW_SECONDS = 1.0;
    
    private counters: Map<TriggerCounterKey, number> = new Map();
    private cooldowns: Map<CooldownKey, number> = new Map();
    private rng: RngService;
    private telemetrySnapshot: TelemetrySnapshot = {
        timeAxis: [],
        data: {},
        cumulativeDamage: [],
        instantaneousDPS: [],
        runningAverageDPS: []
    };
    private lastSampleTime: number = -0.1;

    constructor(
        private loadout: LoadoutComponent,
        private conditions: EncounterConditions,
        private selectedAmmunition: AmmunitionType = AmmunitionType.Steel,
        rng?: RngService
    ) {
        this.rng = rng ?? new MathRandomRng();
        this.playerId = this.world.createEntity('player');
        this.targetId = this.world.createEntity('target');

        this.setupEntities();
    }

    private setupEntities() {
        // Reset components
        this.world.addComponent(this.playerId, 'loadout', this.loadout);
        this.world.addComponent(this.playerId, 'stats', { snapshot: {} as Record<StatType, number> });
        this.world.addComponent(this.playerId, 'flags', { activeFlags: new Set() });
        this.world.addComponent(this.playerId, 'status', { activeBuffs: [], activeDoTs: [] });
        this.world.addComponent(this.playerId, 'resources', {
            sanity: this.conditions.playerSanity,
            maxSanity: this.conditions.maxPlayerSanity,
            deviantPower: this.conditions.playerDeviantPower,
            maxDeviantPower: this.conditions.maxPlayerDeviantPower
        });

        // Setup Target
        this.world.addComponent(this.targetId, 'health', { currentHp: 9999999, maxHp: 9999999 });
        this.world.addComponent(this.targetId, 'status', { activeBuffs: [], activeDoTs: [] });
    }

    public simulateMagDump(): SimulationLogEntry[] {
        this.accumulatedDamage = 0;
        this.currentTime = 0;
        this.logs = [];
        this.dpsWindow = [];
        this.counters.clear();
        this.cooldowns.clear();
        this.telemetrySnapshot = {
            timeAxis: [],
            data: {},
            cumulativeDamage: [],
            instantaneousDPS: [],
            runningAverageDPS: []
        };
        this.lastSampleTime = -0.1;
        
        this.setupEntities();
        
        const loadout = this.world.getComponent(this.playerId, 'loadout')!;
        if (!loadout.weapon) return [];

        runStatAggregation(this.world, this.conditions, 1.0, this.selectedAmmunition);
        
        const stats = this.world.getComponent(this.playerId, 'stats')!;
        const fireRate = stats.snapshot[StatType.FireRate] || 100;
        const shotInterval = 60 / fireRate;
        const magSize = Math.floor(stats.snapshot[StatType.MagazineCapacity] || 30);

        for (let shotCount = 1; shotCount <= magSize; shotCount++) {
            const ammoPercent = (magSize - shotCount + 1) / magSize;
            
            runStatAggregation(this.world, this.conditions, ammoPercent, this.selectedAmmunition);
            
            this.executeShot(shotCount);
            this.advanceTime(shotInterval); 
        }

        return this.logs;
    }

    public async runMonteCarlo(iterations: number = 500, onProgress?: (p: number) => void): Promise<MonteCarloResult> {
        const allTotals: number[] = [];
        const allDurations: number[] = [];
        let sampleLogs: SimulationLogEntry[] = [];

        for (let i = 0; i < iterations; i++) {
            const logs = this.simulateMagDump();
            if (i === 0) sampleLogs = logs;

            allTotals.push(this.accumulatedDamage);
            allDurations.push(this.currentTime);

            if (onProgress && i % 20 === 0) {
                onProgress(i / iterations);
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        const average = allTotals.reduce((a, b) => a + b, 0) / iterations;
        const avgDuration = allDurations.reduce((a, b) => a + b, 0) / iterations;
        const min = Math.min(...allTotals);
        const max = Math.max(...allTotals);

        const squareDiffs = allTotals.map(v => Math.pow(v - average, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / iterations;
        const stdDev = Math.sqrt(avgSquareDiff);

        if (onProgress) onProgress(1.0);

        return {
            averageDamage: average,
            averageDuration: avgDuration,
            minDamage: min,
            maxDamage: max,
            standardDeviation: stdDev,
            iterations,
            allTotals,
            sampleLogs,
            telemetry: this.telemetrySnapshot
        };
    }

    private executeShot(shotNumber: number) {
        const result = runCombatShot(this.world, this.playerId, this.conditions, this.rng);
        
        this.recordDamage(result.finalDamage);
        
        const stats = this.world.getComponent(this.playerId, 'stats')!;
        this.log(this.currentTime, 'Shot', `Bullet #${shotNumber} deals ${Math.round(result.finalDamage)}`, result.finalDamage, stats.snapshot, result.audit, result.flagsSnapshot);

        // Fire triggers
        const triggerEvent: TriggerEvent = {
            triggerType: TriggerType.OnHit,
            isCrit: result.wasCrit,
            isWeakspot: result.wasWeakspot,
            passDepth: 0
        };
        
        this.fireTriggers(triggerEvent);
    }

    private fireTriggers(event: TriggerEvent) {
        const loadout = this.world.getComponent(this.playerId, 'loadout')!;
        const triggerDefs = this.getAllTriggerDefinitions(loadout);
        const playerStatus = this.world.getComponent(this.playerId, 'status')!;
        const targetStatus = this.world.getComponent(this.targetId, 'status')!;
        
        const evalCtx: TriggerEvalContext = {
            encounterEnemyType: this.conditions.enemyType,
            targetDistanceMeters: this.conditions.targetDistanceMeters,
            currentTimeSeconds: this.currentTime,
            targetActiveDoTs: targetStatus.activeDoTs,
            targetActiveBuffs: targetStatus.activeBuffs,
            counters: this.counters,
            cooldowns: this.cooldowns,
            rng: this.rng
        };

        const firedTriggers = runTriggerEvaluation(triggerDefs, event, evalCtx);
        if (firedTriggers.length === 0) return;

        const attackerStats = this.world.getComponent(this.playerId, 'stats')!;
        const statValues = statValuesFromSnapshot(attackerStats.snapshot);

        const effCtx: EffectExecutionContext = {
            statValues,
            statContributions: new Map(), // Mocked for now
            encounterEnemyType: this.conditions.enemyType,
            currentTimeSeconds: this.currentTime,
            cooldowns: this.cooldowns,
            targetDoTs: targetStatus.activeDoTs,
            targetBuffs: targetStatus.activeBuffs,
            playerBuffs: playerStatus.activeBuffs,
            dotRegistry: (id) => STATUS_REGISTRY.getDot(dotId(id)),
            buffRegistry: (id) => STATUS_REGISTRY.getBuff(buffId(id)),
            recordDamage: (amount, label) => {
                this.recordDamage(amount);
                this.log(this.currentTime, 'Effect Damage', `${label}: ${Math.round(amount)}`, amount, attackerStats.snapshot);
            },
            logEvent: (evt, desc) => this.log(this.currentTime, evt, desc, 0, attackerStats.snapshot),
            rng: this.rng,
            playerFlags: new Map(), // Mocked
            unlockedKeywordCrits: new Set()
        };

        for (const fired of firedTriggers) {
            runEffectExecution(fired.effects, effCtx);
        }
    }

    private getAllTriggerDefinitions(loadout: LoadoutComponent): TriggerDefinition[] {
        const defs: TriggerDefinition[] = [];
        if (loadout.weapon) {
            const weapon = loadout.weapon;
            if (weapon.mod) defs.push(...weapon.mod.triggerDefinitions);
            if (!weapon.overridesKeywordTriggers) {
                const kwTriggers = KEYWORD_TRIGGERS[weapon.keyword];
                if (kwTriggers) defs.push(...kwTriggers);
            }
            defs.push(...weapon.triggerDefinitions);
        }
        
        const armors = [
            loadout.helmet, loadout.mask, loadout.top, 
            loadout.gloves, loadout.pants, loadout.boots
        ].filter((a): a is ArmorComponent => a !== undefined);

        const setCounts: Record<string, number> = {};
        const setDefinitions: Record<string, NonNullable<ArmorComponent['setDefinition']>> = {};

        for (const armor of armors) {
            if (armor.mod) defs.push(...armor.mod.triggerDefinitions);
            defs.push(...armor.triggerDefinitions);

            if (armor.setDefinition) {
                const setId = armor.setDefinition.id;
                setCounts[setId] = (setCounts[setId] || 0) + 1;
                setDefinitions[setId] = armor.setDefinition;
            }
        }

        for (const setId in setCounts) {
            const count = setCounts[setId];
            const definition = setDefinitions[setId];
            for (const bonus of definition.bonuses) {
                if (count >= bonus.requiredPieces && bonus.triggerDefinitions) {
                    defs.push(...bonus.triggerDefinitions);
                }
            }
        }

        return defs;
    }

    private advanceTime(dt: number) {
        const attackerStats = this.world.getComponent(this.playerId, 'stats')!;
        const statValues = statValuesFromSnapshot(attackerStats.snapshot);

        const options: SimulationStepOptions = {
            dt,
            step: 0.01,
            playerId: this.playerId,
            primaryTargetId: this.targetId,
            telemetry: this.telemetrySnapshot,
            lastSampleTime: this.lastSampleTime,
            accumulatedDamage: this.accumulatedDamage,
            calculateInstantaneousDPS: () => this.calculateInstantaneousDPS()
        };

        const result = advanceTime(
            this.world,
            this.currentTime,
            options,
            {
                statValues,
                statContributions: new Map(),
                encounterEnemyType: this.conditions.enemyType,
                recordDamage: (amount, label, time) => {
                    this.recordDamage(amount, time);
                    this.log(time, 'DoT Tick', `${label}: ${Math.round(amount)}`, amount, attackerStats.snapshot);
                },
                logEvent: (evt, desc, time) => this.log(time, evt, desc, 0, attackerStats.snapshot),
                dotRegistry: (id) => STATUS_REGISTRY.getDot(dotId(id)),
                buffRegistry: (id) => STATUS_REGISTRY.getBuff(buffId(id)),
                rng: this.rng,
                playerFlags: new Map(),
                unlockedKeywordCrits: new Set()
            }
        );

        this.currentTime = result.currentTime;
        this.lastSampleTime = result.lastSampleTime;
    }

    private recordDamage(amount: number, time?: number) {
        this.accumulatedDamage += amount;
        this.dpsWindow.push({ timestamp: time ?? this.currentTime, damage: amount });
    }

    private calculateInstantaneousDPS(): number {
        const cutoff = this.currentTime - this.DPS_WINDOW_SECONDS;
        while (this.dpsWindow.length > 0 && this.dpsWindow[0].timestamp < cutoff) {
            this.dpsWindow.shift();
        }
        const windowDamage = this.dpsWindow.reduce((acc, entry) => acc + entry.damage, 0);
        return windowDamage / this.DPS_WINDOW_SECONDS;
    }

    private log(
        timestamp: number, 
        event: string, 
        description: string, 
        damage: number, 
        snapshot: Record<StatType, number>,
        bucketMultipliers: ReadonlyMap<BucketId, number> = new Map(),
        flagsSnapshot: ReadonlySet<ContextFlag> = new Set()
    ) {
        const playerStatus = this.world.getComponent(this.playerId, 'status');
        
        this.logs.push({
            timestamp,
            event,
            description,
            damage,
            accumulatedDamage: this.accumulatedDamage,
            instantaneousDPS: this.calculateInstantaneousDPS(),
            runningAverageDPS: timestamp > 0 ? this.accumulatedDamage / timestamp : 0,
            statsSnapshot: { ...snapshot },
            bucketMultipliers,
            flagsSnapshot,
            activeBuffs: playerStatus?.activeBuffs.map(b => ({
                id: b.definitionId,
                name: b.definitionId, // We don't have name easily here
                stacks: b.currentStacks,
                remaining: b.remainingDurationSeconds
            })) || [],
            activeDoTs: [], // Mocked for now
            activeEffects: []
        });
    }

    public getTelemetry() {
        return this.telemetrySnapshot;
    }

    public getAccumulatedDamage() {
        return this.accumulatedDamage;
    }
}
