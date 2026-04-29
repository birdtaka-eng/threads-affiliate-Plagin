/**
 * FactoryManager.js
 * V12.0 - [緊急指令] 郵便屋 GAS モデル（Drive 直送版）
 */

/**
 * サイドパネルからの直送指示（generate_direct）を処理する
 * @param {Object} data - { targetRow, persona, topic, ... }
 */
function FACTORY_processSequence(data) {
  const rowIndex = parseInt(data.targetRow);
  const personaKey = data.persona || "A";
  const topic = data.topic || "";

  if (!rowIndex || rowIndex < 4) {
    throw new Error("有効なターゲット行が指定されていません。");
  }

  const ss = getSS();
  const sheet = ss.getSheetByName(SHEET_BOARD);
  const map = getStrictColMap(sheet);
  
  if (!map || !map.HOOK) {
    throw new Error("列マッピング(HOOK)の取得に失敗しました。ヘッダー定義を確認してください。");
  }

  try {
    // 🚩 1. 執筆開始のステータス
    sheet.getRange(rowIndex, map.HOOK).setValue("⏳ 工場稼働中 (Drive Bridge)...");

    // 🚩 2. 画像の吸い出し (Google ドライブからバイナリ化)
    const imageIds = FACTORY_fetchImageIds(sheet, rowIndex, map);
    const imageBlobs = imageIds.map(id => DriveApp.getFileById(id).getBlob());

    // 🚩 3. 400行のDNA（人格魂）の取得
    const soulDNA = (typeof PERSONA_LIB !== 'undefined') ? PERSONA_LIB['FULL_SOUL_' + personaKey] : "Persona DNA Placeholder";

    // 🚩 4. Gemini API への直送 (GeminiAPI.js)
    const result = callGeminiDirectV12(soulDNA, imageBlobs, topic);

    if (!result) throw new Error("Gemini からの応答が空、あるいは解析不能でした。");

    // 🚩 5. 自動納品（シート書き込み）
    FACTORY_writeToSheet(sheet, rowIndex, map, result);

    // 成功通知
    ss.toast(`✅ 工場出荷完了! (Row: ${rowIndex})`);
    return { status: "success", row: rowIndex, data: result };

  } catch (e) {
    // 🚩 指令第3条: エラーハンドリングの強化（セルメモへの刻印）
    const errorMsg = `❌ 工場停止: ${e.message} (${new Date().toLocaleString()})`;
    console.error(errorMsg);
    
    const range = sheet.getRange(rowIndex, map.HOOK);
    range.setValue("❌ 執筆失敗（詳細はメモを確認）");
    range.setNote(errorMsg); // セルメモ（Comment）にエラーを記録
    
    return { status: "error", message: e.message };
  }
}

/**
 * 対象行の PHOTO カラムのメモから File ID を取得する
 */
function FACTORY_fetchImageIds(sheet, rowIndex, map) {
  const ids = [];
  const photoCols = [map.PHOTO_1, map.PHOTO_2, map.PHOTO_3];
  
  photoCols.forEach(col => {
    if (col) {
      const note = sheet.getRange(rowIndex, col).getNote();
      if (note && note.includes("FACTORY_ID:")) {
        ids.push(note.replace("FACTORY_ID:", "").trim());
      }
    }
  });
  return ids;
}

/**
 * 解析されたJSONデータをシートに書き込む
 */
function FACTORY_writeToSheet(sheet, rowIndex, map, result) {
  if (map.HOOK && result.hook) sheet.getRange(rowIndex, map.HOOK).setValue(result.hook);
  
  if (map.ROOM && result.room) {
    const visionTxt = result.vision_summary ? `【AI鑑定】${result.vision_summary}\n\n` : "";
    sheet.getRange(rowIndex, map.ROOM).setValue(visionTxt + result.room);
  }

  if (map.REPLY && result.reply) {
    const itemUrl = (map.ITEM_URL) ? sheet.getRange(rowIndex, map.ITEM_URL).getValue() : "";
    const finalReply = itemUrl ? `${result.reply}\n\n👇 詳細はコチラ\n${itemUrl}` : result.reply;
    sheet.getRange(rowIndex, map.REPLY).setValue(finalReply);
  }
}
