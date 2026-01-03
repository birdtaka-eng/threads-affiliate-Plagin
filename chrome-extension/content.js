// content.js - Threads職人 自動入力 & 予約ダイアログ制御
// Version 2.4 (Japanese Localized)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "insertText") {
        handleInsertion(request.text, request.scheduledTime)
            .then(() => sendResponse({ success: true }))
            .catch((err) => sendResponse({ success: false, error: err.message }));
        return true; // Keep channel open for async response
    }
});

async function handleInsertion(text, scheduledTime = null) {
    console.log("[Threads職人] 処理開始:", { text, scheduledTime });

    // 1. エディタを探してテキスト挿入
    const editor = await findAndFocusEditor();
    if (!editor) {
        alert("投稿ボックスが見つかりません。「スレッドを開始」をクリックしてから再試行してください。");
        throw new Error("Editor not found");
    }

    // 既存テキストをクリアする場合はここで行うが、今回は追記/挿入とする

    // execCommandは非推奨だが、ThreadsのLexicalエディタには最も確実に効く
    const success = document.execCommand('insertText', false, text);
    if (!success) {
        // フォールバック: 直接代入してイベント発火
        editor.innerText = text;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    }

    console.log("[Threads職人] テキスト挿入完了");

    // 2. 予約投稿の時間指定がある場合
    if (scheduledTime) {
        await handleScheduling(scheduledTime);
    }
}

async function findAndFocusEditor() {
    const selectors = [
        'div[contenteditable="true"]',
        'div[role="textbox"][contenteditable="true"]',
        'div[data-lexical-editor="true"]'
    ];

    // まず現在のDOMから探す
    let editor = document.querySelector(selectors.join(','));

    // 見つからない場合、プレースホルダーをクリックしてみる
    if (!editor) {
        console.log("[Threads職人] エディタ未検出。プレースホルダーを探します...");
        const placeholders = Array.from(document.querySelectorAll('div, span')).filter(el => {
            const txt = (el.innerText || "").trim();
            return (txt === "Start a thread" || txt === "スレッドを開始") && el.offsetParent !== null;
        });

        if (placeholders.length > 0) {
            placeholders[0].click();
            await sleep(800); // アニメーション待機
            editor = document.querySelector(selectors.join(','));
        }
    }

    if (editor) {
        editor.focus();
        await sleep(200);
    }
    return editor;
}

async function handleScheduling(timeStr) {
    console.log("[Threads職人] 予約フロー開始...");

    // 予約アイコンをクリック
    // 日本語環境: aria-label="投稿を予約"
    // 英語環境: aria-label="Schedule post"
    const scheduleBtnSelectors = [
        '[aria-label="投稿を予約"]',
        '[aria-label="Schedule post"]',
        '[aria-label="Schedule"]'
    ];

    let btn = null;
    for (const sel of scheduleBtnSelectors) {
        btn = document.querySelector(sel);
        if (btn) break;
    }

    if (btn) {
        console.log("[Threads職人] 予約ボタン発見。クリックします。");
        btn.click();

        // ダイアログが出るまで少し待つ (本来はMutationObserverが良いが簡易的にWait)
        await sleep(600);

        // ここでカレンダー操作までは自動化が難しいため（ShadowDOMやCanvas等が絡む場合あり）、
        // ガイドを表示してユーザーに操作を促す
        showGuideOverlay(timeStr);
    } else {
        console.warn("[Threads職人] 予約ボタンが見つかりませんでした。");
        showGuideOverlay(timeStr, true); // エラーモード
    }
}

function showGuideOverlay(timeStr, isError = false) {
    const old = document.getElementById('threads-shokunin-guide');
    if (old) old.remove();

    const d = new Date(timeStr);
    const dateDisplay = isNaN(d.getTime()) ? timeStr : d.toLocaleString('ja-JP', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', weekday: 'short'
    });

    const div = document.createElement('div');
    div.id = 'threads-shokunin-guide';
    div.style.cssText = `
        position: fixed;
        bottom: 24px; left: 24px;
        background: ${isError ? '#e0245e' : '#0095f6'};
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: sans-serif;
        animation: slideIn 0.3s ease-out;
        min-width: 260px;
    `;

    div.innerHTML = `
        <div style="font-size:11px; opacity:0.9; margin-bottom:4px; font-weight:bold;">
            ${isError ? '⚠️ 予約ボタン未検出' : '📅 予約日時を指定してください'}
        </div>
        <div style="font-size:18px; font-weight:800; margin-bottom:8px;">
            ${dateDisplay}
        </div>
        <div style="font-size:11px; line-height:1.4;">
            ${isError ? '手動でカレンダーを開いて設定してください' : '自動設定は未対応のため、<br>手動でこの時間に設定してください'}
        </div>
        <button id="ts-close-guide" style="
            margin-top:12px; width:100%; border:none; background:rgba(255,255,255,0.25);
            color:white; padding:6px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:12px;
        ">閉じる</button>
    `;

    document.body.appendChild(div);
    document.getElementById('ts-close-guide').onclick = () => div.remove();

    // 30秒で自動消去
    setTimeout(() => { if (div.isConnected) div.remove(); }, 30000);
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}
