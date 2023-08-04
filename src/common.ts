import * as vscode from 'vscode';
import { InferenceOptions, MODEL_KEY, conversation, createOpenAiApi } from '@juno/llm/openai';
import { createResultPanel } from '@juno/ui/panel';
import { ChatCompletionRequestMessage } from 'openai';
import { marked } from 'marked';

export async function runConversation(context: vscode.ExtensionContext, messages: ChatCompletionRequestMessage[]): Promise<string> {
	const openai = createOpenAiApi();

	if (!openai) {
		throw new Error('Failed to create OpenAiApi');
	}

	const panel = await createResultPanel(context.extensionUri, context.extensionPath);
	const model = context.workspaceState.get<string>(MODEL_KEY);

	const options:InferenceOptions = {
		model,
		onDidStart: () => {
			console.log('inference started')
			// panel.webview.postMessage({type: 'stream.start'})
		},
		onDidUpdate: (content) => {
			const result = marked.parse(content, {headerIds: false, mangle: false});
			panel.webview.postMessage({type: 'stream.update', content: result});
		},
		onDidEnd: () => {
			console.log('inference finished');
			panel.webview.postMessage({type: 'stream.end'});
		}
	}

	return await conversation(openai, messages, options);
}

export function getGlobalState(context:vscode.ExtensionContext):{assistantName:string,userName?:string} {
	const assistantName = context.globalState.get<string>('juno.assistant.name') || 'Juno';
	const userName = context.globalState.get<string>("juno.user.name");
	return {assistantName, userName};
}

export function getEditorContext():{language?:string,scratchpad?:string} {
	let language = undefined;
	let scratchpad = undefined;

	const editor = vscode.window.activeTextEditor;

	if (editor) {
		const document = editor.document;

		scratchpad = editor.selection.isEmpty
			? document.getText()
			: document.getText(editor.selection);

		language = document.languageId;
	}

	return {
		language,
		scratchpad
	}
}

export type PromptLoopOptions = {
	initialPlaceholder?:string,
	initialPrompt?:string,
	initialValue?:string,
	followupPlaceholder?:string,
	followupPrompt?:string,
}
/**
 * Starts a prompt loop where the user is given the ability to ask questions
 * @param context the vscode ExtensionContext
 * @param history initial/existing conversation history to use
 */
export async function processUserPrompts(context: vscode.ExtensionContext, history: ChatCompletionRequestMessage[], options?:PromptLoopOptions) {
    
	// retrieve the initial prompt

	let userInput = await vscode.window.showInputBox({
        placeHolder: options?.initialPlaceholder || 'Question or comment',
        prompt: options?.initialPrompt || 'How may I be of assistance?',
        value: options?.initialValue || '',
    });

	// loop while user gives new instructions
    while (userInput) {
		// push the prompt to history before executing the LLM
        history.push({ role: 'user', content: userInput });
        const result = await runConversation(context, history);

		// append the result into the history
        console.log("appending result to conversation", result);
        history.push({ role: 'assistant', content: result });

		// ask for new prompt / clarification.
		// if cancelled or empty the loop will exit.
        userInput = await vscode.window.showInputBox({
            placeHolder: options?.followupPlaceholder || 'Ask a question or clarify any misunderstanding',
            prompt: options?.followupPrompt || 'Follow up',
            value: '',
        });
    }
}

/**
 * Constructs an initial conversation history based on the system prompt.
 * @param systemMessage the system message to use for the conversation
 * @returns a pupulated history / message collection with which to start a conversation.
 */
export function initializeConversation(systemMessage: string) {
    const messages: ChatCompletionRequestMessage[] = [
        { role: "system", content: systemMessage }
    ];

    return messages;
}

/**
 * Generates a system message based on configured paramaters such as user name and assistant name.
 * It also extracts the code scratchpad from the current window/selection if available.
 * @param context the vscode extension context
 * @returns {string} system message based on user configuration
 */
export function createSystemMessage(context:vscode.ExtensionContext, instruction:string, useScratchpad?:boolean): string {
	const {assistantName, userName} = getGlobalState(context);
    const {language, scratchpad} = getEditorContext();

	const defaultUser = 'The USER';
	const configuredUser = `The USER (Name: ${userName})`;
    const user = userName ? configuredUser : defaultUser

	const personalizedInstructions = instruction
		.replace("$USER", user)
		.replace("$LANGUAGE", language || '')
		.replace("$ASSISTANT", assistantName);

	let systemMessage = `You are a ${language || ''} coding assistant named ${assistantName}.\n${personalizedInstructions}`;
	
	// only disable scratchpad if explicitly set to false 
	// and there actually is a scratchpad to show
    if(useScratchpad !== false && scratchpad) {
        systemMessage = `${systemMessage}\n\nThe below scratchpad is provided by the user 
so you are aware of the script they are working on. 
Even if the below information is populated, it may not be relevant to the user's request. 
Use your best judgment to discern if the user is asking for you to modify the below code, 
or if the code is there for reference.

SCRATCHPAD:

${scratchpad}`;
    }

    return systemMessage;
}