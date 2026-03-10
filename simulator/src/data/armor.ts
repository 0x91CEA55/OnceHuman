import { ArmorSlot, Rarity, StatType, ArmorKey, ArmorSetKey, FlagType } from '../types/enums';
import { IncreaseStatEffect, SetFlagEffect, ConditionalEffect } from '../ecs/effects';
import { AggregationContext } from '../types/common';
import { ArmorData, ArmorSetData } from '../types/materialization';
import { TriggerType, DynEffectType, EffectTargetType } from '../types/trigger-types';
import { triggerCounterKey } from '../types/keys';
import { LONE_SHADOW_BUFF } from './status-registry';

const SELF = { type: EffectTargetType.Self } as const;

export const ARMOR_SETS: Record<ArmorSetKey, ArmorSetData> = {
    [ArmorSetKey.Lonewolf]: {
        id: ArmorSetKey.Lonewolf,
        name: 'Lonewolf Set',
        bonuses: [
            { requiredPieces: 1, effects: [new IncreaseStatEffect(StatType.MagazineCapacity, 10)] },
            { requiredPieces: 2, effects: [new IncreaseStatEffect(StatType.CritRatePercent, 5)] },
            { 
                requiredPieces: 3, 
                effects: [], 
                triggerDefinitions: [
                    {
                        id: 'set:lonewolf:3pc-lone-shadow',
                        trigger: {
                            type: TriggerType.EveryNCrits,
                            n: 2,
                            counterKey: triggerCounterKey('set:lonewolf:lone-shadow-counter'),
                        },
                        conditions: [],
                        effects: [{ type: DynEffectType.ApplyBuff, buffId: LONE_SHADOW_BUFF.id, target: SELF }],
                    }
                ]
            },
            { requiredPieces: 4, effects: [new IncreaseStatEffect(StatType.CritRatePercent, 8)] }, 
        ]
    },
    [ArmorSetKey.Bastille]: {
        id: ArmorSetKey.Bastille,
        name: 'Bastille Set',
        bonuses: [
            { requiredPieces: 1, effects: [new IncreaseStatEffect(StatType.WeaponDamagePercent, 10)] },
            { requiredPieces: 2, effects: [new IncreaseStatEffect(StatType.AttackPercent, 5)] },
            { requiredPieces: 3, effects: [new IncreaseStatEffect(StatType.WeaponDamagePercent, 40)] }, // Bastille State simplified
        ]
    },
    [ArmorSetKey.Savior]: {
        id: ArmorSetKey.Savior,
        name: 'Savior Set',
        bonuses: [
            { requiredPieces: 2, effects: [
                new ConditionalEffect(
                    (ctx: AggregationContext) => (ctx.player.stats.get(StatType.ShieldPercent)?.value ?? 0) > 0,
                    [
                        new IncreaseStatEffect(StatType.WeaponDamagePercent, 10),
                        new IncreaseStatEffect(StatType.StatusDamagePercent, 10)
                    ]
                )
            ]},
            { requiredPieces: 3, effects: [
                new IncreaseStatEffect(StatType.WeaponDamagePercent, 20), // 5% * 4 stacks (simplified to max)
                new IncreaseStatEffect(StatType.StatusDamagePercent, 20)
            ]}
        ]
    },
    [ArmorSetKey.Treacherous]: {
        id: ArmorSetKey.Treacherous,
        name: 'Treacherous Tides Set',
        bonuses: [
            { requiredPieces: 2, effects: [
                new ConditionalEffect(
                    (ctx: AggregationContext) => ctx.conditions.playerHpPercent < 70,
                    [
                        new IncreaseStatEffect(StatType.WeaponDamagePercent, 12),
                        new IncreaseStatEffect(StatType.StatusDamagePercent, 12)
                    ]
                )
            ]},
            { requiredPieces: 3, effects: [
                // 10% base + up to 18% additional based on sanity
                new IncreaseStatEffect(StatType.WeaponDamagePercent, 10),
                new IncreaseStatEffect(StatType.StatusDamagePercent, 10),
                new ConditionalEffect(
                    (ctx: AggregationContext) => (ctx.resources.sanity / ctx.resources.maxSanity * 100) < 50,
                    [
                        new IncreaseStatEffect(StatType.WeaponDamagePercent, 18),
                        new IncreaseStatEffect(StatType.StatusDamagePercent, 18)
                    ]
                )
            ]}
        ]
    }
};

export const ARMOR: Record<ArmorKey, ArmorData> = {
    [ArmorKey.LonewolfHood]: { id: ArmorKey.LonewolfHood, name: 'Lonewolf Hood', slot: ArmorSlot.Helmet, rarity: Rarity.Legendary, setKey: ArmorSetKey.Lonewolf },
    [ArmorKey.LonewolfMask]: { id: ArmorKey.LonewolfMask, name: 'Lonewolf Mask', slot: ArmorSlot.Mask, rarity: Rarity.Legendary, setKey: ArmorSetKey.Lonewolf },
    [ArmorKey.LonewolfJacket]: { id: ArmorKey.LonewolfJacket, name: 'Lonewolf Jacket', slot: ArmorSlot.Top, rarity: Rarity.Legendary, setKey: ArmorSetKey.Lonewolf },
    [ArmorKey.LonewolfGloves]: { id: ArmorKey.LonewolfGloves, name: 'Lonewolf Gloves', slot: ArmorSlot.Gloves, rarity: Rarity.Legendary, setKey: ArmorSetKey.Lonewolf },
    [ArmorKey.LonewolfPants]: { id: ArmorKey.LonewolfPants, name: 'Lonewolf Pants', slot: ArmorSlot.Pants, rarity: Rarity.Legendary, setKey: ArmorSetKey.Lonewolf },
    [ArmorKey.LonewolfShoes]: { id: ArmorKey.LonewolfShoes, name: 'Lonewolf Shoes', slot: ArmorSlot.Boots, rarity: Rarity.Legendary, setKey: ArmorSetKey.Lonewolf },
    
    [ArmorKey.Beret]: { 
        id: ArmorKey.Beret, 
        name: 'Beret', 
        slot: ArmorSlot.Helmet, 
        rarity: Rarity.Legendary, 
        intrinsicEffects: [new IncreaseStatEffect(StatType.ShrapnelDamageFactor, 10)] 
    },
    [ArmorKey.OasisMask]: { 
        id: ArmorKey.OasisMask, 
        name: 'Oasis Mask', 
        slot: ArmorSlot.Mask, 
        rarity: Rarity.Legendary, 
        intrinsicEffects: [new IncreaseStatEffect(StatType.AttackPercent, 10)] 
    },
    [ArmorKey.GildedGloves]: {
        id: ArmorKey.GildedGloves,
        name: 'Gilded Gloves',
        slot: ArmorSlot.Gloves,
        rarity: Rarity.Legendary,
        intrinsicEffects: [
            new SetFlagEffect(FlagType.KeywordCanCrit, true),
            new IncreaseStatEffect(StatType.KeywordCritRatePercent, 20),
            new IncreaseStatEffect(StatType.KeywordCritDamagePercent, 20)
        ]
    },
    [ArmorKey.BBQGloves]: {
        id: ArmorKey.BBQGloves,
        name: 'BBQ Gloves',
        slot: ArmorSlot.Gloves,
        rarity: Rarity.Epic,
        intrinsicEffects: [
            new IncreaseStatEffect(StatType.BurnFrequencyPercent, 100)
        ]
    },

    // Savior Set
    [ArmorKey.SaviorHelmet]: { id: ArmorKey.SaviorHelmet, name: 'Savior Helmet', slot: ArmorSlot.Helmet, rarity: Rarity.Legendary, setKey: ArmorSetKey.Savior },
    [ArmorKey.SaviorMask]: { id: ArmorKey.SaviorMask, name: 'Savior Mask', slot: ArmorSlot.Mask, rarity: Rarity.Legendary, setKey: ArmorSetKey.Savior },
    [ArmorKey.SaviorTop]: { id: ArmorKey.SaviorTop, name: 'Savior Top', slot: ArmorSlot.Top, rarity: Rarity.Legendary, setKey: ArmorSetKey.Savior },
    [ArmorKey.SaviorGloves]: { id: ArmorKey.SaviorGloves, name: 'Savior Gloves', slot: ArmorSlot.Gloves, rarity: Rarity.Legendary, setKey: ArmorSetKey.Savior },
    [ArmorKey.SaviorPants]: { id: ArmorKey.SaviorPants, name: 'Savior Pants', slot: ArmorSlot.Pants, rarity: Rarity.Legendary, setKey: ArmorSetKey.Savior },
    [ArmorKey.SaviorBoots]: { id: ArmorKey.SaviorBoots, name: 'Savior Boots', slot: ArmorSlot.Boots, rarity: Rarity.Legendary, setKey: ArmorSetKey.Savior },

    // Treacherous Set
    [ArmorKey.TreacherousHelmet]: { id: ArmorKey.TreacherousHelmet, name: 'Treacherous Helmet', slot: ArmorSlot.Helmet, rarity: Rarity.Legendary, setKey: ArmorSetKey.Treacherous },
    [ArmorKey.TreacherousMask]: { id: ArmorKey.TreacherousMask, name: 'Treacherous Mask', slot: ArmorSlot.Mask, rarity: Rarity.Legendary, setKey: ArmorSetKey.Treacherous },
    [ArmorKey.TreacherousTop]: { id: ArmorKey.TreacherousTop, name: 'Treacherous Top', slot: ArmorSlot.Top, rarity: Rarity.Legendary, setKey: ArmorSetKey.Treacherous },
    [ArmorKey.TreacherousGloves]: { id: ArmorKey.TreacherousGloves, name: 'Treacherous Gloves', slot: ArmorSlot.Gloves, rarity: Rarity.Legendary, setKey: ArmorSetKey.Treacherous },
    [ArmorKey.TreacherousPants]: { id: ArmorKey.TreacherousPants, name: 'Treacherous Pants', slot: ArmorSlot.Pants, rarity: Rarity.Legendary, setKey: ArmorSetKey.Treacherous },
    [ArmorKey.TreacherousBoots]: { id: ArmorKey.TreacherousBoots, name: 'Treacherous Boots', slot: ArmorSlot.Boots, rarity: Rarity.Legendary, setKey: ArmorSetKey.Treacherous },
};
