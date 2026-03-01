import { Player } from '../models/player';
import { EffectType, StatType } from '../types/enums';
import { SetArmor, Armor, KeyArmor } from '../models/equipment';
import { Effect, IncreaseStatEffect, SetFlagEffect } from '../models/effect';
import { auditLog } from './audit-log';

export class StatAggregator {
    static aggregate(player: Player): void {
        const { loadout, stats } = player;
        auditLog.clear();
        auditLog.log('Aggregation', 'Start', 'Resetting stats');

        // 2. Base Weapon Stats
        if (loadout.weapon) {
            const wStats = loadout.weapon.stats;
            const statsToAggregate = [
                { type: StatType.DamagePerProjectile, val: wStats.damagePerProjectile.value },
                { type: StatType.ProjectilesPerShot, val: wStats.projectilesPerShot.value },
                { type: StatType.FireRate, val: wStats.fireRate.value },
                { type: StatType.MagazineCapacity, val: wStats.magazineCapacity.value },
                { type: StatType.CritRatePercent, val: wStats.critRatePercent.value },
                { type: StatType.CritDamagePercent, val: wStats.critDamagePercent.value },
                { type: StatType.WeakspotDamagePercent, val: wStats.weakspotDamagePercent.value }
            ];

            for (const s of statsToAggregate) {
                stats.add(s.type, s.val);
                auditLog.log('Weapon', `Base ${s.type}`, s.val);
            }
        }

        // 3. Collect Effects from all equipment and mods
        const activeEffects: Effect[] = [];
        const armorPieces: Armor[] = [];
        
        if (loadout.weapon) {
            const weaponIntrinsic = loadout.weapon.intrinsicEffects.map((e: Effect) => ({ ...e, source: `Weapon: ${loadout.weapon!.name}` }));
            activeEffects.push(...weaponIntrinsic);

            if (loadout.weapon.mod) {
                const modEffects = loadout.weapon.mod.effects.map((e: Effect) => ({ ...e, source: `Weapon Mod: ${loadout.weapon!.mod!.name}` }));
                activeEffects.push(...modEffects);
                auditLog.log('Mod', `Weapon Mod: ${loadout.weapon.mod.name}`, modEffects.length + ' effects');
            }
        }
        
        const slots: (keyof typeof loadout)[] = ['helmet', 'mask', 'top', 'gloves', 'pants', 'boots'];
        for (const slot of slots) {
            const piece = loadout[slot] as Armor | undefined;
            if (piece) {
                armorPieces.push(piece);
                
                // Add base armor stats (Psi Intensity)
                if (piece.stats.psiIntensity) {
                    stats.add(StatType.PsiIntensity, piece.stats.psiIntensity.value);
                    auditLog.log('Armor', `${slot} Base Psi Intensity`, piece.stats.psiIntensity.value);
                }

                if (piece instanceof KeyArmor) {
                    const intrinsic = piece.intrinsicEffects.map((e: Effect) => ({ ...e, source: `Armor: ${piece.name}` }));
                    activeEffects.push(...intrinsic);
                }

                if (piece.mod) {
                    const modEffects = piece.mod.effects.map((e: Effect) => ({ ...e, source: `${slot.charAt(0).toUpperCase() + slot.slice(1)} Mod: ${piece.mod!.name}` }));
                    activeEffects.push(...modEffects);
                    auditLog.log('Mod', `${slot} Mod: ${piece.mod.name}`, modEffects.length + ' effects');
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
                    const setEffects = bonus.effects.map((e: Effect) => ({ ...e, source: `Set: ${set.name} (${bonus.requiredPieces}pc)` }));
                    activeEffects.push(...setEffects);
                    auditLog.log('SetBonus', `${set.name} (${count}pc)`, `${bonus.effects.length} effects active`);
                }
            }
        }

        // 5. Apply all collected effects
        for (const effect of activeEffects) {
            switch (effect.type) {
                case EffectType.IncreaseStat:
                    const increase = effect as IncreaseStatEffect;
                    stats.add(increase.stat, increase.value);
                    auditLog.log('Effect', `Increase ${increase.stat} (${effect.source})`, `+${increase.value}`);
                    break;
                case EffectType.SetFlag:
                    const setFlag = effect as SetFlagEffect;
                    player.setFlag(setFlag.flag, setFlag.value);
                    auditLog.log('Effect', `Set Flag ${setFlag.flag} (${effect.source})`, setFlag.value);
                    break;
            }
        }
        
        player.activeEffects = activeEffects;
        auditLog.log('Aggregation', 'Complete', `${activeEffects.length} total effects processed`);
    }
}
