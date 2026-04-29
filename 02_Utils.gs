/**
 * 02_Utils.gs [聖域・真実の帰還]
 */

/**
 * 📸 写真をドライブに保存し、セル内に埋め込む
 */
function saveImagesToSheet(data) {
  try {
    const ss = SpreadsheetApp.openById(SS_ID);
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    const row = parseInt(data.targetRow);
    
    Logger.log("--- 聖域・ドライブ保存開始 ---");
    if (!row || row < 3) return { status: "error", message: "Invalid Row: " + data.targetRow };

    // 保存先フォルダの確保
    const folder = getOrCreateFolder(DRIVE_FOLDER_NAME);

    // 画像データの処理
    const images = data.imageDatas || [];
    images.forEach((base64, index) => {
      const col = [COL.IMAGE_F, COL.IMAGE_G, COL.IMAGE_H][index];
      if (col && base64) {
        Logger.log("ドライブ保存中... 行:" + row + " 枚目:" + (index + 1));
        
        // 1. Blob作成
        const blob = Utilities.newBlob(Utilities.base64Decode(base64.split(',')[1]), "image/jpeg");
        const fileName = "thread_" + row + "_" + index + "_" + new Date().getTime() + ".jpg";
        
        // 2. ドライブに保存
        const file = folder.createFile(blob).setName(fileName);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        // 3. CellImageとしてセルに埋め込み
        const url = "https://drive.google.com/uc?export=view&id=" + file.getId();
        const cellImage = SpreadsheetApp.newCellImage().setSourceUrl(url).build();
        sheet.getRange(row, col).setValue(cellImage);
      }
    });

    // 🚀 表示リフレッシュ
    const nudgeRange = sheet.getRange(row, 1);
    nudgeRange.setValue(nudgeRange.getValue());
    SpreadsheetApp.flush(); 
    
    ss.toast("📸 聖域（ドライブ保存）完了！", "Threads職人", 3);
    return { status: "success", row: row };

  } catch (e) {
    Logger.log("致命的エラー: " + e.toString());
    return { status: "error", message: e.toString() };
  }
}

/**
 * 📂 フォルダがなければ作成、あれば取得
 */
function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(folderName);
}
