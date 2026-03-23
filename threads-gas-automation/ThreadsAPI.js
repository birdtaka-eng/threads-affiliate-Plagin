/**
 * ThreadsAPI.js
 * Handles official Meta Threads Graph API communication
 */

/**
 * Posts text and optional images (up to 10) to Threads via the official Graph API.
 * @param {string} userId - The Meta developer User ID for Threads
 * @param {string} token - The long-lived access token
 * @param {string} text - The post text
 * @param {string|string[]} imageUrls - (Optional) Publicly queryable image URL(s). Can be a string or array of strings.
 * @param {string} replyToId - (Optional) Parent Media ID to reply to.
 * @returns {object} - { success: boolean, mediaId: string, error: string }
 */
function postToThreadsAPI(userId, token, text, imageUrls, replyToId = null) {
    try {
        if (!userId || !token) {
            return { success: false, error: "Settings: UserID or Token is missing." };
        }

        const baseUrl = `https://graph.threads.net/v1.0/${userId}/threads`;

        let urls = [];
        if (imageUrls) {
            urls = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
            urls = urls.filter(url => url && typeof url === 'string' && url.trim() !== "");
        }

        let creationId = null;

        if (urls.length === 0) {
            // 1a. Text Only Container
            let containerPayload = { access_token: token, text: text, media_type: "TEXT" };
            if (replyToId) containerPayload.reply_to_id = String(replyToId);
            const containerOptions = { method: "post", contentType: "application/json", payload: JSON.stringify(containerPayload), muteHttpExceptions: true };
            const containerRes = UrlFetchApp.fetch(baseUrl, containerOptions);
            const containerJson = JSON.parse(containerRes.getContentText());

            if (containerRes.getResponseCode() !== 200) {
                debugLog(`[ThreadsAPI] Text Container Error: ${JSON.stringify(containerJson)}`);
                return { success: false, error: "Failed to create text container: " + (containerJson.error ? containerJson.error.message : "Unknown") };
            }
            creationId = containerJson.id;

        } else if (urls.length === 1) {
            // 1b. Single Image Container
            let containerPayload = { access_token: token, text: text, media_type: "IMAGE", image_url: urls[0] };
            if (replyToId) containerPayload.reply_to_id = String(replyToId);
            const containerOptions = { method: "post", contentType: "application/json", payload: JSON.stringify(containerPayload), muteHttpExceptions: true };
            const containerRes = UrlFetchApp.fetch(baseUrl, containerOptions);
            const containerJson = JSON.parse(containerRes.getContentText());

            if (containerRes.getResponseCode() !== 200) {
                debugLog(`[ThreadsAPI] Single Image Container Error: ${JSON.stringify(containerJson)}`);
                return { success: false, error: "Failed to create image container: " + (containerJson.error ? containerJson.error.message : "Unknown") };
            }
            creationId = containerJson.id;

        } else {
            // 1c. Carousel Container
            // Step A: Create Item Containers for each image (must have is_carousel_item: true)
            let childrenIds = [];
            for (let i = 0; i < urls.length; i++) {
                // Encode payload as URL parameters since some Graph API endpoints prefer application/x-www-form-urlencoded
                // However, application/json is standard. We will stick to json but ensure is_carousel_item is boolean
                let itemPayload = {
                    access_token: token,
                    media_type: "IMAGE",
                    image_url: urls[i],
                    is_carousel_item: true
                };

                const itemOptions = {
                    method: "post",
                    contentType: "application/json",
                    payload: JSON.stringify(itemPayload),
                    muteHttpExceptions: true
                };

                const itemRes = UrlFetchApp.fetch(baseUrl, itemOptions);
                const itemJson = JSON.parse(itemRes.getContentText());

                if (itemRes.getResponseCode() !== 200) {
                    debugLog(`[ThreadsAPI] Carousel Item ${i} Error: ${JSON.stringify(itemJson)}`);
                    return { success: false, error: `Failed to create carousel item ${i}: ` + (itemJson.error ? itemJson.error.message : "Unknown") };
                }
                childrenIds.push(itemJson.id);
            }

            // Step B: Create Carousel Parent Container
            // Graph API expects `children` to be an array or a comma-separated string depending on strictness. 
            // The official docs often show an array for JSON bodies.
            let carouselPayload = {
                access_token: token,
                media_type: "CAROUSEL",
                text: text,
                children: childrenIds // Pass as array in JSON
            };
            if (replyToId) carouselPayload.reply_to_id = String(replyToId);
            const carouselOptions = {
                method: "post",
                contentType: "application/json",
                payload: JSON.stringify(carouselPayload),
                muteHttpExceptions: true
            };

            const carouselRes = UrlFetchApp.fetch(baseUrl, carouselOptions);
            const carouselJson = JSON.parse(carouselRes.getContentText());

            if (carouselRes.getResponseCode() !== 200) { // If array fails, fallback to comma string could be considered, but API docs say array for JSON
                debugLog(`[ThreadsAPI] Carousel Container Error: ${JSON.stringify(carouselJson)}`);

                // Fallback attempt: some endpoints strictly want stringified array or comma separation
                debugLog(`[ThreadsAPI] Retrying Carousel Parent with comma-separated string...`);
                carouselPayload.children = childrenIds.join(',');
                const fallbackOptions = {
                    method: "post",
                    contentType: "application/json",
                    payload: JSON.stringify(carouselPayload),
                    muteHttpExceptions: true
                };
                const fallbackRes = UrlFetchApp.fetch(baseUrl, fallbackOptions);
                const fallbackJson = JSON.parse(fallbackRes.getContentText());

                if (fallbackRes.getResponseCode() !== 200) {
                    debugLog(`[ThreadsAPI] Fallback Carousel Container Error: ${JSON.stringify(fallbackJson)}`);
                    return { success: false, error: "Failed to create carousel container: " + (fallbackJson.error ? fallbackJson.error.message : "Unknown") };
                }
                creationId = fallbackJson.id;
            } else {
                creationId = carouselJson.id;
            }
        }

        debugLog(`[ThreadsAPI] Container Created: ${creationId}`);

        // 2. Publish Media Container
        const publishUrl = `https://graph.threads.net/v1.0/${userId}/threads_publish`;
        const publishPayload = {
            access_token: token,
            creation_id: creationId
        };
        const publishOptions = {
            method: "post",
            contentType: "application/json",
            payload: JSON.stringify(publishPayload),
            muteHttpExceptions: true
        };

        const publishRes = UrlFetchApp.fetch(publishUrl, publishOptions);
        const publishJson = JSON.parse(publishRes.getContentText());

        if (publishRes.getResponseCode() !== 200) {
            debugLog(`[ThreadsAPI] Publish Error: ${JSON.stringify(publishJson)}`);
            return { success: false, error: "Failed to publish container: " + (publishJson.error ? publishJson.error.message : "Unknown") };
        }

        const publishedMediaId = publishJson.id;
        debugLog(`[ThreadsAPI] Published successfully! Media ID: ${publishedMediaId}`);

        return { success: true, mediaId: publishedMediaId };

    } catch (e) {
        debugLog(`[ThreadsAPI] Exception: ${e.message}`);
        return { success: false, error: e.message };
    }
}

/**
 * Fetches metrics for a specific Threads post.
 * @param {string} mediaId - The published Threads Media ID
 * @param {string} token - The long-lived access token
 * @returns {object} - { success: boolean, metrics: { views, likes, replies, reposts }, error: string }
 */
function getThreadsMetricsAPI(mediaId, token) {
    try {
        if (!mediaId || !token) {
            return { success: false, error: "Missing mediaID or Token" };
        }

        const metricsToFetch = ["views", "likes", "replies", "reposts"];
        const url = `https://graph.threads.net/v1.0/${mediaId}/insights?metric=${metricsToFetch.join(',')}&access_token=${token}`;

        const options = {
            method: "get",
            muteHttpExceptions: true
        };

        const response = UrlFetchApp.fetch(url, options);
        const json = JSON.parse(response.getContentText());

        if (response.getResponseCode() !== 200) {
            debugLog(`[ThreadsAPI] Insights Error for ${mediaId}: ${JSON.stringify(json)}`);
            return { success: false, error: "Failed to fetch insights" };
        }

        // Parse data array
        const results = {
            views: 0,
            likes: 0,
            replies: 0,
            reposts: 0
        };

        if (json.data && Array.isArray(json.data)) {
            json.data.forEach(item => {
                if (results[item.name] !== undefined && item.values && item.values.length > 0) {
                    results[item.name] = item.values[0].value;
                }
            });
        }

        return { success: true, metrics: results };

    } catch (e) {
        debugLog(`[ThreadsAPI] Insights Exception: ${e.message}`);
        return { success: false, error: e.message };
    }
}
