// content.js - Threads職人 自動入力 & 予約ダイアログ制御
// Version 2.5 (Fixes: Input reliability, Tab detection, Button selectors)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "insertText") {
        (async () => {
            try {
                await handleInsertion(request.text, request.scheduledTime);
                sendResponse({ success: true });
            } catch (err) {
                console.error("[Threads職人] Error:", err);
                sendResponse({ success: false, error: err.toString() });
            }
        })();
        return true;
    }
});

async function handleInsertion(text, scheduledTime = null) {
    console.log("[Threads職人] 処理開始 v2.5:", { text, scheduledTime });

    // 1. エディタを探してフォーカス
    const editor = await findAndFocusEditor();
    if (!editor) {
        throw new Error("Editor not found. Please click 'Start a thread' first.");
    }

    // 2. テキスト入力 (強力版)
    // Lexicalエディタ等はexecCommand 'insertText' が最もネイティブに近い挙動をする
    // まずはフォーカスを確実に
    editor.focus();
    await sleep(100);

    // method A: execCommand
    const success = document.execCommand('insertText', false, text);

    // method B: テキストノード直接操作 + イベント発火 (Fallback)
    if (!success) {
        console.warn("[Threads職人] execCommand failed, trying manual injection");
        editor.innerText = text; // 単純置換
        // Inputイベント群をバブリングありで発火
        editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 遅延させて確認（念のため）
    await sleep(200);

    // 3. 予約投稿の時間指定がある場合
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

    // 待機ループ (最大3秒)
    for (let i = 0; i < 6; i++) {
        const editor = document.querySelector(selectors.join(','));
        if (editor) {
            editor.focus();
            return editor;
        }

        // 見つからない場合、プレースホルダーを探してクリック
        if (i === 0) { // 初回のみクリック試行
            const placeholders = Array.from(document.querySelectorAll('div, span')).filter(el => {
                const txt = (el.innerText || "").trim();
                return (txt === "Start a thread" || txt === "スレッドを開始") && el.offsetParent !== null;
            });
            if (placeholders.length > 0) {
                console.log("[Threads職人] プレースホルダーをクリック");
                placeholders[0].click();
            }
        }

        await sleep(500);
    }
    return null;
}

async function handleScheduling(timeStr) {
    console.log("[Threads職人] 予約フロー開始...");
    await sleep(800); // 入力確定後のUI更新待ち

    // 予約アイコンを探す
    // セレクタ戦略:
    // 1. aria-label (日/英)
    // 2. SVGパスの特徴 (今回はaria-label優先)
    const btnSelectors = [
        '[aria-label="投稿を予約"]',
        '[aria-label="Schedule post"]',
        '[aria-label="Schedule"]'
    ];

    let btn = null;
    // 試行ループ
    for (let i = 0; i < 5; i++) {
        for (const sel of btnSelectors) {
            btn = document.querySelector(sel);
            if (btn) break;
        }
        if (btn) break;
        await sleep(500);
    }

    if (btn) {
        console.log("[Threads職人] 予約ボタン発見。クリックします。");
        btn.click();

        // ダイアログが出るまで待つ
        await sleep(800);
        showGuideOverlay(timeStr);
    } else {
        console.warn("[Threads職人] 予約ボタンが見つかりませんでした。");
        showGuideOverlay(timeStr, true);
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
        background: ${isError ? '#d32f2f' : '#1976d2'};
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 99999;
        font-family: sans-serif;
        font-size: 14px;
        animation: fadeIn 0.3s;
    `;

    div.innerHTML = `
        <div style="font-weight:bold; margin-bottom:4px;">
            ${isError ? '⚠️ ボタン未検出' : '📅 予約設定'}
        </div>
        <div style="font-size:18px; font-weight:bold; margin-bottom:8px;">
            ${dateDisplay}
        </div>
        <div>
            ${isError
            ? '予約ボタン（カレンダー）が見つかりませんでした。'
            : '時間を手動で合わせて「完了」を押してください。'}
        </div>
        <button id="ts-close-guide" style="
            margin-top:10px; width:100%; border:none; background:rgba(255,255,255,0.3);
            color:white; padding:5px; cursor:pointer; font-weight:bold;
        ">閉じる</button>
    `;

    document.body.appendChild(div);
    document.getElementById('ts-close-guide').onclick = () => div.remove();
    setTimeout(() => { if (div.isConnected) div.remove(); }, 20000);
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}
