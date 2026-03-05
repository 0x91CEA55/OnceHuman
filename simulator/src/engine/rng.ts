/**
 * ADR-003: Deterministic RNG Service
 *
 * All probabilistic events (Crits, Weakspots, Procs) MUST use this service
 * to ensure simulation reproducibility (Monte Carlo seeds).
 */

export interface RngService {
    /** Returns a random float in [0.0, 1.0). */
    next(): number;
}

/** Default implementation using Math.random(). */
export class MathRandomRng implements RngService {
    next(): number {
        return Math.random();
    }
}

/** Deterministic implementation for testing. Returns values from a fixed sequence. */
export class FixedRng implements RngService {
    private index = 0;
    constructor(private values: number[]) {}

    next(): number {
        const val = this.values[this.index % this.values.length];
        this.index++;
        return val;
    }
}

/** 
 * Seeded implementation for Monte Carlo simulation reproducibility.
 * Simple Mulberry32 algorithm.
 */
export class SeededRng implements RngService {
    private state: number;
    constructor(seed: number) {
        this.state = seed;
    }

    next(): number {
        this.state |= 0;
        this.state = (this.state + 0x6D2B79F5) | 0;
        let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}
