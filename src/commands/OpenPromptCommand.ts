
import * as vscode from 'vscode';
import { Command } from '../types';
import { runInference } from './common';

export const OpenPromptCommand: Command = {
	name: "juno.openPrompt",
	factory: context => async () => {
		const prompt = await vscode.window.showInputBox({
			placeHolder: "Juno at your service",
			prompt: "What can I help you with?",
			value: "",
		});

		if (prompt) {
			await runInference(context, prompt);
		}
	}
};