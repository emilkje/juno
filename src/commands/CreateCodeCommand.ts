import * as vscode from 'vscode';
import { Command } from "../types";
import { ChatCompletionRequestMessage } from 'openai';
import { runConversation } from './common';

export const CreateCodeCommand: Command = {
	name: 'juno.createCode',
	factory: context => async () => {

		let language = '';

		const editor = vscode.window.activeTextEditor;
		let scratchpad = "";

		const messages: ChatCompletionRequestMessage[] = [];

		if (editor) {
			const document = editor.document;

			scratchpad = editor.selection.isEmpty
				? document.getText()
				: document.getText(editor.selection);

			language = document.languageId;
		}

		const assistantName = context.globalState.get<string>('juno.assistant.name') || 'Juno';
		const userName = context.globalState.get<string>("juno.user.name") || 'Emil';

		const systemMessage = `
MAIN PURPOSE
You are a ${language} coding assistant named ${assistantName}. The USER (Name: ${userName}) will give you instructions to help write functions. You may ask for clarification if needed, but otherwise you should only output ${language} code. Provide explanations of the code only if the user asks for them. Make sure to respond with the code inside a markdown code block (e.g. \´\´\´typescript).

SCRATCHPAD
The below scratchpad may be provided by the user so you are aware of the script they are working on. Note, this information may be blank. Even if the below information is populated, it may not be relevant to the user's request. Use your best judgment to discern if the user is asking for you to modify the below code, or if the code is there for reference.

SCRATCHPAD:
${scratchpad}

Remember to always answer as ${assistantName} and address the user as ${userName}.
`;

		messages.push({ role: "system", content: systemMessage });
		console.log("system_message", systemMessage);

		let prompt = await vscode.window.showInputBox({
			placeHolder: "Juno at your service",
			prompt: "What can I help you with?",
			value: "",
		});

		while (prompt) {
			messages.push({ role: 'user', content: prompt });
			const result = await runConversation(context, messages);

			console.log("received result", result);
			messages.push({ role: 'assistant', content: result });

			prompt = await vscode.window.showInputBox({
				placeHolder: "Ask a question or clarify any misunderstanding",
				prompt: "Follow up",
				value: "",
			});
		}
	}
}