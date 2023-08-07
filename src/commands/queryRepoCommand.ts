import { createCommand } from '@juno/command';
import * as vscode from 'vscode';
import { LocalIndex } from 'vectra';
import {join as joinPath} from 'path';
import { conversation, createOpenAiApi } from '@juno/llm/openai';
import * as vectors from '@juno/vectorization';
import { createSystemMessage, getPeristentWorkspaceFolderPath, initializeConversation, runConversation } from '@juno/common';
import { createResultPanel } from '@juno/ui/panel';

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

    // vscode.window.showInformationMessage("gathering relevant information...");
    const panel = await createResultPanel(ctx.extensionUri, ctx.extensionPath);
    panel.webview.postMessage({type: 'strem.start'});

    const results = await vectors.search(api, index, userInput, 3);
    const context = vectors.filesContextFormatter.format(results);

    let instructions = `Given the information provided by $USER, please extract keywords relevant for for a search to discover additional important infomration (such as important dependencies and references). Extract the keywords without formatting, only newlines between the items. Keep the list as short as possible and prioritize the 3 most important items to answer the following question: ${userInput}`;
    
    let systemMessage = createSystemMessage(ctx, instructions, false);
    console.log("using system message", systemMessage);

    let messages = initializeConversation(systemMessage);
    messages.push({role: 'user', content: context});
    
    const additionalInfoQuery = await conversation(api, messages);

    console.log('querying for additional info');
    console.log(additionalInfoQuery);

    const additionalInfo = await vectors.search(api, index, additionalInfoQuery);
    const additionalContext = vectors.filesContextFormatter.format(additionalInfo);
    console.log("received additional context", additionalContext);
    
    instructions = `$USER will ask specific questions related to the following CONTEXT that you will try to answer as best as possible. 

    Always adhere to the folling rules:
    
    1. Respond in markdown format
    2. When providing code blocks you have to qualify it with what language. e.g \`\`\`javascript or \`\`\`typescript.
    3. Always answer as $ASSISTANT and avoid using phrases as "as a large language model" etc.
    
    The following CONTEXT contains a list of files and its contents. This information is always relavant to the question.
    It is helpful to show the relevant code from this context. Do not answer questions that cannot be inferred from the context.
    $USER might provide additional context in their messages, use this information as well when formulating an answer.
    
    CONTEXT:
    ${context}`;
    
    systemMessage = createSystemMessage(ctx, instructions, false);
    messages = initializeConversation(systemMessage);

    messages.push({role: 'user', content: `Question: ${userInput}\n\n Additional Context: ${additionalContext}`});
    await runConversation(ctx, messages);
});