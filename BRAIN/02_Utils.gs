/**
 * 02_Utils.gs [聖域・完結編]
 * 共通の便利ツールや、具体的な保存処理を記述。
 */

/**
 * 📸 写真をシートの指定行に保存する
 */
function saveImagesToSheet(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    const row = parseInt(data.targetRow);
    
    Logger.log("--- 聖域保存開始 ---");
    Logger.log("ターゲット行: " + row);
    Logger.log("画像枚数: " + (data.imageDatas ? data.imageDatas.length : 0));

    if (!row || row < 3) {
      Logger.log("エラー: 行番号が不正です");
      return { status: "error", message: "Invalid Row: " + data.targetRow };
    }

    if (!data.imageDatas || data.imageDatas.length === 0) {
      Logger.log("エラー: 画像データが空です");
      return { status: "error", message: "No Image Data" };
    }

    // 1. 新しい写真を挿入（F, G, H列へ順番に）
    data.imageDatas.forEach((base64, index) => {
      const col = [COL.IMAGE_F, COL.IMAGE_G, COL.IMAGE_H][index];
      if (col && base64) {
        Logger.log("画像挿入中... 列:" + col + " 行:" + row);
        const blob = Utilities.newBlob(Utilities.base64Decode(base64.split(',')[1]), "image/jpeg");
        // 高さを 150px に固定して比率を維持
        sheet.insertImage(blob, col, row).setHeight(150); 
      }
    });

    // 🚀 【ナッジ】該当行の1列目を「同じ値で上書き」してシートを叩き起こす
    const nudgeRange = sheet.getRange(row, 1);
    nudgeRange.setValue(nudgeRange.getValue());
    nudgeRange.activate();
    
    SpreadsheetApp.flush(); 
    
    // UIを動かすためのダメ押しの通知
    ss.toast("📸 聖域へ保存完了（行: " + row + "）", "Threads職人", 3);

    Logger.log("--- 聖域保存完了 ---");
    return { status: "success", row: row };

  } catch (e) {
    Logger.log("致命的エラー: " + e.toString());
    return { status: "error", message: e.toString() };
  }
}
