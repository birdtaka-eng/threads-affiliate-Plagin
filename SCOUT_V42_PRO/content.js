chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_IMAGES") {
    // 🚀 【究極】450px 以上 ＋ 形（比率）で小画像を根絶
    const images = Array.from(document.querySelectorAll('img'))
      .filter(img => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const ratio = w / h;
        // 450px以上、かつ「極端に細長くない（0.5〜2.0の間）」ものだけを許可
        const isSizeOk = w >= 450 && h >= 400;
        const isShapeOk = ratio > 0.5 && ratio < 2.0;
        const isNotAd = !img.src.match(/icon|logo|button|pixel|ad|banner|recommend/i);
        return isSizeOk && isShapeOk && isNotAd;
      })
      .map(img => img.src);
    
    sendResponse([...new Set(images)]);
  }
  return true;
});
