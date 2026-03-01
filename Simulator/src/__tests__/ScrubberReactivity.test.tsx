import { render, screen, fireEvent } from '@testing-library/react';
import { DamageDashboard } from '../components/DamageDashboard';
import { Player, PlayerStats } from '../models/player';
import { Loadout } from '../models/equipment';
import { EncounterConditions } from '../types/common';
import { createWeapon } from '../data/weapons';
import { createModInstance, DEFAULT_SUBSTATS } from '../data/mods';
import { ModKey, WeaponKey, StatType } from '../types/enums';

// Mock ResizeObserver for Radix/Shadcn components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('Simulation Scrubber Reactivity', () => {
    test('scrubber updates stats via onScrub callback during timeline navigation', () => {
        const onScrub = jest.fn();
        
        // Setup player with Momentum Up mod
        // Momentum Up gives +10% Fire Rate at high ammo, +30% Weapon DMG at low ammo
        const loadout = new Loadout();
        const momentumUp = createModInstance(ModKey.MomentumUp, DEFAULT_SUBSTATS);
        loadout.weapon = createWeapon(WeaponKey.DE50Jaws, 1, 1, 0, momentumUp);
        const player = new Player(loadout, new PlayerStats(), 100);
        const conditions = new EncounterConditions();

        render(
            <DamageDashboard 
                player={player} 
                conditions={conditions} 
                onScrub={onScrub} 
            />
        );

        // 1. Trigger the simulation
        const runButton = screen.getByText(/EXECUTE SIM/i);
        fireEvent.click(runButton);

        // 2. Verify we have simulation logs now
        expect(screen.getByText(/Simulation Timeline/i)).toBeInTheDocument();

        // 3. Find the scrubber (Radix UI Slider uses role="slider")
        const slider = screen.getByRole('slider');

        // 4. Scrub to the beginning (High ammo)
        // Note: Using KeyDown because fireEvent.change on Radix sliders often requires internal implementation details
        fireEvent.keyDown(slider, { key: 'Home' }); 
        
        // At start, Momentum Up should give +10 Fire Rate, 0 Weapon DMG
        expect(onScrub).toHaveBeenCalledWith(
            expect.objectContaining({
                [StatType.FireRate]: expect.any(Number),
                [StatType.WeaponDamagePercent]: 0
            }),
            expect.any(Array),
            expect.any(Array)
        );

        // 5. Scrub to the end (Low ammo)
        fireEvent.keyDown(slider, { key: 'End' });

        // At the end of the mag, Momentum Up should give 0 Fire Rate, +30 Weapon DMG
        expect(onScrub).toHaveBeenLastCalledWith(
            expect.objectContaining({
                [StatType.FireRate]: expect.any(Number),
                [StatType.WeaponDamagePercent]: 30
            }),
            expect.any(Array),
            expect.any(Array)
        );
    });
});
