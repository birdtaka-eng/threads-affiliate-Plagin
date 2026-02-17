// --- Auto-Injection on Load ---
(async function init() {
    console.log("[Threads職人] Gem script initialized. Checking for auto-prompt...");

    // Slight delay to let the page stabilize
    await new Promise(r => setTimeout(r, 2000));

    chrome.storage.local.get(['unifiedPrompt', 'autoInjectOnWake'], async (res) => {
        if (res.autoInjectOnWake && res.unifiedPrompt) {
            console.log("[Threads職人] Auto-injecting unified prompt...");
            const editor = await waitForEditor();
            if (editor) {
                editor.focus();
                // We don't have an image for initial brew, just text
                injectTextOnly(editor, res.unifiedPrompt);
            }
        }
    });
})();

function injectTextOnly(editor, text) {
    try {
        const dt = new DataTransfer();
        dt.setData("text/plain", text);
        const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: dt
        });
        editor.dispatchEvent(pasteEvent);
        console.log("[Threads職人] Text-only injection success.");
    } catch (e) {
        editor.innerText = text;
    }
}

// --- Message Listener for Background Relay (Action-based) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "paste_ai_data") {
        handleAiPaste(request.images, request.prompt);
        sendResponse({ success: true });
        return true;
    }
});

async function handleAiPaste(images, prompt) {
    console.log("[Threads職人] AI Data Received. Images:", images ? (Array.isArray(images) ? images.length : 1) : 0);

    const editor = await waitForEditor();
    if (!editor) {
        console.error("[Threads職人] Gemini editor not found.");
        return;
    }

    editor.focus();

    try {
        const dt = new DataTransfer();

        // 1. Process Images (Array or Single)
        const imageList = Array.isArray(images) ? images : (images ? [images] : []);

        for (let i = 0; i < imageList.length; i++) {
            const b64 = imageList[i];
            const resp = await fetch(b64);
            const blob = await resp.blob();
            const file = new File([blob], `capture_${i}.png`, { type: "image/png" });
            dt.items.add(file);
        }

        // 2. Add prompt text
        dt.setData("text/plain", prompt);

        // 3. Trigger FAKE PASTE event
        const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: dt
        });

        editor.dispatchEvent(pasteEvent);
        console.log("[Threads職人] Multi-Paste success.");
    } catch (e) {
        console.error("[Threads職人] Multi-Paste failed:", e);
        editor.innerText = prompt;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

// --- Result Monitoring & Scraping ---
let lastProcessedText = "";

setInterval(() => {
    monitorResults();
}, 3000);

async function monitorResults() {
    const stopButton = document.querySelector('button[aria-label="Stop generation"]');
    if (stopButton) {
        console.log("[Threads職人] Gemini is generating...");
        return;
    }

    // Find the last response
    const responses = document.querySelectorAll('.message-content, .model-response-text');
    if (responses.length === 0) return;

    const lastResponse = responses[responses.length - 1];
    const currentHTML = lastResponse.innerHTML;
    const currentText = lastResponse.innerText;

    // Check if new and stable
    if (currentText === lastProcessedText || currentText.length < 50) return;

    console.log("[Threads職人] New response detected. Analyzing variations...");
    lastProcessedText = currentText;

    // Variations are often numbered 1. to 8.
    const variations = splitVariations(lastResponse);

    if (variations.length > 0) {
        chrome.runtime.sendMessage({
            action: "updateVariations",
            gemUrl: window.location.href,
            variations: variations
        });
    }
}

function splitVariations(rootEl) {
    const results = [];
    // We try to find patterns like "1. ", "2. ", etc. 
    // Often Gemini puts them in <li> or just as text blocks.

    // Simplest approach: Look for blocks starting with numbers
    const text = rootEl.innerText;
    const items = text.split(/\n(?=[1-8]\.|\d+\.\s+)/); // Split before "1. ", "2. ", etc.

    items.forEach(item => {
        const clean = item.trim();
        if (clean.length > 10 && /\d+\./.test(clean.substring(0, 5))) {
            // Keep the HTML snippet for this part if possible
            // For now, let's wrap the text in <p> to preserve some structure
            results.push(clean.replace(/\n/g, '<br>'));
        }
    });

    return results.slice(0, 8); // Max 8 per sister
}

async function waitForEditor(retryCount = 20) {
    const selectors = [
        'div[contenteditable="true"]',
        'div[role="textbox"]',
        'textarea'
    ];
    for (let i = 0; i < retryCount; i++) {
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) return el;
        }
        await new Promise(r => setTimeout(r, 500));
    }
    return null;
}
