/**
 * RNG service interface + implementations.
 *
 * Injecting RNG via this interface makes all probabilistic decisions
 * (ChanceCondition, crit rolls, weakspot rolls) deterministically replayable
 * when a SeededRng is provided. The default MathRandomRng delegates to
 * Math.random() for normal simulation runs.
 */

export interface RngService {
    /** Returns a float in [0, 1). */
    next(): number;
}

/** Default implementation — delegates to Math.random(). */
export class MathRandomRng implements RngService {
    next(): number { return Math.random(); }
}

/**
 * Mulberry32 seeded PRNG — fast, good distribution, simple state.
 * Produces a deterministic sequence from a 32-bit integer seed.
 *
 * Use case: Monte Carlo iterations — pass a per-iteration seed derived
 * from a master seed so each iteration is independently reproducible.
 */
export class SeededRng implements RngService {
    private state: number;

    constructor(seed: number) {
        this.state = seed >>> 0; // Ensure unsigned 32-bit
    }

    next(): number {
        this.state = (this.state + 0x6D2B79F5) >>> 0;
        let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /** Returns a clone at the current state — useful for snapshot/restore. */
    clone(): SeededRng {
        return new SeededRng(this.state);
    }
}
