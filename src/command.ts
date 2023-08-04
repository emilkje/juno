import * as vscode from 'vscode';

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

/**
 * Creates an instance of Command that makes it easy to provide arbitrary functions as vscode commands.
 * @param name unique name of command prefixed by a namespace. e.g. juno.foo
 * @param handler a function that executes when command is triggered
 * @returns the command
 */
export function createCommand(name:string, handler:CommandHandler) {
    return new Command(name, handler);
}