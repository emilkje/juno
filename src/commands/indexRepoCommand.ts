import { createCommand } from '@juno/command';
import * as vscode from 'vscode';
import { LocalIndex } from 'vectra';
import {join as joinPath} from 'path';
import { createOpenAiApi } from '@juno/llm/openai';
import { OpenAIApi } from 'openai';

// list of globs to include
const includes = ['**/*.*']

// list of globs to exclude
const excludes = [
    '**/node_modules/**',
    '**/out/**',
    '**/vectors/**',
    '**/package-lock.json'
]

export const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

/**
 * Indexes the repository by creating an index, gathering all the documents
 * in the workspace, splitting the content into chunks, generating vectors for
 * each chunk, and inserting them into the index.
 *
 * @param {LocalIndex} index - The LocalIndex object used for indexing.
 * @returns {Promise<void>} - A promise that resolves when the indexing is complete.
 */
export const indexRepoCommand = createCommand('juno.indexRepo', async (ctx) => {

    // create a local filesystem index database 
    const index = new LocalIndex(joinPath(ctx.extensionPath, 'vectors'));

    if (!await index.isIndexCreated()) {
        await index.createIndex();
    }

    // run the indexer asynchronously
    indexRepository(index);
});

function updateStatus(currentDoc:number, totalDoc:number) {
    const value = Math.round((100 * currentDoc) / totalDoc);
    statusBar.text = `Juno indexing: ${value}%`;
    statusBar.show();
 } 

async function indexRepository(index:LocalIndex) {
    const api = createOpenAiApi();

    if(!api) {
        console.log("failed to get openai api");
        return;
    }

    console.log("gathering documents")
    const files = await vscode.workspace.findFiles(
        `{${includes.join(',')}}`, 
        `{${excludes.join(',')}}`
    );

    console.log("saving vectors")
    let cancelled = false;
    vscode.window.showInformationMessage(`indexing ${files.length} files`, "Cancel").then(c => {
        if(c === "Cancel") {
            cancelled = true;
        }
    });
    
    let currentDocCount = 0;
    const items = [];
    for(const file of files) {
        const document = await vscode.workspace.openTextDocument(file);
        const content = document.getText();

        const chunks = splitStr(content, 1000, 200);
        console.log(document.fileName, chunks.length);
        
        for(let i = 0; i < chunks.length; i++)
        {
            // const vector = await vectorize(api, chunks[i]);
            const metadata = {
                text: chunks[i],
                page: i+1,
                languageId: document.languageId,
                fileName: document.fileName,
                filePath: file.path,
                lineCount: document.lineCount
            };
            items.push(metadata);

            // await index.insertItem({vector, metadata});
        }
    }

    console.log(`indexing ${items.length} chunks`);
        
    for(const i of items) {
        
        if(cancelled) {
            vscode.window.showWarningMessage(
                "Repository did not finish indexing and you will experience degraded query capabilities.",
                "Delete partial index").then(c => {
                    if(c === "Delete partial index") {
                        vscode.commands.executeCommand("juno.deleteRepoIndex");
                    }
                });
            statusBar.hide();
            return;
        }

        updateStatus(currentDocCount++, items.length);
        const vector = await vectorize(api, i.text);
        await index.insertItem({vector, metadata: i})
    }

    statusBar.hide();
    
    vscode.window.showInformationMessage(
        "Successfully indexed repository. You can now query the repository using semantic search", 
        "Try it!")
        .then(choice => {
            if(choice === "Try it!") {
                vscode.commands.executeCommand("juno.queryRepo");
            }
        });
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
