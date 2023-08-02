//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent

        switch (message.type) {
            case 'chunk':
                {
                    hideLoading();
                    addChunk(message.content);
                    break;
                }
            case 'stream.update':
                {
                    hideLoading();
                    updateContent(message.content);
                    break;
                }
            case 'stream.start':
                {
                    clearResults();
                    showLoading();
                    break;
                }
        }
    });

    function addChunk(chunk) {
        const element = document.querySelector(".result");
        
        if (!element) {
            return;
        }

        const existingText = element.innerHTML || "";
        element.innerHTML = `${existingText} ${chunk}`;
    }

    function updateContent(content) {
        const element = document.querySelector(".result");

        if(!element) {
            return;
        }

        element.innerHTML = `${content}`;
    }

    function clearResults() {
        const element = document.querySelector(".result");
        
        if (!element) {
            return;
        }

        element.innerHTML = "";
    }

    function hideLoading() {
        const loading = document.querySelector(".loading");

        if (loading instanceof HTMLElement) {
            loading.style.display = "none";
            return;
        }
    }

    function showLoading() {
        const loading = document.querySelector(".loading");

        if (loading instanceof HTMLElement) {
            loading.style.display = "block";
            return;
        }
    }
    
}());

