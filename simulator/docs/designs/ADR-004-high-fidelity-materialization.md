# ADR-004: High-Fidelity Domain Materialization — Full Verbatim implementation Record

**Status:** Implementation Complete (Phase 1)
**Date:** 2026-03-05
**Deciders:** Tatum (Project Lead), Gemini CLI

---

## 1. Engine & Resolution Core (Verbatim)

### 1.1. Deterministic RNG Service (`rng.ts`)
```typescript
export interface RngService {
    /** Returns a random float in [0.0, 1.0). */
    next(): number;
}

export class MathRandomRng implements RngService {
    next(): number { return Math.random(); }
}

export class FixedRng implements RngService {
    private index = 0;
    constructor(private values: number[]) {}
    next(): number {
        const val = this.values[this.index % this.values.length];
        this.index++;
        return val;
    }
}

export class SeededRng implements RngService {
    private state: number;
    constructor(seed: number) { this.state = seed; }
    next(): number {
        this.state |= 0;
        this.state = (this.state + 0x6D2B79F5) | 0;
        let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}
```

### 1.2. Roll Registry & Keyword Trait Mapping (`resolver.ts`)
```typescript
export function evaluateRolls(
    rolls: readonly RollDefinition[],
    ctx: ResolutionContext,
    rng: RngService,
): void {
    for (const roll of rolls) {
        let sum = 0;
        for (const contributor of roll.rateContributors) {
            if (evaluate(contributor.condition, ctx)) {
                sum += ctx.statValues.get(contributor.stat) ?? 0;
            }
        }
        const rate = Math.min(sum / 100, 1);
        const result = rng.next() < rate;
        ctx.flags.set(roll.resultFlag, result);
    }
}

export const KEYWORD_TRAIT_MAP: Record<KeywordType, DamageTrait[]> = {
    [KeywordType.Burn]: [DamageTrait.Burn, DamageTrait.Status, DamageTrait.Elemental],
    [KeywordType.FrostVortex]: [DamageTrait.FrostVortex, DamageTrait.Status, DamageTrait.Elemental],
    [KeywordType.PowerSurge]: [DamageTrait.PowerSurge, DamageTrait.Elemental],
    [KeywordType.Shrapnel]: [DamageTrait.Shrapnel, DamageTrait.Weapon],
    [KeywordType.UnstableBomber]: [DamageTrait.UnstableBomber, DamageTrait.Status, DamageTrait.Elemental, DamageTrait.Explosive],
    [KeywordType.Bounce]: [DamageTrait.Bounce, DamageTrait.Weapon],
    [KeywordType.FastGunner]: [DamageTrait.FastGunner, DamageTrait.Weapon],
    [KeywordType.BullsEye]: [DamageTrait.BullsEye, DamageTrait.Weapon],
    [KeywordType.FortressWarfare]: [DamageTrait.Weapon],
};
```

---

## 2. Domain & Data Materialization (Verbatim)

### 2.1. Armor Sets & Uniques (`armor.ts`)
```typescript
    [ArmorSetKey.Savior]: {
        id: ArmorSetKey.Savior,
        name: 'Savior Set',
        bonuses: [
            { requiredPieces: 2, effects: [
                () => new ConditionalEffect(
                    (ctx: AggregationContext) => (ctx.player.stats.get(StatType.ShieldPercent)?.value ?? 0) > 0,
                    [
                        new IncreaseStatEffect(StatType.WeaponDamagePercent, 10),
                        new IncreaseStatEffect(StatType.StatusDamagePercent, 10)
                    ]
                )
            ]},
            { requiredPieces: 3, effects: [
                () => new IncreaseStatEffect(StatType.WeaponDamagePercent, 20), // 5% * 4 stacks (simplified to max)
                () => new IncreaseStatEffect(StatType.StatusDamagePercent, 20)
            ]}
        ]
    },
    [ArmorKey.GildedGloves]: {
        id: ArmorKey.GildedGloves,
        name: 'Gilded Gloves',
        slot: ArmorSlot.Gloves,
        rarity: Rarity.Legendary,
        intrinsicEffects: [
            () => new SetFlagEffect(FlagType.KeywordCanCrit, true),
            () => new IncreaseStatEffect(StatType.KeywordCritRatePercent, 20),
            () => new IncreaseStatEffect(StatType.KeywordCritDamagePercent, 20)
        ]
    }
```

### 2.2. Complex Mod Logic (`mods.ts`)
```typescript
class MomentumUpMod extends Mod {
    protected override applyCustomLogic(ctx: AggregationContext): void {
        if (ctx.ammoPercent > 0.5) {
            ctx.player.stats.add(StatType.FireRate, 10);
        } else {
            ctx.player.stats.add(StatType.WeaponDamagePercent, 30);
        }
    }
}

class RushHourMod extends Mod {
    protected override applyCustomLogic(ctx: AggregationContext): void {
        const hpLoss = 100 - ctx.conditions.playerHpPercent;
        const stacks = Math.floor(hpLoss / 10);
        const bonus = stacks * 4;
        ctx.player.stats.add(StatType.WeaponDamagePercent, bonus);
        ctx.player.stats.add(StatType.StatusDamagePercent, bonus);
    }
}
```

---

## 3. High-Fidelity Simulation Engine (Verbatim)

### 3.1. Telemetry & DPS Window (`damage-engine.ts`)
```typescript
export interface SimulationLogEntry {
    timestamp: number;
    event: string;
    description: string;
    damage?: number;
    accumulatedDamage: number;
    instantaneousDPS: number;
    runningAverageDPS: number;
    statsSnapshot: Record<StatType, number>;
    activeBuffs: { id: string, name: string, stacks: number, remaining: number }[];
    activeDoTs: { id: string, name: string, stacks: number, remaining: number, nextTick: number }[];
    activeEffects: any[]; 
    bucketMultipliers: Record<string, number>;
}

private calculateInstantaneousDPS(): number {
    const cutoff = this.currentTime - this.DPS_WINDOW_SECONDS;
    while (this.dpsWindow.length > 0 && this.dpsWindow[0].timestamp < cutoff) {
        this.dpsWindow.shift();
    }
    const windowDamage = this.dpsWindow.reduce((acc, entry) => acc + entry.damage, 0);
    return windowDamage / this.DPS_WINDOW_SECONDS;
}
```

### 3.2. Context Bridging (`common.ts` & `stat-aggregator.ts`)
```typescript
// simulator/src/types/common.ts
export class EncounterConditions {
    constructor(
        public enemyType: EnemyType = EnemyType.Normal,
        public targetDistanceMeters: number = 10,
        public playerHpPercent: number = 100,
        public playerSanityPercent: number = 100,
        public playerShieldPercent: number = 0,
        public isTargetVulnerable: boolean = false,
        public weakspotHitRate: number = 0.5,
        public topology: EncounterTopology = EncounterTopology.SingleTarget
    ) {}
}

// simulator/src/engine/stat-aggregator.ts
player.stats.set(StatType.SanityPercent, conditions.playerSanityPercent);
player.stats.set(StatType.ShieldPercent, conditions.playerShieldPercent);
```

---

## 4. Model Refinement (Verbatim)

### 4.1. PlayerStats Expansion (`player.ts`)
```typescript
snapshotMap(): Map<StatType, number> {
    const snap = new Map<StatType, number>();
    this.stats.forEach((stat, type) => {
        snap.set(type, stat.value);
    });
    return snap;
}

set(type: StatType, value: number): void {
    const stat = this.stats.get(type);
    if (stat) {
        stat.value = value;
    } else {
        this.stats.set(type, new GenericStat(type, value));
    }
}
```

---

## 5. High-Fidelity Integration Tests (Verbatim)

### 5.1. Burn Build Fidelity (`burn-build-fidelity.test.ts`)
```typescript
test('Full Pipeline: Gilded Gloves unlock Burn Crit via ROLL_REGISTRY', () => {
    const stats = new PlayerStats();
    const loadout = new Loadout();
    const player = new Player(loadout, stats, 100);
    const conditions = new EncounterConditions();
    
    player.loadout.weapon = createWeapon(WeaponKey.OctopusGrilledRings); 
    player.loadout.gloves = createArmor(ArmorKey.GildedGloves);
    
    StatAggregator.aggregate(player, conditions);
    expect(player.hasFlag(FlagType.KeywordCanCrit)).toBe(true);

    const engine = new DamageEngine(player, conditions, null, new FixedRng([0.1]));
    
    player.stats.set(StatType.DamagePerProjectile, 100);
    player.stats.set(StatType.CritRatePercent, 100);
    player.stats.set(StatType.KeywordCritDamagePercent, 50);
    player.stats.set(StatType.BurnDamageFactor, 0);

    (engine as any).simulateShot(1);
    const log = engine.getLogs()[0];

    expect(log.bucketMultipliers['burn_factor']).toBe(1.5);
    expect(log.damage).toBe(273);
});
```

---

## 6. Pending Refinements (Mandatory Phase 2)

To reach "Zero-Trust" standard, Phase 2 MUST resolve the following string-key and type-casting debt:
*   `type ContextFlag = FlagType | 'wasCrit' | 'wasWeakspot' | 'wasBurnCrit' | 'isShielded' | 'isFirstHalfOfMag'`
*   `SimulationLogEntry.bucketMultipliers: ReadonlyMap<BucketId, number>`
*   `DamageEngine.executeSingleShot(shotNumber: number): SimulationLogEntry` (Abolish `as any`).
