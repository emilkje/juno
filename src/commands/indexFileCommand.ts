import { createCommand } from '@juno/command';
import * as vscode from 'vscode';
import { LocalIndex } from 'vectra';
import {join as joinPath} from 'path';
import { createOpenAiApi } from '@juno/llm/openai';
import { OpenAIApi } from 'openai';
import { MAX_FILE_SIZE, getIndex } from '@juno/vectorization';
import { getPeristentWorkspaceFolderPath } from '@juno/common';
import { commonExcludes } from '@juno/vectorization';
import { matchUri } from '@juno/util/glob';

/**
 * Indexes the repository by creating an index, gathering all the documents
 * in the workspace, splitting the content into chunks, generating vectors for
 * each chunk, and inserting them into the index.
 *
 * @param {LocalIndex} index - The LocalIndex object used for indexing.
 * @returns {Promise<void>} - A promise that resolves when the indexing is complete.
 */
export const indexFileCommand = createCommand('juno.indexFile', async (ctx, uri:vscode.Uri) => {

    let configuration = vscode.workspace.getConfiguration('juno');

    if (!configuration.get<boolean>('activeIndexing')) {
        if(ctx.workspaceState.get<boolean>("juno.hasPromptedActiveIndexing")) {
            console.log("active indexing is disabled");
            return;
        }
    }

    if(commonExcludes.some(glob => matchUri(glob, uri))) {
        console.log("skipping excluded file", uri.path);
        return;
    }
    
    if(uri.path.startsWith(getPeristentWorkspaceFolderPath(ctx))) {
        console.log("skipping self referencing folder folder", uri.path);
        return;
    }

    // create a local filesystem index database 
    const index = getIndex();

    if (!await index.isIndexCreated()) {
        await index.createIndex();
    }

    // run the indexer asynchronously.
    await indexFile(index, uri);
});

async function indexFile(index:LocalIndex, file:vscode.Uri) {

    const api = createOpenAiApi();

    if(!api) {
        console.log("failed to get openai api");
        return;
    }

    console.log("gathering content");
    const document = await vscode.workspace.openTextDocument(file);
    const content = document.getText();
    
    if(content.length > MAX_FILE_SIZE) {
        const workspaces = vscode.workspace.workspaceFolders;
        const filePath = workspaces && workspaces.length > 0 
            ? file.path.substring(workspaces[0].uri.path.length)
            : file.path;
        vscode.window.showWarningMessage(`skipping indexing of file ${filePath} due to excessive size`);
        return;
    }

    //TODO: deleting old index

    const chunks = splitStr(content, 1000, 200);
    console.log(document.fileName, chunks.length);

    for(let i = 0; i < chunks.length; i++)
    {
        const vector = await vectorize(api, chunks[i]);
        const metadata = {
            text: content,
            page: i+1,
            languageId: document.languageId,
            fileName: document.fileName,
            filePath: file.path,
            lineCount: document.lineCount
        };

        await index.insertItem({vector, metadata});
    }

    console.log("done");
}

function splitStr(str:string, chunkSize = 1000, overlap = 0) {
    const chunks = [];
    for (let i=0; i<str.length; i += (chunkSize - overlap)) {
        chunks.push(str.substring(i, i + chunkSize));
    }
    return chunks;
}

async function vectorize(api:OpenAIApi, text: string) {
    const response = await api.createEmbedding({
        'model': 'text-embedding-ada-002',
        'input': text,
    });
    return response.data.data[0].embedding;
}
