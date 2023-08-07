import * as vscode from 'vscode';
import { ChatCompletionFunctions, ChatCompletionRequestMessage, CreateChatCompletionRequest } from 'openai';
import { createCommand } from '@juno/command';
import { createOpenAiApi } from '@juno/llm/openai';

const openaiApi = createOpenAiApi();
const model = 'gpt-3.5-turbo-0613';
const temperature = 0.2;
const systemPrompt = "You are a helpful assistant.";

interface FunctionData {
    function: (...args: any[]) => any;
    object: ChatCompletionFunctions;
}

interface FunctionMap {
    [name: string]: FunctionData;
}

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
const functionMap: FunctionMap = {
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
    
    const chat = await runChatCompletion(userMessage, chatHistory);
    const result = chat.data.choices[0];
    let answer = result.message?.content;

    if (result.finish_reason === 'function_call') {
        answer = await handleFunctionCall(chat, userMessage, chatHistory);
    }
    
    vscode.window.showInformationMessage(answer || 'failed to retrieve answer');
});

async function runChatCompletion(userMessage: string, chatHistory: ChatCompletionRequestMessage[]) {
    const inputToOpenAIApi:CreateChatCompletionRequest = {
        model,
        temperature,
        messages: [
            { role: 'system', content: systemPrompt },
            ...chatHistory,
            { role: 'user', content: userMessage },
        ],
        functions: getFunctions(),
        function_call: 'auto',
    };

    return await openaiApi.createChatCompletion(inputToOpenAIApi);
}

function getFunctions():ChatCompletionFunctions[] {
    return Object.values(functionMap).map(f => f.object);
}

async function handleFunctionCall(chat: any, userMessage: string, chatHistory: ChatCompletionRequestMessage[]): Promise<string | undefined> {
    const functionCall = chat.data.choices[0].message?.function_call;
    if (!functionCall) {
        console.error("openai indicates that it want to use a function but did not provide what function.", chat.data.choices[0].message);
        return;
    }

    const functionResult = callFunction(functionCall);
    const chatWithFunction = await continueChatWithFunctionResult(userMessage, chatHistory, functionCall, functionResult);
    return chatWithFunction.data.choices[0].message?.content;
}

function callFunction(functionCall: any): any {
    if (!functionCall || !functionCall.name || !functionMap[functionCall.name]) {
        console.error("Function call name is not available or not registered in functionMap", functionCall);
        return {};
    }

    const args = JSON.parse(functionCall.arguments) as any;
    const functionToCall = functionMap[functionCall.name].function;
    return functionToCall(args);
}

async function continueChatWithFunctionResult(userMessage: string, chatHistory: ChatCompletionRequestMessage[], functionCall: any, functionResult: any) {
    const serializedFunctionResult = JSON.stringify(functionResult);
    const chatCompletionRequest:CreateChatCompletionRequest = {
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            ...chatHistory,
            { role: 'user', content: userMessage },
            { role: "function", name: functionCall.name, content: serializedFunctionResult }, // needs to be JSON encoded
        ],
    };
    
    return await openaiApi.createChatCompletion(chatCompletionRequest);
}