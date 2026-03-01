import { EffectType, StatType, FlagType, EventTrigger } from '../types/enums';

export interface BaseEffect {
    type: EffectType;
    source?: string; // Origin of the effect (e.g., 'Weapon', 'Mod: Fateful Strike', 'Set: Lonewolf')
    durationSeconds?: number;
    maxStacks?: number;
    currentStacks?: number;
}

export interface IncreaseStatEffect extends BaseEffect {
    type: EffectType.IncreaseStat;
    stat: StatType;
    value: number;
}

export interface SetFlagEffect extends BaseEffect {
    type: EffectType.SetFlag;
    flag: FlagType;
    value: boolean;
}

export interface OnEventEffect extends BaseEffect {
    type: EffectType.OnEvent;
    event: EventTrigger;
    effects: Effect[];
}

export type Effect = IncreaseStatEffect | SetFlagEffect | OnEventEffect;
