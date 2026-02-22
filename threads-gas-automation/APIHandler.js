/**
 * APIHandler.js
 * Headless GAS API Endpoint
 * Handles requests from Next.js Frontend & Chrome Extension
 */

function doGet(e) {
    return handleApiRequest(e);
}

function doPost(e) {
    return handleApiRequest(e);
}

function handleApiRequest(e) {
    var customHeader = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };

    try {
        // === DEBUG: Log raw request ===
        var rawLog = "postData=" + (e.postData ? e.postData.contents : "none") +
            " | params=" + JSON.stringify(e.parameter || {});
        debugLog("[RAW] " + rawLog);

        // 1. Parse Action
        var action = "";
        var payload = {};

        if (e.parameter && e.parameter.action) {
            action = e.parameter.action;
            payload = e.parameter;
        } else if (e.postData && e.postData.contents) {
            try {
                var json = JSON.parse(e.postData.contents);
                action = json.action;
                payload = json;
            } catch (parseErr) {
                // JSONパース失敗時のフォールバック
                action = e.parameter ? e.parameter.action : "";
                payload = e.parameter || {};
            }
        }

        // 2. Route
        var result = {};
        switch (action) {
            case "getBoardData":
                result = apiGetBoardData();
                break;
            case "getMasterInfo":
                result = apiGetMasterInfo(payload);
                break;
            case "getSettings":
                result = apiGetSettings();
                break;
            case "generate":
                result = apiRunGeneration(payload);
                break;
            case "clip_instagram":
                try {
                    var dataObj = payload.data || payload;
                    debugLog("Clip Request: " + JSON.stringify(dataObj)); // 受信データをログ保存
                    result = saveClipToBoard(dataObj);
                } catch (err) {
                    debugLog("Clip Error: " + err.message);
                    result = { status: "error", message: err.message };
                }
                break;
            case "ping":
                result = { status: "success", message: "API Connectivity OK", version: "v6.9.0" };
                break;
            default:
                result = { status: "success", message: "Threads職人 API Ready", received: action };
        }

        return ContentService.createTextOutput(JSON.stringify(result))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        debugLog("API Error: " + err.message + "\nStack: " + err.stack);
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * デバッグログを「デバッグ」シートに記録する（APIデバッグ用）
 */
function debugLog(message) {
    try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var sheet = ss.getSheetByName("デバッグ記録");
        if (!sheet) {
            sheet = ss.insertSheet("デバッグ記録");
            sheet.appendRow(["タイムスタンプ", "メッセージ"]);
        }
        sheet.appendRow([new Date(), message]);
    } catch (e) {
        // ログ記録自体が失敗した場合はこれ以上何もしない
    }
}


// --- API Functions ---

function apiGetBoardData() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_BOARD);
    if (!sheet) return { status: "error", message: "Board sheet not found" };

    var lastRow = sheet.getLastRow();
    var data = sheet.getRange(2, 1, lastRow - 1, 10).getValues(); // Get A-J roughly
    var rows = data.map((row, index) => {
        return {
            id: index + 2, // Row number (Starts at Row 2 in getValues array relative to Sheet?) 
            // getValues(2, ...) -> index 0 is Row 2.
            // Actually, var 's just use index + 2 if we fetched from Row 2.
            onAir: row[0],      // Col A (ON AIR)
            theme: row[2],      // Col C (Type)
            material: row[6],   // Col G (Assets)
            generated1: row[7], // Col H (Output)
        };
    }).filter(r => r.theme && r.theme !== "↓Type" && (r.material || r.generated1)); // Filter out guide row and empty rows

    return { status: "success", data: rows };
}

function apiGetSettings() {
    // Return basic config needed for UI (e.g. Models)
    return { status: "success", models: AI_MODELS };
}


function apiRunGeneration(payload) {
    var rowId = payload.rowId; // Row number (e.g., 3, 4...)
    if (!rowId) return { status: "error", message: "No rowId provided" };

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_BOARD);

    // Check if row is valid for generation
    var isActive = sheet.getRange(rowId, 1).getValue(); // Create Checkbox
    // Force set Checkbox to TRUE to be safe, or just run logic?
    // Running logic directly is better for API efficiency (no waiting for trigger)

    try {
        // Call the shared generation logic from Board.js
        generatePostsCommon(SHEET_BOARD, Number(rowId));
        return { status: "success", message: "Generation Completed", rowId: rowId };
    } catch (e) {
        return { status: "error", message: "Generation Failed: " + e.message };
    }
}

/**
 * 拡張機能からの情報をボードに保存する
 */
function saveClipToBoard(data) {
    debugLog("saveClipToBoard STARTED");

    var action = data.action || 'mixed';
    debugLog("Action parsed: " + action);

    try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        debugLog("Active spreadsheet fetched.");
        var sheet = ss.getSheetByName(SHEET_BOARD);
        debugLog("Sheet fetched: " + (sheet ? "yes" : "no"));

        if (!sheet) {
            debugLog("Sheet not found, calling setupBoardSheet...");
            setupBoardSheet(); // Safety
            sheet = ss.getSheetByName(SHEET_BOARD);
            debugLog("Sheet setup complete.");
        }
    } catch (sheetErr) {
        debugLog("Error fetching sheet: " + sheetErr.message);
        throw sheetErr;
    }

    // v6.8.0: Split Actions
    var action = data.action || 'mixed';

    // A: ON AIR, B: No, C: Type, D-F: Images, G: ROOM, H: Threads
    var imageUrls = data.imageUrls || [];
    var roomText = data.roomText || "";
    var threadsText = data.threadsText || "";

    var rowData = [];

    // --- CASE 1: Save Images Only ---
    if (action === 'save_images') {
        // [FALSE, "", "単品", Img1, Img2, Img3, "", ""]
        rowData = [
            false,
            "",
            "単品", // Type
            imageUrls[0] ? `=IMAGE("${imageUrls[0]}")` : "",
            imageUrls[1] ? `=IMAGE("${imageUrls[1]}")` : "",
            imageUrls[2] ? `=IMAGE("${imageUrls[2]}")` : "",
            "", // G: Empty
            ""  // H: Empty
        ];
    }
    // --- CASE 2: Save Text Only ---
    else if (action === 'save_text') {
        debugLog("Building rowData for save_text...");
        // [FALSE, "", "単品", RoomText, ThreadsText, "", "", ""] 
        rowData = [
            false,
            "",
            "単品", // Type
            "", // D: Empty
            "", // E: Empty
            "", // F: Empty
            roomText, // G: ROOM Text
            threadsText  // H: Threads Text
        ];
    }
    // --- CASE 3: Legacy / Fallback ---
    else {
        // [FALSE, "", "単品", Img..., RoomText+Meta, ThreadsText]
        var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm");
        var metaInfo = "";
        if (data.url) metaInfo += "\n[Source] " + data.url;
        metaInfo += "\n[Saved] " + today;

        var roomContent = roomText;
        if (roomContent) roomContent += "\n\n";
        roomContent += metaInfo;

        rowData = [
            false, "", "単品",
            imageUrls[0] ? `=IMAGE("${imageUrls[0]}")` : "",
            imageUrls[1] ? `=IMAGE("${imageUrls[1]}")` : "",
            imageUrls[2] ? `=IMAGE("${imageUrls[2]}")` : "",
            roomContent,
            threadsText
        ];
    }

    debugLog("Finding target row...");
    // Find Target Row (First Empty Col C)
    var lastRow = sheet.getLastRow() || 1;
    var startRow = 8;

    // --- Merge Logic: Check if we can append to the last used row ---
    // If the last used row has Type "単品", let's see if we can merge.
    var merged = false;
    var targetRow = lastRow + 1;

    // Scan for the last used row and first empty row
    var firstEmptyRow = startRow;
    var lastUsedRow = -1;

    if (lastRow >= startRow) {
        var range = sheet.getRange("C" + startRow + ":H" + (lastRow + 1));
        var values = range.getValues();

        for (var i = 0; i < values.length; i++) {
            if (!values[i][0]) { // Type (Col C) is empty
                firstEmptyRow = startRow + i;
                break;
            } else {
                lastUsedRow = startRow + i;
            }
        }

        // Check if we can merge with the last used row
        if (lastUsedRow >= startRow) {
            var lastType = values[lastUsedRow - startRow][0]; // Col C
            var lastImg1 = values[lastUsedRow - startRow][1]; // Col D
            var lastRoom = values[lastUsedRow - startRow][4]; // Col G
            var lastThreads = values[lastUsedRow - startRow][5]; // Col H

            if (lastType === "単品") {
                if (action === 'save_text' && !lastRoom && !lastThreads && lastImg1) {
                    // Last row has images but no text -> Merge Text
                    targetRow = lastUsedRow;
                    merged = true;
                    // Keep existing images, update text
                    rowData[3] = sheet.getRange(targetRow, 4).getFormula() || sheet.getRange(targetRow, 4).getValue(); // D
                    rowData[4] = sheet.getRange(targetRow, 5).getFormula() || sheet.getRange(targetRow, 5).getValue(); // E
                    rowData[5] = sheet.getRange(targetRow, 6).getFormula() || sheet.getRange(targetRow, 6).getValue(); // F
                    debugLog("Merging save_text into existing row " + targetRow);
                } else if (action === 'save_images' && !lastImg1 && (lastRoom || lastThreads)) {
                    // Last row has text but no images -> Merge Images
                    targetRow = lastUsedRow;
                    merged = true;
                    // Keep existing text, update images
                    rowData[6] = lastRoom; // G
                    rowData[7] = lastThreads; // H
                    debugLog("Merging save_images into existing row " + targetRow);
                }
            }
        }
    }

    if (!merged) {
        targetRow = firstEmptyRow;
        debugLog("Creating new row at " + targetRow);
    }

    debugLog("Writing data to row: " + targetRow + ", length: " + rowData.length);
    // Write Data
    try {
        sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
        // ★ 画像を大きく見せるために行の高さを広げる (150px)
        sheet.setRowHeight(targetRow, 150);
        debugLog("Data written successfully.");
    } catch (writeErr) {
        debugLog("Write Error: " + writeErr.message);
        throw writeErr;
    }

    // Trigger Analysis (DNA) if needed - optional for just images? 
    // Let's run it anyway to be safe, or maybe skip for images?
    // "Type" column change might trigger onEdit if user edits it later.
    // For now, let's NOT run analysis automatically for just images/text to keep it fast, 
    // unless user explicitly requests "Generate".
    // Actually existing code ran `analyzeSingleRowBoard`.
    // Let's keep running it ONLY if it's text (generating tags etc?) or legacy.
    // But wait, DNA analysis usually needs Title/URL which we might not have in `save_text` logic?
    // `save_text` has no URL/Title in payload (only inputs).
    // So let's skip automatic analysis for split actions for now to avoid errors.

    return { status: "success", message: "Saved!", row: targetRow };
}

/**
 * Get Master URL and Images for the active row (or specified row)
 */
function apiGetMasterInfo(payload) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_BOARD);

    // Default to last row if not specified (simplification for extension)
    // Ideally extension sends the row index, but for now extension saves then gets info.
    // Let's rely on finding the *last modified* or passing row.
    // If payload.row is present use it.

    var row = sheet.getLastRow(); // Default
    if (payload.row) row = parseInt(payload.row);

    // Read G (Master Name), D, E, F (Images)
    // G is Col 7, D is Col 4
    var data = sheet.getRange(row, 4, 1, 4).getValues()[0];
    var img1 = data[0]; // D
    var img2 = data[1]; // E
    var img3 = data[2]; // F
    var masterName = data[3]; // G

    // Normalize master name (remove extra spaces etc)
    var rawName = String(masterName).trim();

    // Case-insensitive lookup
    var targetKey = Object.keys(MASTER_GEMS).find(k => k.toLowerCase() === rawName.toLowerCase());

    if (targetKey) {
        masterName = targetKey; // Normalize to key name (e.g. "poison" -> "Poison")
    }

    var masterUrl = "";
    if (MASTER_GEMS[masterName]) {
        masterUrl = MASTER_GEMS[masterName];
    } else {
        // Fallback or legacy text handling
        masterUrl = MASTER_GEMS["Basic"]; // Default to Basic
    }

    var imageUrls = [];
    if (img1 && String(img1).startsWith("http")) imageUrls.push(img1);
    if (img2 && String(img2).startsWith("http")) imageUrls.push(img2);
    if (img3 && String(img3).startsWith("http")) imageUrls.push(img3);

    return {
        status: "success",
        masterName: masterName,
        masterUrl: masterUrl,
        imageUrls: imageUrls
    };
}
