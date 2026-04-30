/**
 * sidepanel.js [聖域・完結編 - SCOUT]
 * 画像を軽量化して聖域（GAS）へ送り届ける。
 */

const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbxbXwMHFdGYLp_vR39U6iVHoIf1XmWuz3aESCU7n8X308-vlNRC1nXuvmCZFPnidpgShw/exec";

let currentTarget = { row: null, url: "" };

async function syncFromScout() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;

  currentTarget.url = tab.url;

  // 1. GASから現在のターゲット行を取得
  try {
    const res = await fetch(GAS_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({ action: "get_active_row_info" })
    });
    const data = await res.json();
    currentTarget.row = data.row;
    document.getElementById('target-info').innerText = `🎯 Row: ${data.row}`;
  } catch (e) {
    console.error("Failed to sync row", e);
  }

  // 2. ページ内の画像を抽出
  chrome.tabs.sendMessage(tab.id, { action: "GET_IMAGES" }, (images) => {
    if (images) renderImageGrid(images);
  });
}

/**
 * 🎨 画像グリッドを表示
 */
function renderImageGrid(images) {
  const grid = document.getElementById('image-grid');
  if (!grid) return;
  grid.innerHTML = "";
  images.forEach(src => {
    const img = document.createElement('img');
    img.src = src;
    img.onclick = () => img.classList.toggle('selected');
    grid.appendChild(img);
  });
}

/**
 * 🚀 【ブロック】画像圧縮 & 送信
 */
async function sendImages() {
  const selected = Array.from(document.querySelectorAll('img.selected')).map(el => el.src);
  if (selected.length === 0) return alert("画像を選んでください。");

  const statusMsg = document.getElementById('status-msg');
  statusMsg.innerText = "⏳ 圧縮中...";

  const compressedImages = [];
  for (let src of selected) {
    try {
      const base64 = await compressImage(src);
      compressedImages.push(base64);
    } catch (e) { console.error("Compression failed", src); }
  }

  statusMsg.innerText = "📡 聖域へ送信中...";

  try {
    const res = await fetch(GAS_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({
        action: "save_images",
        targetRow: currentTarget.row,
        imageDatas: compressedImages
      })
    });
    const result = await res.json();
    if (result.status === "success") {
      statusMsg.innerText = "✅ 聖域へ保存完了！";
    } else {
      statusMsg.innerText = "❌ 保存失敗: " + (result.message || "error");
    }
  } catch (e) {
    statusMsg.innerText = "❌ 送信失敗";
  }
}

/**
 * 🛠️ 画像圧縮ツール (Canvas API)
 */
function compressImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const maxW = 1024;
      const finalW = img.width > maxW ? maxW : img.width; // 👈 小さい画像は拡大しない！
      const scale = finalW / img.width;
      canvas.width = finalW;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = src;
  });
}

// 初回起動
syncFromScout();

// 【ブロック】タカ様の動きに追従する
chrome.tabs.onActivated.addListener(syncFromScout);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') syncFromScout();
});

document.getElementById('sync-btn').onclick = syncFromScout;
document.getElementById('send-btn').onclick = sendImages;

/**
 * ✨ 文章生成アクション
 */
async function generateText(persona) {
  if (!currentTarget.row) return alert("ターゲット行が同期されていません。");

  const statusMsg = document.getElementById('status-msg');
  const resultArea = document.getElementById('result-area');
  
  statusMsg.innerText = `⏳ Geminiが「${persona === 'A' ? '影' : '光'}」の文章を調合中...`;
  resultArea.style.display = "none";

  try {
    const res = await fetch(GAS_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({
        action: "generate_text",
        targetRow: currentTarget.row,
        persona: persona
      })
    });
    const data = await res.json();

    if (data.status === "success") {
      statusMsg.innerText = "✅ 劇薬の調合が完了しました。";
      document.getElementById('result-hook').innerText = data.hook;
      document.getElementById('result-body').innerText = data.body;
      resultArea.style.display = "block";
    } else {
      statusMsg.innerText = "❌ 調合失敗: " + (data.message || "error");
    }
  } catch (e) {
    statusMsg.innerText = "❌ 通信エラー";
    console.error(e);
  }
}

document.getElementById('gen-a-btn').onclick = () => generateText('A');
document.getElementById('gen-b-btn').onclick = () => generateText('B');

document.getElementById('copy-btn').onclick = () => {
  const hook = document.getElementById('result-hook').innerText;
  const body = document.getElementById('result-body').innerText;
  const text = `${hook}\n\n${body}`;
  navigator.clipboard.writeText(text).then(() => {
    alert("📋 クリップボードにコピーしました！");
  });
};
