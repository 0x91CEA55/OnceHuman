export interface RawWeaponBaseStats {
    damage_per_projectile: number;
    projectiles_per_shot: number;
    fire_rate: number;
    magazine_capacity: number;
    crit_rate_percent: number;
    weakspot_damage_percent: number;
    crit_damage_percent: number;
    stability?: number;
    accuracy?: number;
    range?: number;
    reload_time_seconds?: number;
    reload_speed_points?: number;
}

export interface RawEffect {
    type: string;
    event?: string;
    chance_percent?: number;
    n?: number;
    effects?: RawEffect[];
    ability?: string;
    damage_formula?: {
        type: string;
        multiplier: number;
    };
    [key: string]: any;
}

export interface RawWeaponData {
    id: string;
    name: string;
    type: string;
    rarity: string;
    base_stats: RawWeaponBaseStats;
    mechanics: {
        description: string;
        effects?: RawEffect[];
    };
    description: string;
    blueprint_fragment_type?: string;
    damage_bonus?: string | {
        type: string;
        target: string;
        value: number;
    };
}

export interface RawWeaponList {
    weapons: RawWeaponData[];
}
