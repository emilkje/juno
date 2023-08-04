
export class ConfigurationError extends Error {
    constructor(message:string, public settingsKey:string) {
        super(message);
    }
}

export class ConfigurationMissingError extends ConfigurationError {
    constructor(settingsKey:string, friendlyName:string) {
        super(`Missing setting: ${friendlyName}`, settingsKey);
    }
}

export class AggregateConfigurationMissingError extends Error {
    constructor(public configs:ConfigurationMissingError[]) {
        super()
    }
}