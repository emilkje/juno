/**
 * ConfigurationError is a sub-class of Error to be thrown 
 * when there is a problem in configuration related process.
 *
 * @export
 * @class ConfigurationError
 * @extends {Error}
 */
export class ConfigurationError extends Error {
    /**
     * Creates an instance of ConfigurationError.
     * @param {string} message The error message.
     * @param {string} settingsKey The key of the configuration setting that caused the error.
     * @memberof ConfigurationError
     */
    constructor(message:string, public settingsKey:string) {
        super(message);
    }
}

/**
 * ConfigurationMissingError is a sub-class of ConfigurationError to be thrown 
 * when a required configuration is missing.
 *
 * @export
 * @class ConfigurationMissingError
 * @extends {ConfigurationError}
 */
export class ConfigurationMissingError extends ConfigurationError {
    /**
     * Creates an instance of ConfigurationMissingError.
     * @param {string} settingsKey The key of the missing configuration setting.
     * @param {string} friendlyName A human readable name for the setting.
     * @memberof ConfigurationMissingError
     */
    constructor(settingsKey:string, friendlyName:string) {
        super(`Missing setting: ${friendlyName}`, settingsKey);
    }
}

/**
 * AggregateConfigurationMissingError is a class which encapsulates and holds multiple ConfigurationMissingError.
 * It's typically thrown when there are several configurations missing
 *
 * @export
 * @class AggregateConfigurationMissingError
 * @extends {Error}
 */
export class AggregateConfigurationMissingError extends Error {
    /**
     * Creates an instance of AggregateConfigurationMissingError.
     * @param {ConfigurationMissingError[]} configs An array of ConfigurationMissingError instances.
     * @memberof AggregateConfigurationMissingError
     */
    constructor(public configs:ConfigurationMissingError[]) {
        super();
    }
}