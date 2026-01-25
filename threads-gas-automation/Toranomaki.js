/**
 * Toranomaki.js
 * 虎の巻DB (Tone of Voice Source) 関連のロジック
 */

/**
 * 虎の巻DBからマニュアルを学習し、Master DNAを作成・更新する
 */
function updateMasterDNA() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const toraSheet = ss.getSheetByName(SHEET_TORANOMAKI);
    let setSheet = ss.getSheetByName(SHEET_SETTINGS);

    if (!toraSheet) {
        Browser.msgBox(`Error: Sheet '${SHEET_TORANOMAKI}' not found. Please create it first.`);
        return;
    }

    // 1. Identify Unlearned Rows (Col A is empty, Col B has text)
    const lastRow = toraSheet.getLastRow();
    if (lastRow < 2) {
        Browser.msgBox("虎の巻DBにデータがありません。B列にマニュアルを追記してください。");
        return;
    }

    // Range: Row 2 to LastRow (Assuming Row 1 is Header)
    // Data Structure: A=Date, B=Source, C=Status, D=Insight
    const dataRange = toraSheet.getRange(2, 1, lastRow - 1, 4);
    const values = dataRange.getValues();
    const unlearnedIndices = []; // 0-based relative to dataRange

    values.forEach((row, index) => {
        const date = row[0]; // A
        const text = row[1]; // B

        // If Date is empty AND Text exists -> Candidate to mark as learned
        if (!date && text) {
            unlearnedIndices.push(index);
        }
    });

    // Collect ALL manuals for prompt (We need FULL context every time to generate the holistic persona)
    const allManuals = values.map(row => row[1]).filter(String).join("\n\n---\n\n");

    if (!allManuals) {
        Browser.msgBox("No manuals found in Toranomaki DB (Col B).");
        return;
    }

    // 2. Generate Master DNA
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        Browser.msgBox("Error: API Key is missing.");
        return;
    }

    const prompt = `
あなたは世界最高峰のブランド・アーキテクトです。
以下は、このアカウントの「運用マニュアル・思想・文体定義（虎の巻）」の全データです。

【虎の巻 (Source Data)】
${allManuals}

【指示】
これらを統合・分析し、**このアカウントの「隠されたキャラクター性（Tone of Voice）」と「行動指針」**を定義する『Master DNA (Grimoire)』を作成してください。

**制約事項:**
- 「承知いたしました」不要。
- 今後のAI生成において、このペルソナを完璧に憑依させるための「プロンプト部品」として出力すること。
- 抽象的な分析だけでなく、具体的な「語尾」「言い回し」「NGワード」も含めること。

# 🃏 Master DNA Grimoire
(Output Character DNA & Skill Analysis)
`;

    try {
        let grimoire = callGeminiSafe(apiKey, prompt);
        if (!grimoire || !grimoire.trim()) {
            throw new Error("AI Returned Empty Content. (Quota Exceeded or Model Error)");
        }
        grimoire = grimoire.trim();

        // 3. Update Settings
        if (!setSheet) setSheet = ss.insertSheet(SHEET_SETTINGS);

        setSheet.getRange("A9").setValue("Master DNA (Grimoire)");
        const cell = setSheet.getRange("B9");
        cell.setValue(grimoire);
        cell.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
        setSheet.setRowHeight(9, 300);
        setSheet.setColumnWidth(2, 600);

        const now = new Date();
        const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm");
        setSheet.getRange("B10").setValue("Last Updated: " + dateStr);

        // 4. Mark as Learned (Col A & C)
        unlearnedIndices.forEach(idx => {
            // idx is 0-based in values array.
            // Sheet Row = idx + 2 (Start Row)
            const sheetRow = idx + 2;
            toraSheet.getRange(sheetRow, 1).setValue(dateStr); // Col A: Date
            toraSheet.getRange(sheetRow, 3).setValue("Learned");     // Col C: Status
            toraSheet.getRange(sheetRow, 4).setValue("Included in Master DNA"); // Col D: Insight
        });

        Browser.msgBox(`Master DNA Updated!\\nLearned ${unlearnedIndices.length} new manuals.\\nCheck Settings Sheet B9.`);

    } catch (e) {
        Browser.msgBox("Master DNA Update Failed: " + e.message);
    }
}
