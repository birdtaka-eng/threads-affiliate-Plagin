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
                result = { status: "success", message: "API Connectivity OK", version: "v2.6" };
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
    var text = data.text;
    var imageUrls = data.imageUrls || []; // Array of up to 3
    var url = data.url;
    var author = data.author;
    var context = data.context;

    // Fallback if only single imageUrl is provided
    if (data.imageUrl && imageUrls.length === 0) {
        imageUrls = [data.imageUrl];
    }

    if (!text && imageUrls.length === 0) {
        throw new Error(`No data provided. (Text: ${text ? "Yes" : "No"}, Images: ${imageUrls.length})`);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_BOARD);

    // If Board is missing, setup it (Safety)
    if (!sheet) {
        setupBoardSheet();
        sheet = ss.getSheetByName(SHEET_BOARD);
    }

    var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm");
    var metaInfo = "[Source] " + (url || "Unknown") + "\n[Author] " + (author || "Unknown") + "\n[Saved] " + dateStr;
    var fullTopic = text ? (text + "\n\n" + metaInfo) : metaInfo;

    // A: ON AIR, B: No, C: Type, D: Photo 1, E: Photo 2, F: Photo 3, G: Topic
    // Find the first empty row based on Column C (Type)
    var lastRow = sheet.getLastRow();
    var targetRow = lastRow + 1;

    // Scan from row 3 downwards to find the first empty "Type" cell
    // (To avoid appending after 100 pre-formatted rows)
    var typeColumn = sheet.getRange(3, 3, lastRow, 1).getValues(); // Column C
    for (var i = 0; i < typeColumn.length; i++) {
        if (!typeColumn[i][0]) {
            targetRow = i + 3;
            break;
        }
    }

    // A: ON AIR, B: No, C: Type, D: Photo 1, E: Photo 2, F: Photo 3, G: Topic
    var rowData = [[
        false,              // A: ON AIR
        "",                 // B: No
        "単品",             // C: Type
        imageUrls[0] ? `=IMAGE("${imageUrls[0]}")` : "", // D: Photo 1
        imageUrls[1] ? `=IMAGE("${imageUrls[1]}")` : "", // E: Photo 2
        imageUrls[2] ? `=IMAGE("${imageUrls[2]}")` : "", // F: Photo 3
        fullTopic,          // G: Assets (Topic)
        ""                  // H: Output
    ]];

    sheet.getRange(targetRow, 1, 1, 8).setValues(rowData);

    // Trigger Analysis (DNA) in Col P
    try {
        analyzeSingleRowBoard(sheet, targetRow);
    } catch (e) {
        console.error("Analysis trigger failed: " + e.message);
    }

    return { status: "success", message: "Saved to Board!", row: targetRow };
}
