// background.js - Threads職人 Relay System
// Version 6.3.0: Manual Prompt Trigger + Auto Monitor

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

    // --- Phase 2: Gemini Broadcast System (Two-Stage) ---
    if (request.action === "wake_up_gems") {
        wakeUpGems()
        sendResponse({ success: true });
        return true;
    }

    // Manual Trigger for Rules
    if (request.action === "broadcast_rules") {
        broadcastRules()
            .then(() => sendResponse({ success: true }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    if (request.action === "distribute_product") {
        distributeProduct(request.payload)
            .then(() => sendResponse({ success: true }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    if (request.action === "gemini_result") {
        console.log("[Background] Received result from:", request.persona);
        // サイドパネルに転送
        chrome.runtime.sendMessage({
            action: "result_received",
            persona: request.persona,
            html: request.html
        });
    }
});

// 3. Gemini Manager
const PERSONAS = [
    { id: 'best1-6', name: '🏆 BEST 1-6', url: 'https://gemini.google.com/gem/b20093055259' },
    { id: 'best7-12', name: '💎 BEST 7-12', url: 'https://gemini.google.com/gem/b430dc8daf33' },
    { id: 'poison', name: '🍄 毒と偏愛', url: 'https://gemini.google.com/gem/0a654a7558d1' }
];

let pendingSetupTabs = new Set(); // Track IDs waiting for load

async function wakeUpGems() {
    console.log("[Background] Waking up 3 sisters...");

    // 1. Open Tabs
    const activeGemTabs = {};
    pendingSetupTabs.clear(); // Reset pending

    for (const persona of PERSONAS) {
        const tab = await chrome.tabs.create({
            url: persona.url,
            active: false
        });
        activeGemTabs[persona.id] = tab.id;
        pendingSetupTabs.add(tab.id); // Mark for setup tracking
    }

    // 2. Save IDs (Persistence)
    await chrome.storage.local.set({ activeGemTabs: activeGemTabs });

    // 3. Monitor for Load Completion (via onUpdated listener below)
}

// Monitor Tab Loading for Setup Injection (Auto-Backup)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only check tabs we are tracking
    if (pendingSetupTabs.has(tabId) && changeInfo.status === 'complete') {
        console.log(`[Background] Tab ${tabId} loaded. Ready/Injecting Setup...`);

        // Locate Persona ID
        chrome.storage.local.get(['activeGemTabs'], (res) => {
            const tabs = res.activeGemTabs || {};
            const personaId = Object.keys(tabs).find(key => tabs[key] === tabId);

            if (personaId) {
                // Auto-attempt (Backup)
                setTimeout(() => {
                    chrome.tabs.sendMessage(tabId, {
                        action: "run_gemini_setup",
                        persona: personaId
                    }).then(() => {
                        console.log(`[Background] Auto-Setup sent to ${personaId}`);
                        pendingSetupTabs.delete(tabId);
                    }).catch(e => {
                        console.warn(`[Background] Auto-Setup failed (User can use Manual Btn):`, e);
                        pendingSetupTabs.delete(tabId);
                    });
                }, 1500);
            }
        });
    }
});

// Manual Trigger Function
async function broadcastRules() {
    console.log("[Background] Broadcasting Rules (Manual Trigger)...");

    // 1. Retrieve IDs
    const res = await chrome.storage.local.get(['activeGemTabs']);
    const activeGemTabs = res.activeGemTabs || {};

    if (Object.keys(activeGemTabs).length === 0) {
        throw new Error("先に「3姉妹を召喚」してください！");
    }

    // 2. Inject Setup Logic
    for (const persona of PERSONAS) {
        const tabId = activeGemTabs[persona.id];
        if (!tabId) continue;

        // Staggered Delay
        if (PERSONAS.indexOf(persona) > 0) await new Promise(r => setTimeout(r, 1500));

        chrome.tabs.sendMessage(tabId, {
            action: "run_gemini_setup",
            persona: persona.id
        }).catch(e => console.warn("Manual Setup inject failed:", e));
    }
}

async function distributeProduct(data) {
    console.log("[Background] Distributing product data...", data);

    // 1. Retrieve IDs from storage (Persistence check)
    const res = await chrome.storage.local.get(['activeGemTabs']);
    const activeGemTabs = res.activeGemTabs || {};

    if (Object.keys(activeGemTabs).length === 0) {
        throw new Error("先に「3姉妹を召喚」してください！");
    }

    // 2. Fetch Images as Base64 (CORS Workaround)
    if (data.imageUrls && data.imageUrls.length > 0) {
        console.log("[Background] Fetching images for CORS bypass...", data.imageUrls.length);
        const base64Images = [];
        for (const url of data.imageUrls) {
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                const base64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
                base64Images.push(base64);
            } catch (e) {
                console.error("Image fetch failed in BG:", url, e);
            }
        }
        data.images = base64Images; // Attach base64 data
    }

    // 3. Distribute (Round-Robin Activation)
    for (const persona of PERSONAS) {
        const tabId = activeGemTabs[persona.id];
        if (!tabId) continue;

        // Staggered Delay (between personas)
        if (PERSONAS.indexOf(persona) > 0) await new Promise(r => setTimeout(r, 1500));

        try {
            // A. Activate Tab (Force Focus for Paste)
            console.log(`[Background] Activating tab ${tabId} for ${persona.id}...`);
            await chrome.tabs.update(tabId, { active: true });

            // B. Wait for focus stabilization (User safety & DOM wake-up)
            await new Promise(r => setTimeout(r, 2000));

            // C. Inject Product Data
            chrome.tabs.sendMessage(tabId, {
                action: "run_gemini_product",
                persona: persona.id,
                productData: data
            }).catch(e => console.warn("Gemini inject failed (Tab might be closed):", e));

        } catch (e) {
            console.error(`[Background] Failed to activate/send to ${persona.id}:`, e);
        }
    }
}

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
