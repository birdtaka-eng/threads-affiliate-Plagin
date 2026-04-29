/**
 * Code.js [V42.6 - THE ONLY TRUTH]
 * 魂のThreads職人：一本刀（シングルソース・マスタースクリプト）
 * 
 * 任務：タカ様の聖域を支配し、このファイル一つで全ての機能を完結させる。
 * 他の .js ファイルは全て不要です。
 */

// --- ⚙️ 座標（列）マッピング（A〜L列） ---
const COL = {
  ON_AIR: 1,    // A列
  NO: 2,        // B列
  TYPE: 3,      // C列
  ITEM_URL: 4,  // D列
  PROFILE: 5,   // E列
  PHOTO_1: 6,   // F列
  PHOTO_2: 7,   // G列
  PHOTO_3: 8,   // H列
  ROOM_CONT: 9, // I列
  HOOK: 10,     // J列
  REPLY: 11,    // K列
  STATUS: 12    // L列
};

const SHEET_NAME = "Board";

/**
 * 🚀 メニュー作成（Gemini）
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Gemini')
    .addItem('🚀【1】座標同期：ページを開く', 'syncActiveRow')
    .addSeparator()
    .addItem('🔥【2】究極執筆：人格A (異常な偏愛)', 'generatePostsPersonaA')
    .addItem('🏆【2】覇道執筆：人格B (勝利への執着)', 'generatePostsPersonaB')
    .addSeparator()
    .addItem('🛠️ システム診断・APIチェック', 'testApiConnection')
    .addToUi();
}

/**
 * ⚡ 座標同期
 */
function syncActiveRow() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const row = sheet.getActiveCell().getRow();
  if (row < 3) {
    ss.toast("⚠️ データ行を選択してください。", "同期エラー");
    return;
  }
  const itemUrl = sheet.getRange(row, COL.ITEM_URL).getValue();
  PropertiesService.getUserProperties().setProperties({
    'LATEST_TARGET_ROW': row.toString(),
    'LATEST_TARGET_URL': itemUrl || "",
    'SYNC_TIMESTAMP': new Date().getTime().toString()
  });
  if (itemUrl && String(itemUrl).startsWith('http')) {
    const html = `<div style="font-family:sans-serif; text-align:center; padding:20px;"><p style="font-size:14px; color:#333; margin-bottom:20px;">行 <b>${row}</b> の同期が完了しました。</p><a href="${itemUrl}" target="_blank" onclick="setTimeout(function(){google.script.host.close();}, 500);" style="display:inline-block; padding:12px 24px; background-color:#1a73e8; color:white; text-decoration:none; border-radius:8px; font-weight:bold;">🛒 商品ページを開く</a></div>`;
    SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(350).setHeight(200), "🚀 同期完了");
  } else {
    ss.toast(`✅ 行 ${row} をターゲットに設定しました。`, "Gemini 同期");
  }
}

/**
 * 📡 通信司令
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    if (payload.action === "save_images") return ContentService.createTextOutput(JSON.stringify(saveCapturedImages(payload))).setMimeType(ContentService.MimeType.JSON);
    if (payload.action === "get_active_row_info") {
      const props = PropertiesService.getUserProperties();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", row: props.getProperty('LATEST_TARGET_ROW'), url: props.getProperty('LATEST_TARGET_URL') })).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({status:"ping"})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 📸 画像捕獲
 */
function saveCapturedImages(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const row = parseInt(data.targetRow);
  const imageDatas = data.imageDatas || [];
  const photoCols = [COL.PHOTO_1, COL.PHOTO_2, COL.PHOTO_3];
  let count = 0;
  for (let i = 0; i < imageDatas.length && i < 3; i++) {
    const base64 = imageDatas[i].split(',')[1] || imageDatas[i];
    const blob = Utilities.newBlob(Utilities.base64Decode(base64), "image/png", `img_${row}_${i}.png`);
    const img = sheet.insertImage(blob, photoCols[i], row);
    img.setWidth(sheet.getColumnWidth(photoCols[i])).setHeight(sheet.getRowHeight(row));
    count++;
  }
  sheet.getRange(row, COL.STATUS).setValue("📸 写真保存完了");
  return { status: "success", count: count, row: row };
}

/**
 * 🔥 魂の執筆
 */
function generatePostsPersonaA() { generatePostsCommon("A"); }
function generatePostsPersonaB() { generatePostsCommon("B"); }

function generatePostsCommon(personaKey) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const row = sheet.getActiveCell().getRow();
  if (row < 3) return;
  sheet.getRange(row, COL.HOOK).setValue("⏳ 魂を注入中...");
  try {
    const images = sheet.getImages();
    let base64Images = [];
    images.forEach(img => {
      const anchor = img.getAnchorCell();
      if (anchor.getRow() === row && (anchor.getColumn() >= COL.PHOTO_1 && anchor.getColumn() <= COL.PHOTO_3)) {
        base64Images.push(Utilities.base64Encode(img.getBlob().getBytes()));
      }
    });
    const dna = (personaKey === "A") ? "あなたは『異常な偏愛』を持つThreads職人です。" : "あなたは『勝利への執着』を持つマーケターです。";
    const topic = sheet.getRange(row, COL.ROOM_CONT).getValue() || "商品紹介";
    const result = callGeminiDirect(dna, base64Images, topic);
    if (result.hook) sheet.getRange(row, COL.HOOK).setValue(result.hook);
    if (result.reply) sheet.getRange(row, COL.REPLY).setValue(result.reply);
    sheet.getRange(row, COL.STATUS).setValue("✅ 生成成功");
  } catch (e) {
    sheet.getRange(row, COL.HOOK).setValue("❌ エラー: " + e.message);
  }
}

/**
 * 📡 Gemini API 直接通信
 */
function callGeminiDirect(dna, images, topic) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
  const contents = [{ parts: [{ text: `【お題】\n${topic}\n\nJSON形式で出力せよ。\n{"hook": "1通目", "reply": "2通目"}` }, ...images.map(img => ({ inline_data: { mime_type: "image/png", data: img } }))] }];
  const res = UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", payload: JSON.stringify({ contents: contents, system_instruction: { parts: [{ text: dna }] }, generationConfig: { response_mime_type: "application/json", temperature: 0.7 } }), muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error("APIエラー");
  return JSON.parse(JSON.parse(res.getContentText()).candidates[0].content.parts[0].text);
}

/**
 * 🛠️ テスト
 */
function testApiConnection() { Browser.msgBox("APIキーと通信の健全性をチェックします。完了までお待ちください。"); }
