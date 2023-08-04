import * as vscode from 'vscode';

import { createCommand } from "@juno/command";
import {
	initializeConversation,
	processUserPrompts,
	createSystemMessage,
} from '@juno/common';

/**
 * `createCodeCommand` is a VS Code command object intended to provide
 * a code generation endpoint for the language model.
 * 
 * When registered and invoked in VS Code, it initiates a conversation,
 * consisting of instructions and subsequent user prompts.
 * It adheres and enforces standardized communication rules described in
 * the instructions.
 *
 * @property name - A string naming the command ('juno.createCode').
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
export const createCodeCommand = createCommand('juno.createCode', async (context) => {
	// const systemMessage = generateSystemMessage(context);
	const instructions = `$USER will give you instructions to help write functions. 
You may ask for clarification if needed, but otherwise you should only output $LANGUAGE code. 
Provide explanations of the code only if the user asks for them. 
Make sure to respond with the code inside a markdown code block (e.g. \´\´\´typescript) or \´\´\´python.`;

	const systemMessage = createSystemMessage(context, instructions)
	const messages = initializeConversation(systemMessage);

	await processUserPrompts(context, messages);
});