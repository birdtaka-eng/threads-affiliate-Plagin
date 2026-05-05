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

    // 💡 新機能：ROOM連携（確定した正解URL形式：/mix?itemcode=shop:id）
    const itemUrl = sheet.getRange(row, COL.ITEM_URL).getValue();
    const itemcode = getRakutenItemcode(itemUrl);
    if (itemcode) {
      const parts = itemcode.split(':');
      const shopCode = parts[0];
      const itemId = parts[1];
      // 🚀 確定正解：楽天市場の商品ページを経由してリファラを正規化する（自動反射）
      const roomUrl = `${itemUrl}${itemUrl.includes('?') ? '&' : '?'}auto_collect=true#row=${row}`;
      sheet.getRange(row, COL.ITEM_CODE).setFormula(`=HYPERLINK("${roomUrl}", "🚀ROOM投稿")`);
    }

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

/**
 * 🚀 E列のURL/IDを元に、ROOM投稿リンクを一括生成する
 */
function generateRoomLinks() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return;

  const data = sheet.getRange(3, COL.ITEM_URL, lastRow - 2, 1).getValues();
  const formulas = [];

  for (let i = 0; i < data.length; i++) {
    const itemUrl = data[i][0];
    const row = i + 3;
    
    if (itemUrl) {
      try {
        const itemcode = getRakutenItemcode(itemUrl);
        if (itemcode) {
          const parts = itemcode.split(':');
          const shopCode = parts[0];
          const itemId = parts[1];
          // 🚀 確定正解：楽天市場の商品ページを経由してリファラを正規化する（自動反射）
          const roomUrl = `${itemUrl}${itemUrl.includes('?') ? '&' : '?'}auto_collect=true#row=${row}`;
          formulas.push([`=HYPERLINK("${roomUrl}", "🚀ROOM投稿")`]);
        } else {
          formulas.push([""]);
        }
      } catch (e) {
        formulas.push([""]);
      }
    } else {
      formulas.push([""]);
    }
  }

  if (formulas.length > 0) {
    sheet.getRange(3, COL.ITEM_CODE, formulas.length, 1).setFormulas(formulas);
    SpreadsheetApp.getUi().alert("✅ " + formulas.length + " 行分のROOMリンクを生成しました。");
  }
}

/**
 * 楽天市場の商品URLから itemcode（shop:item形式）を抽出する
 */
function getRakutenItemcode(itemUrl) {
  if (!itemUrl) return null;
  
  // 通常のショップURL: https://item.rakuten.co.jp/[ショップコード]/[商品ID]/
  let match = itemUrl.match(/item\.rakuten\.co\.jp\/([^/|?]+)\/([^/|?]+)/);
  
  if (!match) {
    // アフィリエイトリンク等の場合はデコードして再検索
    const decodedUrl = decodeURIComponent(itemUrl);
    match = decodedUrl.match(/item\.rakuten\.co\.jp\/([^/|?]+)\/([^/|?]+)/);
  }

  if (match) {
    return `${match[1]}:${match[2]}`;
  }
  return null;
}

/**
 * 🆔 Threads IDを半自動取得してSettingsシートに書き込む
 */
function fetchThreadsUserId() {
  const token = THREADS_ACCESS_TOKEN;
  if (!token) {
    return SpreadsheetApp.getUi().alert("❌ 先にSettingsシートに THREADS_ACCESS_TOKEN を入力してください。");
  }

  try {
    const url = `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${token}`;
    const res = UrlFetchApp.fetch(url);
    const data = JSON.parse(res.getContentText());
    
    if (data.id) {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const settingsSheet = ss.getSheetByName('Settings');
      if (settingsSheet) {
        const values = settingsSheet.getDataRange().getValues();
        let found = false;
        for (let i = 0; i < values.length; i++) {
          if (values[i][0] === 'THREADS_USER_ID') {
            settingsSheet.getRange(i + 1, 2).setValue(data.id);
            found = true;
            break;
          }
        }
        if (!found) {
          settingsSheet.appendRow(['THREADS_USER_ID', data.id, '自動取得されたID']);
        }
        SpreadsheetApp.getUi().alert(`✅ 取得成功！\nユーザー名: ${data.username}\nID: ${data.id}\n\nSettingsシートに自動書き込みしました。`);
      }
    }
  } catch (e) {
    SpreadsheetApp.getUi().alert("❌ ID取得エラー: " + e.message + "\nトークンが正しいか、有効期限が切れていないか確認してください。");
  }
}

/**
 * 🛡️ 全APIの疎通確認（ヘルスチェック）
 */
function verifyAllSettings() {
  const results = [];
  
  // 1. Gemini Check
  try {
    const res = callGeminiApi("Test: Hello. Reply only 'OK'.");
    results.push("✅ Gemini API: 接続成功");
  } catch (e) {
    results.push("❌ Gemini API: 失敗 (" + e.message + ")");
  }

  // 2. Threads Check
  const token = THREADS_ACCESS_TOKEN;
  const userId = THREADS_USER_ID;
  if (token && userId) {
    try {
      const url = `https://graph.threads.net/v1.0/${userId}?fields=username&access_token=${token}`;
      const res = UrlFetchApp.fetch(url);
      const data = JSON.parse(res.getContentText());
      results.push(`✅ Threads API: 接続成功 (@${data.username})`);
    } catch (e) {
      results.push("❌ Threads API: 失敗 (" + e.message + ")");
    }
  } else {
    results.push("⚠️ Threads API: 未設定 (TokenまたはIDが空です)");
  }

  SpreadsheetApp.getUi().alert("🛡️ 接続テスト結果:\n\n" + results.join("\n"));
}
