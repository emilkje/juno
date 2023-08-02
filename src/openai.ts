import hljs from "highlight.js";
import { IncomingMessage } from "http";
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import * as vscode from "vscode";

export function createOpenAiApi(): OpenAIApi | undefined {
	try {
		const openAiConfiguration = createConfigurationFromSettings();

		if (!openAiConfiguration) {
			console.error("Failed to create OpenAI configuration.");
			return;
		}

		return new OpenAIApi(openAiConfiguration);
	} catch (error) {
		console.error("Failed to create OpenAI API.", error);
		return;
	}
}

export function createConfigurationFromSettings(): Configuration | undefined {
	try {
		const apiKey = getApiKey();

		if (!apiKey) {
			console.log("No API key configured. Please open the settings panel and configure your OpenAI api key");
			return;
		}

		return new Configuration({ apiKey: apiKey });
	} catch (error) {
		console.error("Failed to create OpenAI configuration.", error);
		return;
	}
}

export function getApiKey(): string | undefined {
	try {
		const settings = vscode.workspace.getConfiguration('juno');
		const apiKey = settings.get<string>("apiKey");
		return apiKey;
	} catch (error) {
		console.error("Failed to retrieve API key from settings.", error);
		return;
	}
}