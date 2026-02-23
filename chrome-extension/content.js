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
    // Google Sheets specific: extract image URLs from selected cells
    if (request.action === "extract_sheets_images") {
        extractSheetsImageUrls().then(urls => {
            sendResponse({ imageUrls: urls });
        });
        return true; // keep channel open for async
    }
});

/**
 * Google Sheets の選択セルから =IMAGE() の URL を抽出する
 * 複数の戦略を順番に試みる
 */
async function extractSheetsImageUrls() {
    const urls = [];
    const seen = new Set();

    function addUrl(url) {
        if (url && url.startsWith('http') && !seen.has(url) && urls.length < 6) {
            seen.add(url);
            urls.push(url);
        }
    }

    // 戦略1: 数式バーを直接読む（選択中のセルの数式を表示しているエリア）
    const formulaBarSelectors = [
        '.cell-input',
        '#formula-bar-input',
        '[id*="formulaBar"]',
        'input[aria-label*="formula"]',
        '.formula-bar-input',
        // Google Sheets internal
        '.d-k-l',
        '[jsname="qDO5De"]',
        '[data-initial-value]'
    ];

    for (const sel of formulaBarSelectors) {
        const el = document.querySelector(sel);
        if (el) {
            const text = el.value || el.textContent || el.innerText || '';
            const match = text.match(/=IMAGE\(\s*["'](https?:\/\/[^"']+)["']/i);
            if (match) addUrl(match[1]);
            else if (text.startsWith('http')) addUrl(text.trim());
        }
    }

    // 戦略2: Sheetsのハイライト（選択）セルのDOMを検索
    // 選択中のセルは通常 "selected" クラスまたは aria-selected="true" を持つ
    const selectedCellSelectors = [
        '[aria-selected="true"]',
        '.selected-cell',
        '.s0[class*="selected"]',
        '.cell-input-container',
    ];

    for (const sel of selectedCellSelectors) {
        const cells = document.querySelectorAll(sel);
        cells.forEach(cell => {
            // セル内のimg srcを探す
            const imgs = cell.querySelectorAll('img');
            imgs.forEach(img => {
                if (img.src && img.src.startsWith('http')) {
                    // Google プロキシURLでなければそのまま追加
                    if (!img.src.includes('googleusercontent.com')) {
                        addUrl(img.src);
                    }
                }
            });
            // data属性からもURL探す
            const attrs = ['data-url', 'data-src', 'data-href', 'data-formula'];
            attrs.forEach(attr => {
                const val = cell.getAttribute(attr);
                if (val) {
                    const match = val.match(/https?:\/\/[^\s"']+/);
                    if (match) addUrl(match[0]);
                }
            });
        });
    }

    // 戦略3: clipboardのHTML (text/html MIME) からURL抽出を試みる
    // (clipboardRead権限が有効な場合のみ動作)
    if (urls.length === 0) {
        try {
            const clipItems = await navigator.clipboard.read();
            for (const item of clipItems) {
                if (item.types.includes('text/html')) {
                    const blob = await item.getType('text/html');
                    const html = await blob.text();
                    // img src を正規表現で抽出
                    const imgMatches = html.matchAll(/src=["'](https?:\/\/[^"']+(?:\.jpg|\.jpeg|\.png|\.webp|\.gif)[^"']*)["']/gi);
                    for (const m of imgMatches) addUrl(m[1]);
                    // =IMAGE("...") 形式も試みる
                    const imageFormulaMatches = html.matchAll(/=IMAGE\(\s*["'](https?:\/\/[^"']+)["']/gi);
                    for (const m of imageFormulaMatches) addUrl(m[1]);
                }
                if (item.types.includes('text/plain') && urls.length === 0) {
                    const blob = await item.getType('text/plain');
                    const text = await blob.text();
                    const matches = text.matchAll(/=IMAGE\(\s*["'](https?:\/\/[^"']+)["']/gi);
                    for (const m of matches) addUrl(m[1]);
                }
            }
        } catch (_) {
            // クリップボードアクセス失敗は無視
        }
    }

    return urls;
}

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
        text: text,
        imageUrls: imageUrls
    };
}
