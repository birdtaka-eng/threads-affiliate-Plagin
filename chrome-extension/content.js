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

// v4.3 Scraping Logic
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrapePost") {
        const data = scrapeMainPost();
        sendResponse(data);
        return true;
    }
    if (request.action === "general_extract") {
        const data = extractGeneralImages();
        sendResponse(data);
        return true;
    }
});

function extractGeneralImages() {
    const url = window.location.href;
    const imageUrls = [];
    const urlSet = new Set();

    // 1. OG Image
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) urlSet.add(ogImage.content);

    // 2. Main Images (Search for large images)
    const imgs = Array.from(document.querySelectorAll('img'));
    imgs.forEach(img => {
        // Ignore icons, avatars, etc. (min 150px)
        if (img.width > 150 || img.naturalWidth > 150) {
            if (!img.src.includes('profile_pic') && !img.src.includes('avatar')) {
                urlSet.add(img.src);
            }
        }
    });

    return {
        url: url,
        imageUrls: Array.from(urlSet).slice(0, 50)
    };
}

function scrapeMainPost() {
    // 1. Get URL and Author
    const url = window.location.href;
    let author = "Unknown";
    let text = "";
    let imageUrls = [];

    // 2. Try to find the main post content
    const articles = document.querySelectorAll('div[data-pressable-container="true"]');

    if (articles.length > 0) {
        const main = articles[0];

        // Extract Text
        text = main.innerText;

        // Extract Images
        const imgs = Array.from(main.querySelectorAll('img'));
        const urlSet = new Set();

        imgs.forEach(img => {
            if (urlSet.size >= 3) return;
            // Ignore small icons (under 50px)
            if (img.width > 50 || img.naturalWidth > 50) {
                // Avoid profile pics
                if (!img.src.includes('profile_pic') && !img.alt.includes('profile picture')) {
                    urlSet.add(img.src);
                }
            }
        });
        imageUrls = Array.from(urlSet);

        // Try extracting author from first span (heuristic)
        const firstSpan = main.querySelector('span');
        if (firstSpan) author = firstSpan.innerText;
    } else {
        // Fallback: Body text
        text = document.body.innerText.substring(0, 2000);
    }

    return {
        url: url,
        imageUrls: imageUrls
    };
}
