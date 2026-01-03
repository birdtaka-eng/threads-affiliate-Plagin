// popup.js - Hardened Version
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const syncBtn = document.getElementById('syncBtn');
    const postBtn = document.getElementById('postBtn');
    const status = document.getElementById('status');
    const apiUrlInput = document.getElementById('apiUrl');
    const postContentInput = document.getElementById('postContent');
    // Helper: Show Status
    function showStatus(msg, type) {
        if (!status) return;
        status.textContent = msg;
        status.className = 'status ' + type;
        status.style.display = 'block';
    }
    // Helper: Get Base URL
    function getBaseUrl() {
        if (!apiUrlInput) return null;
        let url = apiUrlInput.value.trim();
        if (!url) return null;
        // Remove trailing slash
        return url.replace(/\/$/, '');
    }
    // Initialize: Load saved settings (Auto-fill)
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['apiUrl', 'lastContent'], (result) => {
            console.log("[Extension] Loaded settings:", result);
            if (result.apiUrl && apiUrlInput) {
                apiUrlInput.value = result.apiUrl;
            }
            if (result.lastContent && postContentInput) {
                postContentInput.value = result.lastContent;
            }
        });
    }
    // Guard: Check if critical elements exist
    if (!apiUrlInput || !postContentInput) {
        console.error("[Extension] Critical elements missing in DOM");
        return;
    }
    // --- Sync Handler ---
    if (syncBtn) {
        syncBtn.addEventListener('click', () => {
            const baseUrl = getBaseUrl();
            if (!baseUrl) return showStatus("Please enter Cloud Run URL", "error");
            // Save config
            chrome.storage.local.set({ apiUrl: baseUrl });
            showStatus("Syncing session...", "loading");
            const targetUrl = `${baseUrl}/api/auth/save-state`;
            // Delegate to background script
            chrome.runtime.sendMessage({
                action: "syncCookies",
                apiUrl: targetUrl
            }, (response) => {
                // Check runtime error
                if (chrome.runtime.lastError) {
                    showStatus("Error: " + chrome.runtime.lastError.message, "error");
                    return;
                }
                if (response && response.success) {
                    showStatus("Session Synced Successfully! ✅", "success");
                } else {
                    showStatus("Sync Failed: " + (response ? response.error : "Unknown error"), "error");
                }
            });
        });
    } else {
        console.error("[Extension] Sync button not found");
    }
    // --- Post Handler ---
    if (postBtn) {
        postBtn.addEventListener('click', () => {
            const baseUrl = getBaseUrl();
            const text = postContentInput.value;
            if (!baseUrl) return showStatus("Please enter Cloud Run URL", "error");
            if (!text) return showStatus("Please enter text to post", "error");
            // Save config
            chrome.storage.local.set({ apiUrl: baseUrl, lastContent: text });
            showStatus("Posting to Threads...", "loading");
            const targetUrl = `${baseUrl}/api/post`;
            fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: text })
            })
                .then(async (res) => {
                    const data = await res.json();
                    if (res.ok && data.success) {
                        showStatus("Posted Successfully! 🎉", "success");
                        postContentInput.value = "";
                        chrome.storage.local.remove(['lastContent']);
                    } else {
                        showStatus("Post Failed: " + (data.error || "Unknown Server Error"), "error");
                    }
                })
                .catch(err => {
                    showStatus("Network/API Error: " + err.message, "error");
                });
        });
    } else {
        console.error("[Extension] Post button not found");
    }
});