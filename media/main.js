//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    // @ts-ignore 
    const vscode = acquireVsCodeApi();

    const oldState = vscode.getState() || { prompt: "" };

    /** @type {string} */
    let prompt = oldState.prompt;

    updatePrompt(prompt);

    // @ts-ignore 
    document.querySelector('.submit').addEventListener('click', () => {
        submit();
    });

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        console.log(message);
        switch (message.type) {
            case 'clearPrompt':
                {
                    clearPrompt();
                    break;
                }
        }
    });

    /**
     * @param {string} prompt
     */
    function updatePrompt(prompt) {
        if(!prompt) {
            return;
        }

        const textarea = document.querySelector(".prompt");

        if (textarea instanceof HTMLTextAreaElement) {
            textarea.value = prompt;

            // Update the saved state
            vscode.setState({ prompt: prompt });
        }
    }

    function submit() {
        const element = document.querySelector(".prompt");

        if (element instanceof HTMLTextAreaElement) {
            updatePrompt(element.value);
            vscode.postMessage({ type: 'submit', value: element.value });
        }
    }

    function clearPrompt() {
        const element = document.querySelector(".prompt");

        if (element instanceof HTMLTextAreaElement) {
            element.value = "";
            updatePrompt("");
        }
    }
}());

