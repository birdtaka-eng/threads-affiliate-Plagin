/**
 * content.js [V42 PRO - Ultimate High-Res Scout]
 * 楽天のあらゆるサイズ制限を排除しつつ、アイコンなどの小さなゴミを「物差し」で弾く。
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_PAGE_INFO") {
    // 全てのimg要素を精査
    const imageElements = Array.from(document.querySelectorAll('img'));
    
    const processedImages = imageElements
      .filter(img => {
        const src = img.src || "";
        
        // --- 【設定場所：サイズ・フィルター】 ---
        // 1ピクセル以上、100ピクセル未満のものは「小さなゴミ」として除外。
        // ※0ピクセルの場合は「読み込み中」の可能性があるため、本命候補として残します。
        const minSize = 200; // ← ここで最小サイズを自由に変更できます！！
        if (img.naturalWidth > 0 && img.naturalWidth < minSize) return false;
        // ---------------------------------------

        // キーワードによるノイズ遮断
        if (src.includes("icon") || src.includes("banner") || src.includes("logo") || src.includes("loading")) return false;
        return src.startsWith('http');
      })
      .map(img => {
        let src = img.src || "";
        // cabinet（本命）ならサイズ制限パラメータを全抹殺して高画質化
        if (src.includes("cabinet")) {
          return src.split('?')[0]; 
        }
        return src.replace(/\?(?:_ex|fitin|downsize)=[^&]+/, "");
      });

    // 重複を削除し、cabinet（楽天本命）を最優先に並べ替え
    const sortedImages = [...new Set(processedImages)].sort((a, b) => {
      const aIsCabinet = a.includes("cabinet") ? 0 : 1;
      const bIsCabinet = b.includes("cabinet") ? 0 : 1;
      return aIsCabinet - bIsCabinet;
    });

    sendResponse({
      title: document.title,
      images: sortedImages.slice(0, 30),
      url: window.location.href
    });
  }
  return true;
});
