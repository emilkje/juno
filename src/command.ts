import * as vscode from 'vscode';
import { AggregateConfigurationMissingError, ConfigurationError, ConfigurationMissingError } from '@juno/errors';

type CommandHandler = (ctx: vscode.ExtensionContext, ...args: any[]) => void | Promise<void>;

/**
 * Represents a command that can be registered with the VS Code command registry.
 */
export default class Command {

    constructor(private _name: string, private _fn: CommandHandler) {
    }

    /**
     * Registers itself to the vscode command registry
     * @param ctx vscode extension context
     */
    register(ctx: vscode.ExtensionContext) {
        ctx.subscriptions.push(
            vscode.commands.registerCommand(
                this._name,
                // bind the extension context as the first argument 
                // to the CommandHandler so that it can access it
                this._fn.bind(this._fn, ctx)
            )
        );
    }

    name(): string {
        return this._name;
    }
}

/**
 * Wraps a command handler function with try-catch to handle errors.
 * @param originalFn The original command handler function.
 * @returns The wrapped command handler function.
 */
function wrapWithTryCatch(originalFn: CommandHandler): CommandHandler {
    return async function (ctx: vscode.ExtensionContext, ...args: any[]) {
        try {
            await ensureHealthyState();
            return await originalFn.apply(originalFn, [ctx, ...args]);
        } catch (error) {
            if (error instanceof ConfigurationError) {
                const settingsKey = error.settingsKey;
                vscode.window.showWarningMessage(
                    error.message, 
                    "Open Settings")
                    .then((choices) => {
                        if (choices === "Open Settings") {
                            vscode.commands.executeCommand(
                                "workbench.action.openSettings", 
                                settingsKey);
                        }
                    });
            }
            else if (error instanceof AggregateConfigurationMissingError) {
                for(const config of error.configs) {
                    showMissingErrorDialogue(config.settingsKey, config.message);
                }
            }
            else if(error instanceof Error) {
                vscode.window.showErrorMessage(error.message);
                console.error(error);
            } 
        }
    };
}

/**
 * Shows a warning message dialog for a missing configuration.
 * @param key The settings key for the missing configuration.
 * @param friendlyName The friendly name for the missing configuration.
 */
function showMissingErrorDialogue(key: string, friendlyName: string) {
    vscode.window.showWarningMessage(
        `Configuration Missing: ${friendlyName}`,
        "Open Settings")
        .then((choices) => {
            if (choices === "Open Settings") {
                vscode.commands.executeCommand(
                    "workbench.action.openSettings",
                    key);
            }
        });
}

/**
 * The namespace for the settings used by the extension.
 */
const SETTINGS_NAMESPACE = "juno";

/**
 * The required settings and their friendly names.
 */
const requiredSettings: Record<string, string> = {
    "apiKey": "OpenAI API Key"
};

/**
 * Ensures that the extension is in a healthy state.
 */
async function ensureHealthyState() {

    await ensureNoMissingSettings();
}

/**
 * Ensures that all required settings are present in the extension's configuration.
 * Throws an `AggregateConfigurationMissingError` if any required setting is missing.
 */
async function ensureNoMissingSettings() {
    // create an array to hold the configuration errors
    const errors: ConfigurationMissingError[] = [];

    // iterate through each required setting
    for (const key of Object.keys(requiredSettings)) {
        // get the value of the setting from the extension's configuration
        const settings = vscode.workspace.getConfiguration(SETTINGS_NAMESPACE);
        const value = settings.get<string>(key);

        // if the value is not present, add a ConfigurationMissingError to the array
        if (!value) {
            errors.push(new ConfigurationMissingError(key, requiredSettings[key]));
        }
    }

    // if there are any errors, throw an AggregateConfigurationMissingError
    if (errors.length > 0) {
        throw new AggregateConfigurationMissingError(errors);
    }
}

/**
 * Creates an instance of Command that makes it easy to provide arbitrary functions as vscode commands.
 * @param name unique name of command prefixed by a namespace. e.g. juno.foo
 * @param handler a function that executes when command is triggered
 * @returns the command
 */
export function createCommand(name: string, handler: CommandHandler) {
    return new Command(name, wrapWithTryCatch(handler));
}