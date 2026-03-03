export const TIER_MULTIPLIERS: Record<number, number> = {
    1: 0.172,
    2: 0.35,
    3: 0.55,
    4: 0.75,
    5: 1.00
};

export class ScalingEngine {
    /**
     * Calculates the final base damage for a weapon based on its level (tier), 
     * star rating, and calibration.
     * 
     * @param baseline The raw damage from the weapon's blueprint (usually Level 50, Star 1)
     * @param star The star rating (1-6)
     * @param level The tier level (1-5)
     * @param calibrationMultiplier The multiplier from calibration (e.g. 1.2 for +20%)
     */
    static calculateFinalBaseDamage(
        baseline: number, 
        star: number, 
        level: number, 
        calibrationMultiplier: number
    ): number {
        const starMultiplier = 1 + (star - 1) * 0.05;
        const tierMultiplier = TIER_MULTIPLIERS[level] || 1.0;
        
        return baseline * starMultiplier * tierMultiplier * calibrationMultiplier;
    }
}
