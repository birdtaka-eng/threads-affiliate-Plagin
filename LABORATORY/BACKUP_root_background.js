/**
 * background.js [V42 PRO - Commander]
 * アイコンクリックでサイドパネルを自動開放。
 */

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "FETCH_IMAGE_BASE64") {
    fetchImageAsBase64(request.url).then(sendResponse);
    return true; // 非同期応答のために true を返す
  }
});

/**
 * バックグラウンドの特権を活かして画像を Base64 化する
 */
async function fetchImageAsBase64(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'omit', // 余計なクッキーを送らずに純粋に画像だけを獲る
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({ success: true, data: reader.result });
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Background Fetch Error:", error);
    return { success: false, error: error.message };
  }
}
