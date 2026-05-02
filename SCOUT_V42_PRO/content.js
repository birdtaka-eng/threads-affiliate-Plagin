console.log("🥷 SCOUT IS ALIVE: Scanning page URL...", location.href);

// 🚀 【真・完遂】自動反射（Auto-Reflector）：隠された「本物のURL」を全探索してジャンプ
if (/row=\d+/.test(location.href)) {
  console.log("🥷 Auto-Reflector Activated: Hunting for the hidden ROOM button...");
  
  const hashPart = location.hash || location.href.split('#')[1] || "";
  const rowMatch = hashPart.match(/row=(\d+)/);
  const row = rowMatch ? rowMatch[1] : "1";

  // 💡 転送前に拡張機能のストレージに保存（ドメインを跨いでも消えない）
  chrome.storage.local.set({ 'scout_target_row': row }, () => {
    setTimeout(() => {
      const allLinks = Array.from(document.querySelectorAll('a'));
      // 🚀 【強化】特定のクラス、またはURLパターンでROOMボタンを捕捉
      const targetLink = allLinks.find(a => 
        (a.href && a.href.includes('room.rakuten.co.jp/mix')) ||
        (a.parentElement && a.parentElement.classList.contains('susumeru-roomShareButton'))
      );
      
      if (targetLink && targetLink.href) {
        console.log("🎯 Hidden URL Found! Jumping to ROOM...");
        location.href = targetLink.href;
      } else {
        console.warn("⚠️ ROOM button still not found in DOM.");
      }
    }, 2000);
  });
}

// 🚀 【真・完遂】ROOM着地時に自動で文章注入を起動
if (location.href.includes('room.rakuten.co.jp/mix/collect')) {
  chrome.storage.local.get(['scout_target_row'], (result) => {
    const row = result.scout_target_row;
    if (row) {
      console.log(`🎯 Landed on ROOM! Restoring row from storage: ${row}`);
      // 1.5秒待ってページが安定してからサイドパネルへ「文章ちょうだい」と通知
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: "ROOM_LANDED", row: row });
        // 使い終わったらメモリを掃除
        chrome.storage.local.remove('scout_target_row');
      }, 1500);
    }
  });
}

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
      .map(img => {
        let src = img.src;
        if (src.includes('rakuten.co.jp')) {
          // 🚀 楽天のサイズ制限パラメータを 1024px へ強制書き換え
          src = src.replace(/_ex=\d+x\d+/g, '_ex=1024x1024')
                   .replace(/fitin=\d+:\d+/g, 'fitin=1024:1024');
        }
        return src;
      });
    
    sendResponse([...new Set(images)]);
  }

  // 🚀 【真・完遂】Reactの壁を突破する文章流し込み
  if (request.action === "INJECT_TEXT") {
    const textarea = document.querySelector('textarea') || document.querySelector('.room-comment-textarea');
    if (textarea) {
      try {
        // 1. Reactの内部Stateを強制的に書き換えるプロトコル
        const nativeValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value'
        ).set;
        nativeValueSetter.call(textarea, request.text);
        
        // 2. 入力イベントをシミュレート（これで「完了」ボタンが有効になる）
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
        
        // 3. 念のためフォーカスを外して確定させる
        textarea.blur();
        
        console.log("✅ React Injection Success");
        sendResponse({ status: "success" });
      } catch (e) {
        // 万が一のフォールバック
        textarea.value = request.text;
        console.error("❌ React Injection Failed, fallback used", e);
        sendResponse({ status: "error", message: e.toString() });
      }
    } else {
      sendResponse({ status: "error", message: "textarea not found" });
    }
  }
  return true;
});
