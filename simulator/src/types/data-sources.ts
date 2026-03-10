import { z } from 'zod';

export const RawEffectSchema: z.ZodType<any> = z.lazy(() => z.object({
    type: z.string(),
    event: z.string().optional(),
    chance_percent: z.number().optional(),
    n: z.number().optional(),
    effects: z.array(RawEffectSchema).optional(),
    ability: z.string().optional(),
    damage_formula: z.object({
        type: z.string(),
        multiplier: z.number(),
    }).optional(),
    stat: z.string().optional(),
    value: z.any().optional(),
    flag: z.string().optional(),
    condition: z.string().optional(),
    duration_seconds: z.number().optional(),
    max_stacks: z.number().optional(),
    required_items: z.number().optional(),
}).catchall(z.unknown()));

export type RawEffect = z.infer<typeof RawEffectSchema>;

export const RawWeaponBaseStatsSchema = z.object({
    damage_per_projectile: z.number(),
    projectiles_per_shot: z.number(),
    fire_rate: z.number(),
    magazine_capacity: z.number(),
    crit_rate_percent: z.number(),
    weakspot_damage_percent: z.number(),
    crit_damage_percent: z.number(),
    stability: z.number().optional(),
    accuracy: z.number().optional(),
    range: z.number().optional(),
    reload_time_seconds: z.number().optional(),
    reload_speed_points: z.number().optional(),
});

export type RawWeaponBaseStats = z.infer<typeof RawWeaponBaseStatsSchema>;

export const RawWeaponDataSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    rarity: z.string(),
    base_stats: RawWeaponBaseStatsSchema,
    mechanics: z.object({
        description: z.string().optional(),
        effects: z.array(RawEffectSchema).optional(),
    }),
    description: z.string().optional(),
    blueprint_fragment_type: z.string().optional(),
    damage_bonus: z.union([
        z.string(),
        z.object({
            type: z.string(),
            target: z.string(),
            value: z.number(),
        })
    ]).optional(),
});

export type RawWeaponData = z.infer<typeof RawWeaponDataSchema>;

export const RawWeaponListSchema = z.object({
    weapons: z.array(RawWeaponDataSchema),
});

export type RawWeaponList = z.infer<typeof RawWeaponListSchema>;

// Armor Data Schemas
export const RawArmorDataSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    rarity: z.string(),
    set_id: z.string().optional(),
    effects: z.array(RawEffectSchema).optional(),
});

export type RawArmorData = z.infer<typeof RawArmorDataSchema>;

export const RawArmorSetBonusSchema = z.object({
    required_items: z.number(),
    effects: z.array(RawEffectSchema),
});

export const RawArmorSetDataSchema = z.object({
    set_id: z.string(),
    name: z.string(),
    max_items: z.number(),
    bonuses: z.array(RawArmorSetBonusSchema),
});

export type RawArmorSetData = z.infer<typeof RawArmorSetDataSchema>;

// Mod Data Schemas
export const RawModDataSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    effects: z.array(RawEffectSchema),
    type: z.string().optional(), // weapon, helmet, etc.
});

export type RawModData = z.infer<typeof RawModDataSchema>;
