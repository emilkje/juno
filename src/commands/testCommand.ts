import * as vscode from 'vscode';

import { createCommand } from "@juno/command";

export const testCommand = createCommand("juno.test", async (context) => {
    vscode.window.showInformationMessage(
        "Successfully indexed repository. You can now query the repository using semantic search", 
        "Try it!")
        .then(choice => {
            if(choice === "Try it!") {
                vscode.commands.executeCommand("juno.queryRepo");
            }
        });
});