export enum ResolutionStrategyType {
    Universal = 'universal'
}

export interface FormulaConfig {
    activeStrategy: ResolutionStrategyType;
}

const defaultConfig: FormulaConfig = {
    activeStrategy: ResolutionStrategyType.Universal
};

export class ConfigManager {
    private static config: FormulaConfig = { ...defaultConfig };

    static setStrategy(type: ResolutionStrategyType) {
        this.config.activeStrategy = type;
    }

    static getActiveStrategyType(): ResolutionStrategyType {
        return this.config.activeStrategy;
    }
}
