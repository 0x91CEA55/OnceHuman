import { LegacyResolutionStrategy, RefinedResolutionStrategy, DamageResolutionStrategy } from './damage-resolution-strategy';

export enum ResolutionStrategyType {
    Legacy = 'legacy',
    Refined = 'refined'
}

export interface FormulaConfig {
    activeStrategy: ResolutionStrategyType;
}

const defaultConfig: FormulaConfig = {
    activeStrategy: ResolutionStrategyType.Refined
};

export class ConfigManager {
    private static config: FormulaConfig = { ...defaultConfig };

    static setStrategy(type: ResolutionStrategyType) {
        this.config.activeStrategy = type;
    }

    static getStrategy(): DamageResolutionStrategy {
        switch (this.config.activeStrategy) {
            case ResolutionStrategyType.Legacy:
                return new LegacyResolutionStrategy();
            case ResolutionStrategyType.Refined:
                return new RefinedResolutionStrategy();
            default:
                return new RefinedResolutionStrategy();
        }
    }

    static getActiveStrategyType(): ResolutionStrategyType {
        return this.config.activeStrategy;
    }
}
