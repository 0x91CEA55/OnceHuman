import { Player } from '../models/player';
import { EncounterConditions, ShotDamage } from '../types/common';
import { PhysicalDamagePipeline } from '../pipelines/physical';
import { KeywordDamagePipeline } from '../pipelines/keyword';
import { StatType, EventTrigger } from '../types/enums';
import { Effect } from '../models/effect';

export class DamageEngine {
    player: Player;
    conditions: EncounterConditions;
    physicalPipeline: PhysicalDamagePipeline;
    kwPipeline: KeywordDamagePipeline;

    constructor(player: Player, conditions: EncounterConditions) {
        this.player = player;
        this.conditions = conditions;
        this.physicalPipeline = new PhysicalDamagePipeline();
        this.kwPipeline = new KeywordDamagePipeline();
    }

    simulateMagDump(): number {
        let accumulatedExpectedDamage = 0;
        const magSize = this.player.stats.get(StatType.MagazineCapacity)?.value ?? 0;
        let bulletsLeft = magSize; 
        for (let bulletsLeft = magSize; bulletsLeft > 0; bulletsLeft--) {
            this.processActiveEffects();

            const shotResult = this.simulateShot(bulletsLeft);
            accumulatedExpectedDamage += shotResult.bulletDmg.expected;

            if (shotResult.kwProcDmg) {
                const kw = this.player.loadout.weapon?.keyword;
                const procTriggerChance = kw ? kw.getExpectedProcsPerShot(this.player, shotResult.bulletDmg) : 0;
                accumulatedExpectedDamage += (shotResult.kwProcDmg.expected * procTriggerChance);
            }

            this.advanceTime();
        }
        return accumulatedExpectedDamage;
    }

    simulateShot(bulletsLeft: number): ShotDamage {
        const bulletDmg = this.physicalPipeline.calculate(this.player, this.conditions);

        this.triggerEvent(EventTrigger.OnHit);

        let kwProcDmg: undefined | any = undefined;

        const kw = this.player.loadout.weapon?.keyword;
        if (kw && (kw.scalingFactor ?? 0) > 0) {
            kwProcDmg = this.kwPipeline.calculate(this.player, this.conditions);
        }

        return { bulletDmg, kwProcDmg };
    }

    processActiveEffects(): Effect[] { return []; }
    triggerEvent(eventName: EventTrigger) { }
    advanceTime() { }
}
