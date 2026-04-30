/**
 * 02_Utils.gs [聖域・真実の帰還]
 */

/**
 * 📸 写真をドライブに保存し、セル内に埋め込む
 */
function saveImagesToSheet(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
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
        const targetCell = sheet.getRange(row, col);
        targetCell.setValue(cellImage);
        targetCell.setNote(file.getId()); // 👈 AIが読み取れるようにIDをメモに隠す
      }
    });

    SpreadsheetApp.flush(); 
    return { status: "success", row: row };

  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}

/**
 * 🔧 既存の画像セルからファイルIDを抽出し、メモに再設定する（過去分救出用）
 */
function fixExistingImageNotes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  const cols = [COL.IMAGE_F, COL.IMAGE_G, COL.IMAGE_H];
  let count = 0;

  for (let r = 3; r <= lastRow; r++) {
    cols.forEach(c => {
      const cell = sheet.getRange(r, c);
      const cellImage = cell.getValue();
      
      // CellImageオブジェクトからソースURLを直接取得できないため、
      // ドライブ内のファイル名を検索してIDを特定する（または、数式等があればそこから取る）
      // ここでは、昨日作成されたファイル名パターンから検索を試みる
      if (cellImage && !cell.getNote()) {
         // 一旦、安全のために「手動で保存し直してください」と案内するか、
         // またはファイル一覧から該当行番号のものを探すロジック
         // 簡易版として、ファイル名に row が入っているものを探す
         const files = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME).next().searchFiles('title contains "thread_' + r + '_"');
         while (files.hasNext()) {
           const file = files.next();
           cell.setNote(file.getId());
           count++;
         }
      }
    });
  }
  SpreadsheetApp.getUi().alert("✅ " + count + " 枚の写真をAIが視れるように修復しました。");
}

function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(folderName);
}
