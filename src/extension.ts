// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';

import { ChatCompletionRequestMessage, OpenAIApi } from "openai";
import path = require('path');
import { IncomingMessage } from 'http';
import { createOpenAiApi } from './openai';
import { getNonce } from './nonce';

marked.use(markedHighlight({
	langPrefix: 'hljs language-',
	highlight(code, lang) {
		const language = hljs.getLanguage(lang) ? lang : 'plaintext';
		return hljs.highlight(code, { language }).value;
	}
}));

let panel: vscode.WebviewPanel;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "juno" is now active!');

	context.subscriptions.push(vscode.commands.registerCommand('juno.openPrompt', async () => {
		
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
			if(!panel) {
				panel = await createResultPanel(context.extensionUri, context.extensionPath);
			}
			submit(openai, panel, prompt);
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('juno.suggestImprovements', async () => {

		const openai = createOpenAiApi();

		if(!openai) {
			console.error("failed to create OpenAiApi")
			return;
		}

		const prompt = "How may I improve this code?";
		
		if (!panel) {
			panel = await createResultPanel(context.extensionUri, context.extensionPath);
		}

		submit(openai, panel, prompt);
    }));
}

// This method is called when your extension is deactivated
export function deactivate() { }

function submit(openai:OpenAIApi, panel:vscode.WebviewPanel, prompt:string) {

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

async function createResultPanel(extensionUri:vscode.Uri, extensionPath:string):Promise<vscode.WebviewPanel> {
	const panel = vscode.window.createWebviewPanel(
		'juno.resultView', // Unique ID for the webview
		'Juno', // Title displayed in the UI
		vscode.ViewColumn.Two, // Editor column to show the webview in
		{
			enableScripts: true,
			retainContextWhenHidden: true,
			localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'media'))],
		}
	);

	// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
	const scriptUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'result.js'));

	// Do the same for the stylesheet.
	const styleResetUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'reset.css'));
	const styleVSCodeUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'vscode.css'));
	const styleMainUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'main.css'));
	const highlightUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "highlight.github.css"));

	// Use a nonce to only allow a specific script to be run.
	const nonce = await getNonce();

	const panelHtml = `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">

			<!--
				Use a content security policy to only allow loading styles from our extension directory,
				and only allow scripts that have a specific nonce.
				(See the 'webview-sample' extension sample for img-src content security policy examples)
			-->
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${panel.webview.cspSource}; script-src 'nonce-${nonce}';">

			<meta name="viewport" content="width=device-width, initial-scale=1.0">

			<link href="${styleResetUri}" rel="stylesheet">
			<link href="${styleVSCodeUri}" rel="stylesheet">
			<link href="${styleMainUri}" rel="stylesheet">
			<link href="${highlightUri}" rel="stylesheet">

			<title>Juno</title>
		</head>
		<body>
			<p class="result"></div>
			<div class="loading" style="display: none;">Let me think about this...</div>
			<script nonce="${nonce}" src="${scriptUri}"></script>
		</body>
		</html>`;

	panel.webview.html = panelHtml;

	return panel;
}