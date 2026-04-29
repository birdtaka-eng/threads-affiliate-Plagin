/**
 * 02_Utils.gs [聖域・真実の帰還]
 */

/**
 * 📸 写真をドライブに保存し、セル内に埋め込む：安全モード（ID指定なし）
 */
function saveImagesToSheet(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet(); // 👈 安全な取得方法に変更
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    const row = parseInt(data.targetRow);
    
    if (!row || row < 3) return { status: "error", message: "Invalid Row: " + data.targetRow };

    const folder = getOrCreateFolder(DRIVE_FOLDER_NAME);
    const images = data.imageDatas || [];
    
    images.forEach((base64, index) => {
      const col = [COL.IMAGE_F, COL.IMAGE_G, COL.IMAGE_H][index];
      if (col && base64) {
        const fileName = "thread_" + row + "_" + index + "_" + new Date().getTime() + ".jpg";
        const blob = Utilities.newBlob(Utilities.base64Decode(base64.split(',')[1]), "image/jpeg").setName(fileName);
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        const url = "https://drive.google.com/uc?export=view&id=" + file.getId();
        const cellImage = SpreadsheetApp.newCellImage().setSourceUrl(url).build();
        sheet.getRange(row, col).setValue(cellImage);
      }
    });

    SpreadsheetApp.flush(); 
    return { status: "success", row: row };

  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}

function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(folderName);
}
