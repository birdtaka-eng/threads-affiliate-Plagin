// content.js - Handling text insertion on Threads

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "insertText") {
        insertTextToEditor(request.text)
            .then(() => sendResponse({ success: true }))
            .catch((err) => sendResponse({ success: false, error: err.message }));
        return true; // async response
    }
});

async function insertTextToEditor(text) {
    console.log("[Threads Assistant] Attempting to insert text...");

    // 1. Find the editor
    // Threads often uses div[contenteditable="true"]
    // Also checking role="textbox" just in case
    const selectors = [
        'div[contenteditable="true"]',
        'div[role="textbox"][contenteditable="true"]',
        'div[data-lexical-editor="true"]'
    ];

    let editor = null;
    for (const sel of selectors) {
        editor = document.querySelector(sel);
        if (editor) break;
    }

    // 2. If not found, try to click the placeholder to "wake up" the editor
    if (!editor) {
        console.log("[Threads Assistant] Editor not found, looking for placeholder...");
        // "Start a thread..." or "スレッドを開始..." (Japanese)
        const placeholders = Array.from(document.querySelectorAll('div, span'))
            .filter(el => {
                const tx = el.innerText || "";
                return tx.includes("Start a thread") || tx.includes("スレッドを開始");
            });

        if (placeholders.length > 0) {
            placeholders[0].click();
            // Wait a moment for editor to appear
            await new Promise(r => setTimeout(r, 500));
            // Try finding editor again
            for (const sel of selectors) {
                editor = document.querySelector(sel);
                if (editor) break;
            }
        }
    }

    if (!editor) {
        alert("投稿ボックスが見つかりません。「スレッドを開始」を一度クリックしてください。");
        throw new Error("Editor not found");
    }

    // 3. Insert Text
    editor.focus();

    // Using execCommand is reliable for Lexical/RichText editors to trigger internal state updates
    const result = document.execCommand('insertText', false, text);

    if (!result) {
        // Fallback
        editor.innerText = text;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    }

    console.log("[Threads Assistant] Text inserted successfully.");
}
