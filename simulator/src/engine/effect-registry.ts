import { WeaponKey, KeywordType, StatType, DamageTrait } from '../types/enums';
import { BaseEffect, IncreaseStatEffect, ExplosionEffect, DoTEffect, ShrapnelEffect } from '../models/effect';
import { TriggeredEffect, OnKillTrigger, OnHitTrigger, ChanceCondition, HitCounterCondition, TargetAtMaxStatusStacksCondition } from '../models/trigger';
import { Keyword, Burn } from '../pipelines/keyword';

export interface WeaponBehavior {
    keywordOverride?: Keyword;
    intrinsicEffects: BaseEffect[];
    triggeredEffects: TriggeredEffect[];
}

export class EffectRegistry {
    private static behaviors: Partial<Record<WeaponKey, WeaponBehavior>> = {
        [WeaponKey.KVDBoomBoom]: {
            triggeredEffects: [
                new TriggeredEffect(
                    new OnKillTrigger(),
                    [
                        new ExplosionEffect(3.0, StatType.PsiIntensity, 2, "Blaze Explosion"),
                        new DoTEffect('status-burn', 'Burn', 0.5, 6, 1, 0.12, StatType.PsiIntensity, DamageTrait.Burn, StatType.MaxBurnStacks, StatType.BurnDurationPercent)
                    ]
                ),
                new TriggeredEffect(
                    new OnHitTrigger(),
                    [new ExplosionEffect(1.0, StatType.PsiIntensity, 1, "Pyro Dino Eruption")],
                    [new ChanceCondition(0.15)]
                )
            ],
            intrinsicEffects: []
        },
        [WeaponKey.DE50Jaws]: {
            triggeredEffects: [
                new TriggeredEffect(
                    new OnHitTrigger(),
                    [new ExplosionEffect(0.8, StatType.PsiIntensity, 0, "Unstable Bomber")],
                    [new HitCounterCondition(3, true)]
                )
            ],
            intrinsicEffects: []
        },
        [WeaponKey.SOCRLastValor]: {
            triggeredEffects: [
                new TriggeredEffect(
                    new OnHitTrigger(),
                    [new ShrapnelEffect()],
                    [new HitCounterCondition(4, true)]
                )
            ],
            intrinsicEffects: []
        },
        [WeaponKey.OctopusGrilledRings]: {
            keywordOverride: new Burn(KeywordType.Burn, 0.12, StatType.PsiIntensity, StatType.BurnDamagePercent, 0.50, true, false),
            intrinsicEffects: [
                new IncreaseStatEffect(StatType.BurnDamageFactor, 75),
                new IncreaseStatEffect(StatType.MaxBurnStacks, -3),
                new IncreaseStatEffect(StatType.KeywordCritRatePercent, 20),
                new IncreaseStatEffect(StatType.KeywordCritDamagePercent, 20)
            ],
            triggeredEffects: [
                new TriggeredEffect(
                    new OnHitTrigger(),
                    [new ExplosionEffect(1.5, StatType.PsiIntensity, 0.5, "Fire Ring")],
                    [new TargetAtMaxStatusStacksCondition('status-burn')]
                )
            ]
        }
    };

    static getWeaponBehavior(weaponId: string): WeaponBehavior {
        return this.behaviors[weaponId as WeaponKey] || {
            intrinsicEffects: [],
            triggeredEffects: []
        };
    }
}
