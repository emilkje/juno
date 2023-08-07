// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import * as commands from '@juno/commands';
import { configure as configureMarkdownParser } from '@juno/ui/markdown';
import { statusBar } from '@juno/commands/indexRepoCommand';
import { setExtensionContext } from './common';

configureMarkdownParser();

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Juno is now active!');

	setExtensionContext(context);

	// loop all the commands exported from commands/index.ts
	// and register them dynamically.
	console.log("registering commands");
	for(const command of Object.values(commands)) {
		try {
			command.register(context);
		} catch(error) {
			console.error(`failed to register ${command.name}`, error);
			vscode.window.showErrorMessage(`error registering command ${command.name}: ${error}`);
		}
	}

	context.subscriptions.push(statusBar);

	// console.log('creating file watcher');
	// const watcher = vscode.workspace.createFileSystemWatcher('**/src/**');
	// watcher.onDidChange(e => {
	// 	vscode.commands.executeCommand("juno.indexFile", e);
	// });
}

// This method is called when your extension is deactivated
export function deactivate() { }
