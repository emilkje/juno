import { createCommand } from '@juno/command';
import * as vscode from 'vscode';
import { LocalIndex, MetadataTypes, QueryResult } from 'vectra';
import {join as joinPath} from 'path';
import { createOpenAiApi } from '@juno/llm/openai';
import { OpenAIApi } from 'openai';
import { createSystemMessage, initializeConversation, runConversation } from '@juno/common';

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

    const index = new LocalIndex(joinPath(ctx.extensionPath, 'vectors'));

    if (!await index.isIndexCreated()) {
        await index.createIndex();
    }

    const api = createOpenAiApi();

    if(!api) {
        console.log("failed to get openai api");
        return;
    }

    console.log("query repo")
    let userInput = await vscode.window.showInputBox({
        placeHolder: 'Query',
        prompt: 'Query the vector indexes',
        value: ''
    });

    if(!userInput) {
        return;
    }

    const results = await query(api, index, userInput, 3);
    const context = [];
    // const info = result.map(r => r.item.metadata.text).join("\n");
    for(const result of results) {
        context.push(formatResultItem(result));
    }

    const instructions = `$USER will ask both generic and specific questions that you will try to answer as best as possible. 

    Always adhere to the folling rules:
    
    1. Respond in markdown format
    2. When providing code blocks you have to qualify it with what language. e.g \`\`\`javascript or \`\`\`typescript.
    3. Always answer as $ASSISTANT and avoid using phrases as "as a large language model" etc.
    
    The following CONTEXT contains a list of files and its contents. This information is always relavant to the question.
    It is helpful to show the relevant code from this context. Do not answer questions that cannot be inferred from the context.

    If there is a specific file that is relevant to that question, ask if they want you to open it for them.
    
    CONTEXT:
    ${context.join("")}`;
    
    const systemMessage = createSystemMessage(ctx, instructions, false);
    console.log("using system message", systemMessage);

    const messages = initializeConversation(systemMessage);

    messages.push({role: 'user', content: userInput});
    
    await runConversation(ctx, messages);
});

function formatResultItem(result:QueryResult<Record<string,MetadataTypes>>): string {
    return `
filePath: ${result.item.metadata["filePath"]}
language: ${result.item.metadata["languageId"]}
content: 
${result.item.metadata["text"]}


---

`
}

async function getVector(api:OpenAIApi, text: string) {
    const response = await api.createEmbedding({
        'model': 'text-embedding-ada-002',
        'input': text,
    });
    return response.data.data[0].embedding;
}

async function query(api:OpenAIApi, index:LocalIndex, text: string, topK=3):Promise<QueryResult<Record<string, MetadataTypes>>[]> {
    const vector = await getVector(api, text);
    const results = await index.queryItems(vector, topK);
    if (results.length > 0) {
        console.log(`${results.length} records matched`);
    } else {
        console.log(`No results found.`);
    }
    
    return results;
}