import * as vscode from 'vscode';
import { MODEL_KEY, conversation, createOpenAiApi, submit } from '../openai';
import { createResultPanel } from '../panel';
import { ChatCompletionRequestMessage } from 'openai';

export async function runInference(context: vscode.ExtensionContext, prompt: string) {
	const openai = createOpenAiApi();

	if (!openai) {
		throw new Error('Failed to create OpenAiApi');
	}

	const panel = await createResultPanel(context.extensionUri, context.extensionPath);
	const model = context.workspaceState.get<string>(MODEL_KEY);
	submit(openai, panel, prompt, model);
}

export async function runConversation(context: vscode.ExtensionContext, messages: ChatCompletionRequestMessage[]): Promise<string> {
	const openai = createOpenAiApi();

	if (!openai) {
		throw new Error('Failed to create OpenAiApi');
	}

	const panel = await createResultPanel(context.extensionUri, context.extensionPath);
	const model = context.workspaceState.get<string>(MODEL_KEY);

	return await conversation(openai, panel, messages, model);
}