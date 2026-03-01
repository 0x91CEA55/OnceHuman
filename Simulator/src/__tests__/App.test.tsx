import { render, screen } from '@testing-library/react';
import App from '../App';

// Mock ResizeObserver which is used by Radix UI / Shadcn
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock PointerEvent which is used by Radix UI
if (!global.PointerEvent) {
  class PointerEvent extends MouseEvent {
    constructor(type: string, params: any = {}) {
      super(type, params);
    }
  }
  global.PointerEvent = PointerEvent as any;
}

describe('App Component Smoke Test', () => {
    test('renders the application header', () => {
        render(<App />);
        expect(screen.getByText(/ONCE HUMAN/i)).toBeInTheDocument();
        // There are multiple "SIMULATOR" texts, just ensure at least one is there
        expect(screen.getAllByText(/SIMULATOR/i).length).toBeGreaterThan(0);
    });

    test('renders the encounter setup card', () => {
        render(<App />);
        // Use getAllByText because it might appear in title and description
        expect(screen.getAllByText(/ENCOUNTER CONFIG/i).length).toBeGreaterThan(0);
    });

    test('renders the loadout planner', () => {
        render(<App />);
        expect(screen.getAllByText(/LOADOUT PLANNER/i).length).toBeGreaterThan(0);
    });
});
