/**
 * background.js [司令塔・自動展開編 - SCOUT]
 */
const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbxbXwMHFdGYLp_vR39U6iVHoIf1XmWuz3aESCU7n8X308-vlNRC1nXuvmCZFPnidpgShw/exec";

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// 🚀 【強化】メッセージリレー & サイドパネル強制オープン
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ROOM_LANDED") {
    // 1. まずサイドパネルを開く（現在のタブに紐付け）
    chrome.sidePanel.open({ tabId: sender.tab.id }).then(() => {
      // 2. 0.5秒待ってパネルの準備ができたらリレー
      setTimeout(() => {
        chrome.runtime.sendMessage(request);
      }, 500);
    }).catch(e => console.error("Sidepanel open failed:", e));
  }

  // 🎯 ROOMアイテムURL → GASへ直接保存（サイドパネル不要）
  if (request.action === "ROOM_ITEM_CAPTURED") {
    fetch(GAS_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({
        action: "save_room_url",
        targetRow: request.row,
        roomItemUrl: request.url
      })
    })
    .then(r => r.json())
    .then(data => {
      console.log(`✅ ROOM Item URL saved: Row ${request.row} → ${request.url}`);
    })
    .catch(e => console.error("ROOM URL save failed:", e));
  }
});
