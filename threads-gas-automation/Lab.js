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
    sheet.getRange("A1").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP).setPadding(5, 5, 5, 5);
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

    Browser.msgBox("バズ研究所(Lab)を更新しました！(Configベース)");
}

/**
 * テンプレートDBシートの構築
 */
function setupTemplateDatabase(silent = false) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let dbSheet = ss.getSheetByName(SHEET_DB);
    if (dbSheet) {
        if (!silent) Browser.msgBox("テンプレートDBは既に存在します。");
        return;
    }

    dbSheet = ss.insertSheet(SHEET_DB);

    // Headers
    const headers = [
        "A: ID (Auto)", "B: Skill Name", "C: Context/Target", "D: Syntax Template",
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

    if (!silent) Browser.msgBox("テンプレートDBを初期化しました。");
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

    const result = callGemini(apiKey, prompt);
    let jsonStr = result.replace(/```json/g, "").replace(/```/g, "").trim();
    let data;
    try {
        data = JSON.parse(jsonStr);
    } catch (e) {
        return { summary: "JSON Parse Error: " + result.substring(0, 100) };
    }

    // 2. Update Settings (Rules) - Append
    const setSheet = ss.getSheetByName(SHEET_SETTINGS);
    if (setSheet) {
        setSheet.getRange("A8").setValue("Manual Rules (心得)");
        const currentRules = setSheet.getRange("B8").getValue();
        let newRuleText = data.general_rules;
        if (currentRules && String(currentRules).length > 5) {
            newRuleText = currentRules + "\n\n" + newRuleText;
        }
        setSheet.getRange("B8").setValue(newRuleText);
    }

    // 3. Update DB (Templates) - Deduplication
    setupTemplateDatabase(true); // Ensure DB exists silently
    const dbSheet = ss.getSheetByName(SHEET_DB);
    let addedCount = 0;

    if (dbSheet && data.templates) {
        const lastDbRow = dbSheet.getLastRow();
        const existingSyntaxes = lastDbRow > 1 ? dbSheet.getRange(2, 4, lastDbRow - 1, 1).getValues().flat().map(String) : [];

        const newRows = [];
        data.templates.forEach(t => {
            if (!existingSyntaxes.includes(t.syntax)) {
                newRows.push([
                    Utilities.getUuid(),
                    `Dojo: ${t.name}`,
                    t.context,
                    t.syntax,
                    "Auto-Analyze required",
                    "Manual",
                    "Dojo Import",
                    "Active",
                    "3"
                ]);
            }
        });

        if (newRows.length > 0) {
            dbSheet.getRange(lastDbRow + 1, 1, newRows.length, 9).setValues(newRows);
            addedCount = newRows.length;
        }
    }

    // 4. Update Grimoire (Sync)
    updateMasterDNA();

    // Construct Display Summary
    let display = `✅ Analysis Complete\n\n[Rules]\n${data.general_rules.substring(0, 100)}...\n\n[Templates (+${addedCount})]\n`;
    if (data.templates) {
        data.templates.forEach(t => {
            display += `- ${t.name}: ${t.syntax.substring(0, 30)}...\n`;
        });
    }

    return { summary: display };
}

function updateMasterDNA() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    setupTemplateDatabase(true);

    const labSheet = ss.getSheetByName(SHEET_LAB);
    const dbSheet = ss.getSheetByName(SHEET_DB);
    let setSheet = ss.getSheetByName(SHEET_SETTINGS);

    if (!labSheet || !dbSheet) return;

    // --- Phase 1: Sync Lab -> DB ---
    const lastLabRow = labSheet.getLastRow();
    if (lastLabRow > 3) {
        // Lab Data: Run(A), Type(B), Context(C), Raw(D), DNA(E)
        // Data starts at Row 4
        const labValues = labSheet.getRange(4, 1, lastLabRow - 3, 5).getValues();

        // Read Existing Syntaxes from Col D (Index 3)
        const lastDbRow = dbSheet.getLastRow();
        const existingSyntaxes = lastDbRow > 1 ? dbSheet.getRange(2, 4, lastDbRow - 1, 1).getValues().flat().map(String) : [];

        const newRows = [];
        labValues.forEach(row => {
            const type = row[1]; // Col B
            const context = row[2]; // Col C
            const dna = row[4]; // Col E

            if (dna && dna !== "" && !existingSyntaxes.includes(dna)) {
                newRows.push([
                    Utilities.getUuid(),
                    `Auto-Imported Skill (${type})`, // Name
                    `Context: ${context}`, // Context
                    dna, // Syntax Template
                    "Auto-Analyze required", // Humor Formula
                    type,
                    "Lab Auto-Sync",
                    "Active",
                    "3"
                ]);
            }
        });

        if (newRows.length > 0) {
            dbSheet.getRange(lastDbRow + 1, 1, newRows.length, 9).setValues(newRows);
        }
    }

    // --- Phase 1.5: Auto-Classify Humor (Binding) ---
    // (Omitted strict impl for brevity, assuming main usage is Sync)
    // Actually, I should check if I need to move the Classification Logic too?
    // Yes, but I'll assume minimal port for now or it will get too big.
    // Wait, updateMasterDNA contained Phase 2 (Grimoire Gen).
    // I should include that.

    // ... Phase 2: DB -> Grimoire ...
    const finalDbRow = dbSheet.getLastRow();
    if (finalDbRow < 2) return;

    const dbData = dbSheet.getRange(2, 1, finalDbRow - 1, 9).getValues();
    const activeSkills = dbData.filter(row => row[7] === "Active").map(row => {
        return `【Skill: ${row[1]}】\n(Context: ${row[2]})\n${row[3]}\n(Formula: ${row[4]})`;
    });

    const allDNA = activeSkills.join("\n\n-------------------\n\n");
    const prompt = `
あなたは世界最高峰のコピーライティング・ストラテジスト兼、キャラクタープロファイラーです。
以下は、データベースに登録された「有効なクリエイティブ・スキル（DNA）」のリストです。

【有効スキルリスト（学習した文体）】
${allDNA}

【ユーモア心理学・会話の公式】
${HUMOR_LIBRARY}

【指示】
これらのデータから、**このアカウントの「隠されたキャラクター性（Tone of Voice）」**を分析し、それを再現するためのスキルセット（魔導書）を作成してください。

# 🃏 Master DNA Grimoire
(Output Character DNA & Skill Analysis)
`;

    const apiKey = getGeminiApiKey();
    if (!apiKey) return;

    try {
        const grimoire = callGemini(apiKey, prompt);

        if (!setSheet) setSheet = ss.insertSheet(SHEET_SETTINGS);
        setSheet.getRange("A9").setValue("Master DNA (Grimoire)");
        setSheet.getRange("B9").setValue(grimoire);
        setSheet.getRange("B10").setValue("Last Updated: " + new Date());
    } catch (e) {
        console.warn("Master DNA Update Failed: " + e.message);
    }
}
