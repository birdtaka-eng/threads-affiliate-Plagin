// rakuten.js
// Scrapes the current Rakuten product page.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extract_rakuten") {
        try {
            const data = extractRakutenData();
            sendResponse(data); // データを直接返す
        } catch (e) {
            sendResponse({ error: e.toString() });
        }
    }
    return true;
});

function extractRakutenData() {
    let url = window.location.href;
    let images = [];

    // より広範囲な画像セレクター
    const candidates = document.querySelectorAll(`
        .image_list img, 
        .slick-track img, 
        .sale_desc img, 
        .rakutenLimitedId_imageMain img,
        #main-image-item img,
        [data-role="main-image"] img,
        input[name="main_image_url"]
    `);

    // First, try to find the "main" image logic often hidden in inputs
    const mainInput = document.querySelector('input[name="main_image_url"]');
    if (mainInput && mainInput.value) {
        images.push(mainInput.value.split('?')[0]);
    }

    // Iterate candidates
    candidates.forEach(img => {
        let src = img.src || img.getAttribute('data-src');
        if (src) {
            // プロトコルを補完 (//... への対応)
            if (src.startsWith('//')) src = window.location.protocol + src;

            // クエリパラメータを削除して高画質版を狙う
            const clean = src.split('?')[0];
            if ((clean.startsWith('http') || clean.startsWith('https')) && !images.includes(clean)) {
                images.push(clean);
            }
        }
    });

    // Fallback: OG Image
    if (images.length === 0) {
        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage) {
            let ogSrc = ogImage.content;
            if (ogSrc.startsWith('//')) ogSrc = window.location.protocol + ogSrc;
            images.push(ogSrc.split('?')[0]);
        }
    }

    // 重複削除と制限
    images = [...new Set(images)].slice(0, 30);

    return {
        url: url,
        images: images
    };
}
