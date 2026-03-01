import { StatType, FlagType } from '../types/enums';
import { Stat, GenericStat, MagazineCapacityStat, CritRateStat } from '../models/stats';
import { Loadout } from '../models/equipment';
import { BaseEffect } from '../models/effect';
import { Entity } from './entity';
import { DamageIntent } from './damage';

export class PlayerStats {
    public stats: Map<StatType, Stat> = new Map();

    constructor() {
        this.initialize();
    }

    private initialize() {
        this.stats.set(StatType.DamagePerProjectile, new GenericStat(StatType.DamagePerProjectile, 0));
        this.stats.set(StatType.FireRate, new GenericStat(StatType.FireRate, 0));
        this.stats.set(StatType.MagazineCapacity, new MagazineCapacityStat(0));
        this.stats.set(StatType.AttackPercent, new GenericStat(StatType.AttackPercent, 0));
        this.stats.set(StatType.CritRatePercent, new CritRateStat(0));
        this.stats.set(StatType.CritDamagePercent, new GenericStat(StatType.CritDamagePercent, 0));
        this.stats.set(StatType.WeakspotDamagePercent, new GenericStat(StatType.WeakspotDamagePercent, 0));
        this.stats.set(StatType.StatusDamagePercent, new GenericStat(StatType.StatusDamagePercent, 0));
        this.stats.set(StatType.ElementalDamagePercent, new GenericStat(StatType.ElementalDamagePercent, 0));
        this.stats.set(StatType.WeaponDamagePercent, new GenericStat(StatType.WeaponDamagePercent, 0));
        this.stats.set(StatType.KeywordCritRatePercent, new CritRateStat(0));
        this.stats.set(StatType.KeywordCritDamagePercent, new GenericStat(StatType.KeywordCritDamagePercent, 0));
        this.stats.set(StatType.KeywordTriggerChancePercent, new CritRateStat(0));
        this.stats.set(StatType.KeywordTriggerHitCount, new GenericStat(StatType.KeywordTriggerHitCount, 0));
        this.stats.set(StatType.DamageBonusNormal, new GenericStat(StatType.DamageBonusNormal, 0));
        this.stats.set(StatType.DamageBonusElite, new GenericStat(StatType.DamageBonusElite, 0));
        this.stats.set(StatType.DamageBonusBoss, new GenericStat(StatType.DamageBonusBoss, 0));
        this.stats.set(StatType.PsiIntensity, new GenericStat(StatType.PsiIntensity, 0));
        this.stats.set(StatType.VulnerabilityPercent, new GenericStat(StatType.VulnerabilityPercent, 0));
        this.stats.set(StatType.BurnDamagePercent, new GenericStat(StatType.BurnDamagePercent, 0));
        this.stats.set(StatType.FrostVortexDamagePercent, new GenericStat(StatType.FrostVortexDamagePercent, 0));
        this.stats.set(StatType.PowerSurgeDamagePercent, new GenericStat(StatType.PowerSurgeDamagePercent, 0));
        this.stats.set(StatType.ShrapnelDamagePercent, new GenericStat(StatType.ShrapnelDamagePercent, 0));
        this.stats.set(StatType.UnstableBomberDamagePercent, new GenericStat(StatType.UnstableBomberDamagePercent, 0));
        this.stats.set(StatType.BounceDamagePercent, new GenericStat(StatType.BounceDamagePercent, 0));
        this.stats.set(StatType.BullsEyeDamagePercent, new GenericStat(StatType.BullsEyeDamagePercent, 0));
        this.stats.set(StatType.MaxBurnStacks, new GenericStat(StatType.MaxBurnStacks, 5));
        this.stats.set(StatType.BurnDurationPercent, new GenericStat(StatType.BurnDurationPercent, 100));
    }

    reset(): void {
        this.stats.clear();
        this.initialize();
    }

    get(type: StatType): GenericStat | undefined {
        return this.stats.get(type);
    }

    snapshot(): Record<StatType, number> {
        const snap = {} as Record<StatType, number>;
        this.stats.forEach((stat, type) => {
            snap[type] = stat.value;
        });
        return snap;
    }

    applySnapshot(snap: Record<StatType, number>): void {
        this.stats.forEach((stat, type) => {
            if (snap[type] !== undefined) {
                stat.value = snap[type];
            }
        });
    }

    add(type: StatType, value: number): void {
        const stat = this.stats.get(type);
        if (stat) {
            stat.add(value);
        } else {
            this.stats.set(type, new GenericStat(type, value));
        }
    }
}

export class Player extends Entity {
    public flags: Map<FlagType, boolean> = new Map();

    constructor(
        public loadout: Loadout,
        public stats: PlayerStats,
        public currentHp: number,
        public activeEffects: BaseEffect[] = []
    ) {
        super('player-1', currentHp);
        Object.values(FlagType).forEach(flag => this.flags.set(flag, false));
    }

    hasFlag(flag: FlagType): boolean {
        return this.flags.get(flag) || false;
    }

    setFlag(flag: FlagType, value: boolean): void {
        this.flags.set(flag, value);
    }

    resetFlags(): void {
        this.flags.forEach((_, key) => this.flags.set(key, false));
    }

    takeDamage(_intent: DamageIntent, finalDamage: number, _isCrit: boolean, _isWeakspot: boolean): void {
        this.hp -= finalDamage;
    }

    isDead(): boolean {
        return this.hp <= 0;
    }
}
