import * as vscode from 'vscode';
import { ChatCompletionFunctions, ChatCompletionRequestMessage, CreateChatCompletionRequest } from 'openai';
import { createCommand } from '@juno/command';
import { createOpenAiApi } from '@juno/llm/openai';
import { FunctionRegistry, continueChatWithFunctionResult, handleFunctionCall, runFunctionChatCompletion } from '@juno/llm/openai/functions';

const openaiApi = createOpenAiApi();

interface Animal {
    name: string,
    sound: string
}

interface AnimalInformation {
    cat: Animal,
    dog: Animal,
    [key: string]: Animal | undefined // Allow any string as index and the value should be StaffPosition or undefined
}

// Then define the function with its associated function object
const functionMap: FunctionRegistry = {
    "getAnimal": {
        function: async ({animalType}: {animalType: string}): Promise<Animal> => {
            const animalInformation: AnimalInformation = {
                'cat': { name: 'Mr. Whiskers', sound: 'meow' },
                'dog': { name: 'Lassie', sound: 'woof!' },
            };
            
            return animalInformation[animalType] || { name: 'No name found', sound: 'Not found' };
        },
        object: {
            name: "getAnimal",
            description: "Get the information about an animal",
            parameters: {
                type: "object",
                properties: {
                    animalType: {
                        type: "string",
                        description: 'The type of animal. E.g. "cat" or "dog"',
                    },
                },
                required: ["animalType"],
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

    const userMessage = "please give me information about cat";
    const chatHistory: ChatCompletionRequestMessage[] = [
        {role: 'system', content: 'You are a helpful assistant. You will be tasked to answer questions and you are to answer using only the available functions. Do noe provide information that is not received from the functions.'}
    ];
    
    const chat = await runFunctionChatCompletion(openaiApi, functionMap, userMessage, chatHistory);
    const result = chat.data.choices[0];
    let answer = result.message?.content;

    if (result.finish_reason === 'function_call') {
        const result = await handleFunctionCall(openaiApi, functionMap, chat, userMessage, chatHistory);
        
        if(result) {
            const chatWithFunction = await continueChatWithFunctionResult(openaiApi, userMessage, chatHistory, result);
            answer = chatWithFunction.data.choices[0].message?.content;
        }
    }
    
    vscode.window.showInformationMessage(answer || 'failed to retrieve answer');
});