// background.js - Handles cookie extraction and API sync
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Only handle syncCookies action
    if (request.action === "syncCookies") {
        const apiUrl = request.apiUrl;
        // Async operation starts here
        chrome.cookies.getAll({ domain: "threads.net" }, (cookies) => {
            if (chrome.runtime.lastError) {
                console.error("Cookie Error:", chrome.runtime.lastError);
                sendResponse({ success: false, error: "Cookie Access Error: " + chrome.runtime.lastError.message });
                return;
            }
            if (!cookies || cookies.length === 0) {
                sendResponse({ success: false, error: "No cookies found for threads.net. Please log in first." });
                return;
            }
            console.log(`[Extension] found ${cookies.length} cookies. Sending to ${apiUrl}...`);
            fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cookies: cookies })
            })
                .then(async (res) => {
                    // Check for HTTP errors specifically
                    if (!res.ok) {
                        // Try to parse JSON error if available
                        let errorMsg = `HTTP Error ${res.status}`;
                        try {
                            const data = await res.json();
                            if (data.error) errorMsg += `: ${data.error}`;
                        } catch (e) {
                            // response wasn't JSON, ignore
                            const text = await res.text().catch(() => '');
                            if (text) errorMsg += ` (${text.substring(0, 50)})`;
                        }
                        sendResponse({ success: false, error: errorMsg });
                        return;
                    }
                    // Success response parsing
                    try {
                        const data = await res.json();
                        sendResponse({ success: true, ...data });
                    } catch (e) {
                        sendResponse({ success: false, error: "Invalid JSON response from server" });
                    }
                })
                .catch(err => {
                    console.error("Fetch Error:", err);
                    // Distinguish network errors (fetch throws on network failure)
                    sendResponse({ success: false, error: "Network Error: " + err.message + ". Check CORS/URL." });
                });
        });
        // CRITICAL: return true to keep the message channel open for async sendResponse
        return true;
    }
});