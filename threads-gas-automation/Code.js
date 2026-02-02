// ==========================================
// 🚀 Threads職人 (Code.js) - Controller
// ==========================================

// Gemini API Key: Retrieved dynamically from getGeminiApiKey()

/**
 * メニュー作成
 */
function onOpen() {
    SpreadsheetApp.getUi().createMenu('🤖 Threads職人 (v2)')
        .addItem('【作成】投稿一括生成 (全タイプ)', 'generateUnifiedPosts')
        .addItem('【作成】まとめネタ作成 (選択合体)', 'generateSummaryPost')
        .addItem('【放送】手動放送テスト (今放送すべきものを実行)', 'runBroadcast')
        .addItem('【分析】投稿データ更新 (Metrics)', 'updateMetrics')
        .addItem('【分析】虎の巻アップデート (Master DNA)', 'updateMasterDNA')
        .addSeparator()
        .addItem('🏭【製造】楽天工場 (シート作成)', 'setupRakutenSheet')
        .addItem('🏭【製造】アフィリエイト生成 (実行)', 'generateRakutenPosts')
        .addSeparator()
        .addItem('【ヒント】表示ON', 'showTips')
        .addItem('【ヒント】表示OFF', 'hideTips')
        .addSeparator()
        .addItem('👁️ ドラフトビューワーを開く', 'showSidebar')
        .addToUi();

    const devMenu = SpreadsheetApp.getUi().createMenu('🤖 Threads職人');

    // User Standard Menu
    devMenu.addItem('【設定】操作マニュアル更新', 'setupManualSheet')
        .addItem('【設定】全体設定シート作成 (リセット)', 'setupSettingsSheet')
        .addItem('【設定】投稿ボード作成 (リセット)', 'setupBoardSheet')
        .addItem('【設定】番組表リセット', 'setupScheduleSheet')
        .addItem('【設定】バズ研究所シート拡張', 'setupLabSheet')
        .addSeparator()
        .addItem('🎨【デザイン】Midnight Glass適用', 'applyPremiumTheme')
        .addSeparator()
        .addItem('【設定】自動分析トリガー設定', 'setupAllTriggers');

    // Developer Only Menu
    if (isDevMode()) {
        devMenu.addSeparator()
            .addItem('🛑【開発】DNA統合 (グリモワール化)', 'updateMasterDNA')
            .addItem('🛑【開発】DB構築 (魔法の杖)', 'setupTemplateDatabase')
            .addItem('🔑【診断】API接続テスト', 'testConnection')
            .addItem('🛑【開発】モデル診断', 'debugListModels');
    }

    devMenu.addToUi();
}

/**
 * トリガー機能: 編集時即時反映 (Dispatcher)
 */
function onEdit(e) {
    const sheet = e.source.getActiveSheet();
    const name = sheet.getName();

    if (name === SHEET_BOARD) {
        handleBoardEdit(e); // Board.js
    }
}

/**
 * トリガー機能: 選択範囲変更時に行の高さを自動調整 (Dispatcher)
 */
function onSelectionChange(e) {
    const sheet = e.source.getActiveSheet();
    const name = sheet.getName();

    if (name === SHEET_BOARD) {
        handleBoardSelectionChange(e); // Board.js
    }
}

/**
 * 【設定】自動化トリガー設定 (全体)
 */
function setupAllTriggers() {
    setupLabTrigger(); // Lab.js
    setupTriggerCommon(SHEET_BOARD, "onBoardEditInstallable"); // Board.js
    Browser.msgBox("自動化トリガーを設定しました！");
}

function setupTriggerCommon(sheetName, functionName) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const existing = ScriptApp.getProjectTriggers();
    for (const t of existing) {
        if (t.getHandlerFunction() === functionName) {
            ScriptApp.deleteTrigger(t);
        }
    }
    ScriptApp.newTrigger(functionName)
        .forSpreadsheet(ss)
        .onEdit()
        .create();
}

// ------------------------------------------
// Sidebar Functions
// ------------------------------------------

function showSidebar() {
    const html = HtmlService.createHtmlOutputFromFile('sidebar')
        .setTitle('Draft Viewer (編集可能)')
        .setWidth(300);
    SpreadsheetApp.getUi().showSidebar(html);
}

function getSidebarContent() {
    const range = SpreadsheetApp.getActiveRange();
    if (!range) return "";
    return range.getValue();
}

function updateSidebarContent(content) {
    const range = SpreadsheetApp.getActiveRange();
    if (!range) throw new Error("No cell selected");
    range.setValue(content);
}

// ------------------------------------------
// Sheet Setup Functions
// ------------------------------------------

function setupSettingsSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_SETTINGS);
    if (!sheet) sheet = ss.insertSheet(SHEET_SETTINGS);

    // Persist existing values
    let existingApiKey = null;
    let existingUserId = null;
    let existingToken = null;
    let existingModel = "gemini-2.5-flash";
    let existingPersona = "";

    try {
        existingApiKey = sheet.getRange("B2").getValue();
        existingUserId = sheet.getRange("B3").getValue();
        existingToken = sheet.getRange("B4").getValue();
        existingModel = sheet.getRange("B5").getValue();
        existingPersona = sheet.getRange("B6").getValue();
    } catch (e) { }

    sheet.clear();
    sheet.getRange("A1").setValue("⚙️ 全体設定 (Settings)");
    sheet.getRange("A1").setFontSize(14).setFontWeight("bold");
    sheet.getRange("A3").setValue("【ユーザー入力エリア】");
    sheet.getRange("A3").setFontWeight("bold").setBackground("#d9ead3");
    sheet.getRange("A2").setValue("Gemini API Key");
    sheet.getRange("B2").setValue(existingApiKey || "Enter API Key");
    sheet.getRange("A3").setValue("Threads User ID");
    sheet.getRange("B3").setValue(existingUserId || "Enter User ID");
    sheet.getRange("A4").setValue("Threads Token");
    sheet.getRange("B4").setValue(existingToken || "Enter Token");
    sheet.getRange("A5").setValue("Gemini Model");
    const ruleModel = SpreadsheetApp.newDataValidation().requireValueInList(["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-1.5-pro"], true).build();
    sheet.getRange("B5").setDataValidation(ruleModel).setValue(existingModel || "gemini-2.5-flash");
    sheet.getRange("A6").setValue("User Wish (Seed Persona)");
    sheet.getRange("B6").setValue(existingPersona || "【種】なりたい自分を自由に記述\n(例: 20代OL。カフェ巡りが好きで、親しみやすい存在になりたい。)");

    sheet.getRange("A7").setValue("【以下、AI自動進化エリア】");
    sheet.getRange("A7").setFontWeight("bold").setBackground("#e6b8af");

    // B8: Reinforced Persona (AI Generated)
    sheet.getRange("A8").setValue("Evolved Persona (AI強化人格)");
    sheet.getRange("A8").setNote("あなたの「種(B6)」に、バズ研究所の成功法則を掛け合わせて生成された「最強の人格」です。");

    // B9: Master Style (AI Generated)
    sheet.getRange("A9").setValue("Master Style (文体・リズム)");
    sheet.getRange("A9").setNote("バズ研究所から抽出された、具体的な「書き方・リズム」の定義書です。");

    Browser.msgBox("設定シートをリセットしました！\nB6: あなたの願い(種)\nB8: AIが育てた最強人格\nB9: 文体スタイル\nこれらが連携して動作します。");
}

function setupScheduleSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = SHEET_SCHEDULE;
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
        sheet = ss.insertSheet(sheetName);
    }
    sheet.clear();
    sheet.getRange("A:I").clearDataValidations();

    sheet.setColumnWidth(1, 250);
    sheet.getRange("A1").setValue("【番組表の使い方】");
    sheet.getRange("A1").setFontWeight("bold").setBackground("#fff2cc");
    const guideText = "1. 投稿ボードで放送したいネタの「ON AIR」にチェック\n2. この表で「放送タイプ」を指定\n3. 時間になると自動放送";
    sheet.getRange("A2").setValue(guideText);
    sheet.getRange("A2:A11").merge();
    sheet.getRange("A2:A11").setBackground("#fff2cc").setVerticalAlignment("top").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);

    const days = ["Mon (月)", "Tue (火)", "Wed (水)", "Thu (木)", "Fri (金)", "Sat (土)", "Sun (日)"];
    sheet.getRange("C1:I1").setValues([days]);
    sheet.getRange("B1").setValue("Time");
    sheet.getRange("B1:I1").setBackground("#4a86e8").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");

    const timeOptions = [];
    for (let h = 6; h <= 23; h++) {
        timeOptions.push(`${("0" + h).slice(-2)}:00`);
        timeOptions.push(`${("0" + h).slice(-2)}:30`);
    }
    const timeRule = SpreadsheetApp.newDataValidation().requireValueInList(timeOptions, true).build();
    sheet.getRange("B2:B11").setDataValidation(timeRule);
    const sampleTimes = [["08:00"], ["10:00"], ["12:00"], ["15:00"], ["18:00"], ["19:00"], ["20:00"], ["21:00"], ["22:00"], ["23:00"]];
    sheet.getRange("B2:B11").setValues(sampleTimes);

    const ruleGenre = SpreadsheetApp.newDataValidation()
        .requireValueInList(["単品", "日常", "有益", "まとめ", "Free", "議論", "実体験", "自己紹介", "Promotion"], true)
        .setAllowInvalid(false).build();
    sheet.getRange("C2:I11").setDataValidation(ruleGenre);
    sheet.setColumnWidth(2, 80);
    for (let c = 3; c <= 9; c++) sheet.setColumnWidth(c, 100);
    sheet.getRange("B1:I11").setBorder(true, true, true, true, true, true, "#cccccc", SpreadsheetApp.BorderStyle.SOLID);

    Browser.msgBox("番組表をリニューアルしました！");
}

function setupManualSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = "マニュアル"; // Use string literal or SHEET_MANUAL if defined
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) sheet = ss.insertSheet(sheetName);
    sheet.clear();
    sheet.getRange("A1").setValue("📘 Threads職人 運用マニュアル (v2.0)");
    sheet.getRange("A1").setFontSize(16).setFontWeight("bold").setFontColor("#1e3a8a");
    sheet.getRange("A2").setValue("このシステムは、あなたの投稿を管理し、最強のAIパートナーとして進化し続ける運用ツールです。");
    sheet.getRange("A4").setValue("⚙️ 初期設定");
    sheet.getRange("A4").setFontSize(12).setFontWeight("bold");
    sheet.getRange("B6").setValue("1. Config Sheet (【設定】シート) を開いてください。");
    sheet.getRange("B7").setValue("2. API Key, User ID を入力してください。");
    sheet.getRange("B8").setValue("3. バズ研究所で「トリガー設定」を実行してください。");
    Browser.msgBox("マニュアルシートを更新しました！");
}

// ------------------------------------------
// Tips Logic
// ------------------------------------------

function showTips() { toggleTips(true); }
function hideTips() { toggleTips(false); }

function toggleTips(enable) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();
    const sheetName = sheet.getName();
    let hints = {};
    let targetRow = 1;

    if (sheetName === SHEET_BOARD) {
        hints = {
            1: "【ON AIR】自動放送予約",
            8: "【Output】AI生成結果",
            9: "【Selector】案の切り替え"
        };
    } else if (sheetName === SHEET_LAB) {
        hints = {
            1: "【Type】種類選択",
            4: "【DNA】AI分析結果"
        };
    }

    if (enable) {
        for (const [col, note] of Object.entries(hints)) {
            sheet.getRange(targetRow, Number(col)).setNote(note);
        }
        Browser.msgBox(`シート「${sheetName}」にヒントを表示しました。`);
    } else {
        sheet.getRange(targetRow, 1, 1, 20).clearNote();
        Browser.msgBox(`シート「${sheetName}」のヒントを非表示にしました。`);
    }
}

// ------------------------------------------
// API & Global Helper Functions
// ------------------------------------------

function isDevMode() {
    return SHOW_DEV_TOOLS;
}

function getGeminiModel() {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName(SHEET_SETTINGS);
        if (sheet) {
            const val = sheet.getRange("B5").getValue();
            if (val && String(val).trim().toLowerCase().startsWith("gemini-")) {
                return String(val).trim();
            }
        }
    } catch (e) { }
    return "gemini-2.5-flash";
}

function getGeminiApiKey() {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName(SHEET_SETTINGS);
        if (sheet) {
            const val = sheet.getRange("B2").getValue();
            if (val && String(val).trim() !== "" && val !== "Enter API Key") {
                return String(val).trim();
            }
        }
    } catch (e) { }
    return null;
}

function getThreadsCredentials() {
    let userId = null;
    let token = null;
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName(SHEET_SETTINGS);
        if (sheet) {
            userId = sheet.getRange("B3").getValue();
            token = sheet.getRange("B4").getValue();
        }
    } catch (e) { }
    if (userId === "Enter User ID") userId = null;
    if (token === "Enter Token") token = null;
    if (!userId || !token) return null;
    return { userId, token };
}

function callGeminiSafe(apiKey, prompt) {
    const model = getGeminiModel();
    // Use v1beta for access to newer models (like gemini-2.5-flash)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
    };
    const options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    };

    const maxRetries = 3;
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            const response = UrlFetchApp.fetch(url, options);
            const responseCode = response.getResponseCode();
            const json = JSON.parse(response.getContentText());

            if (responseCode === 200) {
                if (json.candidates && json.candidates.length > 0) {
                    return json.candidates[0].content.parts[0].text;
                }
                const reason = json.promptFeedback ? JSON.stringify(json.promptFeedback) : "Unknown (No Candidates)";
                throw new Error(`Gemini Blocked: ${reason}`);
            }

            if ([429, 500, 503].includes(responseCode)) {
                Utilities.sleep(1000 * Math.pow(2, attempt));
                attempt++;
                continue;
            }
            const errorMsg = json.error ? json.error.message : "Unknown Error";
            throw new Error(`Gemini Error (${responseCode}): ${errorMsg}`);

        } catch (e) {
            if (attempt === maxRetries - 1) throw e;
            Utilities.sleep(1000);
            attempt++;
        }
    }
}

function testConnection() {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        Browser.msgBox("API Key Missing");
        return;
    }
    try {
        const res = callGemini(apiKey, "Hi");
        Browser.msgBox("Success: " + res);
    } catch (e) {
        Browser.msgBox("Error: " + e.message);
    }
}

function debugListModels() {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        Browser.msgBox("API Keyが見つかりません。");
        return;
    }
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
    try {
        const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        const json = JSON.parse(response.getContentText());
        if (json.models) {
            const genModels = json.models.map(m => m.name.replace("models/", "")).join("\\n");
            Browser.msgBox("Available Models:\\n" + genModels);
        }
    } catch (e) { }
}

function callGeminiDebug(apiKey, prompt) {
    const model = getGeminiModel();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Safety Settings included
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
    };

    const options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    };

    try {
        const response = UrlFetchApp.fetch(url, options);
        return response.getContentText(); // Return RAW JSON String
    } catch (e) {
        return JSON.stringify({ error: e.message });
    }
}

/**
 * Legacy Alias for Grid buttons
 */
function runDojoAnalysis() {
    updateMasterDNA();
}

function debugListSheets() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    const names = sheets.map(s => s.getName()).join("\\n");
    Browser.msgBox("Sheets:\\n" + names);
}
// ------------------------------------------
// Web API for Chrome Extension (Clip to Lab)
// ------------------------------------------

function doPost(e) {
    // 1. Parse Request
    let data;
    try {
        data = JSON.parse(e.postData.contents);
    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Invalid JSON" }))
            .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Extract Data
    const { text, url, author, context } = data;
    if (!text) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "No text provided" }))
            .setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Append to Lab Sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_LAB);
    if (!sheet) {
        setupLabSheet();
        sheet = ss.getSheetByName(SHEET_LAB);
    }

    try {
        // Lab Sheet Layout: [Run(A), Type(B), Context(C), Raw(D), DNA(E)]
        // We append a new row.

        // Find next empty row manually or use appendRow? 
        // appendRow adds to bottom. Let's use insertRowAfter(3) to keep it at top if possible, 
        // but Lab sheet reads from top down for "Run".
        // Let's just append.

        const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm");

        // Context: Add URL and Author info
        const metaContext = `[Source] ${url || "Unknown"}\n[Author] ${author || "Unknown"}\n[Saved] ${dateStr}`;
        const finalContext = context ? `${context}\n---\n${metaContext}` : metaContext;

        sheet.appendRow([
            true,           // A: Run (Auto-check) -> Triggers Analysis
            "単品",         // B: Type (Default to Single Item as requested)
            finalContext,   // C: Context
            text,           // D: Raw Post
            ""              // E: DNA (Empty)
        ]);

        // Important: Flush to ensure Trigger sees the change? 
        // Actually, script-initiated edits do NOT trigger simple onEdit, 
        // BUT we set up "Installable Trigger" (onLabEditInstallable) which listens to 'EDIT'?
        // No, Installable OnEdit also requires USER interaction usually, or API edits?
        // Wait, Web App edits counts as API edits?
        // Actually, easier way: Call analysis DIRECTLY here.

        const lastRow = sheet.getLastRow();

        // Trigger Analysis Immediately
        // Note: analyzeSingleRow uses SHEET UI logic (getRange etc), which works in Web App context 
        // IF the container is bound.
        analyzeSingleRow(sheet, lastRow);

        // Uncheck Run
        sheet.getRange(lastRow, 1).setValue(false);

        return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Saved & Analyzing..." }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * 🎨 Design: Apply "Midnight Glass" Theme to Sheets
 */
function applyPremiumTheme() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();

    // Theme Config
    const colorHeaderBg = "#3c4043"; // Dark Grey
    const colorHeaderTx = "#ffffff";
    const colorBorder = "#e8eaed";

    sheets.forEach(sheet => {
        const lastRow = sheet.getLastRow();
        const lastCol = sheet.getLastColumn();
        if (lastRow < 1 || lastCol < 1) return;

        const fullRange = sheet.getRange(1, 1, lastRow, lastCol);

        // 1. Reset Basic Styles
        fullRange.setFontFamily("Roboto");
        fullRange.setVerticalAlignment("middle");

        // 2. Header Style (Row 1)
        const headerRange = sheet.getRange(1, 1, 1, lastCol);
        headerRange
            .setBackground(colorHeaderBg)
            .setFontColor(colorHeaderTx)
            .setFontWeight("bold")
            .setHorizontalAlignment("center")
            .setBorder(false, false, true, false, false, false, colorBorder, SpreadsheetApp.BorderStyle.SOLID);

        // 3. Gridlines Off
        sheet.setHiddenGridlines(true);
    });

    Browser.msgBox("✨ Design Upgrade: 'Midnight Glass' UI and Clean Sheets applied!");
}
