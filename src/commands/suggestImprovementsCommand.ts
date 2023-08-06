import * as vscode from 'vscode';

import { createCommand } from '@juno/command';
import { 
	createSystemMessage,
	initializeConversation,
	runConversation,
} from '@juno/common';

/**
 * Creates a command that suggests improvements.
 * 
 * This command allows users to suggest improvements to the code. It prompts the user to provide feedback or suggestions, 
 * and then processes and displays the suggestions in a meaningful way. It ensures that internal implementation details are not leaked.
 * 
 * @param context - The VSCode ExtensionContext.
 * @returns A Promise that resolves when the code generation is complete.
 */
export const suggestImprovementsCommand = createCommand('juno.suggestImprovements', async (context) => {
	const instructions = `$USER will ask you how to improve their code. You should use the provided code (if any) and respond with practical solutions.

Always adhere to the folling rules:

1. Respond in markdown format
2. When providing code blocks you have to qualify it with what language. e.g \`\`\`javascript or \`\`\`typescript.
3. Always answer as $ASSISTANT and avoid using phrases as "as a large language model" etc.
4. Use the scratchpad if relevant to the question
5. Apply common structural/creational/behavioural software patterns to your edits when relevant`;

	const systemMessage = createSystemMessage(context, instructions);
	console.log('using system message', systemMessage);
	const messages = initializeConversation(systemMessage);
	messages.push({role: 'user', content: 'How may I improve this code?'});

	await runConversation(context, messages);
});