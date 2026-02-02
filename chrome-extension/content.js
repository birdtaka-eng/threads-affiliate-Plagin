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
return null;
}

// v4.3 Scraping Logic
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrapePost") {
        const data = scrapeMainPost();
        sendResponse(data);
        return true;
    }
});

function scrapeMainPost() {
    // 1. Get URL and Author
    const url = window.location.href;
    let author = "Unknown";
    let text = "";

    // 2. Try to find the main post content
    // Threads structure varies, but usually it's in a specific div hierarchy.
    // Strategy: Look for the first major visual text block or specifically targeted semantics.

    // Attempt 1: Meta Tags (cleanest for single post view)
    const card = document.querySelector('div[data-pressable-container="true"]'); // Often the post container

    // Let's try grabbing visible text from the "main" area.
    // In Single Post View, the first thread item is the main one.

    // Heuristic: Get all spans/divs with substantial text
    const articles = document.querySelectorAll('div[data-pressable-container="true"]');

    if (articles.length > 0) {
        // Assume first article is the target (if user opens single post)
        // Or if feed, it's the first one? User usually focuses on one.
        const main = articles[0];
        text = main.innerText;

        // Extract Author?
        // Usually "user name" is at the top.
        // Let's just fallback to full text for now, extracting nuances later in GAS.
    } else {
        // Fallback: Body text
        text = document.body.innerText.substring(0, 2000);
    }

    // Try finding og:description for clean text if available
    const metaDesc = document.querySelector('meta[property="og:description"]');
    if (metaDesc) {
        // often contained in content
    }

    return {
        text: text,
        url: url,
        author: author
    };
}
