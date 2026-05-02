/**
 * 00_Main.gs [聖域・真実の帰還 - 三位一体 V2.1 鉄壁版]
 */

/**
 * 🚀 自動メニュー作成
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('💎 Sanctuary')
    .addItem('🚀【1】特急リンク一括生成', 'generateAllTicketLinks')
    .addItem('📂【2】フォルダを開く', 'openSanctuaryFolder')
    .addItem('🔧【3】既存写真の修復', 'fixExistingImageNotes')
    .addSeparator()
    .addItem('✨【4】文章生成（偏愛）', 'generateTextA')
    .addItem('✨【5】文章生成（勝利）', 'generateTextB')
    .addSeparator()
    .addItem('🔍【6】モデル名を確認', 'listAvailableGeminiModels')
    .addItem('🔑【7】楽天IDを封印', 'runSetup')
    .addToUi();
}

/**
 * 📥 doGet: 拡張機能（SCOUT）からの情報取得リクエストを処理
 */
function doGet(e) {
  const action = e.parameter.action;
  
  // スプレッドシートで「座標同期」された最新の行番号を返す
  if (action === "get_active_row") {
    const row = PropertiesService.getScriptProperties().getProperty('LATEST_TARGET_ROW');
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      row: row ? parseInt(row) : null
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput("Invalid Action").setMimeType(ContentService.MimeType.TEXT);
}

/**
 * 📥 doPost: 拡張機能（SCOUT）からの全リクエストを処理
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    // URLから行を特定
    let row = findRowByUrl(data.url);
    if (!row) {
      const latestRow = PropertiesService.getScriptProperties().getProperty('LATEST_TARGET_ROW');
      row = latestRow ? parseInt(latestRow) : null;
    }

    // 1. 画像の保存
    if (action === "saveImages" || action === "save_images") {
      logToSheet("saveImages", "INFO", `Row: ${row}, Images: ${data.images.length}`);
      const result = saveImagesToSheet({ ...data, targetRow: row });
      logToSheet("saveImages", "SUCCESS", `Saved to row: ${result.row}`);
      return createJsonResponse(result);
    }
    
    // 2. ROOM投稿用の全情報を取得（ItemCode + 文章）
    if (action === "getRoomPostInfo" || action === "getRoomContent") {
      logToSheet("getRoomPostInfo", "INFO", `TargetRow: ${row}`);
      if (!row || row < 3) throw new Error("行を特定できません。座標同期してください。");
      
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      const itemUrl = sheet.getRange(row, COL.ITEM_URL).getValue();
      const roomContent = sheet.getRange(row, COL.GEN_ROOM).getValue();
      
      // 楽天APIでItemCodeを特定（ゴミデータが入っている場合も再取得）
      let itemCode = sheet.getRange(row, COL.ITEM_CODE).getValue();
      if (!itemCode || isNaN(itemCode)) {
        logToSheet("getRoomPostInfo", "INFO", `Fetching ItemCode (Invalid or Missing): ${itemUrl}`);
        const details = getRakutenItemDetails(itemUrl);
        if (details) {
          itemCode = details.itemCode;
          sheet.getRange(row, COL.ITEM_CODE).setValue(itemCode); // 正しいIDで浄化
          logToSheet("getRoomPostInfo", "SUCCESS", `Purified ItemCode: ${itemCode}`);
        } else {
          logToSheet("getRoomPostInfo", "WARNING", `Failed to fetch ItemCode for: ${itemUrl}`);
        }
      }
      
      return createJsonResponse({ 
        status: "success", 
        itemCode: itemCode, 
        roomContent: roomContent 
      });
    }

    // 3. 文章生成
    if (action === "generateText" || action === "generate_text") {
      logToSheet("generateText", "INFO", `Persona: ${data.persona}, Row: ${row}`);
      if (!row || row < 3) throw new Error("行を特定できません。");
      const result = generateThreadsPost(row, data.persona || 'A');
      logToSheet("generateText", "SUCCESS", `Generated for row: ${row}`);
      return createJsonResponse({ status: "success", ...result, row: row });
    }

    return createJsonResponse({ status: "error", message: "不明なアクション: " + action });

  } catch (err) {
    // 🛡️ 何が起きても必ずJSONを返す（HTMLエラー画面を回避）
    logToSheet("SYSTEM_ERROR", "ERROR", err.message + "\n" + err.stack);
    return createJsonResponse({ 
      status: "error", 
      message: "GAS内部エラー: " + err.message,
      stack: err.stack
    });
  }
}

/**
 * 🔍 URLからシート上の行を検索する
 */
function findRowByUrl(url) {
  if (!url) return null;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return null;
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return null;

  const data = sheet.getRange(3, COL.ITEM_URL, lastRow - 2).getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] && url.includes(data[i][0])) {
      return i + 3;
    }
  }
  return null;
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- 既存の generateTextA, generateTextB, openSanctuaryFolder, syncActiveRow は維持 ---
function generateTextA() {
  const row = SpreadsheetApp.getActiveSpreadsheet().getActiveCell().getRow();
  if (row < 3) return SpreadsheetApp.getUi().alert("3行目以降を選択してください。");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast("⏳ 影（偏愛）の魂を召喚中...", "Gemini");
  try { generateThreadsPost(row, 'A'); ss.toast("✅ 調合完了！", "Gemini"); } 
  catch (e) { SpreadsheetApp.getUi().alert("❌ エラー: " + e.message); }
}

function generateTextB() {
  const row = SpreadsheetApp.getActiveSpreadsheet().getActiveCell().getRow();
  if (row < 3) return SpreadsheetApp.getUi().alert("3行目以降を選択してください。");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast("⏳ 光（勝利）の魂を召喚中...", "Gemini");
  try { generateThreadsPost(row, 'B'); ss.toast("✅ 調合完了！", "Gemini"); } 
  catch (e) { SpreadsheetApp.getUi().alert("❌ エラー: " + e.message); }
}

function openSanctuaryFolder() {
  const folder = getOrCreateFolder(DRIVE_FOLDER_NAME);
  const url = folder.getUrl();
  const html = `<div style="text-align:center;padding:10px;"><p>写真の保存先はこちらです：</p><a href="${url}" target="_blank" onclick="google.script.host.close();" style="display:inline-block;padding:12px;background:#1db954;color:white;text-decoration:none;border-radius:20px;font-weight:bold;">Googleドライブを開く</a></div>`;
  const output = HtmlService.createHtmlOutput(html).setWidth(300).setHeight(150);
  SpreadsheetApp.getUi().showModalDialog(output, "📁 Folder Found");
}

/**
 * 🚀 D列のURLを元に、行番号付きの特急リンクをE列に一括生成する
 */
function generateAllTicketLinks() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return;

  const urls = sheet.getRange(3, COL.ITEM_URL, lastRow - 2, 1).getValues();
  const formulas = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i][0];
    const row = i + 3;
    
    if (url && url.startsWith('http')) {
      // URLにすでに ? があれば &row=、なければ ?row= を使う
      const separator = url.includes('?') ? '&' : '?';
      const ticketUrl = `${url}${separator}row=${row}`;
      formulas.push([`=HYPERLINK("${ticketUrl}", "🚀ROOMへ投稿")`]);
    } else {
      formulas.push([""]);
    }
  }

  sheet.getRange(3, COL.ITEM_CODE, formulas.length, 1).setFormulas(formulas);
  SpreadsheetApp.getUi().alert("✅ " + formulas.length + " 行分の特急チケットを発行しました！\nE列のリンクから作業を開始してください。");
}
