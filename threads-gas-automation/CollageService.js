/**
 * Deep search for a collage on-demand (O(N) search)
 * Used when the lightweight marker is missing.
 * Includes diagnostic dump of all images if not found.
 */
function manualScanForCollage(row) {
    if (!row) return { error: "Row missing" };
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const targetName = (typeof SHEET_BOARD !== 'undefined') ? SHEET_BOARD : "投稿作成ボード";
        const sheet = ss.getSheetByName(targetName);
        if (!sheet) return { error: "Sheet not found: " + targetName };

        // --- Step 1: In-Cell Check (H-column) ---
        const targetCell = sheet.getRange(row, 8);
        const cellVal = targetCell.getValue();
        if (cellVal && typeof cellVal === 'object' && cellVal.toString().includes("CellImage")) {
            // In-Cell image found! 
            // Convert to blob if possible (Note: cellImages are tricky to b64 directly in some GAS versions)
            // For now, if we found a CellImage, we tell the user Step 1 is OK.
            return { error: "【検知成功】セル内画像(In-Cell)として発見しました。コピー機能のためにU列から再生成してください。" };
        }

        // --- Step 2: Floating Scan & Diagnostic Dump ---
        const sheetImages = sheet.getImages();
        let imageLogs = [];
        let foundImg = null;

        for (let img of sheetImages) {
            try {
                let anchor = img.getAnchorCell();
                let aRow = anchor.getRow();
                let aCol = anchor.getColumn();
                imageLogs.push(`[${aRow},${aCol}]`);

                // Reach out to a wider area (+/- 10 rows for legacy recovery)
                if (Math.abs(aRow - row) <= 10.1 && (aCol >= 7 && aCol <= 9)) {
                    foundImg = img;
                    break;
                }
            } catch (e) { continue; }
        }

        if (foundImg) {
            let blob = foundImg.getBlob();
            let b64 = Utilities.base64Encode(blob.getBytes());

            // Found it! Let's put a marker so it's instant next time.
            sheet.getRange(row, 8).setValue("🖼️ READY")
                .setFontColor("#94a3b8").setFontSize(9).setHorizontalAlignment("center");

            return {
                data: b64,
                mimeType: blob.getContentType(),
                repaired: true
            };
        }

        // --- Step 3: Not Found -> Return Diagnostic Report ---
        let report = `付近(H列 Row ${row}±10)に画像がありません。\n`;
        report += `シート全体の画像数: ${sheetImages.length}\n`;
        if (imageLogs.length > 0) {
            report += `検出された座標: ${imageLogs.slice(0, 15).join(", ")}`;
        } else {
            report += `画像が1つも見つかりませんでした。`;
        }

        return { error: report };
    } catch (e) {
        return { error: "スキャンエラー: " + e.message };
    }
}

/**
 * On-demand function to fetch collage Base64
 * Polling every 1s with large blobs was causing TransportError.
 */
function getCollageBase64(row) {
    if (!row) return null;
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const targetName = (typeof SHEET_BOARD !== 'undefined') ? SHEET_BOARD : "投稿作成ボード";
        const sheet = ss.getSheetByName(targetName);
        if (!sheet) return null;

        // One-shot fetch for "READY" row
        const sheetImages = sheet.getImages();
        for (let img of sheetImages) {
            try {
                let anchor = img.getAnchorCell();
                let aRow = anchor.getRow();
                let aCol = anchor.getColumn();
                if (Math.abs(aRow - row) <= 3.1 && (aCol >= 7 && aCol <= 9)) {
                    let blob = img.getBlob();
                    img.remove(); // Cleanup as per workflow
                    sheet.getRange(row, 8).clearContent();
                    return { data: Utilities.base64Encode(blob.getBytes()), mimeType: blob.getContentType() };
                }
            } catch (e) { }
        }
        return { error: "画像が見つかりません。マーカーはありますが画像がありません。" };
    } catch (e) { return { error: e.message }; }
}
