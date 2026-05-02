/**
 * sidepanel.js [聖域・完結編 - SCOUT V2.9]
 * チケット（URL）読み取り & 高速保存プロトコル
 */

const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbzR71N59172SmfQ_KIh5yslhMSZiT0J9GMltoJSZuRAyxJREpqLU-2_amGRhh4mMnkzbg/exec";

let currentTarget = { row: null, url: "" };
let selectedImages = [];

/**
 * ⚡ 斥候（content.js）から情報を取得し、座標（row）を特定する
 */
async function syncFromScout() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    currentTarget.url = tab.url;

    // 1. 招待状（URLの ?row= ）を最優先で読み取る
    const urlObj = new URL(tab.url);
    let row = urlObj.searchParams.get('row');

    if (row) {
      currentTarget.row = row;
      document.getElementById('target-info').innerText = `🎯 Row ${row} ロック完了`;
    } else {
      // チケットがない場合はGASに今の選択行を聞く（予備）
      document.getElementById('target-info').innerText = "座標を同期中...";
      try {
        const res = await fetch(GAS_ENDPOINT, {
          method: "POST",
          body: JSON.stringify({ action: "get_active_row_info" })
        });
        const data = await res.json();
        if (data && data.row) {
          currentTarget.row = data.row;
          document.getElementById('target-info').innerText = `🎯 Row ${data.row} 捕捉`;
        } else {
          document.getElementById('target-info').innerText = "🔍 楽天市場を開いてください";
        }
      } catch (e) {
        document.getElementById('target-info').innerText = "⚠️ GAS通信エラー";
      }
    }

    // 2. 画像の抽出依頼
    chrome.tabs.sendMessage(tab.id, { action: "GET_IMAGES" }, (response) => {
      if (response && response.images) {
        renderImageGrid(response.images);
      }
    });
  } catch (e) {
    console.error("Sync Error:", e);
  }
}

function renderImageGrid(images) {
  const grid = document.getElementById('image-grid');
  if (!grid) return;
  grid.innerHTML = "";
  selectedImages = [];
  
  images.forEach(src => {
    const img = document.createElement('img');
    img.src = src;
    img.addEventListener('click', () => {
      img.classList.toggle('selected');
      if (img.classList.contains('selected')) {
        selectedImages.push(src);
      } else {
        selectedImages = selectedImages.filter(i => i !== src);
      }
      document.getElementById('send-btn').innerText = `📸 聖域（シート）へ保存 (${selectedImages.length})`;
    });
    grid.appendChild(img);
  });
}

/**
 * 📸 聖域（シート）へ保存
 */
document.getElementById('send-btn').addEventListener('click', async () => {
  if (!currentTarget.row) return alert("保存先の行が不明です。");
  if (selectedImages.length === 0) return alert("画像を選んでください。");

  const btn = document.getElementById('send-btn');
  btn.disabled = true;
  document.getElementById('status-msg').innerText = "聖域へ転送中...";

  try {
    const base64Images = await Promise.all(selectedImages.map(async (url) => {
      const resp = await fetch(url);
      const blob = await resp.blob();
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    }));

    const res = await fetch(GAS_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({
        action: "save_images",
        targetRow: currentTarget.row,
        url: currentTarget.url,
        imageDatas: base64Images
      })
    });
    const data = await res.json();
    if (data.status === "success" || data.success) {
      document.getElementById('status-msg').innerText = `✨ Row ${currentTarget.row} へ保存完了！`;
    } else {
      document.getElementById('status-msg').innerText = "❌ 保存失敗: " + (data.message || "Error");
    }
  } catch (e) {
    document.getElementById('status-msg').innerText = "❌ 聖域が応答しません。";
  }
  btn.disabled = false;
});

/**
 * 🚀 楽天ROOMへ登録（文章準備）
 */
document.getElementById('room-post-btn').addEventListener('click', async () => {
  const btn = document.getElementById('room-post-btn');
  btn.disabled = true;
  document.getElementById('status-msg').innerText = "劇薬テキストを抽出中...";

  try {
    const res = await fetch(GAS_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({ 
        action: "get_room_post_info", 
        itemUrl: currentTarget.url 
      })
    });
    const data = await res.json();
    
    if (data && data.roomContent) {
      await chrome.storage.local.set({ pendingRoomComment: data.roomContent });
      document.getElementById('status-msg').innerText = "✅ 装填完了。アイコンを押してROOMへ。";
    } else {
      document.getElementById('status-msg').innerText = "❌ 文章が見つかりません。";
    }
  } catch (e) {
    document.getElementById('status-msg').innerText = "❌ 通信エラー";
  }
  btn.disabled = false;
});

// 🔄 画像を再抽出ボタン
document.getElementById('sync-btn').onclick = syncFromScout;

// タブ切り替えや更新時に再同期
chrome.tabs.onActivated.addListener(syncFromScout);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') syncFromScout();
});

// 即座に同期を開始
syncFromScout();
