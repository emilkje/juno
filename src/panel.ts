import {join as joinPath} from 'path';
import * as vscode from 'vscode';
import { getNonce } from './nonce';

let _panel:vscode.WebviewPanel
let _panelIsDisposed = false

export async function createResultPanel(extensionUri:vscode.Uri, extensionPath:string):Promise<vscode.WebviewPanel> {

	if(_panel && _panelIsDisposed == false) {
		return _panel;
	}

	const panel = vscode.window.createWebviewPanel(
		'juno.resultView', // Unique ID for the webview
		'Juno', // Title displayed in the UI
		vscode.ViewColumn.Two, // Editor column to show the webview in
		{
			enableScripts: true,
			retainContextWhenHidden: true,
			localResourceRoots: [vscode.Uri.file(joinPath(extensionPath, 'media'))],
		},
	);

	panel.onDidDispose(e => _panelIsDisposed = true);

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

	_panel = panel;
	_panelIsDisposed = false;
	
	return panel;
}