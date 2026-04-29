/**
 * ImageService.js
 * Over-Grid Image (Floating) management engine for Threads Visual Engine
 */

/**
 * Inserts a floating image anchored to a specific cell, resizing it to fit.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet 
 * @param {number} row 
 * @param {number} col 
 * @param {GoogleAppsScript.Base.Blob} blob 
 */
function insertOverGridImage(sheet, row, col, blob) {
  try {
    // 1. Optimization: シート全体の画像スキャン（getImages）は重いため廃止
    // 代わりに、挿入先のセルに既にコンテンツがある場合のみクリアする簡易処理に留める
    // ※ 浮遊画像は重複しても目視で確認・削除可能なため、パフォーマンスを最優先
    
    // 2. Calculation: Get cell dimensions
    const cellWidth = sheet.getColumnWidth(col);
    const cellHeight = sheet.getRowHeight(row);
    
    // 3. Insertion (最速で実行)
    const floatingImg = sheet.insertImage(blob, col, row);
    
    // 4. Resizing: Maintain aspect ratio and fit inside cell with a small margin
    const imgWidth = floatingImg.getWidth();
    const imgHeight = floatingImg.getHeight();
    
    // Fit to cell logic (90% of cell size to avoid covering borders)
    const scale = Math.min((cellWidth * 0.9) / imgWidth, (cellHeight * 0.9) / imgHeight, 1.0);
    
    floatingImg.setWidth(imgWidth * scale);
    floatingImg.setHeight(imgHeight * scale);
    
    // 5. Centering (Optional offset)
    const offsetX = (cellWidth - (imgWidth * scale)) / 2;
    const offsetY = (cellHeight - (imgHeight * scale)) / 2;
    floatingImg.setAnchorCellOffset(Math.floor(offsetX), Math.floor(offsetY));
    
    // 6. Final Anchor Lock & DNA metadata
    floatingImg.setAnchorCell(sheet.getRange(row, col));
    floatingImg.setAltTextDescription(blob.getName()); // Marker for vision engine
    SpreadsheetApp.flush();
    return floatingImg;

  } catch (e) {
    console.error("Critical Image Insertion Fail:", e.message);
    consultClaudeOnError("ImageService.js (insertOverGridImage)", e.message, `Row: ${row}, Col: ${col}, Blob: ${blob ? blob.getName() : 'NULL'}`);
    return null;
  }
}

/**
 * セル内画像 (In-Cell Image) として挿入する
 * タカ様のリサーチに基づき、もっとも安定した「Base64/Blobからの直接埋め込み」を採用
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet 
 * @param {number} row 
 * @param {number} col 
 * @param {GoogleAppsScript.Base.Blob} blob 
 */
function insertInCellImage(sheet, row, col, blob) {
  try {
    const cellImage = SpreadsheetApp.newCellImage()
      .setSourceUrl("data:" + blob.getContentType() + ";base64," + Utilities.base64Encode(blob.getBytes()))
      .setAltTextDescription(blob.getName())
      .build();
    
    sheet.getRange(row, col).setValue(cellImage);
    SpreadsheetApp.flush();
    return true;
  } catch (e) {
    console.error("In-Cell Image Insertion Fail:", e.message);
    consultClaudeOnError("ImageService.js (insertInCellImage)", e.message, `Row: ${row}, Col: ${col}`);
    return false;
  }
}

/**
 * 自動工場用の画像保存フォルダを取得または作成する
 */
function getOrCreateFactoryFolder() {
  if (IMAGES_FOLDER_ID) {
    try {
      return DriveApp.getFolderById(IMAGES_FOLDER_ID);
    } catch (e) {}
  }
  
  const folderName = "Threads_Factory_Images";
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

/**
 * 画像をドライブの専用フォルダに保存し、ファイルIDを返す
 */
function saveBlobToFactoryDrive(blob) {
  const folder = getOrCreateFactoryFolder();
  const file = folder.createFile(blob);
  return file.getId();
}

/**
 * 拡張機能からの情報をボードに保存するメインフローの連動
 * @param {string} base64Data 
 * @param {number} row 
 * @param {number} col 
 */
function uploadPastedImage(base64Data, row, col) {
  if (!base64Data || !row || !col) return { success: false, error: "Missing parameters" };
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_BOARD) || ss.getActiveSheet();
    
    const cleanData = base64Data.replace(/\s/g, '');
    const contentType = cleanData.split(';')[0].split(':')[1];
    const data = cleanData.split(',')[1];
    const blob = Utilities.newBlob(Utilities.base64Decode(data), contentType, "pasted_" + new Date().getTime());
    
    // 1. ドライブへ保存して ID を確保 (自動工場用)
    const fileId = saveBlobToFactoryDrive(blob);
    
    // 2. シートへ挿入 (視覚確認用)
    insertInCellImage(sheet, row, col, blob);
    insertOverGridImage(sheet, row, col, blob);
    
    // 3. セルメモに ID を記録 (工場が後で読み込むため)
    sheet.getRange(row, col).setNote("FACTORY_ID:" + fileId);
    
    return { success: true, fileId: fileId };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
