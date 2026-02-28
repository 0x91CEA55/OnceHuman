import { Player } from '../models/player';
import { EffectType, StatType } from '../types/enums';
import { SetArmor, Armor } from '../models/equipment';
import { Effect, IncreaseStatEffect, SetFlagEffect } from '../models/effect';

export class StatAggregator {
    static aggregate(player: Player): void {
        const { loadout, stats } = player;

        // 1. Reset stats to zero (optional if PlayerStats constructor handles it, but safe for re-aggregation)
        // Since PlayerStats initializes with 0, we'll just add to them.
        // For a clean aggregation, we should probably reset them first.
        // But for now, let's assume aggregate is called on a fresh PlayerStats.

        // 2. Base Weapon Stats
        if (loadout.weapon) {
            const wStats = loadout.weapon.stats;
            stats.add(StatType.DamagePerProjectile, wStats.damagePerProjectile.value);
            stats.add(StatType.ProjectilesPerShot, wStats.projectilesPerShot.value);
            stats.add(StatType.FireRate, wStats.fireRate.value);
            stats.add(StatType.MagazineCapacity, wStats.magazineCapacity.value);
            stats.add(StatType.CritRatePercent, wStats.critRatePercent.value);
            stats.add(StatType.CritDamagePercent, wStats.critDamagePercent.value);
            stats.add(StatType.WeakspotDamagePercent, wStats.weakspotDamagePercent.value);
        }

        // 3. Collect Effects from all equipment and mods
        const activeEffects: Effect[] = [];
        const armorPieces: Armor[] = [];
        
        if (loadout.weapon) activeEffects.push(...loadout.weapon.getActiveEffects(loadout));
        
        const slots: (keyof typeof loadout)[] = ['helmet', 'mask', 'top', 'gloves', 'pants', 'boots'];
        for (const slot of slots) {
            const piece = loadout[slot] as Armor | undefined;
            if (piece) {
                activeEffects.push(...piece.getActiveEffects(loadout));
                armorPieces.push(piece);
                
                // Add base armor stats (Psi Intensity)
                if (piece.stats.psiIntensity) {
                    stats.add(StatType.PsiIntensity, piece.stats.psiIntensity.value);
                }
            }
        }

        // 4. Armor Set Bonuses
        const setCounts = new Map<string, { count: number, set: any }>();
        for (const piece of armorPieces) {
            if (piece instanceof SetArmor) {
                const setId = piece.armorSet.id;
                const current = setCounts.get(setId) || { count: 0, set: piece.armorSet };
                setCounts.set(setId, { count: current.count + 1, set: current.set });
            }
        }

        for (const { count, set } of setCounts.values()) {
            for (const bonus of set.bonuses) {
                if (count >= bonus.requiredPieces) {
                    activeEffects.push(...bonus.effects);
                }
            }
        }

        // 5. Apply all collected effects
        for (const effect of activeEffects) {
            switch (effect.type) {
                case EffectType.IncreaseStat:
                    stats.add((effect as IncreaseStatEffect).stat, (effect as IncreaseStatEffect).value);
                    break;
                case EffectType.SetFlag:
                    player.setFlag((effect as SetFlagEffect).flag, (effect as SetFlagEffect).value);
                    break;
                // OnEvent and Conditional effects are handled by the DamageEngine during simulation
            }
        }
        
        // Store final active effects for the engine to use later
        player.activeEffects = activeEffects;
    }
}
