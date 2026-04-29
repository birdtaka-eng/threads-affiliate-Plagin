/**
 * Gemini_Master.js [V42.5 - GENESIS REBORN]
 * 魂のThreads職人：一本刀（シングルソース・マスタースクリプト）
 * 
 * 任務：タカ様の聖域（スプレッドシート）を支配し、拡張機能と連動して「究極のThreads投稿」を生成する。
 */

/* --- ⚙️ 座標（列）マッピング（BRAIN/01_Config.gs と衝突するため一時停止） ---
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

const SHEET_NAME = "Board"; // メインシート名
*/

/* 🚀 メニュー作成（Gemini） - BRAIN/00_Main.gs と衝突するため一時停止
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
*/

/**
 * ⚡ 座標同期：現在行をロックし、商品ページへ
 */
function syncActiveRow() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const row = sheet.getActiveCell().getRow();

  if (row < 3) { // ヘッダーが2行目の場合、データは3行目から
    ss.toast("⚠️ データ行（3行目以降）を選択してください。", "同期エラー");
    return;
  }

  const itemUrl = sheet.getRange(row, COL.ITEM_URL).getValue();

  // UserProperties にターゲット情報を保存 (拡張機能がここを読み取る)
  const props = PropertiesService.getUserProperties();
  props.setProperties({
    'LATEST_TARGET_ROW': row.toString(),
    'LATEST_TARGET_URL': itemUrl || "",
    'SYNC_TIMESTAMP': new Date().getTime().toString()
  });

  if (itemUrl && String(itemUrl).startsWith('http')) {
    const html = `
      <div style="font-family:sans-serif; text-align:center; padding:20px;">
        <p style="font-size:14px; color:#333; margin-bottom:20px;">行 <b>${row}</b> の同期が完了しました。</p>
        <a href="${itemUrl}" target="_blank" 
           onclick="setTimeout(function(){google.script.host.close();}, 500);" 
           style="display:inline-block; padding:12px 24px; background-color:#1a73e8; color:white; text-decoration:none; border-radius:8px; font-weight:bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
          🛒 商品ページを開く
        </a>
      </div>`;
    const output = HtmlService.createHtmlOutput(html).setWidth(350).setHeight(200);
    SpreadsheetApp.getUi().showModalDialog(output, "🚀 同期完了");
  } else {
    ss.toast(`✅ 行 ${row} をターゲットに設定しました。`, "Gemini 同期");
  }
}

/* 📡 通信司令：拡張機能（サイドパネル）からのデータを受信 - BRAIN/00_Main.gs と衝突するため一時停止
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    let result = {};

    if (action === "save_images") {
      result = saveCapturedImages(payload);
    } else if (action === "get_active_row_info") {
      const props = PropertiesService.getUserProperties();
      result = {
        status: "success",
        row: props.getProperty('LATEST_TARGET_ROW'),
        url: props.getProperty('LATEST_TARGET_URL')
      };
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
*/

/**
 * 📸 画像捕獲：拡張機能から送られた Base64 画像をシートに配置
 */
function saveCapturedImages(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const row = parseInt(data.targetRow);
  const imageDatas = data.imageDatas || []; // Base64 配列

  if (!row || row < 3) throw new Error("Invalid target row.");

  const photoCols = [COL.PHOTO_1, COL.PHOTO_2, COL.PHOTO_3];
  let count = 0;

  for (let i = 0; i < imageDatas.length && i < 3; i++) {
    const base64 = imageDatas[i].split(',')[1] || imageDatas[i];
    const blob = Utilities.newBlob(Utilities.base64Decode(base64), "image/png", `img_${row}_${i}.png`);
    
    // 浮遊画像として配置 (OverGrid)
    const img = sheet.insertImage(blob, photoCols[i], row);
    
    // サイズ調整（セルの大きさに合わせる）
    const cellWidth = sheet.getColumnWidth(photoCols[i]);
    const cellHeight = sheet.getRowHeight(row);
    img.setWidth(cellWidth).setHeight(cellHeight);
    
    count++;
  }

  sheet.getRange(row, COL.STATUS).setValue("📸 写真保存完了");
  return { status: "success", count: count, row: row };
}

/**
 * 🔥 魂の執筆：Gemini 1.5 PRO を直接叩いて生成
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
    // 1. 画像の取得 (シート上の浮遊画像から Base64 化して取得)
    const images = sheet.getImages();
    let base64Images = [];
    images.forEach(img => {
      const anchor = img.getAnchorCell();
      if (anchor.getRow() === row && (anchor.getColumn() >= COL.PHOTO_1 && anchor.getColumn() <= COL.PHOTO_3)) {
        base64Images.push(Utilities.base64Encode(img.getBlob().getBytes()));
      }
    });

    // 2. DNAの取得
    const dna = getSoulDNA(personaKey);
    const topic = sheet.getRange(row, COL.ROOM_CONT).getValue() || "商品紹介";

    // 3. Gemini 呼び出し
    const result = callGeminiDirect(dna, base64Images, topic);
    
    // 4. シートへの書き込み
    if (result.hook) sheet.getRange(row, COL.HOOK).setValue(result.hook);
    if (result.reply) sheet.getRange(row, COL.REPLY).setValue(result.reply);
    sheet.getRange(row, COL.STATUS).setValue("✅ 生成成功");
    
    ss.toast("✅ 執筆が完了しました！", "Gemini");

  } catch (e) {
    sheet.getRange(row, COL.HOOK).setValue("❌ エラー: " + e.message);
    ss.toast("❌ エラー発生: " + e.message, "Gemini");
  }
}

/**
 * 🧠 魂のDNA（人格定義）
 */
function getSoulDNA(key) {
  if (key === "A") {
    return "あなたは『異常な偏愛』を持つThreads職人です。商品の細部（傷、質感、匂い）に異常に執着し、毒気と愛が混ざり合った最高品質の文章を書いてください。";
  } else {
    return "あなたは『勝利への執着』を持つマーケターです。ユーザーの心理を突き、クリックせずにはいられない、覇道を行く文章を書いてください。";
  }
}

/**
 * 📡 Gemini API 直接通信部
 */
function callGeminiDirect(dna, images, topic) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error("GEMINI_API_KEY が設定されていません。");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
  
  const contents = [{
    parts: [
      { text: `【お題】\n${topic}\n\n上記に基づき、視覚情報を分析してJSON形式で投稿を作成せよ。` },
      ...images.map(img => ({ inline_data: { mime_type: "image/png", data: img } }))
    ]
  }];

  const payload = {
    contents: contents,
    system_instruction: { parts: [{ text: dna + "\n\n必ず以下のJSON形式で出力せよ：\n{\"hook\": \"1通目\", \"reply\": \"2通目\"}" }] },
    generationConfig: { response_mime_type: "application/json", temperature: 0.7 }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const res = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(res.getContentText());
  
  if (res.getResponseCode() !== 200) throw new Error("APIエラー: " + res.getContentText());
  
  return JSON.parse(json.candidates[0].content.parts[0].text);
}

/**
 * 🛠️ API接続テスト
 */
function testApiConnection() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    Browser.msgBox("❌ GEMINI_API_KEY が未設定です。スクリプトプロパティを確認してください。");
    return;
  }
  Browser.msgBox("✅ APIキーを確認。通信テストを開始します。");
  try {
    const res = callGeminiDirect("テストです。返答は 'OK' だけで。としてもJSONで返せ。", [], "TEST");
    Browser.msgBox("✅ 通信成功！ AIからの応答を確認しました。");
  } catch (e) {
    Browser.msgBox("❌ 通信失敗: " + e.message);
  }
}
