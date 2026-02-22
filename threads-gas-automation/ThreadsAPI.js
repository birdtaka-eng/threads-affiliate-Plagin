/**
 * ThreadsAPI.js
 * Handles official Meta Threads Graph API communication
 */

/**
 * Posts text and optional images to Threads via the official Graph API.
 * @param {string} userId - The Meta developer User ID for Threads
 * @param {string} token - The long-lived access token
 * @param {string} text - The post text
 * @param {string} imageUrl - (Optional) Publicly queryable image URL. Note: Only one image per single container is supported without carousel.
 * @returns {object} - { success: boolean, mediaId: string, error: string }
 */
function postToThreadsAPI(userId, token, text, imageUrl) {
    try {
        if (!userId || !token) {
            return { success: false, error: "Settings: UserID or Token is missing." };
        }

        const baseUrl = `https://graph.threads.net/v1.0/${userId}/threads`;

        // 1. Create Media Container
        let containerPayload = {
            access_token: token,
            text: text
        };

        if (imageUrl) {
            containerPayload.media_type = "IMAGE";
            containerPayload.image_url = imageUrl;
        } else {
            containerPayload.media_type = "TEXT";
        }

        const containerOptions = {
            method: "post",
            contentType: "application/json",
            payload: JSON.stringify(containerPayload),
            muteHttpExceptions: true
        };

        const containerRes = UrlFetchApp.fetch(baseUrl, containerOptions);
        const containerJson = JSON.parse(containerRes.getContentText());

        if (containerRes.getResponseCode() !== 200) {
            debugLog(`[ThreadsAPI] Container Error: ${JSON.stringify(containerJson)}`);
            return { success: false, error: "Failed to create container: " + (containerJson.error ? containerJson.error.message : "Unknown") };
        }

        const creationId = containerJson.id;
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
