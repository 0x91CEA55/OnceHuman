import { World } from '../world';
import { StatType, WeaponType, CalibrationStyle, AmmunitionType } from '../../types/enums';
import { AggregationContext, EncounterConditions } from '../../types/common';
import { 
    WeaponComponent, 
    ArmorComponent, 
    ModComponent, 
    LoadoutComponent, 
    StatsComponent, 
    FlagComponent,
    EntityId,
    StatusComponent
} from '../types';
import { ScalingEngine } from '../../engine/scaling-engine';
import { AMMUNITION } from '../../data/ammunition';
import { STATUS_REGISTRY } from '../../data/status-registry';
import { IPlayer, IEffect } from '../../types/domain-interfaces';
import { StaticAttributeEffect, IncreaseStatEffect } from '../../ecs/effects';

const CHARACTER_BASELINE: Partial<Record<StatType, number>> = {
    [StatType.PsiIntensity]: 125,
    [StatType.MaxBurnStacks]: 5,
    [StatType.BurnDurationPercent]: 100,
    [StatType.SanityPercent]: 100,
    [StatType.Sanity]: 100,
    [StatType.MaxSanity]: 100,
    [StatType.DeviantPower]: 100,
    [StatType.MaxDeviantPower]: 100,
    [StatType.WeaponDamagePercent]: 0,
    [StatType.StatusDamagePercent]: 0,
    [StatType.ElementalDamagePercent]: 0,
    [StatType.AttackPercent]: 0,
    [StatType.CritRatePercent]: 0,
    [StatType.CritDamagePercent]: 0,
    [StatType.WeakspotDamagePercent]: 0,
};

const STYLE_BASE_DMG_REGISTRY: Record<CalibrationStyle, number> = {
    [CalibrationStyle.Heavy]: 20,
    [CalibrationStyle.Precision]: 20,
    [CalibrationStyle.Portable]: 20,
    [CalibrationStyle.RapidShot]: 10,
    [CalibrationStyle.None]: 0
};

/**
 * StatAggregatorSystem - Implements pure ECS stat aggregation.
 * Performs all logic previously in Weapon.apply(), Armor.apply(), etc.
 */
export function runStatAggregation(
    world: World, 
    conditions: EncounterConditions, 
    ammoPercent: number = 1.0,
    selectedAmmunition: AmmunitionType = AmmunitionType.Steel,
    externalActiveEffects?: IEffect[]
): void {
    const query = world.query('loadout', 'stats', 'flags', 'resources');
    
    for (const [entityId, components] of query) {
        const { loadout, stats, flags, resources } = components;
        
        // 1. Reset Stats and Flags
        stats.snapshot = { ...CHARACTER_BASELINE } as Record<StatType, number>;
        flags.activeFlags.clear();

        // 2. Feed context values into stats
        stats.snapshot[StatType.SanityPercent] = (resources.sanity / resources.maxSanity) * 100;
        stats.snapshot[StatType.ShieldPercent] = conditions.playerShieldPercent;
        stats.snapshot[StatType.Sanity] = resources.sanity;
        stats.snapshot[StatType.MaxSanity] = resources.maxSanity;
        stats.snapshot[StatType.DeviantPower] = resources.deviantPower;
        stats.snapshot[StatType.MaxDeviantPower] = resources.maxDeviantPower;

        const activeEffects: IEffect[] = [];
        const mockPlayer = createMockPlayer(entityId, stats, flags, loadout, activeEffects);
        const ctx: AggregationContext = {
            player: mockPlayer,
            conditions,
            ammoPercent,
            loadout: mockPlayer.loadout,
            resources
        };

        // 3. Aggregate Loadout
        aggregateLoadout(ctx, loadout, activeEffects);

        // 4. Apply Ammunition
        const ammo = AMMUNITION[selectedAmmunition];
        if (ammo) {
            if (ammo.weaponDamageBonus > 0) {
                mockPlayer.stats.add(StatType.WeaponDamagePercent, ammo.weaponDamageBonus, `Ammunition: ${ammo.name}`);
            }
            const psiValue = stats.snapshot[StatType.PsiIntensity] || 0;
            if (psiValue && ammo.psiIntensityBonus > 0) {
                const bonusValue = Math.round(psiValue * (ammo.psiIntensityBonus / 100));
                mockPlayer.stats.add(StatType.PsiIntensity, bonusValue, `Ammunition: ${ammo.name} (+${ammo.psiIntensityBonus}%)`);
            }
        }

        // 5. Apply Statuses
        const statusComp = world.getComponent(entityId, 'status');
        if (statusComp) {
            applyStatusEffects(mockPlayer, statusComp);
        }

        // 6. Output to external array if provided
        if (externalActiveEffects) {
            externalActiveEffects.push(...activeEffects);
        }
    }
}

function aggregateLoadout(ctx: AggregationContext, loadout: LoadoutComponent, activeEffects: IEffect[]): void {
    if (loadout.weapon) applyWeapon(ctx, loadout.weapon, activeEffects);
    
    const armors = [
        loadout.helmet, loadout.mask, loadout.top, 
        loadout.gloves, loadout.pants, loadout.boots
    ].filter((a): a is ArmorComponent => a !== undefined);

    for (const armor of armors) {
        applyArmor(ctx, armor, activeEffects);
    }

    applySetBonuses(ctx, armors, activeEffects);
}

function applyWeapon(ctx: AggregationContext, weapon: WeaponComponent, activeEffects: IEffect[]): void {
    const source = `Weapon: ${weapon.name}`;
    // Calibration Level Multiplier (e.g., Level 10 = +20%)
    const levelBonus = weapon.calibration * 2;
    // Matrix Multipliers (Style + RNG Bonus)
    const styleBase = STYLE_BASE_DMG_REGISTRY[weapon.calibrationMatrix.style] || 0;
    const matrixBonus = styleBase + weapon.calibrationMatrix.weaponDamageBonus;
    
    // Combined Calibration Multiplier (Additive percentages converted to multiplier)
    const combinedMultiplier = 1.0; // ADR-016: Calibration moves to Weapon DMG Bucket

    const finalBaseDamage = ScalingEngine.calculateFinalBaseDamage(
        weapon.baseStats.damagePerProjectile,
        weapon.star,
        weapon.level,
        combinedMultiplier
    );

    const statsToApply: { type: StatType; value: number }[] = [
        { type: StatType.DamagePerProjectile, value: finalBaseDamage },
        { type: StatType.ProjectilesPerShot, value: weapon.baseStats.projectilesPerShot },
        { type: StatType.FireRate, value: weapon.baseStats.fireRate },
        { type: StatType.MagazineCapacity, value: weapon.baseStats.magazineCapacity },
        { type: StatType.CritRatePercent, value: weapon.baseStats.critRatePercent },
        { type: StatType.CritDamagePercent, value: weapon.baseStats.critDamagePercent },
        { type: StatType.WeakspotDamagePercent, value: weapon.baseStats.weakspotDamagePercent },
        { type: StatType.WeaponDamagePercent, value: levelBonus + matrixBonus }, // Inject calibration here
    ];

    for (const s of statsToApply) {
        if (s.value !== 0) {
            const eff = new StaticAttributeEffect(s.type, s.value, source);
            activeEffects.push(eff);
            ctx.player.stats.add(s.type, s.value, source);
        }
    }

    // Intrinsics
    for (const effect of weapon.intrinsicEffects) {
        activeEffects.push(effect);
        effect.applyWithContext(ctx, 1);
    }

    // Calibration Style Effects
    const styleEffects = getCalibrationStyleEffects(weapon.calibrationMatrix.style, weapon.type);
    for (const effect of styleEffects) {
        activeEffects.push(effect);
        effect.applyWithContext(ctx, 1);
    }

    // Calibration Secondary Stat
    if (weapon.calibrationMatrix.secondaryStatValue !== 0) {
        const eff = new IncreaseStatEffect(weapon.calibrationMatrix.secondaryStatType, weapon.calibrationMatrix.secondaryStatValue, 'Calibration Affix');
        activeEffects.push(eff);
        eff.applyWithContext(ctx, 1);
    }

    // Mod
    if (weapon.mod) applyMod(ctx, weapon.mod, activeEffects);
}

function getCalibrationStyleEffects(style: CalibrationStyle, weaponType: WeaponType): IEffect[] {
    const source = `Calibration Style: ${style}`;
    const styleEffects: Record<CalibrationStyle, (wt: WeaponType) => IEffect[]> = {
        [CalibrationStyle.RapidShot]: (wt) => wt === WeaponType.SniperRifle
            ? [
                new IncreaseStatEffect(StatType.BoltPullingSpeedPercent, 50, source),
                new IncreaseStatEffect(StatType.ActionDelayPercent, -50, source),
                new IncreaseStatEffect(StatType.ReloadSpeedPercent, 15, source),
                new IncreaseStatEffect(StatType.AttackPercent, -10, source)
              ]
            : [
                new IncreaseStatEffect(StatType.FireRate, 10, source),
                new IncreaseStatEffect(StatType.AccuracyPercent, -50, source)
              ],
        [CalibrationStyle.Heavy]: () => [
            new IncreaseStatEffect(StatType.AttackPercent, 10, source),
            new IncreaseStatEffect(StatType.FireRate, -10, source)
        ],
        [CalibrationStyle.Precision]: () => [
            new IncreaseStatEffect(StatType.WeakspotDamagePercent, 15, source)
        ],
        [CalibrationStyle.Portable]: () => [],
        [CalibrationStyle.None]: () => []
    };

    const factory = styleEffects[style] || styleEffects[CalibrationStyle.None];
    return factory(weaponType);
}

function applyArmor(ctx: AggregationContext, armor: ArmorComponent, activeEffects: IEffect[]): void {
    const source = `Armor: ${armor.name}`;
    const eff = new StaticAttributeEffect(StatType.PsiIntensity, armor.psiIntensity, source);
    activeEffects.push(eff);
    ctx.player.stats.add(StatType.PsiIntensity, armor.psiIntensity, source);

    for (const effect of armor.intrinsicEffects) {
        activeEffects.push(effect);
        effect.applyWithContext(ctx, 1);
    }
    if (armor.mod) applyMod(ctx, armor.mod, activeEffects);
}

function applyMod(ctx: AggregationContext, mod: ModComponent, activeEffects: IEffect[]): void {
    const source = `Mod: ${mod.name}`;
    for (const sub of mod.substats) {
        const eff = new StaticAttributeEffect(sub.type, sub.value, `${source} (Substat)`);
        activeEffects.push(eff);
        ctx.player.stats.add(sub.type, sub.value, `${source} (Substat)`);
    }
    for (const effect of mod.permanentEffects) {
        activeEffects.push(effect);
        effect.applyWithContext(ctx, 1);
    }
}

function applySetBonuses(ctx: AggregationContext, armors: ArmorComponent[], activeEffects: IEffect[]): void {
    const setCounts: Record<string, number> = {};
    const setDefinitions: Record<string, NonNullable<ArmorComponent['setDefinition']>> = {};

    for (const armor of armors) {
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
            if (count >= bonus.requiredPieces) {
                for (const effect of bonus.effects) {
                    activeEffects.push(effect);
                    effect.applyWithContext(ctx, 1);
                }
            }
        }
    }
}

function applyStatusEffects(player: IPlayer, status: StatusComponent): void {
    for (const buffInstance of status.activeBuffs) {
        const def = STATUS_REGISTRY.getBuff(buffInstance.definitionId);
        if (!def) continue;
        for (const contrib of def.statContributions) {
            const bonus = contrib.valuePerStack * buffInstance.currentStacks;
            player.stats.add(contrib.stat, bonus, `Status: ${def.name} (${buffInstance.currentStacks} stacks)`);
        }
    }
}

function createMockPlayer(
    entityId: EntityId, 
    statsComp: StatsComponent, 
    flagsComp: FlagComponent, 
    loadout: LoadoutComponent,
    activeEffects: IEffect[]
): IPlayer {
    return {
        id: entityId,
        hp: 100,
        activeEffects,
        stats: {
            add: (type, value) => {
                statsComp.snapshot[type] = (statsComp.snapshot[type] || 0) + value;
            },
            get: (type) => ({
                type,
                value: statsComp.snapshot[type] || 0,
                add: (v) => statsComp.snapshot[type] = (statsComp.snapshot[type] || 0) + v,
                reset: () => {}
            })
        },
        hasFlag: (flag) => flagsComp.activeFlags.has(flag),
        setFlag: (flag, value) => {
            if (value) flagsComp.activeFlags.add(flag);
            else flagsComp.activeFlags.delete(flag);
        },
        loadout: loadout as any
    };
}
