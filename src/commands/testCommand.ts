import * as vscode from 'vscode';

import { createCommand } from "@juno/command";

export const testCommand = createCommand("juno.test", async (context) => {
    vscode.window.showInformationMessage("test");
});