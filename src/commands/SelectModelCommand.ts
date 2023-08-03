import * as vscode from 'vscode';
import { Command } from "../types";
import { MODEL_KEY } from '../openai';

export const SelectModelCommand: Command = {
	name: 'juno.selectModel',
	factory: context => async () => {

		const models = [
			'gpt-3.5-turbo',
			'gpt-4',
			'gpt-4-0613'
		];

		const placeHolder = 'please select a model to use';
		const result = await vscode.window.showQuickPick(models, { placeHolder });

		if (result) {
			// setModel(result);
			context.workspaceState.update(MODEL_KEY, result)
			vscode.window.showInformationMessage(`Using ${result}`);
		}
	}
};