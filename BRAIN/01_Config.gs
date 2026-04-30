// 🔐 API管理
const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

/**
 * 初回のみ実行してAPIキーを封印する関数
 * 実行後、この関数は削除してOK
 */
function setupGeminiKey() {
  PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', 'AIzaSyBYpGKGF4uycnx3z3C4oa_KuBBm715C53k');
  console.log("✅ APIキーを封印しました。");
}

const SS_ID = "1vgpoDggisreX8xYDarTGMjWdE5qNgy9sGKp5fe9toP8";
const SHEET_NAME = "Board"; 
const COL = { 
  ITEM_URL: 4, 
  ITEM_NAME: 3, 
  GEN_ROOM: 9,   // I列: ROOM投稿用（ノーマル）
  GEN_HOOK: 10,  // J列: スレッズ投稿用（偏愛）
  GEN_REPLY: 11, // K列: リプライ用（感情的）
  IMAGE_F: 6, 
  IMAGE_G: 7, 
  IMAGE_H: 8 
};

// 📂 ドライブ保存設定
const DRIVE_FOLDER_NAME = "Threads_Sanctuary_Photos";
