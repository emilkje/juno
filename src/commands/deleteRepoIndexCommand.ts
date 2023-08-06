import { createCommand } from '@juno/command';
import * as vscode from 'vscode';
import { LocalIndex } from 'vectra';
import {join as joinPath} from 'path';
import { getPeristentWorkspaceFolderPath } from '@juno/common';

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
    const vectorPath = joinPath(getPeristentWorkspaceFolderPath(ctx), 'vectors');
    const index = new LocalIndex(vectorPath);

    if (await index.isIndexCreated()) {
        await index.deleteIndex();
    }

    vscode.window.showInformationMessage("Vector index deleted");
});