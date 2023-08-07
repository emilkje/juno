import * as vscode from 'vscode';
import { ChatCompletionFunctions, ChatCompletionRequestMessage, CreateChatCompletionRequest } from 'openai';
import { createCommand } from '@juno/command';
import { createOpenAiApi } from '@juno/llm/openai';
import { FunctionRegistry, handleFunctionCall, runFunctionChatCompletion } from '@juno/llm/openai/functions';

const openaiApi = createOpenAiApi();

interface StaffPosition {
    name: string,
    email: string
}

interface StaffInformation {
    author: StaffPosition,
    owner: StaffPosition,
    [key: string]: StaffPosition | undefined // Allow any string as index and the value should be StaffPosition or undefined
}

// Then define the function with its associated function object
const functionMap: FunctionRegistry = {
    "getStaffInfo": {
        function: ({staffPosition}: {staffPosition: string}): StaffPosition => {
            const staffInformation: StaffInformation = {
                'author': { name: 'Rebecca', email: 'rebecca@company.com' },
                'owner': { name: 'Josh', email: 'josh@company.com' },
            };
            
            return staffInformation[staffPosition] || { name: 'No name found', email: 'Not found' };
        },
        object: {
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
            }
        }
    }
    // add other functions here as needed
}

export const functionExampleCommand = createCommand('juno.functionsExample', async () => {
    if (!openaiApi) {
        console.error("openai not found");
        return;
    }

    const userMessage = "please give me information about the owner";
    const chatHistory: ChatCompletionRequestMessage[] = [];
    
    const chat = await runFunctionChatCompletion(openaiApi, functionMap, userMessage, chatHistory);
    const result = chat.data.choices[0];
    let answer = result.message?.content;

    if (result.finish_reason === 'function_call') {
        answer = await handleFunctionCall(openaiApi, functionMap, chat, userMessage, chatHistory);
    }
    
    vscode.window.showInformationMessage(answer || 'failed to retrieve answer');
});