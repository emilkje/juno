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

export function submit(openai:OpenAIApi, panel:vscode.WebviewPanel, prompt:string) {

	const editor = vscode.window.activeTextEditor;
	let context = "";

	const messages: ChatCompletionRequestMessage[] = [
		{role: 'system', content: 'You are a helpful coding assistant that always responds in markdown format. When providing full code blocks you have to qualify it with what language. e.g ```javascript or ```typescript. When providing contextual snippets, try to provide which line of code it belongs.'}
	];

	if (editor) {
		const document = editor.document;
		
		context = editor.selections.length > 1
			? document.getText(editor.selection) 
			: document.getText();

		vscode.window.showInformationMessage(`${editor.selections.length}`);

		messages.push({ role: "user", content: `answer the following question using the current context if applicable.\n\nCONTEXT:\n${context}\n\nQUESTION:${prompt}` });
	} else {
		messages.push({ role: "user", content: prompt });
	}

	panel.webview.postMessage({type: 'stream.start'});

	openai.createChatCompletion({
		model: "gpt-3.5-turbo",
		messages: messages,
		stream: true,
	}, {responseType: 'stream'}).then(chatCompletion => {
		// const result = chatCompletion.data.choices[0].message;
		const stream = chatCompletion.data as unknown as IncomingMessage;

		console.log(stream);
		const buffer:Array<string> = [];
		stream.on('data', (chunk:Buffer) => {
			const payloads = chunk.toString().split("\n\n");
			for(const payload of payloads) {
				if(payload.includes("[DONE]")) {
					panel.webview.postMessage({type: 'stream.end'});
					return;
				}

				if (payload.startsWith("data:")) {
					const data = JSON.parse(payload.replace("data: ", ""));
					try {
						const chunk: undefined | string = data.choices[0].delta?.content;
						if (chunk) {
							buffer.push(chunk);
							const content = marked.parse(buffer.join(""), {headerIds: false, mangle: false});
							panel.webview.postMessage({type: 'stream.update', content: content});
						}
					} catch (error) {
						panel.webview.postMessage({type: 'error', content: `Error with JSON.parse and ${payload}.\n${error}`});
						console.log(`Error with JSON.parse and ${payload}.\n${error}`);
					}
				}
			}
		});
	});
}