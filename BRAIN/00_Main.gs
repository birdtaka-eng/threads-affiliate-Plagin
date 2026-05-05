/**
 * 00_Main.gs [聖域・真実の帰還 - 最終完全版]
 */

/**
 * 🚀 自動メニュー作成
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('💎 Sanctuary')
    .addItem('🚀【1】座標同期', 'syncActiveRow')
    .addItem('📂【2】フォルダを開く', 'openSanctuaryFolder')
    .addItem('🔧【3】既存写真の修復', 'fixExistingImageNotes')
    .addSeparator()
    .addItem('🔥【4-A】魂の排出（人格A・偏愛）', 'generateTripleSetsA')
    .addItem('🌟【4-B】魂の排出（人格B・勝利）', 'generateTripleSetsB')
    .addSeparator()
    .addItem('🔍【5】モデル名を確認', 'listAvailableGeminiModels')
    .addSeparator()
    .addItem('🚀【6】ROOMリンク一括生成', 'generateRoomLinks')
    .addSeparator()
    .addItem('⚙️【S】設定シートの作成', 'initializeSettingsSheet')
    .addToUi();
}

/**
 * ✨ 人格A（異常な偏愛）で3セット生成
 */
function generateTripleSetsA() {
  generateTripleSets('A');
}

/**
 * ✨ 人格B（社会的勝利）で3セット生成
 */
function generateTripleSetsB() {
  generateTripleSets('B');
}

/**
 * シート上の選択行に対して指定された人格で同時生成
 */
function generateTripleSets(personaKey = 'A') {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheetName = ss.getActiveSheet().getName();
  const targetSheetName = personaKey === 'A' ? SHEET_A : SHEET_B;

  if (activeSheetName !== targetSheetName) {
    return SpreadsheetApp.getUi().alert(`⚠️ シート不一致\n現在は '${activeSheetName}' です。\n'${targetSheetName}' シートを開いてから実行してください。`);
  }

  const row = ss.getActiveCell().getRow();
  if (row < 3) return SpreadsheetApp.getUi().alert("3行目以降を選択してください。");
  
  const personaLabel = personaKey === 'A' ? "人格A (偏愛)" : "人格B (勝利)";
  ss.toast(`⏳ ${personaLabel} の魂を召喚中...`, "Gemini");
  
  try {
    const res = generateThreadsPost(row, personaKey);
    ss.toast(`✅ ${personaLabel} 3案の書き込みを完了しました！`, "Gemini");
  } catch (e) {
    SpreadsheetApp.getUi().alert("❌ 調合エラー: " + e.message);
  }
}

/**
 * 📂 写真保存フォルダのURLを表示する
 */
function openSanctuaryFolder() {
  const folder = getOrCreateFolder(DRIVE_FOLDER_NAME);
  const url = folder.getUrl();
  const html = `<div style="text-align:center;padding:10px;"><p>写真の保存先はこちらです：</p><a href="${url}" target="_blank" onclick="google.script.host.close();" style="display:inline-block;padding:12px;background:#1db954;color:white;text-decoration:none;border-radius:20px;font-weight:bold;">Googleドライブを開く</a></div>`;
  const output = HtmlService.createHtmlOutput(html).setWidth(300).setHeight(150);
  SpreadsheetApp.getUi().showModalDialog(output, "📁 Folder Found");
}

/**
 * ⚡ 座標同期
 */
function syncActiveRow() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const row = sheet.getActiveCell().getRow();
  
  if (row < 3) return ss.toast("⚠️ データ行（3行目以降）を選択してください。");

  PropertiesService.getScriptProperties().setProperty('LATEST_TARGET_ROW', row.toString());

  const itemUrl = sheet.getRange(row, COL.ITEM_URL).getValue();
  if (itemUrl) {
    const html = `<div style="text-align:center;padding:10px;"><a href="${itemUrl}" target="_blank" onclick="google.script.host.close();" style="display:inline-block;padding:15px;background:#1a73e8;color:white;text-decoration:none;border-radius:30px;font-weight:bold;">商品ページを開く</a></div>`;
    const output = HtmlService.createHtmlOutput(html).setWidth(250).setHeight(100);
    SpreadsheetApp.getUi().showModalDialog(output, "Row " + row + " Locked");
  } else {
    ss.toast(`✅ 行 ${row} を捕捉しました。`, "Sanctuary");
  }
}

/**
 * 📥 doPost: 拡張機能（SCOUT）からの全リクエストを処理
 */
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  
  // 1. 画像の保存
  if (data.action === "save_images") {
    const result = saveImagesToSheet(data);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // 2. 現在の行情報の回答
  if (data.action === "get_active_row_info") {
    const row = PropertiesService.getScriptProperties().getProperty('LATEST_TARGET_ROW');
    return ContentService.createTextOutput(JSON.stringify({ row: row }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 3. 文章生成
  if (data.action === "generate_text") {
    try {
      const result = generateThreadsPost(data.targetRow, data.persona || 'A');
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (e) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: e.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 4. ROOM用文章の取得
  if (data.action === "get_room_info") {
    const row = parseInt(data.targetRow || PropertiesService.getScriptProperties().getProperty('LATEST_TARGET_ROW'));
    if (!row || row < 3) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "行が特定できません。座標同期してください。" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    const roomContent = sheet.getRange(row, COL.GEN_ROOM).getValue();
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      roomContent: roomContent 
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 5. ROOM投稿完了URLの保存
  if (data.action === "save_room_url") {
    const row = parseInt(data.targetRow);
    const url = data.roomUrl;
    if (!row || !url) return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "データ不足" })).setMimeType(ContentService.MimeType.JSON);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    sheet.getRange(row, COL.ROOM_ITEM_URL).setValue(url);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
