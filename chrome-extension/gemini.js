// --- Auto-Injection on Load ---
(async function init() {
    console.log("[Threads職人] Gem script initialized. Auto-inject disabled — use ② buttons.");
    // Auto-inject removed: prompts are now sent manually via the ② buttons in the sidebar
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

// --- Phase 2: Persona Prompt Injection & Monitoring (Split Flow) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "run_gemini_setup") {
        handleSetupFlow(request.persona, request.overridePrompt);
        sendResponse({ success: true });
        return true;
    }
    if (request.action === "run_gemini_product") {
        handleProductFlow(request.persona, request.productData);
        sendResponse({ success: true });
        return true;
    }
});

async function handleSetupFlow(personaId, overridePrompt) {
    console.log(`[Threads職人] Starting SETUP flow for: ${personaId}`);

    let prompt = overridePrompt;

    if (!prompt) {
        const res = await chrome.storage.local.get(['unifiedPrompt']);
        prompt = res.unifiedPrompt;
    }

    if (!prompt) {
        prompt = getSetupPrompt(personaId);
    }

    await injectAndSend(prompt);
}

async function handleProductFlow(personaId, product) {
    console.log(`[Threads職人] Starting PRODUCT flow for: ${personaId}`);

    // 1. Prepare Prompt (Text)
    const prompt = getProductPrompt(product);

    // 2. Prepare Images (Base64 from BG or Fallback to URLs)
    const images = product.images || product.imageUrls || [];

    // 3. Inject (Images + Text)
    if (images.length > 0) {
        await injectImagesAndText(images, prompt);
    } else {
        await injectAndSend(prompt);
    }

    // 4. Start Monitoring
    monitorGeneration(personaId);
}

async function injectImagesAndText(images, text) {
    console.log("[Threads職人] Injecting Images + Text...", images.length);
    const editor = await waitForEditor();
    if (!editor) return;

    editor.focus();

    try {
        const dt = new DataTransfer();

        // A. Add Images
        for (let i = 0; i < images.length; i++) {
            try {
                const imgData = images[i];
                let blob;

                if (imgData.startsWith('data:')) {
                    // Base64 to Blob
                    const res = await fetch(imgData);
                    blob = await res.blob();
                } else {
                    // URL Fallback (Likely to fail in ContentScript if CORS)
                    const res = await fetch(imgData);
                    blob = await res.blob();
                }

                const file = new File([blob], `image_${i}.png`, { type: "image/png" });
                dt.items.add(file);
            } catch (e) {
                console.error("Failed to process image:", i, e);
            }
        }

        // B. Add Text
        dt.setData("text/plain", text);

        // C. Dispatch Paste
        const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: dt
        });
        editor.dispatchEvent(pasteEvent);
        console.log("[Threads職人] Image Paste Dispatched.");

        // Wait for upload?
        await new Promise(r => setTimeout(r, 2000));

    } catch (e) {
        console.error("Image injection failed:", e);
        // Fallback to text only
        injectTextViaPaste(editor, text);
    }

    await clickSendButton();
}

async function injectAndSend(prompt) {
    // 1. Find Editor
    const editor = await waitForEditor();
    if (!editor) {
        console.error("Editor not found");
        return;
    }

    // 2. Clear & Focus
    try { editor.focus(); } catch (e) { }
    editor.innerHTML = '';
    editor.innerText = '';
    await new Promise(r => setTimeout(r, 100));

    // 3. Inject
    const success = injectTextViaPaste(editor, prompt);
    if (!success) {
        editor.innerText = prompt;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // 4. Send
    await clickSendButton();
}

function injectTextViaPaste(editor, text) {
    console.log("[Threads職人] Attempting injection...");

    // 1. execCommand (Best Simulation)
    try {
        editor.focus();
        const success = document.execCommand('insertText', false, text);
        if (success) {
            console.log("[Threads職人] Injection Method: execCommand (Success)");
            return true;
        }
    } catch (e) {
        console.warn("execCommand failed:", e);
    }

    // 2. ClipboardEvent (Synthetic Paste)
    try {
        const dt = new DataTransfer();
        dt.setData("text/plain", text);
        const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: dt
        });
        editor.dispatchEvent(pasteEvent);
        console.log("[Threads職人] Injection Method: ClipboardEvent (Dispatched)");
        return true; // We assume dispatch works
    } catch (e) {
        console.warn("Paste event failed:", e);
    }

    // 3. Fallback: InnerText (Last Resort)
    try {
        console.log("[Threads職人] Injection Method: InnerText (Fallback)");
        editor.innerText = text;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
    } catch (e) {
        console.error("All injection methods failed:", e);
        return false;
    }
}

// --- Prompt Builders ---
function getSetupPrompt(personaId) {
    return `
【共通ルール】
・「普通の言葉」禁止：素敵、可愛い、コスパ、便利、おすすめ、楽天、安い、激安は使用禁止。
・感情の増幅：語彙力を失う、正気を疑う、理性が飛ぶ、視覚の暴力、生活感への憎悪などを使用。
・LaTeX禁止：数式などは使わず、プレーンなテキストと適切な改行で構成。
・絵文字禁止（Threads投稿のみ）。
・スレッズ投稿文には「プロフに飛べるリンク（タグ）を含んだ誘導文」を末尾に添えて、投稿を作成
・私のプロフリンク　@purin201010

【出力形式（厳守）】
以下の形式で出力してください。

---
① パターン1
(本文)
プロフに飛べるリンク（タグ）を含んだ誘導文

② パターン2
(本文)
プロフに飛べるリンク（タグ）を含んだ誘導文

③ パターン3
(本文)
プロフに飛べるリンク（タグ）を含んだ誘導文

④ パターン4
(本文)
プロフに飛べるリンク（タグ）を含んだ誘導文

⑤ パターン5
(本文)
プロフに飛べるリンク（タグ）を含んだ誘導文

⑥ パターン6
(本文)
プロフに飛べるリンク（タグ）を含んだ誘導文

---
🛒 楽天ROOM：トドメの魔力（紹介文案）
Threadsから流入したユーザーに「あ、これ私のことだ」と思わせてポチらせる文章。
(150文字前後)
---

【準備完了の合図】
理解したら「準備完了：${getPersonaStyle(personaId)}」とだけ短く返してください。
`;
}

function getProductPrompt(p) {
    return `
■商品情報
URL: ${p.url}
画像: ${p.imageUrls.join(', ')} (参照用)

【指示】
この商品の魅力を、先ほど指定した「出力形式」と「共通ルール」に従って6パターン＋ROOM紹介文で作成してください。
`;
}

function getPersonaStyle(id) {
    switch (id) {
        case 'best1-6': return '王道のバズ投稿';
        case 'best7-12': return '変化球のバズ投稿';
        case 'poison': return '毒と偏愛のバズ投稿';
        default: return '魅力的な投稿';
    }
}

async function clickSendButton() {
    await new Promise(r => setTimeout(r, 1000));
    const btn = document.querySelector('button[aria-label="Send message"], button[aria-label="送信"]'); // Adjust for locale
    if (btn) {
        btn.click();
        console.log("[Threads職人] Sent prompt.");
    } else {
        // Enter key fallback
        const editor = await waitForEditor();
        if (editor) {
            const event = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true
            });
            editor.dispatchEvent(event);
        }
    }
}

function monitorGeneration(personaId) {
    console.log(`[Threads職人] Monitoring generation for ${personaId}...`);

    // Wait for "Stop" button to appear (Generating started)
    let checkCount = 0;
    const interval = setInterval(() => {
        const stopBtn = document.querySelector('button[aria-label="Stop generation"], button[aria-label="生成を停止"]');

        // Generating has finished (button gone) OR never started (timeout)
        if (!stopBtn && checkCount > 5) {
            // Check if we have a result
            const responses = document.querySelectorAll('.message-content, .model-response-text');
            if (responses.length > 0) {
                const lastResponse = responses[responses.length - 1];
                if (lastResponse.innerText.length > 50) {
                    // Success!
                    clearInterval(interval);
                    console.log(`[Threads職人] Generation complete for ${personaId}. Sending result...`);

                    chrome.runtime.sendMessage({
                        action: "gemini_result",
                        persona: personaId,
                        html: lastResponse.innerHTML
                    });
                }
            }
        }
        checkCount++;
    }, 2000);
}

async function waitForEditor(retryCount = 20) {
    const selectors = [
        'div[contenteditable="true"]',
        'div[role="textbox"]',
        'rich-textarea > div',
        'div[aria-label="Input"]',
        'div[aria-label="入力"]', // Japanese locale
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
