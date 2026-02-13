// instagram.js
// Scrapes the current Instagram post for Image and Caption.
// Called by popup.js when "Clip" is clicked.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extract_instagram") {
        try {
            const data = extractInstaData();
            sendResponse(data);
        } catch (e) {
            sendResponse({ error: e.toString() });
        }
    }
    return true;
});

function extractInstaData() {
    const url = window.location.href;
    let imageUrls = [];
    const images = Array.from(document.querySelectorAll('article img'));
    const validImages = images.filter(img => img.width > 200 || img.naturalWidth > 200);
    const urlSet = new Set();

    validImages.forEach(img => {
        if (urlSet.size >= 10) return; // ひとまず多めに取得して選べるようにする
        let bestUrl = img.src;
        if (img.srcset) {
            const sources = img.srcset.split(',');
            const lastSource = sources[sources.length - 1];
            const match = lastSource.match(/(\S+)\s+\d+w/);
            if (match) bestUrl = match[1];
        }
        if (bestUrl && !bestUrl.includes('profile_pic')) {
            urlSet.add(bestUrl);
        }
    });

    imageUrls = Array.from(urlSet);

    return {
        url: url,
        imageUrls: imageUrls
    };
}
