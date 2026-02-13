/**
 * Lab.js
 * バズ研究所 (Buzz Lab) 関連のロジック
 */

/**
 * 【設定】バズ研究所シート拡張
 * Config.jsの設定に基づいてシートを構築する
 */
function setupLabSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_LAB);

    if (!sheet) {
        sheet = ss.insertSheet(SHEET_LAB);
    } else {
        // Migration Check: If A1 is not Start with Description
        const a1 = sheet.getRange("A1").getValue();
        if (a1 && String(a1).indexOf("使い方") === -1 && String(a1).indexOf("Run") !== -1) {
            // If A1 is "Run" (Old Header), insert row
            sheet.insertRows(1);
        }
    }

    // 1. Description (Row 1)
    sheet.getRange("A1:E1").merge().setValue(LAB_CONFIG.description);
    sheet.getRange("A1").setBackground("#fff2cc").setFontColor("#000000");
    sheet.getRange("A1").setVerticalAlignment("top").setHorizontalAlignment("left");
    sheet.getRange("A1").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    sheet.setRowHeight(1, 100);

    // 2. Headers & Guides (Rows 2 & 3)
    const headers = LAB_CONFIG.columns.map(c => c.header);
    const guides = LAB_CONFIG.columns.map(c => c.guide);

    // Row 2: Headers
    sheet.getRange(2, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(2, 1, 1, headers.length).setBackground("#4c1130").setFontColor("white").setFontWeight("bold").setHorizontalAlignment("center");
    sheet.setRowHeight(2, 40);

    // Row 3: Guides
    // Safety check: Ensure Row 3 exists/is clear
    const checkA3 = sheet.getRange("A3").getValue();
    if (!String(checkA3).includes("↓")) {
        // Only insert if it looks like data
        const looksLikeData = sheet.getLastRow() >= 3 && checkA3 !== "";
        if (looksLikeData) {
            sheet.insertRows(3);
        }
    }
    sheet.getRange(3, 1, 1, guides.length).setValues([guides]);
    sheet.getRange(3, 1, 1, guides.length).setBackground("#f3f3f3").setFontColor("#666666").setFontSize(9).setVerticalAlignment("top").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    sheet.setRowHeight(3, 60);

    sheet.setFrozenRows(3);

    // 3. Columns Config (Widths & Validations) - Loop through Config
    LAB_CONFIG.columns.forEach((col, index) => {
        const colNum = index + 1; // 1-based
        const range = sheet.getRange(4, colNum, 997, 1); // Start from Row 4

        // Width
        if (col.width) sheet.setColumnWidth(colNum, col.width);

        // Validation / formatting
        range.clearDataValidations();

        if (col.type === "CHECKBOX") {
            const rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
            range.setDataValidation(rule).setHorizontalAlignment("center");
        } else if (col.type === "DROPDOWN" && col.options) {
            const rule = SpreadsheetApp.newDataValidation().requireValueInList(col.options, true).setAllowInvalid(false).build();
            range.setDataValidation(rule);
        } else if (col.type === "TEXT_WRAP") {
            range.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP).setVerticalAlignment("top");
        } else if (col.type === "TEXT_WRAP_BG") {
            range.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP).setVerticalAlignment("top").setBackground("#f3f3f3");
        }
    });

    // Cleanup Duplicates (Row 4+)
    for (let i = 0; i < 5; i++) {
        const val = sheet.getRange("A4").getValue();
        if (String(val).includes("🚀") || String(val).includes("↓")) {
            sheet.deleteRow(4);
        } else break;
    }

    try {
        Browser.msgBox("バズ研究所(Lab)を更新しました！(Configベース)");
    } catch (e) { }
}

/**
 * テンプレートDBシートの構築
 */
function setupTemplateDatabase(silent = false) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let dbSheet = ss.getSheetByName(SHEET_DB);
    if (dbSheet) {
        if (!silent) {
            try { Browser.msgBox("テンプレートDBは既に存在します。"); } catch (e) { }
        }
        return;
    }

    dbSheet = ss.insertSheet(SHEET_DB);

    // Headers
    // Headers
    const headers = [
        "A: Last Learned", "B: Skill Name", "C: Context/Target", "D: Syntax Template",
        "E: Humor Formula", "F: Type", "G: Source (Lab URL)", "H: Status (Active/Archived)", "I: Rating (1-5)"
    ];

    dbSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    dbSheet.setFrozenRows(1);
    dbSheet.getRange("A:I").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    dbSheet.setColumnWidth(2, 200);
    dbSheet.setColumnWidth(3, 200);
    dbSheet.setColumnWidth(4, 300);

    const rule = SpreadsheetApp.newDataValidation().requireValueInList(["Active", "Archived"]).build();
    dbSheet.getRange("H2:H1000").setDataValidation(rule);

    if (!silent) {
        try { Browser.msgBox("テンプレートDBを初期化しました。"); } catch (e) { }
    }
}

/**
 * Helper: Analyze Single Block of Text and Update DB/Settings
 */
function analyzeDojoText(apiKey, rawText, ss) {
    const prompt = `
あなたは世界最高峰のコンテンツ・ストラテジストです。
以下の「SNS運用のマニュアル」から、AI生成システムに組み込むための「構造化データ」を抽出してください。

【読み込むマニュアル本文】
${rawText}

【抽出ミッション】
背景にある「なぜ効くのか？」というロジックを含めて言語化してください。

### 1. General Rules (心得・戦略ルール)
- 投稿全体に通底する「思想」や「禁止事項」。

### 2. Templates (型・テンプレート)
- そのまま使える「穴埋め式の構文」。
- 例: 「【〇〇な人へ】実は××なんです。」

【出力形式 (JSON)】
必ず以下のJSON形式のみを出力してください。Markdownバッククォート不要。
{
  "general_rules": "心得をまとめたテキスト",
  "templates": [
    {
      "name": "テクニック名",
      "syntax": "構文テンプレート",
      "context": "使用場面"
    }
  ]
}
`;

    const result = callGeminiSafe(apiKey, prompt);
    if (!result) {
        throw new Error("No response from AI (Result is empty).");
    }
    let jsonStr = result.replace(/```json/g, "").replace(/```/g, "").trim();
    let data;
    try {
        data = JSON.parse(jsonStr);
    } catch (e) {
        return { summary: "JSON Parse Error: " + result.substring(0, 100) };
    }

    // 2. Update Toranomaki DB (Rules) - Append
    const toraSheet = ss.getSheetByName(SHEET_TORANOMAKI);
    let addedRulesCount = 0;

    if (toraSheet && data.general_rules) {
        // Check duplicates? For now, we append "Analysis Rules" as a new item.
        const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm");
        const ruleText = data.general_rules;

        // Append Row: [Date, Text, Status, Insight]
        toraSheet.appendRow([
            dateStr,
            `【Lab Analysis】\n${ruleText}`,
            "Pending Study", // Toranomaki.js will process this next
            "Extracted from Lab Post"
        ]);
        addedRulesCount = 1;
    }

    // 3. Update DB (Templates) - Deduplication
    setupTemplateDatabase(true); // Ensure DB exists silently
    const dbSheet = ss.getSheetByName(SHEET_DB);
    let addedTemplateCount = 0;

    if (dbSheet && data.templates) {
        const lastDbRow = dbSheet.getLastRow();
        const existingSyntaxes = lastDbRow > 1 ? dbSheet.getRange(2, 4, lastDbRow - 1, 1).getValues().flat().map(String) : [];

        const newRows = [];
        data.templates.forEach(t => {
            if (!existingSyntaxes.includes(t.syntax)) {
                newRows.push([
                    "", // A: Last Learned (Empty initially)
                    `Lab: ${t.name}`,
                    t.context,
                    t.syntax,
                    "Auto-Analyze required",
                    "Manual",
                    "Lab Analysis",
                    "Active",
                    "3"
                ]);
            }
        });

        if (newRows.length > 0) {
            dbSheet.getRange(lastDbRow + 1, 1, newRows.length, 9).setValues(newRows);
            addedTemplateCount = newRows.length;
        }
    }

    // 4. Update Grimoire (Sync)
    // This will trigger Toranomaki.js to read the new Rule from Toranomaki DB and evolve B8.
    updateMasterDNA();

    // Construct Display Summary
    let display = `✅ Analysis Complete\n\n[Rules (+${addedRulesCount})]\n${data.general_rules.substring(0, 50)}...\n(Saved to Toranomaki DB)\n\n[Templates (+${addedTemplateCount})]\n`;
    if (data.templates) {
        data.templates.forEach(t => {
            display += `- ${t.name}: ${t.syntax.substring(0, 30)}...\n`;
        });
    }

    return { summary: display };
}

// End of Lab.js

/**
 * 【設定】自動化トリガー設定 (バズ研究所)
 */
function setupLabTrigger() {
    setupTriggerCommon(SHEET_LAB, "onLabEditInstallable");
}

/**
 * トリガーによって実行されるDNA分析関数
 */
function onLabEditInstallable(e) {
    if (!e) return;
    const range = e.range;
    const sheet = range.getSheet();

    if (sheet.getName() !== SHEET_LAB) return;

    // Check Column: Col 1 (Run Checkbox)
    const col = range.getColumn();
    const row = range.getRow();
    if (col !== 1 || row < 2) return;

    if (range.getValue() !== true) return;

    // Show feedback
    sheet.getRange(row, 5).setValue("⏳ Analyzing...");
    SpreadsheetApp.flush();

    analyzeSingleRow(sheet, row);
    range.setValue(false); // Reset checkbox
}

/**
 * 単一行分析ロジック
 */
function analyzeSingleRow(sheet, row) {
    let apiKey = getGeminiApiKey();
    if (!apiKey) return;

    // Data Columns (Shifted by +1 due to Checkbox at A)
    const rawPostCell = sheet.getRange(row, 4);
    const dnaCell = sheet.getRange(row, 5);

    const rawPost = rawPostCell.getValue();
    if (!rawPost) return;

    try {
        const result = analyzeDojoText(apiKey, rawPost, sheet.getParent());

        // Write Result
        if (result.summary) {
            dnaCell.setValue(result.summary);
        }
    } catch (e) {
        dnaCell.setValue("Error: " + e.message);
    }
}
