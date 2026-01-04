// background.js - Threads職人 Relay System
// Version 3.0: バックグラウンド中継 & アクティブ化

// 1. Side Panel Open
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

// 2. Message Relay System (SidePanel -> Background -> ContentScript)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    // 中継リクエスト: "relayInsertText"
    if (request.action === "relayInsertText") {
        handleRelay(request.text)
            .then(res => sendResponse(res))
            .catch(err => sendResponse({ success: false, error: err.message }));

        return true; // Keep channel open
    }
});

async function handleRelay(text) {
    console.log("[Background] Relaying text:", text);

    // 1. 現在のウィンドウ内で Threads のタブを探す
    const tabs = await chrome.tabs.query({ currentWindow: true, url: "*://www.threads.net/*" });

    // (A) アクティブなタブがあればそれを優先
    let target = tabs.find(t => t.active) || tabs[0];

    if (!target) {
        return { success: false, error: "No Threads tab found in this window." };
    }

    console.log("[Background] Target Tab:", target.id, target.title);

    // 2. タブを強制的にアクティブにする (重要)
    // これにより、フォーカスが確実にブラウザ画面に戻る
    await chrome.tabs.update(target.id, { active: true });

    // 少し待つ (アクティブ化アニメーション等のため)
    await new Promise(r => setTimeout(r, 150));

    // 3. Content Script にメッセージを送る
    try {
        await chrome.tabs.sendMessage(target.id, {
            action: "insertText",
            text: text
        });
        return { success: true };
    } catch (e) {
        console.warn("[Background] Message failed. Attempting injection...", e);

        // Content Script がいない場合 (リロード直後など)
        await chrome.scripting.executeScript({
            target: { tabId: target.id },
            files: ['content.js']
        });

        await new Promise(r => setTimeout(r, 200));

        // 再試行
        await chrome.tabs.sendMessage(target.id, {
            action: "insertText",
            text: text
        });
        return { success: true, recovered: true };
    }
}
