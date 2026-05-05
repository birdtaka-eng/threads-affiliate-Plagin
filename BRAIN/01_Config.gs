/**
 * ⚙️ 設定値の取得（シート優先 ＞ スクリプトプロパティ）
 */
function getConfigValue(keyName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName('Settings');
  
  // 1. シートから探す
  if (settingsSheet) {
    const data = settingsSheet.getDataRange().getValues();
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === keyName) return data[i][1];
    }
  }
  
  // 2. プロパティから探す
  return PropertiesService.getScriptProperties().getProperty(keyName);
}

// 動的定数（これらを使用して各処理を行う）
const GEMINI_API_KEY = getConfigValue('GEMINI_API_KEY');
const THREADS_ACCESS_TOKEN = getConfigValue('THREADS_ACCESS_TOKEN');
const THREADS_USER_ID = getConfigValue('THREADS_USER_ID');

/**
 * 初回セットアップ用（Settingsシートがない場合に作成）
 */
function initializeSettingsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Settings');
  if (!sheet) {
    sheet = ss.insertSheet('Settings');
    sheet.getRange('A1:C1').setValues([['項目', '設定値', '説明']])
         .setBackground('#d9ead3').setFontWeight('bold');
    
    const initialData = [
      ['GEMINI_API_KEY', '', 'Google AI Studioで取得したキー'],
      ['THREADS_ACCESS_TOKEN', '', 'Meta for Developersで取得したトークン'],
      ['THREADS_USER_ID', '', 'ThreadsのアカウントID（数字）'],
      ['RAKUTEN_APP_ID', '', '楽天ウェブサービスのアリフィエイトID等']
    ];
    sheet.getRange(2, 1, initialData.length, 3).setValues(initialData);
    sheet.setColumnWidth(1, 200);
    sheet.setColumnWidth(2, 400);
    sheet.setColumnWidth(3, 300);
  }
  SpreadsheetApp.getUi().alert("✅ Settingsシートを作成しました。値を入力してください。");
}

const SS_ID = "1vgpoDggisreX8xYDarTGMjWdE5qNgy9sGKp5fe9toP8";
const SHEET_A = "Board_A"; // 人格A：偏愛・影
const SHEET_B = "Board_B"; // 人格B：勝利・光
const COL = { 
  ITEM_URL: 4, 
  ITEM_NAME: 3, 
  ITEM_CODE: 5,  // E列: 楽天ItemCode / ROOMリンク
  GEN_ROOM: 9,   // I列: ROOM投稿用（ノーマル）
  GEN_HOOK: 10,  // J列: スレッズ投稿用（偏愛）
  GEN_REPLY: 11, // K列: リプライ用（感情的）
  IMAGE_F: 6, 
  IMAGE_G: 7, 
  IMAGE_H: 8,
  ROOM_ITEM_URL: 13 // M列: ROOM単品アイテムURL（投稿完了後に自動保存）
};

// 📂 ドライブ保存設定
const DRIVE_FOLDER_NAME = "Threads_Sanctuary_Photos";
