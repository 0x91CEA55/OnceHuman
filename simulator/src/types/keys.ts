/**
 * Branded key types for trigger counters and cooldowns.
 * Prevents accidental key collisions via compile-time nominal typing.
 * Raw strings are only ever written inside the factory functions below.
 */

export type TriggerCounterKey = string & { readonly __brand: 'TriggerCounterKey' };
export type CooldownKey       = string & { readonly __brand: 'CooldownKey' };
export type DoTId             = string & { readonly __brand: 'DoTId' };
export type BuffId            = string & { readonly __brand: 'BuffId' };

export function triggerCounterKey(scope: string): TriggerCounterKey {
    return `trigger-counter:${scope}` as TriggerCounterKey;
}

export function cooldownKey(scope: string): CooldownKey {
    return `cooldown:${scope}` as CooldownKey;
}

export function dotId(id: string): DoTId   { return id as DoTId; }
export function buffId(id: string): BuffId { return id as BuffId; }
