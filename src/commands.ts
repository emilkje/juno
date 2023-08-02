import * as vscode from "vscode";
import { createOpenAiApi, submit, MODEL_KEY, conversation } from "./openai";
import { createResultPanel } from "./panel";
import { Command } from "./types";
import { ChatCompletionRequestMessage } from "openai";

async function runInference(context: vscode.ExtensionContext, prompt: string) {
	const openai = createOpenAiApi();

	if (!openai) {
		throw new Error('Failed to create OpenAiApi');
	}

	const panel = await createResultPanel(context.extensionUri, context.extensionPath);
	const model = context.workspaceState.get<string>(MODEL_KEY);
	submit(openai, panel, prompt, model);
}

async function runConversation(context: vscode.ExtensionContext, messages:ChatCompletionRequestMessage[]): Promise<string> {
	const openai = createOpenAiApi();

	if (!openai) {
		throw new Error('Failed to create OpenAiApi');
	}

	const panel = await createResultPanel(context.extensionUri, context.extensionPath);
	const model = context.workspaceState.get<string>(MODEL_KEY);

	return await conversation(openai, panel, messages, model);
}

export const openPromptCommand: Command = {
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
}

export const suggestImprovementsCommand: Command = {
	name: "juno.suggestImprovements",
	factory: context => async () => {
		await runInference(context, "How may I improve this code?");
	}
}

export const selectModelCommand: Command = {
	name: 'juno.selectModel',
	factory: context => async () => {
		
		const models = [
			'gpt-3.5-turbo', 
			'gpt-4', 
			'gpt-4-0613'
		];
		
		const placeHolder = 'please select a model to use';
		const result = await vscode.window.showQuickPick(models, {placeHolder});
		
		if(result) {
			// setModel(result);
			context.workspaceState.update(MODEL_KEY, result)
			vscode.window.showInformationMessage(`Using ${result}`);
		}
	}
}

export const createCodeCommand: Command = {
	name: 'juno.createCode',
	factory: context => async () => {
		
		let language = '';
		
		const editor = vscode.window.activeTextEditor;
		let scratchpad = "";
	
		const messages: ChatCompletionRequestMessage[] = [
			{role: 'system', content: 'You are a helpful coding assistant that always responds in markdown format. When providing full code blocks you have to qualify it with what language. e.g ```javascript or ```typescript. When providing contextual snippets, try to provide which line of code it belongs.'}
		];
	
		if (editor) {
			const document = editor.document;
			
			scratchpad = editor.selection.isEmpty
				? document.getText() 
				: document.getText(editor.selection);
			
			language = document.languageId
		}
			
		const systemMessage = `
MAIN PURPOSE
You are a ${language} coding assistant. The USER will give you instructions to help write functions. You may ask for clarification if needed, but otherwise you should only output ${language} code. Provide explanations of the code only if the user asks for them.

SCRATCHPAD
The below scratchpad may be provided by the user so you are aware of the script they are working on. Note, this information may be blank. Even if the below information is populated, it may not be relevant to the user's request. Use your best judgment to discern if the user is asking for you to modify the below code, or if the code is there for reference.

SCRATCHPAD:
${scratchpad}
`;
			
		messages.push({ role: "system", content: systemMessage });
		console.log("system_message", systemMessage);

		let prompt = await vscode.window.showInputBox({
			placeHolder: "Juno at your service",
			prompt: "What can I help you with?",
			value: "",
		});

		while(prompt) {
			messages.push({role: 'user', content: prompt});
			const result = await runConversation(context, messages);
			
			console.log("received result", result);
			messages.push({role: 'assistant', content: result});

			prompt = await vscode.window.showInputBox({
				placeHolder: "Ask a question or clarify any misunderstanding",
				prompt: "Follow up",
				value: "",
			});
		}
	}
}