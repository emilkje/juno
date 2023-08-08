import { getExtensionContext } from "@juno/common";
import { createResultPanel } from "@juno/ui/panel";
import { IncomingMessage } from "http";
import { ChatCompletionFunctions, ChatCompletionRequestMessage, CreateChatCompletionRequest, CreateChatCompletionResponse, OpenAIApi } from "openai";
import { InferenceOptions } from ".";
import { marked } from "marked";

const model = 'gpt-3.5-turbo-0613';
const temperature = 0;
const systemPrompt = "You are a helpful assistant. You will be tasked to answer questions and you are to answer using only the available functions. Do noe provide information that is not received from the functions.";

export interface FunctionData {
    function: (...args: any[]) => Promise<any>;
    object: ChatCompletionFunctions;
    displayExecution: (...args: any[]) => string;
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
    const functionToCall = functionRegistry[functionCall.name].function;

    const ctx = getExtensionContext();
    const panel = await createResultPanel(ctx.extensionUri, ctx.extensionPath);

    const panelOutput = functionRegistry[functionCall.name].displayExecution(args);
    panel.webview.postMessage({type: 'stream.function_call', content: panelOutput});
    return await functionToCall(args);
}

export async function continueChatWithFunctionResult(openaiApi:OpenAIApi, userMessage: string, chatHistory: ChatCompletionRequestMessage[], response:FunctionResponse, functionRegistry:FunctionRegistry, options?:InferenceOptions): Promise<string> {
    
    const messages:ChatCompletionRequestMessage[] = [
        ...chatHistory, 
        {role: 'user', content: userMessage}, 
        createFunctionResponseMessage(response)
    ];
    
    console.log(messages);
    const request:CreateChatCompletionRequest = {
        model,
        messages,
        functions: getFunctions(functionRegistry),
        function_call: 'auto',
        stream: true,
    };
    
    let buffer:Array<string> = [];

    return new Promise(async (resolve, reject) => {

        openaiApi.createChatCompletion(request, {responseType: 'stream'}).then(chatCompletion => {
            const stream = chatCompletion.data as unknown as IncomingMessage;
    
            stream.on('data', (chunk:Buffer) => {
                const payloads = chunk.toString().split("\n\n");
                for(const payload of payloads) {
                    if(payload.includes("[DONE]")) {
                        options?.onDidEnd?.(buffer.toString());
                        resolve(buffer.toString());
                        return;
                    }
    
                    if (payload.startsWith("data:")) {
                        try {
                            const data = JSON.parse(payload.replace("data: ", ""));
                            const chunk: undefined | string = data.choices[0].delta?.content;
                            if (chunk) {
                                buffer.push(chunk);
                                options?.onDidReceiveChunk?.(chunk);
                                options?.onDidUpdate?.(buffer.join(""));
                            }
                        } catch (error) {
                            options?.onError?.(error);
                            console.log(`Received error ${payload}.\n${error}`);
                            reject(error);
                        }
                    }
                }
            });
        });
    })

}

export function createFunctionResponseMessage(response:FunctionResponse): ChatCompletionRequestMessage {
    return { 
        role: "function", 
        name: response.functionName.name, 
        content: JSON.stringify(response.result) // needs to be JSON encoded
    }
}

export async function runFunctionExecutionLoop(api:OpenAIApi, systemMessage:string, userMessage:string, functions:FunctionRegistry) {

    const chatHistory: ChatCompletionRequestMessage[] = [
        {role: 'system', content: systemMessage}
    ];
    
    const ctx = getExtensionContext();
    const panel = await createResultPanel(ctx.extensionUri, ctx.extensionPath);
    const options:InferenceOptions = {
		onDidUpdate: (content) => {
			const result = marked.parse(content, {headerIds: false, mangle: false});
			panel.webview.postMessage({type: 'stream.update', content: result});
		},
		onDidEnd: () => panel.webview.postMessage({type: 'stream.end'})
	};
    
    const chat = await runFunctionChatCompletion(api, functions, userMessage, chatHistory);
    const result = chat.data.choices[0];
    let answer = result.message?.content;

    if (result.finish_reason === 'function_call') {
        console.log("executing function");
        const result = await handleFunctionCall(api, functions, chat, userMessage, chatHistory);
        
        if(result) {
            answer = await continueChatWithFunctionResult(api, userMessage, chatHistory, result, functions, options);
        }
    } else {
        console.log("no function call executed");
        if(answer) {
            const panel = await createResultPanel(ctx.extensionUri, ctx.extensionPath);
            panel.webview.postMessage({type: "stream.update", content: marked(answer)});
        }
    }
}