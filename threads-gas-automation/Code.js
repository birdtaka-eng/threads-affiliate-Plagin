// ==========================================
// 🚀 Threads職人 (Code.js) - Controller
// ==========================================

// Gemini API Key: Retrieved dynamically from getGeminiApiKey()

/**
 * メニュー作成
 */
// Last Updated: 2026-02-16 00:15
function onOpen() {
    try {
        // Diagnostic: Check if script is updated
        // SpreadsheetApp.getActive().toast("Threads職人 v2.5 準備完了", "System", 3);
    } catch (e) { }

    // 1. Main User Menu
    SpreadsheetApp.getUi().createMenu('🤖 Threads職人 (v2.6-SCREENSHOT)')
        .addItem('【作成】投稿一括生成 (全タイプ)', 'generateUnifiedPosts')
        .addItem('【作成】まとめネタ作成 (選択合体)', 'generateSummaryPost')
        .addSeparator()
        .addItem('🚀 師匠へ (Copy & Go)', 'showMasterModal')
        .addSeparator()
        .addItem('【放送】手動放送テスト (今放送すべきものを実行)', 'runBroadcast')
        .addItem('【分析】投稿データ更新 (Metrics)', 'updateMetrics')
        .addItem('【分析】虎の巻アップデート (Master DNA)', 'updateMasterDNA')
        .addSeparator()
        .addItem('【ヒント】表示ON', 'showTips')
        .addItem('【ヒント】表示OFF', 'hideTips')
        .addSeparator()
        .addItem('👁️ ドラフトビューワーを開く', 'showSidebar')
        .addSeparator()
        .addItem('⚙️ 自動分析トリガー設定', 'setupAllTriggers')
        .addItem('🔍【診断】トリガー動作確認', 'checkTriggerStatus')
        .addToUi();

    // 2. Dev/Setup Menu
    const devMenu = SpreadsheetApp.getUi().createMenu('⚙️ 設定・開発'); // Renamed for clarity

    // User Standard Setup
    devMenu.addItem('【設定】操作マニュアル更新', 'setupManualSheet')
        .addItem('【設定】全体設定シート作成 (リセット)', 'setupSettingsSheet')
        .addItem('【設定】投稿ボード作成 (リセット)', 'setupBoardSheet')
        .addItem('【設定】番組表リセット', 'setupScheduleSheet')
        .addItem('【設定】バズ研究所シート拡張', 'setupLabSheet')
        .addSeparator()
        .addItem('🎨【デザイン】Midnight Glass適用', 'applyPremiumTheme')
        .addSeparator()
        .addItem('【設定】自動分析トリガー設定', 'setupAllTriggers');

    // Developer Only
    if (isDevMode()) {
        devMenu.addSeparator()
            .addItem('🛑【開発】DNA統合 (グリモワール化)', 'updateMasterDNA')
            .addItem('🛑【開発】DB構築 (魔法の杖)', 'setupTemplateDatabase')
            .addItem('🔑【診断】API接続テスト', 'testConnection')
            .addItem('🛑【開発】モデル診断', 'debugListModels');
    }

    devMenu.addSeparator()
        .addItem('▶ 自動放送を開始する (30分毎)', 'enableScheduleTrigger')
        .addItem('■ 自動放送を停止する', 'disableScheduleTrigger');

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
 * 手動テスト用：選択中の行で合体画像を生成
 */
function runManualCollageTest() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();
    const range = ss.getActiveRange();
    const row = range.getRow();

    if (row < 4) {
        Browser.msgBox("4行目以降を選択してください。");
        return;
    }

    try {
        generateRowCollage(sheet, row);
        Browser.msgBox("処理完了。画像が表示されない場合は、URLを確認してください。");
    } catch (e) {
        Browser.msgBox("エラー発生: " + e.message);
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

    // Forced authorization check
    try {
        UrlFetchApp.fetch("https://google.com");
        DriveApp.getRootFolder();
        SlidesApp.create("temp");
    } catch (e) { }

    Browser.msgBox("✅ 自動化トリガーの設定が完了しました！\n\n今後、D〜F列を編集すると右下に通知が出て、自動で画像が合体されます。");
}

/**
 * トリガーの現在の状態を診断
 */
function checkTriggerStatus() {
    const handlers = ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction());
    if (handlers.indexOf("onBoardEditInstallable") !== -1) {
        Browser.msgBox("✅ 診断結果: 正常\n\n自動合体トリガーはすでに登録されています。D〜F列を編集して右下に通知が出るか確認してください。");
    } else {
        Browser.msgBox("❌ 診断結果: 未登録\n\n自動合体トリガーが見つかりません。「自動合体を有効にする」ボタンをもう一度押してください。");
    }
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
    var html = HtmlService.createHtmlOutputFromFile('sidebar_v4')
        .setTitle('AI Cockpit v2.6.4 (DIAG)')
        .setWidth(330);
    SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Sidebar Polling Function (State Manager)
 * Extremely lightweight: No getImages() allowed here.
 */
function getSidebarContent() {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getActiveSheet();
        const range = ss.getActiveRange();
        if (!range) return { mode: 'empty' };

        const row = range.getRow();
        const sheetName = sheet.getName();
        const cellValue = range.getValue();
        const targetSheetName = (typeof SHEET_BOARD !== 'undefined') ? SHEET_BOARD : "投稿作成ボード";

        if (sheetName === targetSheetName && row >= 3) {
            let promptText = ""; // Reserved: will be received from sidebar in future

            // --- Collage Detection (High-Speed Marker-Only) ---
            let hasCollage = false;
            try {
                const targetCell = sheet.getRange(row, 8);
                const formula = targetCell.getFormula();
                const v = String(targetCell.getValue());
                // Detection by Marker or IMAGE formula
                if (v.includes("READY") || formula.includes("IMAGE(")) {
                    hasCollage = true;
                }
            } catch (e) { }

            return {
                mode: 'board_master',
                text: String(cellValue),
                row: row,
                masterName: masterName,
                masterGems: (typeof MASTER_GEMS !== 'undefined') ? MASTER_GEMS : {},
                promptText: promptText,
                debugInfo: `R:${row} | ${hasCollage ? 'Marker Detected' : 'No Marker'}`,
                hasCollage: hasCollage
            };
        }

        // Mode 2: Normal Text Editor
        return {
            mode: 'text',
            text: String(cellValue),
            row: row
        };
    } catch (e) {
        return { mode: 'error', message: e.toString() + " Stack: " + e.stack };
    }
}

/**
 * Helper to fetch image bytes and return Base64
 * Used for AI content generation (D-F images)
 */
function fetchImageAsBase64(url) {
    try {
        const response = UrlFetchApp.fetch(url);
        const blob = response.getBlob();
        return {
            data: Utilities.base64Encode(blob.getBytes()),
            mimeType: blob.getContentType()
        };
    } catch (e) {
        console.error("fetchImageAsBase64 error: " + e.message);
        return null;
    }
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
    let existingSetupPrompt = null;

    try {
        existingApiKey = sheet.getRange("B2").getValue();
        existingUserId = sheet.getRange("B3").getValue();
        existingToken = sheet.getRange("B4").getValue();
        existingModel = sheet.getRange("B5").getValue();
        existingPersona = sheet.getRange("B6").getValue();
        existingSetupPrompt = sheet.getRange("B11").getValue();
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

    sheet.getRange("A10").setValue("【固定プロンプト】");
    sheet.getRange("A10").setFontWeight("bold").setBackground("#cfe2f3");

    sheet.getRange("A11").setValue("システムプロンプト\n(共通ルール＆出力形式)");
    const defaultSetupPrompt = `【共通ルール】
・「普通の言葉」禁止：素敵、可愛い、コスパ、便利、おすすめ、楽天、安い、激安は使用禁止。
・感情の増幅：語彙力を失う、正気を疑う、理性が飛ぶ、視覚の暴力、生活感への憎悪などを使用。
・LaTeX禁止：数式などは使わず、プレーンなテキストと適切な改行で構成。
・絵文字禁止（Threads投稿のみ）。
・スレッズ投稿文には「プロフに飛べるリンク（タグ）を含んだ誘導文」を末尾に添えて、投稿を作成
・私のプロフリンク　@purin201010

【出力形式（厳守）】
以下の形式で出力してください。

---
① パターン1
(本文)
プロフに飛べるリンク（タグ）を含んだ誘導文

② パターン2
(本文)
プロフに飛べるリンク（タグ）を含んだ誘導文

③ パターン3
(本文)
プロフに飛べるリンク（タグ）を含んだ誘導文

④ パターン4
(本文)
プロフに飛べるリンク（タグ）を含んだ誘導文

⑤ パターン5
(本文)
プロフに飛べるリンク（タグ）を含んだ誘導文

⑥ パターン6
(本文)
プロフに飛べるリンク（タグ）を含んだ誘導文

---
🛒 楽天ROOM：トドメの魔力（紹介文案）
Threadsから流入したユーザーに「あ、これ私のことだ」と思わせてポチらせる文章。
(150文字前後)
---`;

    if (existingSetupPrompt) {
        sheet.getRange("B11").setValue(existingSetupPrompt);
    } else {
        sheet.getRange("B11").setValue(defaultSetupPrompt);
    }
    sheet.getRange("B11").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);

    Browser.msgBox("設定シートをリセットしました！\nB6: あなたの願い(種)\nB8: AIが育てた最強人格\nB9: 文体スタイル\nB11: システムプロンプト\nこれらが連携して動作します。");
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

/**
 * Call Gemini API (Text + Images Support)
 * @param {string} apiKey
 * @param {string} prompt
 * @param {Array<{mimeType: string, data: string}>} [images] - Array of base64 images
 */
function callGeminiSafe(apiKey, prompt, images) {
    const model = getGeminiModel();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Construct Parts
    const parts = [{ text: prompt }];

    // Add Images if provided
    if (images && Array.isArray(images)) {
        images.forEach(img => {
            if (img.data) {
                parts.push({
                    inline_data: {
                        mime_type: img.mimeType || "image/jpeg",
                        data: img.data
                    }
                });
            }
        });
    }

    const payload = {
        contents: [{ parts: parts }],
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

// doPost was removed to consolidate handles in APIHandler.js


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

// doGet was moved to APIHandler.js to consolidate all entry points.


/**
 * Show "Master Modal" for the active row (Click-to-Gem)
 */
function showMasterModal() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();

    // Check if on correct sheet
    if (sheet.getName() !== SHEET_BOARD) {
        Browser.msgBox("「投稿作成ボード」で実行してください。");
        return;
    }

    var row = sheet.getActiveCell().getRow();
    if (row < 3) {
        Browser.msgBox("データ行を選択してください。（3行目以降）");
        return;
    }

    // Get Info using API Logic
    var info = apiGetMasterInfo({ row: row });

    // Debug: Check what we got
    // Browser.msgBox("Debug: G列の値 = " + info.masterName); 

    // Create Template
    var t = HtmlService.createTemplateFromFile('MasterModal');
    t.masterName = info.masterName; // Default/Current selection
    t.imageUrls = info.imageUrls;
    t.masterGems = MASTER_GEMS; // Pass all gems for selection

    var html = t.evaluate()
        .setWidth(450)
        .setHeight(400); // Slightly taller for buttons

    SpreadsheetApp.getUi().showModalDialog(html, '🚀 師匠へ (Copy & Go)');
}

/**
 * Sidebar Helper: Fetch image server-side to bypass CORS
 */
function getImageBase64(url) {
    try {
        if (!url) return null;

        // Handle formula wrapping if raw string contains it (redundant safety)
        if (url.includes('IMAGE("')) {
            const match = url.match(/IMAGE\s*\(\s*"([^"]+)"/i);
            if (match && match[1]) url = match[1];
        }

        const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        if (response.getResponseCode() !== 200) {
            console.error("Failed to fetch image: " + url);
            return { error: "Fetch failed: " + response.getResponseCode() };
        }

        const blob = response.getBlob();
        const base64 = Utilities.base64Encode(blob.getBytes());
        return {
            mimeType: blob.getContentType(),
            base64: base64
        };
    } catch (e) {
        console.error(e);
        return { error: e.message };
    }
}

// ------------------------------------------
// Schedule Triggers
// ------------------------------------------
function enableScheduleTrigger() {
    disableScheduleTrigger(true); // Silent delete
    ScriptApp.newTrigger('runScheduledBroadcast')
        .timeBased()
        .everyMinutes(30)
        .create();
    Browser.msgBox("自動放送(30分間隔)を開始しました！\\n番組表と現在時刻を照らし合わせて自動投稿を行います。");
}

function disableScheduleTrigger(silent) {
    const existing = ScriptApp.getProjectTriggers();
    let deleted = false;
    for (let i = 0; i < existing.length; i++) {
        if (existing[i].getHandlerFunction() === 'runScheduledBroadcast') {
            ScriptApp.deleteTrigger(existing[i]);
            deleted = true;
        }
    }
    if (!silent) {
        if (deleted) {
            Browser.msgBox("自動放送を停止しました。");
        } else {
            Browser.msgBox("現在、自動放送は設定されていません。");
        }
    }
}
