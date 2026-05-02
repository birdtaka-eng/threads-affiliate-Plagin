/**
 * background.js [司令塔・自動展開編 - SCOUT]
 */
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
});
