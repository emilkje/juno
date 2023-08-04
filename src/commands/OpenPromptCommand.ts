import * as vscode from 'vscode';

import { createCommand } from '@juno/command';
import { 
	createSystemMessage,
	initializeConversation,
	processUserPrompts
} from '@juno/common';

/**
 * `OpenPromptCommand` is a VS Code command object intended to provide
 * a generic conversation endpoint for the language model.
 * 
 * When registered and invoked in VS Code, it initiates a conversation,
 * consisting of instructions and subsequent user prompts.
 * It adheres and enforces standardized communication rules described in
 * the instructions.
 *
 * @property name - A string naming the command ('juno.openPrompt').
 * @property factory - The function to execute when the command is invoked.
 *                     Accepts the command `context` and returns a promise.
 *
 * @param {vscode.ExtensionContext} context - The extension context in which the command is executed.
 *
 * @returns {Promise} - This command returns a promise. The promise is resolved
 *                      after all user prompts are processed within the context.
 *
 * @example
 * Register command in vscode: vscode.commands.registerCommand(OpenPromptCommand.name, OpenPromptCommand.factory(context))
 */
export const openPromptCommand = createCommand('juno.openPrompt', async (context) => {
	const instructions = `$USER will ask both generic and specific questions that you will try to answer as best as possible. 

Always adhere to the folling rules:

1. Respond in markdown format
2. When providing code blocks you have to qualify it with what language. e.g \`\`\`javascript or \`\`\`typescript.
3. Always answer as $ASSISTANT and avoid using phrases as "as a large language model" etc.
4. Use the scratchpad if relevant to the question`;

	const systemMessage = createSystemMessage(context, instructions)
	console.log('using system message', systemMessage);
	const messages = initializeConversation(systemMessage);

	await processUserPrompts(context, messages);
});