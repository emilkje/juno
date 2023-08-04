// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import * as commands from '@juno/commands';
import { configure as configureMarkdownParser } from '@juno/ui/markdown';

configureMarkdownParser();

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Juno is now active!');

	// register commands
	for(const command of Object.values(commands)) {
		try {
			command.register(context);
			// context.subscriptions.push(
			// 	vscode.commands.registerCommand(command.name(), command.register(context))
			// )
		} catch(error) {
			console.error(`failed to register ${command.name}`, error);
			vscode.window.showErrorMessage(`error registering command ${command.name}: ${error}`);
		}
	}
}

// This method is called when your extension is deactivated
export function deactivate() { }
