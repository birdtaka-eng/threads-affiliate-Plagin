// background.js - Threads職人 Relay System
// Version 3.2: Explicit Tab ID Targeting

// 1. Side Panel Open
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

// 2. Message Relay System (SidePanel -> Background -> ContentScript)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    // 中継リクエスト: "relayInsertText"
    if (request.action === "relayInsertText") {
        // v3.2: TabIDが指定されていればそれを優先的に使う
        handleRelay(request.text, request.targetTabId)
            .then(res => sendResponse(res))
            .catch(err => sendResponse({ success: false, error: err.message }));

        return true; // Keep channel open
    }
});

async function handleRelay(text, specificTabId) {
    console.log("[Background] Relaying text to TabID:", specificTabId);

    let targetId = specificTabId;

    // もしIDが来てなければ（フォールバック）、従来どおり探す
    if (!targetId) {
        const tabs = await chrome.tabs.query({ currentWindow: true, url: "*://*.threads.net/*" });
        const t = tabs.find(tab => tab.active) || tabs[0];
        if (!t) return { success: false, error: "No Threads tab found (Auto-detect failed)." };
        targetId = t.id;
    }

    // 念のため存在確認
    try {
        const tabCheck = await chrome.tabs.get(targetId);
        console.log("[Background] Target Tab verified:", tabCheck.title);
    } catch (e) {
        return { success: false, error: "Target tab no longer exists: " + e.message };
    }

    // 1. タブを強制的にアクティブにする
    await chrome.tabs.update(targetId, { active: true });

    await new Promise(r => setTimeout(r, 150));

    // 2. Content Script にメッセージを送る
    try {
        await chrome.tabs.sendMessage(targetId, {
            action: "insertText",
            text: text
        });
        return { success: true };
    } catch (e) {
        console.warn("[Background] Message failed. Attempting injection...", e);

        // Content Script がいない場合
        await chrome.scripting.executeScript({
            target: { tabId: targetId },
            files: ['content.js']
        });

        await new Promise(r => setTimeout(r, 200));

        // 再試行
        await chrome.tabs.sendMessage(targetId, {
            action: "insertText",
            text: text
        });
        return { success: true, recovered: true };
    }
}
