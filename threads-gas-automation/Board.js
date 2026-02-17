/**
 * Board.js
 * 投稿作成ボード (Content Factory) 関連のロジック
 */

/**
 * 【設定】投稿ボード作成 (リセット)
 */

/**
 * 【設定】投稿ボード作成 (リセット)
 */
function setupBoardSheet() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = SHEET_BOARD;
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
        sheet = ss.insertSheet(sheetName);
    }

    // 1. クリーニング
    sheet.getRange("A1:Z1000").clear();
    sheet.getRange("A1:Z1000").clearDataValidations();
    sheet.getRange("A1:Z1000").clearFormat();

    // --- NEW: Row 1 Prompt Area ---
    // User requested "Prompt in the 1st line".
    // We will merge A1:U1 and put the "Mix" prompt there for easy copying.
    var promptCell = sheet.getRange("A1:U1");
    promptCell.merge();
    promptCell.setValue(typeof PROMPT_MIX !== 'undefined' ? PROMPT_MIX : "Prompt Loading...");
    promptCell.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP); // Wrap text
    promptCell.setVerticalAlignment("top");
    promptCell.setBackground("#fff2cc"); // Light yellow/orange for attention
    promptCell.setFontSize(10);
    // Auto-row height for prompt? Maybe fixed height to avoid taking too much space.
    // User said "Slide down", suggesting insertion.
    sheet.setRowHeight(1, 100); // Give it some space

    // 2. ヘッダー (2行目)
    // A: ON AIR, B: No, C: Type, D: Photo 1, E: Photo 2, F: Photo 3, G: Topic, H: Output, I: System ID, J: Views, K: Likes, L: Replies, M: Reposts, N: Rate, O: Judge, P: DNA
    var headers = [
        ["ON AIR", "No", "Type", "Photo 1", "Photo 2", "Photo 3", "Select Master (師匠選択)", "Output (決定稿)", "System ID", "👁️ Views", "❤️ Likes", "💬 Replies", "🔁 Reposts", "📊 Rate", "📝 Judge", "DNA (分析)", "Drafts Source", "Draft 1", "Draft 2", "Draft 3", "🚀 Create"]
    ];

    sheet.getRange("A2:U2").setValues(headers); // Shifted to Row 2
    sheet.getRange("A2:U2").setBackground("#ffe599"); // Yellow
    sheet.getRange("A2:U2").setFontWeight("bold");
    sheet.getRange("A2:U2").setHorizontalAlignment("center");

    // 3. ガイド行 (3行目)
    var guides = [
        "チェックボックス", "No", "↓Type", "[Auto1]", "[Auto2]", "[Auto3]",
        "↓使用する師匠を選択",
        "←ここにAIが書いた文章が出ます",
        "⛔ ID", "閲覧数", "いいね", "返信", "引用/再投稿", "反応率", "判定",
        "←ここにAI分析結果が出ます",
        "", "", "", "", "チェックで生成"
    ];
    sheet.getRange("A3:U3").setValues([guides]); // Shifted to Row 3
    sheet.getRange("A3:U3").setBackground("#f3f3f3").setFontColor("#666666").setFontSize(9).setVerticalAlignment("top").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    sheet.setRowHeight(3, 60);

    // 4. データエリア設定 (4行目以降)
    sheet.getRange("A4:U1000").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    sheet.getRange("A4:U1000").setVerticalAlignment("top");
    sheet.setRowHeight(2, 40); // Header height
    sheet.setFrozenRows(3);    // Freeze top 3 rows

    // 5. バリデーション & 幅調整
    // A: ON AIR Checkbox
    var checkboxOnAir = SpreadsheetApp.newDataValidation().requireCheckbox().build();
    sheet.getRange("A4:A100").setDataValidation(checkboxOnAir);

    // U: Create Checkbox
    var checkboxCreate = SpreadsheetApp.newDataValidation().requireCheckbox().build();
    sheet.getRange("U4:U100").setDataValidation(checkboxCreate);

    // C: Type Rule
    var ruleType = SpreadsheetApp.newDataValidation()
        .requireValueInList(["単品", "日常", "有益", "自己紹介", "Free", "まとめ"], true)
        .setAllowInvalid(false).build();
    sheet.getRange("C4:C100").setDataValidation(ruleType);

    // Widths
    sheet.setColumnWidth(1, 60);  // ON AIR
    sheet.setColumnWidth(2, 40);  // No
    sheet.setColumnWidth(3, 80);  // Type
    sheet.setColumnWidth(4, 100); // Photo 1
    sheet.setColumnWidth(5, 100); // Photo 2
    sheet.setColumnWidth(6, 100); // Photo 3
    // G: Master Select Rule (Updated for Click-to-Gem)
    var ruleMaster = SpreadsheetApp.newDataValidation()
        .requireValueInList(["Basic", "Var", "Rewrite", "Poison", "ROOM", "Mix"], true)
        .setAllowInvalid(true).build(); // Allow invalid for legacy text compatibility
    sheet.getRange("G4:G100").setDataValidation(ruleMaster);

    // Widths
    sheet.setColumnWidth(1, 60);  // ON AIR
    sheet.setColumnWidth(2, 40);  // No
    sheet.setColumnWidth(3, 80);  // Type
    sheet.setColumnWidth(4, 100); // Photo 1
    sheet.setColumnWidth(5, 100); // Photo 2
    sheet.setColumnWidth(6, 100); // Photo 3
    sheet.setColumnWidth(7, 150); // Select Master (Was Topic)
    sheet.setColumnWidth(8, 400); // Output
    sheet.setColumnWidth(9, 50);  // System ID

    // Metrics Widths
    sheet.setColumnWidth(10, 60); // Views
    sheet.setColumnWidth(11, 60); // Likes
    sheet.setColumnWidth(12, 60); // Replies
    sheet.setColumnWidth(13, 60); // Reposts
    sheet.setColumnWidth(14, 60); // Rate
    sheet.setColumnWidth(15, 60); // Judge
    sheet.setColumnWidth(16, 200); // DNA

    // Hide Drafts
    sheet.hideColumns(17, 4); // Q, R, S, T

    try {
        Browser.msgBox("投稿作成ボード(Pro版)の準備ができました！\\n1行目にプロンプトを表示しました。コピーして師匠へペーストしてください。");
    } catch (e) {
        // API実行時はスキップ
        console.log("Setup completed (Headless mode)");
    }
}

/**
 * 【緊急】G列のドロップダウンのみを適用（データは消さない）
 */
function applyMasterValidation() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_BOARD);
    if (!sheet) return;

    // G: Master Select Rule
    var ruleMaster = SpreadsheetApp.newDataValidation()
        .requireValueInList(["Basic", "Var", "Rewrite", "Poison", "ROOM", "Mix"], true)
        .setAllowInvalid(false).build();
    sheet.getRange("G3:G1000").setDataValidation(ruleMaster);

    // Header & Guide Update
    sheet.getRange("G1").setValue("Select Master (師匠選択)");
    sheet.getRange("G2").setValue("↓使用する師匠を選択");

    Browser.msgBox("G列のドロップダウンを修復しました！");
}

/**
 * 【強制実行用】G列のドロップダウンをMix入りに書き換える
 */
function FORCE_UPDATE_DROPDOWN() {
    var sheet = SpreadsheetApp.getActiveSheet();
    var rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(["Basic", "Var", "Rewrite", "Poison", "ROOM", "Mix"], true)
        .setAllowInvalid(false)
        .build();

    // Apply to G4:G1000 ("Select Master")
    sheet.getRange("G4:G1000").setDataValidation(rule);

    Browser.msgBox("✅ 強制アップデート完了！\\nG列のドロップダウンに「Mix」が入っているか確認してください。");
}

/**
 * 【作成】投稿一括生成 (全タイプ)
 */
function generateUnifiedPosts() {
    generatePostsCommon(SHEET_BOARD);
}

/**
 * 【単品】まとめネタ作成 (選択合体)
 */
function generateSummaryPost() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_BOARD);
    if (!sheet) return;

    let apiKey = getGeminiApiKey();
    if (!apiKey) {
        try { Browser.msgBox("API Key Missing"); } catch (e) { }
        return;
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 5) { // Needs at least 2 checked items, so checks start from row 4
        try { Browser.msgBox("データがありません。"); } catch (e) { }
        return;
    }

    const range = sheet.getRange(4, 1, lastRow - 3, 7); // Start from Row 4
    const values = range.getValues();

    let selectedContents = [];
    let selectedHumors = [];

    for (let i = 0; i < values.length; i++) {
        if (values[i][0] === true) { // Checked
            const output = values[i][6]; // Col G (Output)
            const topic = values[i][4];  // Col E (Topic)
            const humor = values[i][3];  // Col D (Humor)

            const content = output ? output : topic;
            if (content) {
                selectedContents.push(content);
                if (humor) selectedHumors.push(humor);
            }
        }
    }

    if (selectedContents.length < 2 || selectedContents.length > 5) {
        try {
            Browser.msgBox(`選択数は2～5個にしてください。\n現在の選択数: ${selectedContents.length}`);
        } catch (e) { }
        return;
    }

    const combinedContent = selectedContents.map((t, idx) => `【ネタ${idx + 1}】\n${t}`).join("\n\n");
    const humorLevel = selectedHumors.length > 0 ? selectedHumors[0] : "Lv2: 標準";

    const prompt = `
あなたはThreadsの人気インフルエンサーです。
以下の「複数の投稿内容(またはネタ)」を素材として、**1つの「まとめ投稿」**を新規に書き下ろしてください。

【素材リスト】
${combinedContent}

【指示】
- 「○選」や「まとめ」の形式で再構成。
- ハッシュタグ禁止。
- 出力は**投稿本文のみ**。
`;

    try {
        let text = callGeminiSafe(apiKey, prompt);
        text = text.replace(/#\S+/g, '').trim();

        sheet.appendRow([
            false,           // Select
            "",              // No
            "まとめ",        // Type
            humorLevel,      // Humor
            "選択されたネタのまとめ", // Topic
            text,            // Output
            "",              // Image
            "Generated"      // Status
        ]);

        try { Browser.msgBox("まとめ投稿を作成しました！"); } catch (e) { }
    } catch (e) {
        try { Browser.msgBox("エラー: " + e.message); } catch (err) { }
    }
}

/**
 * 放送実行 (Manual Broadcast) (Placeholder)
 */
function runBroadcast() {
    try {
        Browser.msgBox("放送機能はまだ実装されていません（スケジュールシート連携予定）");
    } catch (e) { }
}

/**
 * APIを使って分析データを更新 (Update Metrics)
 */
function updateMetrics() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const boardSheet = ss.getSheetByName(SHEET_BOARD);
    if (!boardSheet) return;

    const creds = getThreadsCredentials();
    if (!creds) {
        try { Browser.msgBox("API設定が見つかりません。"); } catch (e) { }
        return;
    }
    const { token } = creds;

    const lastRow = boardSheet.getLastRow();
    if (lastRow < 4) return;

    const range = boardSheet.getRange(4, 1, lastRow - 3, 16);
    const data = range.getValues();
    let updateCount = 0;

    data.forEach((row, i) => {
        const sysId = row[9]; // Index 9 (J列)
        if (!sysId) return;

        try {
            const url = `https://graph.threads.net/v1.0/${sysId}/insights?metric=views,likes,replies,reposts,quotes&access_token=${token}`;
            const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
            const json = JSON.parse(resp.getContentText());

            if (json.data) {
                let views = 0, likes = 0, replies = 0, reposts = 0, quotes = 0;
                json.data.forEach(item => {
                    const val = (item.values && item.values.length > 0) ? item.values[0].value : 0;
                    if (item.name === 'views') views = val;
                    if (item.name === 'likes') likes = val;
                    if (item.name === 'replies') replies = val;
                    if (item.name === 'reposts') reposts = val;
                    if (item.name === 'quotes') quotes = val;
                });

                const totalDiffusion = reposts + quotes;
                let rate = 0;
                if (views > 0) rate = ((likes + replies + totalDiffusion) / views) * 100;
                const rateStr = rate.toFixed(2) + "%";
                let judge = "-";
                if (views > 1000 && rate > 5.0) judge = "🔥バズ";
                else if (views > 500 && rate > 3.0) judge = "🎯良";
                else if (views > 100) judge = "👀";

                const targetRow = i + 4;
                boardSheet.getRange(targetRow, 11).setValue(views);
                boardSheet.getRange(targetRow, 12).setValue(likes);
                boardSheet.getRange(targetRow, 13).setValue(replies);
                boardSheet.getRange(targetRow, 14).setValue(totalDiffusion);
                boardSheet.getRange(targetRow, 15).setValue(rateStr);
                boardSheet.getRange(targetRow, 16).setValue(judge);
                updateCount++;
            }
        } catch (e) { }
    });
    try { Browser.msgBox(`${updateCount}件の投稿データを更新しました。`); } catch (e) { }
}

/**
 * 共通記事生成ロジック (Unified Factory)
 */
function generatePostsCommon(sheetName, targetRow) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    const labSheet = ss.getSheetByName(SHEET_LAB);

    if (!sheet) {
        try { Browser.msgBox(`シート「${sheetName}」が見つかりません。`); } catch (e) { }
        return;
    }

    let apiKey = getGeminiApiKey();
    if (!apiKey) {
        if (!targetRow) {
            try { Browser.msgBox("API Key Missing"); } catch (e) { }
        }
        return;
    }

    // --- 1. Resources: Personas & Style ---
    let evolvedPersona = "30代女性インフルエンサー";
    let masterStyle = "";

    try {
        const setSheet = ss.getSheetByName(SHEET_SETTINGS);
        if (setSheet) {
            // Evolved Persona (B8)
            const p = setSheet.getRange("B8").getValue();
            if (p && String(p).length > 10) evolvedPersona = p;
            else {
                // Fallback to Seed (B6)
                const seed = setSheet.getRange("B6").getValue();
                if (seed) evolvedPersona = seed;
            }

            // Master Style (B9)
            const s = setSheet.getRange("B9").getValue();
            if (s) masterStyle = s;
        }
    } catch (e) { }

    // --- 2. Resources: Expert Tips (Toranomaki DB) ---
    // Read raw tips (Techniques)
    let expertTips = "";
    const toraSheet = ss.getSheetByName(SHEET_TORANOMAKI);
    if (toraSheet && toraSheet.getLastRow() >= 2) {
        try {
            const rawTips = toraSheet.getRange(2, 2, toraSheet.getLastRow() - 1, 1).getValues();
            expertTips = rawTips.flat().filter(String).join("\n- ");
        } catch (e) { }
    }

    // --- 3. Resources: Template DB (Skeleton) ---
    let templates = [];
    const dbSheet = ss.getSheetByName(SHEET_DB);
    if (dbSheet && dbSheet.getLastRow() > 1) {
        try {
            const lastDbRow = dbSheet.getLastRow();
            templates = dbSheet.getRange(2, 1, lastDbRow - 1, 6).getValues();
        } catch (e) { }
    }

    // --- 4. Target Identification ---
    const lastRow = sheet.getLastRow();
    if (lastRow < 4) return;

    // Column Config (Ref: LAYOUT_MASTER.md)
    var colOnAir = 1;
    var colType = 3;
    var colTopic = 7;
    var colOutput = 8;
    var colDraft1 = 17;
    var colDraft2 = 18;
    var colDraft3 = 19;
    var colCreate = 21;
    var colHumor = 4; // 仮定：LAYOUT_MASTERにないのでPhoto1と被らないよう配慮が必要だが、既存ロジックが参照しているため。

    var targets = [];
    if (targetRow) {
        if (targetRow < 4) return;
        targets.push(targetRow - 4);
    } else {
        // Range up to colCreate (21)
        var data = sheet.getRange(4, 1, lastRow - 3, colCreate).getValues();
        for (let i = 0; i < data.length; i++) {
            var row = data[i];
            var check = row[colCreate - 1]; // U: Create trigger
            var topic = row[colTopic - 1];  // G: Topic
            var output = row[colOutput - 1]; // H: Output

            if (check === true) {
                targets.push(i);
            } else if (topic && !output && row[colType - 1] !== 'まとめ') {
                targets.push(i);
            }
        }
    }

    if (targets.length === 0) {
        if (!targetRow) {
            try { Browser.msgBox("生成対象が見つかりませんでした。"); } catch (e) { }
        }
        return;
    }

    // --- 5. Generation Loop ---
    var fullData = sheet.getRange(4, 1, lastRow - 3, colCreate).getValues();
    var count = 0;

    for (const dataIndex of targets) {
        try {
            const rowIndex = dataIndex + 4;
            const dataRow = fullData[dataIndex];
            const type = dataRow[colType - 1];
            const humor = dataRow[colHumor - 1];
            const topic = dataRow[colTopic - 1];

            if (!topic) continue;

            sheet.getRange(rowIndex, colOutput).setValue("⏳ AI思考中 (Full Synthesis)...");
            SpreadsheetApp.flush();

            // --- SELECT TEMPLATES ---
            let selectedHook = "";
            let selectedCTA = "";

            if (templates.length > 0) {
                const hooks = templates.filter(r => r[5] === 'HOOK' || (r[1] && String(r[1]).toUpperCase().includes('HOOK')));
                const ctas = templates.filter(r => r[5] === 'CTA' || (r[1] && String(r[1]).toUpperCase().includes('CTA')));

                if (hooks.length > 0) selectedHook = hooks[Math.floor(Math.random() * hooks.length)][3];
                if (ctas.length > 0) selectedCTA = ctas[Math.floor(Math.random() * ctas.length)][3];
            }

            // --- FETCH IMAGES ---
            // D(4), E(5), F(6)
            var imageUrls = [dataRow[3], dataRow[4], dataRow[5]]; // D, E, F
            var encodedImages = [];

            imageUrls.forEach(url => {
                if (url && String(url).startsWith("http")) {
                    var imgData = fetchImageAsBase64(url);
                    if (imgData) encodedImages.push(imgData);
                }
            });

            var imageContextMsg = "";
            if (encodedImages.length > 0) {
                imageContextMsg = `[Visual Context]\nI have attached ${encodedImages.length} image(s) from the post. Please refer to them for visual details (colors, atmosphere, text in image).\n`;
            }

            // --- PROMPT CONSTRUCTION ---
            const prompt = `
[Role Definition (Evolved Persona)]
You are: 
${evolvedPersona}
(Act as this persona fully.)

[Writing Style (Master Style)]
Adopt the following rhetoric style:
${masterStyle || "Professional yet engaging."}

${imageContextMsg}

[Structural Constraints (Template Skeleton)]
Structure the post as follows:
- **Hook**: "${selectedHook || "Catchy opening"}"
- **Body**: Develop the topic using your Persona and Style.
- **CTA**: "${selectedCTA || "Engagement prompt"}"
- **Humor**: ${humor}

[Expert Tips (Techniques)]
Incorporate these applicable techniques if relevant to the topic:
- ${expertTips.slice(0, 1000) || "No specific tips."} (Selected tips)

[Task]
Write a Threads post about: "${topic}".

[Output Format]
Output ONLY the post content.
 ///案1
 (Draft 1)
 ///案2
 (Draft 2)
 ///案3
 (Draft 3)
`;

            const result = callGeminiSafe(apiKey, prompt, encodedImages);

            if (result) {
                const parts = result.split("///").filter(s => s.trim().length > 0);

                let drafts = ["", "", ""];
                parts.forEach((p, idx) => { if (idx < 3) drafts[idx] = p.replace(/^案\d+\s*/, "").trim(); });

                sheet.getRange(rowIndex, colDraft1).setValue(drafts[0]);
                sheet.getRange(rowIndex, colDraft2).setValue(drafts[1]);
                sheet.getRange(rowIndex, colDraft3).setValue(drafts[2]);

                var combinedOutput = `【案1】\n${drafts[0]}\n\n【案2】\n${drafts[1]}\n\n【案3】\n${drafts[2]}`;
                sheet.getRange(rowIndex, colOutput).setValue(combinedOutput);
                // Selector logic removed/simplified
                sheet.getRange(rowIndex, colCreate).setValue(false);
                count++;
            }
        } catch (e) {
            sheet.getRange(dataIndex + 4, colOutput).setValue("Error: " + e.message);
        }
    }

    if (!targetRow && count > 0) {
        try { Browser.msgBox("Completed: " + count + " posts generated."); } catch (e) { }
    }
}

/**
 * Handle onEdit for Board Sheet (Selector)
 */
function handleBoardEdit(e) {
    var sheet = e.source.getActiveSheet();
    var range = e.range;

    // A: ON AIR (1) or Selector (9)
    var col = range.getColumn();
    var rowIndex = range.getRow();

    if (rowIndex < 4) return;

    if (col === 9) {
        var selectorValue = range.getValue(); // "案1", "案2", "案3"
        var content = "";
        if (selectorValue === "案1") {
            content = sheet.getRange(rowIndex, 17).getValue(); // Draft 1 (Q)
        } else if (selectorValue === "案2") {
            content = sheet.getRange(rowIndex, 18).getValue(); // Draft 2 (R)
        } else if (selectorValue === "案3") {
            content = sheet.getRange(rowIndex, 19).getValue(); // Draft 3 (S)
        } else if (selectorValue === "すべて") {
            var d1 = sheet.getRange(rowIndex, 17).getValue();
            var d2 = sheet.getRange(rowIndex, 18).getValue();
            var d3 = sheet.getRange(rowIndex, 19).getValue();
            content = "【案1】\n" + d1 + "\n\n【案2】\n" + d2 + "\n\n【案3】\n" + d3;
        } else {
            return;
        }
        sheet.getRange(rowIndex, 8).setValue(content); // Output (H)
    }
}

/**
 * トリガー: 投稿ボードのチェックボックス監視 (Create) & DNA自動分析
 */
function onBoardEditInstallable(e) {
    if (!e) return;

    // 0. Absolute First Diagnostic (MsgBox)
    // Browser.msgBox("トリガー起動検知！これが出れば設定は成功しています。");

    var range = e.range;
    var sheet = range.getSheet();
    var ss = e.source;
    var sheetName = sheet.getName();
    var col = range.getColumn();
    var row = range.getRow();

    // 1. Reliable Toast using e.source
    try {
        ss.toast("⚡️ 分析・合体トリガー検知 (Sheet: " + sheetName + " / Col: " + col + ")", "System", 3);
    } catch (err) { }

    if (sheetName !== SHEET_BOARD) return;
    if (row < 4) return;

    // 1. Create Checkbox (Column U = 21)
    if (col === 21) {
        if (range.getValue() === true) {
            generatePostsCommon(SHEET_BOARD, row);
            range.setValue(false);
        }
    }

    // 1.5. Auto-Collage Trigger (Columns D, E, F = 4, 5, 6)
    // DISABLED: Moved to Chrome Extension Screenshot Flow (v2.6.5+)
    /*
    if (col >= 4 && col <= 6 && row >= 4) {
        generateRowCollage(sheet, row);
    }
    */

    // 2. DNA Auto-Analysis (Column G = 7)
    if (col === 7 && row >= 4) {
        var val = range.getValue();
        var dna = sheet.getRange(row, 16).getValue(); // Col P
        if (val && String(val).length > 20 && !dna) {
            analyzeSingleRowBoard(sheet, row);
        }
    }
}

/**
 * Stage 1: 複数画像を1枚に合体してシートに配置する
 */
/**
 * Stage 1: 複数画像を1枚に合体してシートに配置する (Production Horizontal Version)
 */
function generateRowCollage(sheet, row) {
    if (row < 4) return;
    console.log("--- Starting Horizontal Collage Generation for Row: " + row + " ---");

    var images = [];
    var imageRange = sheet.getRange(row, 4, 1, 3); // D, E, F
    var vals = imageRange.getValues()[0];
    var formulas = imageRange.getFormulas()[0];

    // Debug Toast
    // SpreadsheetApp.getActive().toast("Scan D-F values: " + JSON.stringify(vals).substring(0, 50), "Debug", 3);

    // 1. Extract URLs
    for (var i = 0; i < 3; i++) {
        var v = vals[i];
        var f = formulas[i];
        var url = "";

        if (typeof v === "string" && v.startsWith("http")) {
            url = v;
        } else if (f && f.toUpperCase().indexOf("IMAGE") !== -1) {
            // Support both "http..." and 'http...'
            var match = f.match(/["'](https?:\/\/[^"']+)["']/i);
            if (match) url = match[1];
        }
        if (url) images.push(url);
    }

    if (images.length === 0) {
        SpreadsheetApp.getActive().toast("⚠️ 画像URLが見つかりません(0件)", "合体プロセス", 5);
        return;
    }

    SpreadsheetApp.getActive().toast("🔍 画像URLを" + images.length + "件検知しました... (D-F: " + row + ")", "合体プロセス", 5);

    try {
        // --- 1. Fetch Blobs ---
        var blobs = [];
        images.forEach((url, idx) => {
            try {
                SpreadsheetApp.getActive().toast((idx + 1) + "枚目の画像を読み込み中...", "合体プロセス", 3);
                var response = UrlFetchApp.fetch(url);
                if (response.getResponseCode() === 200) {
                    blobs.push(response.getBlob());
                }
            } catch (e) {
                console.error("Fetch error: " + e.message);
                SpreadsheetApp.getActive().toast("⚠️ 画像(" + (idx + 1) + ")の取得に失敗: " + e.message, "警告", 5);
            }
        });

        if (blobs.length === 0) {
            SpreadsheetApp.getActive().toast("❌ 有効な画像データを取得できませんでした。", "中止", 5);
            return;
        }

        // --- 2. Create Merged Image (Horizontal) using Google Slides ---
        SpreadsheetApp.getActive().toast("🛠 スライドで合成画像を生成中...", "合体プロセス", 5);
        var tempPresentation = SlidesApp.create("TempCollageH_" + new Date().getTime());
        var presentationId = tempPresentation.getId();
        var slide = tempPresentation.getSlides()[0];
        slide.getShapes().forEach(s => s.remove());

        var pageWidth = tempPresentation.getPageWidth();
        var pageHeight = tempPresentation.getPageHeight();

        var spacing = 10;
        var availableWidth = pageWidth - (spacing * (blobs.length + 1));
        var imgWidth = availableWidth / blobs.length;

        blobs.forEach((blob, idx) => {
            var img = slide.insertImage(blob);
            var ratio = img.getWidth() / img.getHeight();

            var targetW = imgWidth;
            var targetH = targetW / ratio;

            if (targetH > pageHeight - 20) {
                targetH = pageHeight - 20;
                targetW = targetH * ratio;
            }

            img.setWidth(targetW);
            img.setHeight(targetH);
            img.setTop((pageHeight - targetH) / 2);
            img.setLeft(spacing + idx * (imgWidth + spacing));
        });

        tempPresentation.saveAndClose();

        // --- 3. Export Slide as PNG ---
        SpreadsheetApp.getActive().toast("📤 画像として書き出し(PNG)中...", "合体プロセス", 5);
        var exportUrl = "https://docs.google.com/presentation/d/" + presentationId + "/export/png";
        var token = ScriptApp.getOAuthToken();
        var options = { headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true };
        var exportResp = UrlFetchApp.fetch(exportUrl, options);
        if (exportResp.getResponseCode() !== 200) {
            SpreadsheetApp.getActive().toast("❌ スライド変換失敗: " + exportResp.getContentText(), "エラー", 5);
            return;
        }

        var collageBlob = exportResp.getBlob().setName("collage_h_row_" + row + ".png");

        // --- 4. Cleanup Old Images and Insert New (Floating for Blob Access) ---
        SpreadsheetApp.getActive().toast("🖼 シートに貼り付け中...", "合体プロセス", 3);

        // H列(8列目)の対象セルと画像をリセット
        const targetCell = sheet.getRange(row, 8);
        targetCell.setValue("🖼️ READY").setFontColor("#94a3b8").setFontSize(9).setHorizontalAlignment("center");

        sheet.getImages().forEach(img => {
            try {
                let anchor = img.getAnchorCell();
                if (anchor.getRow() === row && anchor.getColumn() === 8) {
                    img.remove();
                }
            } catch (e) { }
        });

        // Insert exactly anchored to (8, row)
        const insertedImg = sheet.insertImage(collageBlob, 8, row);

        // Adjust size to fit row height nicely
        const rowHeight = sheet.getRowHeight(row);
        const sH = insertedImg.getHeight();
        const sW = insertedImg.getWidth();
        const targetH = rowHeight - 4;
        const scale = targetH / sH;

        insertedImg.setWidth(sW * scale);
        insertedImg.setHeight(targetH);
        insertedImg.setTop(insertedImg.getTop() + 2); // Minor vertical centering

        // --- 5. Cleanup Drive ---
        DriveApp.getFileById(presentationId).setTrashed(true);
        SpreadsheetApp.getActive().toast("✅ 合体完了！(" + Math.round(sW * scale) + "x" + targetH + ")", "Threads職人", 5);

    } catch (e) {
        console.error("Horizontal Collage Error: " + e.message);
    }
}

/**
 * 単一行分析ロジック
 */
function analyzeSingleRowBoard(sheet, row) {
    var apiKey = getGeminiApiKey();
    if (!apiKey) return;

    var rawPostCell = sheet.getRange(row, 7); // Col G
    var dnaCell = sheet.getRange(row, 16);     // Col P

    var rawPost = rawPostCell.getValue();
    if (!rawPost) return;

    try {
        dnaCell.setValue("⏳ Analyzing DNA...");
        SpreadsheetApp.flush();

        var result = analyzeDojoTextBoard(apiKey, rawPost, sheet, row);

        if (result.summary) {
            dnaCell.setValue(result.summary);
        }
    } catch (e) {
        dnaCell.setValue("Error: " + e.message);
    }
}


/**
 * AI Analysis logic for the Board (Multimodal)
 */
function analyzeDojoTextBoard(apiKey, rawText, sheet, row) {
    // Fetch Images from row (Col D, E, F -> 4, 5, 6)
    var imageRange = sheet.getRange(row, 4, 1, 3); // D, E, F
    var urls = imageRange.getValues()[0];
    var encodedImages = [];

    urls.forEach(url => {
        if (url && String(url).startsWith("http")) {
            var imgData = fetchImageAsBase64(url);
            if (imgData) encodedImages.push(imgData);
        }
    });

    var prompt = "あなたは世界最高峰のコンテンツ・ストラテジストです。\n" +
        "以下の「SNS投稿」（テキストと添付画像）から、AI生成システムに組み込むための「構造化データ（エッセンス）」を抽出してください。\n\n" +
        "【対象投稿テキスト】\n" + rawText + "\n\n" +
        (encodedImages.length > 0 ? "【添付画像】\n" + encodedImages.length + "枚の画像を添付しました。画像内の文字や視覚的情報も分析に含めてください。\n\n" : "") +
        "【抽出項目】\n" +
        "1. General Rules (心得・戦略・フックの癖)\n" +
        "2. Templates (そのまま使える構文テンプレート)\n" +
        "3. Visual DNA (画像の傾向・構図・文字入れの特徴)\n\n" +
        "必ず以下の形式で簡潔に出力してください。\n" +
        "【DNA要約】\n(ここにルールと型と視覚的特徴をまとめる)";

    var result = callGeminiSafe(apiKey, prompt, encodedImages);
    if (!result) return { summary: "Analysis failed." };

    return { summary: result };
}

/**
 * Handle onSelectionChange for Board Sheet (Auto-Expanding)
 */
function handleBoardSelectionChange(e) {
    var sheet = e.source.getActiveSheet();
    var range = e.range;
    var row = range.getRow();
    var col = range.getColumn();

    // 対象列: G, H, P (7, 8, 16)
    var targetCols = [7, 8, 16];
    var isTarget = (row >= 4 && targetCols.indexOf(col) !== -1);

    var props = PropertiesService.getUserProperties();
    var lastRowKey = 'LAST_EXPANDED_ROW_' + sheet.getSheetId();
    var lastRow = props.getProperty(lastRowKey);

    if (lastRow && parseInt(lastRow) !== row) {
        try {
            if (parseInt(lastRow) > 2) {
                sheet.setRowHeight(parseInt(lastRow), 80);
            }
        } catch (e) { }
        props.deleteProperty(lastRowKey);
    }

    if (isTarget) {
        sheet.setRowHeight(row, 400);
        props.setProperty(lastRowKey, row);
    }
}
