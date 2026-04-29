/**
 * 00_Main.gs [聖域・完結編]
 * 司令塔。全ての実行はここから始まる。
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('💎 Sanctuary')
    .addItem('🚀【1】座標同期', 'syncActiveRow')
    .addToUi();
}

/**
 * ⚡ 座標同期：現在選択している「行」を聖域の記憶に刻む
 */
function syncActiveRow() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const row = sheet.getActiveCell().getRow(); // 👈 ここで行番号を特定しています！
  
  if (row < 3) return ss.toast("⚠️ データ行（3行目以降）を選択してください。");

  // 聖域の記憶（UserProperties）に保存
  PropertiesService.getUserProperties().setProperty('LATEST_TARGET_ROW', row.toString());

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
 * 📥 doPost: 拡張機能（SCOUT）からのデータを受信する
 */
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  if (data.action === "save_images") {
    return ContentService.createTextOutput(JSON.stringify(saveImagesToSheet(data)))
      .setMimeType(ContentService.MimeType.JSON);
  }
  // ターゲット行の情報を返す
  if (data.action === "get_active_row_info") {
    const row = PropertiesService.getUserProperties().getProperty('LATEST_TARGET_ROW');
    return ContentService.createTextOutput(JSON.stringify({ row: row }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
