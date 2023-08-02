import * as vscode from "vscode";
import { createOpenAiApi, submit } from "./openai";
import { createResultPanel } from "./panel";
import { Command } from "./types";

export const openPromptCommand:Command = {
	name: "juno.openPrompt",
	factory: (context:vscode.ExtensionContext) => {
		return async () => {
			
			const openai = createOpenAiApi();
	
			if(!openai) {
				console.error("failed to create OpenAiApi")
				return;
			}
	
			const prompt = await vscode.window.showInputBox({
				placeHolder: "Juno at your service",
				prompt: "What can I help you with?",
				value: "",
			});
	
			if (prompt) {
				const panel = await createResultPanel(context.extensionUri, context.extensionPath);
				submit(openai, panel, prompt);
			}
		}
	}
}

export const suggestImprovementsCommand:Command = {
	name: "juno.suggestImprovements",
	factory: (context:vscode.ExtensionContext) => {

		return async () => {
			const openai = createOpenAiApi();
		
			if(!openai) {
				console.error("failed to create OpenAiApi")
				return;
			}
		
			const prompt = "How may I improve this code?";
			const panel = await createResultPanel(context.extensionUri, context.extensionPath);
		
			submit(openai, panel, prompt);
		}
	}
}