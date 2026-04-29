/**
 * sidepanel.js [V42 PRO - Headquarters]
 * 司令塔と斥候を統括し、聖域（GAS）へ情報を転送。
 */

const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbzR71N59172SmfQ_KIh5yslhMSZiT0J9GMltoJSZuRAyxJREpqLU-2_amGRhh4mMnkzbg/exec";

let currentTarget = { row: null, url: "", title: "" };
let selectedImages = [];

function logText(msg) {
  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.innerText = msg;
}

/**
 * ⚡ 斥候（content.js）から情報を取得し、座標同期を行う
 */
async function syncFromScout() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    currentTarget.url = tab.url;

    // 1. 斥候へ報告を要請
    try {
      chrome.tabs.sendMessage(tab.id, { action: "GET_PAGE_INFO" }, async (response) => {
        if (response) {
          renderImageGrid(response.images);
          currentTarget.title = response.title;

          // 2. 本陣（GAS）から座標を読み取る
          logText("座標（カーソル位置）を同期中...");
          const res = await fetch(`${GAS_ENDPOINT}?action=get_active_row`);
          const data = await res.json();

          if (data.success && data.row >= 3) {
            currentTarget.row = data.row;
            document.getElementById('productName').innerText = `Row ${data.row}: ターゲットロック完了`;
            logText("保存準備完了。");
          } else {
            document.getElementById('productName').innerText = "行未選択 (3行目以降を選択)";
            logText("シート側の行をクリックしてください。");
          }
        }
      });
    } catch (e) {
      logText("斥候との通信に失敗しました。ページを一度リロードしてください。");
    }
  } catch (e) {
    console.error("Sidepanel Error:", e.message);
  }
}

function renderImageGrid(images) {
  const grid = document.getElementById('imageGrid');
  if (!grid) return;
  grid.innerHTML = "";
  selectedImages = [];
  images.slice(0, 20).forEach(src => {
    const img = document.createElement('img');
    img.src = src;
    img.addEventListener('click', () => {
      if (img.classList.contains('selected')) {
        img.classList.remove('selected');
        selectedImages = selectedImages.filter(i => i !== src);
      } else {
        if (selectedImages.length >= 3) return;
        img.classList.add('selected');
        selectedImages.push(src);
      }
    });
    grid.appendChild(img);
  });
}

document.getElementById('btnSave').addEventListener('click', async () => {
  if (!currentTarget.row) return logText("保存先の行が不明です。");
  if (selectedImages.length === 0) return logText("写真を選んでください。");

  logText("写真をパッキング中...");
  try {
    // 1. バックグラウンド（background.js）に画像取得を「外注」してブロックを回避
    const base64Images = await Promise.all(selectedImages.map(async (url) => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "FETCH_IMAGE_BASE64", url: url }, (response) => {
          if (response && response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response ? response.error : "Unknown fetch error"));
          }
        });
      });
    }));

    logText("聖域へ転送中...");
    const res = await fetch(GAS_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({
        action: "save_images",
        targetRow: currentTarget.row,
        url: currentTarget.url,
        imageDatas: base64Images // 捕獲した生データを送信
      })
    });
    const data = await res.json();
    if (data.success) {
      logText("✅ Row " + currentTarget.row + " へ保存成功！");
    } else {
      logText("❌ 通信エラー: " + (data.message || "Failed"));
    }
  } catch (e) { logText("聖域が応答しません。"); }
});

// タブ切り替えや更新時に再同期
chrome.tabs.onActivated.addListener(syncFromScout);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') syncFromScout();
});

// 即座に同期を開始（Instant Sync）
(function() {
  logText("⚡ ターゲット捕捉中...");
  syncFromScout();
})();

/**
 * 司令塔（background.js）からの指令を受信
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // background.jsからのデバッグメッセージなどをsidepanelのstatusに表示
  if (request.action === "UPDATE_STATUS") {
    const statusMessage = request.message || "ステータス更新";
    const modelName = request.model || "不明なモデル";

    const productNameEl = document.getElementById('productName');
    if (productNameEl) {
      productNameEl.innerText = `稼働モデル: ${modelName}`;
    }
    logText(statusMessage);
  }
});
