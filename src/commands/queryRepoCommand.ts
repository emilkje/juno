import { createCommand } from '@juno/command';
import * as vscode from 'vscode';
import { LocalIndex } from 'vectra';
import {join as joinPath} from 'path';
import { InferenceOptions, conversation, createOpenAiApi } from '@juno/llm/openai';
import * as vectors from '@juno/vectorization';
import { createSystemMessage, getPeristentWorkspaceFolderPath, initializeConversation, runConversation } from '@juno/common';
import { createResultPanel } from '@juno/ui/panel';
import { ChatCompletionRequestMessage } from 'openai';
import { FunctionRegistry, continueChatWithFunctionResult, handleFunctionCall, runFunctionChatCompletion, runFunctionExecutionLoop } from '@juno/llm/openai/functions';
import { marked } from 'marked';



// Then define the function with its associated function object
const functionMap: FunctionRegistry = {
    "getContext": {
        function: async ({query}: {query: string}): Promise<string> => {
            console.log("querying vectors: ", query)
            const api = createOpenAiApi();
            const index = vectors.getIndex();
            const result = await vectors.search(api, index, query, 3);
            const context = vectors.filesContextFormatter.format(result);
            return context;
        },
        object: {
            name: "getContext",
            description: "Search the repository for additional context",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: 'keyword to search for',
                    },
                },
                required: ["query"],
            }
        },
        displayExecution({query}: {query:string}): string {
            return `gathering data: <span class="keyword">${query.split(" ").join('</span><span class="keyword">')}</span>`;
        }
    }
    // add other functions here as needed
};

/**
 * Executes a query on the vector indexes of the repository.
 *
 * This command prompts the user to input a query and queries the vector indexes of the repository
 * using the provided query. The query results are displayed to the user in the VS Code output window.
 *
 * @param ctx - The context object containing information about the extension.
 *
 * @returns A Promise that resolves when the query is completed.
 */
export const queryRepoCommand = createCommand('juno.queryRepo', async (ctx) => {

    const api = createOpenAiApi();

    const workspacePath = getPeristentWorkspaceFolderPath(ctx);
    const index = new LocalIndex(joinPath(workspacePath, 'vectors'));

    if (!await index.isIndexCreated()) {
        await vscode.window.showInformationMessage(
            "Vector database needs to be indexed first", 
            "Create Index")
            .then(async (choice) => {
                if(choice === "Create Index") {
                    await vscode.commands.executeCommand("juno.indexRepo");
                }
            });

        return;
    }

    let userInput = await vscode.window.showInputBox({
        placeHolder: 'Query',
        prompt: 'Ask a question or give an instruction',
        value: ''
    });

    if(!userInput) {
        return;
    }

    const systemMessage = `You are a helpful assistant. You are to answer the users question as best as possible while respecting the following rules:

1. Do not make up an answer
2. Use the available functions to retrieve information
3. Continue search for information until you can confidently answer the question

IMPORTANT: Do not answer the question without retrieving context`

    const userMessage = `Use the getContext function to search the code base for information to answer the following question. Please present relevant code blocks if appropriate. If you are not confident in your answer, you can use the getContext function multiple times with new queries to help you get more information. Do not reference the getContext function in your answer.\n\nQuestion: ${userInput}`
    
    await runFunctionExecutionLoop(api, systemMessage, userMessage, functionMap);
});