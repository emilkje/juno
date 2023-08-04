import * as vscode from 'vscode';
import { AggregateConfigurationMissingError, ConfigurationError, ConfigurationMissingError } from '@juno/errors';

type CommandHandler = (ctx:vscode.ExtensionContext, ...args:any[]) => void | Promise<void>;

export default class Command {

    constructor(private _name:string, private _fn:CommandHandler) {
    }

    /**
     * Registers itself to the vscode command registry
     * @param ctx vscode extension context
     */
    register(ctx:vscode.ExtensionContext) {
        ctx.subscriptions.push(
            vscode.commands.registerCommand(
                this._name,
                // bind the extension context as the first argument 
                // to the CommandHandler so that it can access it
                this._fn.bind(this._fn, ctx)
            )
        )
    }

    name():string {
        return this._name;
    }
}

function wrapWithTryCatch(originalFn: CommandHandler): CommandHandler {
    return async function (ctx:vscode.ExtensionContext, ...args: any[]) {
        try {
            await ensureHealthyState();
            return await originalFn.apply(originalFn, [ctx, ...args]);
        } catch(error) {
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
                    })
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
    }
}

function showMissingErrorDialogue(key:string, friendlyName:string) {
    vscode.window.showWarningMessage(
        `Configuration Missing: ${friendlyName}`, 
        "Open Settings")
        .then((choices) => {
            if (choices === "Open Settings") {
                vscode.commands.executeCommand(
                    "workbench.action.openSettings", 
                    key);
            }
        })
}

const requiredSettings:Record<string,string> = {
    "juno.apiKey": "OpenAI API Key"
};

async function ensureHealthyState() {

    const errors:ConfigurationMissingError[] = []

    for(const key of Object.keys(requiredSettings)) {

        const settings = vscode.workspace.getConfiguration(key.split('.')[0]);
        const value = settings.get<string>(key.split('.')[1]);

        if(!value) {
            errors.push(new ConfigurationMissingError(key, requiredSettings[key]));
        }
    }

    console.log("found ", errors.length, "errors", errors);
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
export function createCommand(name:string, handler:CommandHandler) {
    return new Command(name, wrapWithTryCatch(handler));
}