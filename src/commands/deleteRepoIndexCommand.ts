import { createCommand } from '@juno/command';
import * as vscode from 'vscode';
import { LocalIndex } from 'vectra';
import {join as joinPath} from 'path';

/**
 * Indexes the repository by creating an index, gathering all the documents
 * in the workspace, splitting the content into chunks, generating vectors for
 * each chunk, and inserting them into the index.
 *
 * @param {LocalIndex} index - The LocalIndex object used for indexing.
 * @returns {Promise<void>} - A promise that resolves when the indexing is complete.
 */
export const deleteRepoIndexCommand = createCommand('juno.deleteRepoIndex', async (ctx, uri:vscode.Uri) => {

    // create a local filesystem index database 
    const index = new LocalIndex(joinPath(ctx.extensionPath, 'vectors'));

    if (await index.isIndexCreated()) {
        await index.deleteIndex();
    }

    vscode.window.showInformationMessage("Vector index deleted")
});