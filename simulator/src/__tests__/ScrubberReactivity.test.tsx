import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DamageDashboard } from '../components/DamageDashboard';
import { World } from '../ecs/world';
import { createWeaponComponent, createModComponent } from '../ecs/factories';
import { LoadoutComponent } from '../ecs/types';
import { EncounterConditions } from '../types/common';
import { DEFAULT_SUBSTATS } from '../data/mods';
import { ModKey, WeaponKey, StatType, AmmunitionType } from '../types/enums';

// Mock ResizeObserver for Radix/Shadcn components
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

describe('Simulation Scrubber Reactivity', () => {
    test('scrubber updates stats via onScrub callback during timeline navigation', async () => {
        const onScrub = jest.fn();

        const world = new World();
        const playerId = world.createEntity('player');
        const conditions = new EncounterConditions();

        const momentumUp = createModComponent(ModKey.MomentumUp, DEFAULT_SUBSTATS as any);
        const weapon = createWeaponComponent(
            WeaponKey.DE50Jaws,
            1, // star
            1, // tier
            0, // calibrationLevel
            'none' as any, // style
            0, // bonus
            StatType.CritDamagePercent, // secondary
            0, // secondaryVal
            momentumUp
        );

        const loadout: LoadoutComponent = { weapon };
        world.addComponent(playerId, 'loadout', loadout);
        world.addComponent(playerId, 'stats', { snapshot: {} as Record<StatType, number> });
        world.addComponent(playerId, 'flags', { activeFlags: new Set() });
        world.addComponent(playerId, 'status', { activeBuffs: [], activeDoTs: [] });
        world.addComponent(playerId, 'resources', {
            sanity: conditions.playerSanity,
            maxSanity: conditions.maxPlayerSanity,
            deviantPower: conditions.playerDeviantPower,
            maxDeviantPower: conditions.maxPlayerDeviantPower
        });

        render(
            <DamageDashboard
                world={world}
                playerId={playerId}
                conditions={conditions}
                selectedAmmunition={AmmunitionType.Copper}
                onScrub={onScrub}
            />
        );

        // 1. Trigger the simulation
        // Label changed from EXECUTE SIM to EXECUTE RUN
        const runButton = screen.getByText(/EXECUTE RUN/i);
        fireEvent.click(runButton);

        // 2. Wait for simulation to complete
        await waitFor(() => {
            const tabs = screen.getAllByText(/01. TIMELINE/i);
            expect(tabs.length).toBeGreaterThan(0);
        }, { timeout: 5000 });

        // 3. Find the scrubber (Radix UI Slider uses role="slider")
        const slider = screen.getByRole('slider');

        // 4. Scrub to the beginning (High ammo)
        fireEvent.keyDown(slider, { key: 'Home' });

        // At start, Momentum Up should give +10 Fire Rate, 0 Weapon DMG
        await waitFor(() => {
            expect(onScrub).toHaveBeenCalledWith(
                expect.objectContaining({
                    [StatType.WeaponDamagePercent]: 0
                }),
                expect.any(Array),
                expect.any(Array),
                expect.any(Number)
            );
        });

        // 5. Scrub to the end (Low ammo)
        fireEvent.keyDown(slider, { key: 'End' });

        // At the end of the mag, Momentum Up should give 0 Fire Rate, +30 Weapon DMG
        await waitFor(() => {
            expect(onScrub).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    [StatType.WeaponDamagePercent]: 30
                }),
                expect.any(Array),
                expect.any(Array),
                expect.any(Number)
            );
        });
    });
});
