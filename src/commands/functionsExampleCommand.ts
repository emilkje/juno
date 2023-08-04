import * as vscode from 'vscode';
import { ChatCompletionRequestMessage } from 'openai';

import { createCommand } from '@juno/command';
import { createOpenAiApi } from '@juno/llm/openai';

export const functionExampleCommand = createCommand('juno.functionsExample', async () => {

	const openai = createOpenAiApi();
	console.log(openai);

	if (!openai) {
		console.error("openai not found");
		return;
	}

	const systemPrompt = `You are a helpful directory assistant. 
			Users will ask questions about staff and you will reply in a friendly tone
			with the name and email of the person. If you receive a "no name found" 
			response, politelty let the user know there is no one by that title who 
			works here. Do not make up people. The email should be a link 
			(e.g. [person@email.com](person@email.com)`;

	const chatHistory: ChatCompletionRequestMessage[] = [];
	const message = "please give me information about the owner";

	const chat = await openai.createChatCompletion({
		model: 'gpt-3.5-turbo-0613',
		temperature: 0.2, // setting this lower to reduce hallucinations
		messages: [
			{
				role: 'system',
				content: systemPrompt,
			},
			...chatHistory,
			{
				role: 'user',
				content: message, // the user's latest message
			},
		],
		functions: [
			{
				name: "getStaffInfo",
				description: "Get the contact info of a staff member",
				parameters: {
					type: "object",
					properties: {
						staffPosition: {
							type: "string",
							description: 'The position of the desired staff member. E.g. "author" or "owner"',
						},
					},
					required: ["staffPosition"],
				},
			},
		],
		function_call: 'auto',
	});

	// setting as let since we will overwrite later
	let answer = chat.data.choices[0].message?.content;
	const wantsToUseFunction = chat.data.choices[0].finish_reason === 'function_call';

	console.log("chat", chat.data);
	console.log("wants_to_use_function", wantsToUseFunction);

	if (wantsToUseFunction) {
		const functionToUse = chat.data.choices[0].message?.function_call;
		let dataToReturn = {};

		if (!functionToUse) {
			console.error("openai indicates that it want to use a function but did not provide what function.", chat.data.choices[0].message)
			return;
		}

		console.log('function_to_use', functionToUse);

		if (functionToUse && functionToUse.name === 'getStaffInfo') {
			if (functionToUse?.arguments) {
				console.log('arguments_to_use', functionToUse.arguments);
				const args = JSON.parse(functionToUse.arguments) as any;
				dataToReturn = getStaffInfo(args.staffPosition);
			} else {
				console.error("invalid function call", functionToUse);
				return;
			}
		}

		// new completion API call
		const serializedFunctionResult = JSON.stringify(dataToReturn);
		console.log('function result', serializedFunctionResult);

		console.log("executing LLM with function message result");

		const chatWithFunction = await openai.createChatCompletion({
			model: 'gpt-3.5-turbo-0613',
			messages: [
				{
					role: 'system',
					content: systemPrompt,
				},
				...chatHistory,
				{
					role: 'user',
					content: message,
				},
				{
					role: "function",
					name: functionToUse.name,
					content: serializedFunctionResult, // needs to be JSON encoded
				},
			],
		});

		// overwrite the answer we will return to the user
		answer = chatWithFunction.data.choices[0].message?.content;
		vscode.window.showInformationMessage(answer || 'failed to retrieve answer');
	}
});

const getStaffInfo = (staffPosition: string): { name: string, email: string } => {
	switch (staffPosition) {
		case 'author':
			return {
				name: 'Rebecca',
				email: 'rebecca@company.com'
			};
		case 'owner':
			return {
				name: 'Josh',
				email: 'josh@company.com'
			};
		default:
			return {
				name: 'No name found',
				email: 'Not found'
			};
	}
}