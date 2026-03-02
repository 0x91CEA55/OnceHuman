import { render, screen } from '@testing-library/react';
import { StatusHUD } from '../components/StatusHUD';

describe('StatusHUD Component', () => {
    const mockBuffs = [
        { id: 'momentum', name: 'Momentum Up', stacks: 1, remaining: 2.5 }
    ];
    const mockDots = [
        { id: 'burn', name: 'Burn', stacks: 5, remaining: 6.0, nextTick: 0.5 }
    ];

    test('renders active buffs and dots correctly', () => {
        render(<StatusHUD buffs={mockBuffs} dots={mockDots} />);
        
        expect(screen.getByText(/MOMENTUM UP/i)).toBeInTheDocument();
        expect(screen.getByText(/BURN/i)).toBeInTheDocument();
        // High density uses 0-padding
        expect(screen.getByText('05')).toBeInTheDocument();
        expect(screen.getByText('0.50Hz')).toBeInTheDocument(); // Next tick / Frequency
    });

    test('renders nothing when no statuses are provided', () => {
        const { container } = render(<StatusHUD buffs={[]} dots={[]} />);
        expect(container.firstChild).toBeNull();
    });
});
