import { ChatCompletionFunctions, ChatCompletionRequestMessage, CreateChatCompletionRequest, OpenAIApi } from "openai";

const model = 'gpt-3.5-turbo-0613';
const temperature = 0.2;
const systemPrompt = "You are a helpful assistant. You will be tasked to answer questions and you are to answer using only the available functions. Do noe provide information that is not received from the functions.";

export interface FunctionData {
    function: (...args: any[]) => Promise<any>;
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
            ...chatHistory,
            { role: 'user', content: userMessage },
        ],
        functions: getFunctions(functionRegistry),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        function_call: 'auto',
    };

    return await openaiApi.createChatCompletion(inputToOpenAIApi);
}

function getFunctions(functionRegistry:FunctionRegistry):ChatCompletionFunctions[] {
    return Object.values(functionRegistry).map(f => f.object);
}

export type FunctionResponse = {
    result: string | undefined,
    functionName: any,
};

export async function handleFunctionCall(openaiApi:OpenAIApi, functionRegistry:FunctionRegistry, chat: any, userMessage: string, chatHistory: ChatCompletionRequestMessage[]): Promise<FunctionResponse | undefined> {
    const functionCall = chat.data.choices[0].message?.function_call;
    if (!functionCall) {
        console.error("openai indicates that it want to use a function but did not provide what function.", chat.data.choices[0].message);
        return;
    }

    const functionResult = await callFunction(functionRegistry, functionCall);
    console.log("received function result", functionResult);
    return {
        result: functionResult,
        functionName: functionCall
    };
}

async function callFunction(functionRegistry:FunctionRegistry, functionCall: any): Promise<any> {
    if (!functionCall || !functionCall.name || !functionRegistry[functionCall.name]) {
        console.error("Function call name is not available or not registered in functionRegistry", functionCall);
        return {};
    }

    const args = JSON.parse(functionCall.arguments) as any;
    console.log("calling function", functionCall, "with arguments", args);
    const functionToCall = functionRegistry[functionCall.name].function;
    return await functionToCall(args);
}

export async function continueChatWithFunctionResult(openaiApi:OpenAIApi, userMessage: string, chatHistory: ChatCompletionRequestMessage[], response:FunctionResponse) {
    const serializedFunctionResult = JSON.stringify(response.result);
    const chatCompletionRequest:CreateChatCompletionRequest = {
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            ...chatHistory,
            { role: 'user', content: userMessage },
            { role: "function", name: response.functionName.name, content: serializedFunctionResult }, // needs to be JSON encoded
        ],
    };
    
    return await openaiApi.createChatCompletion(chatCompletionRequest);
}

export function appendFunctionResult(openaiApi:OpenAIApi, userMessage: string, chatHistory: ChatCompletionRequestMessage[], response:FunctionResponse) {
    const serializedFunctionResult = JSON.stringify(response.result);
    const chatCompletionRequest:CreateChatCompletionRequest = {
        model,
        messages: [
            ...chatHistory,
            { role: 'user', content: userMessage },
            { role: "function", name: response.functionName.name, content: serializedFunctionResult }, // needs to be JSON encoded
        ],
    };

    return chatCompletionRequest;
}