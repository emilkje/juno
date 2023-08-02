import * as vscode from 'vscode';

export type Command = {
	name: string,
	factory: (context: vscode.ExtensionContext) => () => void,
}