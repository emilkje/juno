import hljs from "highlight.js";
import { IncomingMessage } from "http";
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import * as vscode from "vscode";

// gpt-3.5-turbo
// const model = "text-davinci-003"
let defaultModel = "gpt-3.5-turbo";
export const MODEL_KEY = "openai.model";

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

let buffer:Array<string> = [];

export type InferenceOptions = {
	onDidStart?: () => void,
	onDidEnd?: (result:string) => void,
	onDidReceiveChunk?:(chunk:string) => void,
	onDidUpdate?:(content:string) => void,
	onError?:(error:any) => void,
	model?: string,
}

export function submit(openai:OpenAIApi, panel:vscode.WebviewPanel, prompt:string, model?:string) {

	const editor = vscode.window.activeTextEditor;
	let context = "";

	const messages: ChatCompletionRequestMessage[] = [
		{role: 'system', content: 'You are a helpful coding assistant that always responds in markdown format. When providing full code blocks you have to qualify it with what language. e.g ```javascript or ```typescript. When providing contextual snippets, try to provide which line of code it belongs.'}
	];

	if (editor) {
		const document = editor.document;
		
		context = editor.selection.isEmpty
			? document.getText() 
			: document.getText(editor.selection);

		messages.push({ role: "user", content: `answer the following question using the current context if applicable.\n\nCONTEXT:\n${context}\n\nQUESTION:${prompt}` });
	} else {
		messages.push({ role: "user", content: prompt });
	}

	panel.webview.postMessage({type: 'stream.start'});

	const current_model = model || defaultModel;
	console.log(`creating chat completion using ${current_model}`);
	
	openai.createChatCompletion({
		model: current_model,
		messages: messages,
		stream: true,
	}, {responseType: 'stream'}).then(chatCompletion => {
		// const result = chatCompletion.data.choices[0].message;
		const stream = chatCompletion.data as unknown as IncomingMessage;

		const buffer:Array<string> = [];
		stream.on('data', (chunk:Buffer) => {
			const payloads = chunk.toString().split("\n\n");
			for(const payload of payloads) {
				if(payload.includes("[DONE]")) {
					panel.webview.postMessage({type: 'stream.end'});
					return;
				}

				if (payload.startsWith("data:")) {
					try {
						const data = JSON.parse(payload.replace("data: ", ""));
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

export function conversation(openai:OpenAIApi, messages:ChatCompletionRequestMessage[], options?:InferenceOptions): Promise<string> {

	return new Promise((resolve, reject) => {
			
		options?.onDidStart?.();

		const current_model = options?.model || defaultModel;
		console.log(`creating chat completion using ${current_model}`);
	
		
		openai.createChatCompletion({
			model: current_model,
			messages: messages,
			stream: true,
		}, {responseType: 'stream'}).then(chatCompletion => {
			// const result = chatCompletion.data.choices[0].message;
			const stream = chatCompletion.data as unknown as IncomingMessage;
	
			// const buffer:Array<string> = [];
			// clear buffer when the conversation starts
			// or add a separator for the next section
			if(messages.filter(m => m.role == "user").length <= 1) {
				buffer = [];
			} else {
				buffer.push("\n\n---\n\n")
			}
	
			stream.on('data', (chunk:Buffer) => {
				const payloads = chunk.toString().split("\n\n");
				for(const payload of payloads) {
					if(payload.includes("[DONE]")) {
						options?.onDidEnd?.(buffer.toString());
						resolve(buffer.toString());
						return;
					}
	
					if (payload.startsWith("data:")) {
						try {
							const data = JSON.parse(payload.replace("data: ", ""));
							const chunk: undefined | string = data.choices[0].delta?.content;
							if (chunk) {
								buffer.push(chunk);
								options?.onDidReceiveChunk?.(chunk);
								options?.onDidUpdate?.(buffer.join(""));
							}
						} catch (error) {
							options?.onError?.(error);
							console.log(`Received error ${payload}.\n${error}`);
							reject(error)
						}
					}
				}
			});
		});
	});
}