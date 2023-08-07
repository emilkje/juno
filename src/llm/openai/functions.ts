import { ChatCompletionFunctions, ChatCompletionRequestMessage, CreateChatCompletionRequest, OpenAIApi } from "openai";

const model = 'gpt-3.5-turbo-0613';
const temperature = 0.2;
const systemPrompt = "You are a helpful assistant.";

interface FunctionData {
    function: (...args: any[]) => any;
    object: ChatCompletionFunctions;
}

export interface FunctionRegistry {
    [name: string]: FunctionData;
}

export async function runFunctionChatCompletion(openaiApi:OpenAIApi, functionRegistry:FunctionRegistry, userMessage: string, chatHistory: ChatCompletionRequestMessage[]) {
    const inputToOpenAIApi:CreateChatCompletionRequest = {
        model,
        temperature,
        messages: [
            { role: 'system', content: systemPrompt },
            ...chatHistory,
            { role: 'user', content: userMessage },
        ],
        functions: getFunctions(functionRegistry),
        function_call: 'auto',
    };

    return await openaiApi.createChatCompletion(inputToOpenAIApi);
}

function getFunctions(functionRegistry:FunctionRegistry):ChatCompletionFunctions[] {
    return Object.values(functionRegistry).map(f => f.object);
}

export async function handleFunctionCall(openaiApi:OpenAIApi, functionRegistry:FunctionRegistry, chat: any, userMessage: string, chatHistory: ChatCompletionRequestMessage[]): Promise<string | undefined> {
    const functionCall = chat.data.choices[0].message?.function_call;
    if (!functionCall) {
        console.error("openai indicates that it want to use a function but did not provide what function.", chat.data.choices[0].message);
        return;
    }

    const functionResult = callFunction(functionRegistry, functionCall);
    const chatWithFunction = await continueChatWithFunctionResult(openaiApi, userMessage, chatHistory, functionCall, functionResult);
    return chatWithFunction.data.choices[0].message?.content;
}

function callFunction(functionRegistry:FunctionRegistry, functionCall: any): any {
    if (!functionCall || !functionCall.name || !functionRegistry[functionCall.name]) {
        console.error("Function call name is not available or not registered in functionRegistry", functionCall);
        return {};
    }

    const args = JSON.parse(functionCall.arguments) as any;
    const functionToCall = functionRegistry[functionCall.name].function;
    return functionToCall(args);
}

async function continueChatWithFunctionResult(openaiApi:OpenAIApi, userMessage: string, chatHistory: ChatCompletionRequestMessage[], functionCall: any, functionResult: any) {
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