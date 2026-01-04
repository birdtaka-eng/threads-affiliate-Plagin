// content.js - Threads職人 自動入力 (Simple & Robust)
// Version 2.8: 文字入力特化版

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "insertText") {
        insertTextSimple(request.text);
        sendResponse({ success: true });
        return true;
    }
});

async function insertTextSimple(text) {
    console.log("[Threads職人] 注入開始: ", text);

    // 1. エディタを探す
    // 待機ループで確実に確保する
    const editor = await waitForEditor();

    if (!editor) {
        console.error("[Threads職人] エディタが見つかりません。");
        alert("投稿ボックスが見つかりません。Threadsを開き直してください。");
        return;
    }

    // 2. フォーカス & 注入
    editor.focus();
    await new Promise(r => setTimeout(r, 50));

    // document.execCommand は Deprecated だが、
    // ContentEditable (Lexical) に対しては依然として最強の互換性を持つ
    const result = document.execCommand('insertText', false, text);

    console.log("[Threads職人] execCommand result:", result);

    if (!result) {
        // 万が一のフォールバック
        console.warn("[Threads職人] execCommand failed. Fallback to direct insertion.");
        editor.innerText = text;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

async function waitForEditor() {
    const selectors = [
        'div[contenteditable="true"]',
        'div[role="textbox"][contenteditable="true"]',
        'div[data-lexical-editor="true"]'
    ];

    for (let i = 0; i < 10; i++) { // 最大5秒待機
        const el = document.querySelector(selectors.join(','));
        if (el) return el;

        // 見つからない場合、プレースホルダー("スレッドを開始...")をクリックして起こす
        if (i === 0) {
            const placeholders = document.querySelectorAll('div, span');
            for (const ph of placeholders) {
                if (ph.innerText === "Start a thread" || ph.innerText === "スレッドを開始") {
                    ph.click();
                    break;
                }
            }
        }
        await new Promise(r => setTimeout(r, 500));
    }
    return null;
}
