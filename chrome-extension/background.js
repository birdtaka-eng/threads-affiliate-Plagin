// background.js - Handles cookie extraction and API sync

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Only handle syncCookies action
    if (request.action === "syncCookies") {
        const apiUrl = request.apiUrl;

        // 1. Find ANY tab that is threads.net
        chrome.tabs.query({ url: "*://*.threads.net/*" }, async (tabs) => {
            let pageCookies = [];

            // Use the first found Threads tab, or current active tab if it happens to be one
            const targetTab = tabs.length > 0 ? tabs[0] : null;

            // 2. Try to get document.cookie via script (Manual Script Logic Automated)
            if (targetTab && targetTab.id) {
                console.log(`[Extension] Found Threads tab: ${targetTab.url} (ID: ${targetTab.id})`);
                try {
                    const injectionResults = await chrome.scripting.executeScript({
                        target: { tabId: targetTab.id },
                        func: () => {
                            // Console script logic
                            return document.cookie.split(';').map(c => {
                                const p = c.trim().split('=');
                                return {
                                    name: p[0],
                                    value: p.slice(1).join('='),
                                    domain: '.threads.net',
                                    path: '/',
                                    secure: true,
                                    httpOnly: false
                                };
                            }).filter(c => c.name);
                        }
                    });

                    if (injectionResults && injectionResults[0] && injectionResults[0].result) {
                        pageCookies = injectionResults[0].result;
                        console.log(`[Extension] Extracted ${pageCookies.length} cookies via Script Injection`);
                    }
                } catch (e) {
                    console.warn("[Extension] Script injection failed:", e);
                }
            } else {
                console.log("[Extension] No Threads tab found open.");
            }

            // 3. Get HttpOnly Cookies via API
            // Try both specific URL and domain to be safe
            const urlCookiesPromise = new Promise(resolve => chrome.cookies.getAll({ url: "https://www.threads.net" }, resolve));
            const domainCookiesPromise = new Promise(resolve => chrome.cookies.getAll({ domain: "threads.net" }, resolve));

            Promise.all([urlCookiesPromise, domainCookiesPromise]).then(([urlCookies, domainCookies]) => {
                let apiCookies = [...(urlCookies || []), ...(domainCookies || [])];

                // Deduplicate API cookies
                const uniqueApiCookies = new Map();
                apiCookies.forEach(c => uniqueApiCookies.set(c.name + c.domain, c));
                apiCookies = Array.from(uniqueApiCookies.values());

                let finalCookies = [];

                if (chrome.runtime.lastError) {
                    console.warn("[Extension] chrome.cookies API error:", chrome.runtime.lastError);
                    finalCookies = pageCookies;
                } else {
                    // Merge: Prefer API cookies, add Page cookies if missing
                    const apiMap = new Map(apiCookies.map(c => [c.name, c]));
                    finalCookies = [...apiCookies];

                    pageCookies.forEach(pc => {
                        // Add if not already present (loose check by name)
                        if (!apiMap.has(pc.name)) {
                            finalCookies.push(pc);
                        }
                    });
                }

                if (finalCookies.length === 0) {
                    sendResponse({
                        success: false,
                        error: "No cookies found. Please open 'threads.net' in a tab and log in."
                    });
                    return;
                }

                console.log(`[Extension] Sending ${finalCookies.length} total cookies to ${apiUrl}...`);

                // 4. Send to API
                fetch(apiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ cookies: finalCookies })
                })
                    .then(async (res) => {
                        if (!res.ok) {
                            let errorMsg = `HTTP Error ${res.status}`;
                            try {
                                const data = await res.json();
                                if (data.error) errorMsg += `: ${data.error}`;
                            } catch (e) {
                                const text = await res.text().catch(() => '');
                                if (text) errorMsg += ` (${text.substring(0, 50)})`;
                            }
                            sendResponse({ success: false, error: errorMsg });
                            return;
                        }
                        try {
                            const data = await res.json();
                            sendResponse({ success: true, ...data });
                        } catch (e) {
                            sendResponse({ success: false, error: "Invalid JSON response" });
                        }
                    })
                    .catch(err => {
                        sendResponse({ success: false, error: "Network Error: " + err.message });
                    });
            });
        });

        return true;
    }
});
