import { StatType, FlagType } from '../types/enums';
import { Stat, GenericStat, MagazineCapacityStat, CritRateStat } from '../models/stats';
import { Loadout } from '../models/equipment';
import { Effect } from '../models/effect';

export class PlayerStats {
    public stats: Map<StatType, Stat> = new Map();

    constructor() {
        this.stats.set(StatType.DamagePerProjectile, new GenericStat(StatType.DamagePerProjectile, 0));
        this.stats.set(StatType.FireRate, new GenericStat(StatType.FireRate, 0));
        this.stats.set(StatType.MagazineCapacity, new MagazineCapacityStat(0));
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
        this.stats.set(StatType.BurnDamagePercent, new GenericStat(StatType.BurnDamagePercent, 0));
        this.stats.set(StatType.FrostVortexDamagePercent, new GenericStat(StatType.FrostVortexDamagePercent, 0));
        this.stats.set(StatType.PowerSurgeDamagePercent, new GenericStat(StatType.PowerSurgeDamagePercent, 0));
        this.stats.set(StatType.ShrapnelDamagePercent, new GenericStat(StatType.ShrapnelDamagePercent, 0));
        this.stats.set(StatType.UnstableBomberDamagePercent, new GenericStat(StatType.UnstableBomberDamagePercent, 0));
        this.stats.set(StatType.BounceDamagePercent, new GenericStat(StatType.BounceDamagePercent, 0));
    }

    get(type: StatType): GenericStat | undefined {
        return this.stats.get(type);
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

export class Player {
    public flags: Map<FlagType, boolean> = new Map();

    constructor(
        public loadout: Loadout,
        public stats: PlayerStats,
        public currentHp: number,
        public activeEffects: Effect[] = []
    ) {
        Object.values(FlagType).forEach(flag => this.flags.set(flag, false));
    }

    hasFlag(flag: FlagType): boolean {
        return this.flags.get(flag) || false;
    }

    setFlag(flag: FlagType, value: boolean): void {
        this.flags.set(flag, value);
    }
}
