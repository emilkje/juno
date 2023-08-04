import * as vscode from 'vscode';

import { createCommand } from '@juno/command';
import { MODEL_KEY } from '@juno/llm/openai';

/**
 * Represents a command that allows the user to select a model to use.
 *
 * This command displays a quick pick menu to the user, showing a list of available models.
 * When the user selects a model, the selected model is stored in the workspace state using the MODEL_KEY.
 *
 * @param context - The context of the command execution.
 * @returns A promise that resolves when the model selection is complete.
 */
export const selectModelCommand = createCommand('juno.selectModel', async (context) => {
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
});