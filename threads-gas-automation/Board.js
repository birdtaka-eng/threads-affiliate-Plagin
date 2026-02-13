/**
 * Board.js
 * 投稿作成ボード (Content Factory) 関連のロジック
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

    // 2. ヘッダー (1行目)
    // A: ON AIR, B: No, C: Type, D: Photo 1, E: Photo 2, F: Photo 3, G: Topic, H: Output, I: System ID, J: Views, K: Likes, L: Replies, M: Reposts, N: Rate, O: Judge, P: DNA
    var headers = [
        ["ON AIR", "No", "Type", "Photo 1", "Photo 2", "Photo 3", "Assets (ネタ/URL)", "Output (決定稿)", "System ID", "👁️ Views", "❤️ Likes", "💬 Replies", "🔁 Reposts", "📊 Rate", "📝 Judge", "DNA (分析)", "Drafts Source", "Draft 1", "Draft 2", "Draft 3", "🚀 Create"]
    ];

    sheet.getRange("A1:U1").setValues(headers);
    sheet.getRange("A1:U1").setBackground("#ffe599"); // Yellow
    sheet.getRange("A1:U1").setFontWeight("bold");
    sheet.getRange("A1:U1").setHorizontalAlignment("center");

    // 3. ガイド行 (2行目)
    var guides = [
        "チェックボックス", "No", "↓Type", "[Auto1]", "[Auto2]", "[Auto3]",
        "【ネタ】ここに書きたいことを入力\n（例：今日は疲れた...）",
        "←ここにAIが書いた文章が出ます",
        "⛔ ID", "閲覧数", "いいね", "返信", "引用/再投稿", "反応率", "判定",
        "←ここにAI分析結果が出ます",
        "", "", "", "", "チェックで生成"
    ];
    sheet.getRange("A2:U2").setValues([guides]);
    sheet.getRange("A2:U2").setBackground("#f3f3f3").setFontColor("#666666").setFontSize(9).setVerticalAlignment("top").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    sheet.setRowHeight(2, 60);

    // 4. データエリア設定 (3行目以降)
    sheet.getRange("A3:U1000").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    sheet.getRange("A3:U1000").setVerticalAlignment("top");
    sheet.setRowHeight(1, 40);
    sheet.setFrozenRows(2);

    // 5. バリデーション & 幅調整
    // A: ON AIR Checkbox
    var checkboxOnAir = SpreadsheetApp.newDataValidation().requireCheckbox().build();
    sheet.getRange("A3:A100").setDataValidation(checkboxOnAir);

    // U: Create Checkbox
    var checkboxCreate = SpreadsheetApp.newDataValidation().requireCheckbox().build();
    sheet.getRange("U3:U100").setDataValidation(checkboxCreate);

    // C: Type Rule
    var ruleType = SpreadsheetApp.newDataValidation()
        .requireValueInList(["単品", "日常", "有益", "自己紹介", "Free", "まとめ"], true)
        .setAllowInvalid(false).build();
    sheet.getRange("C3:C100").setDataValidation(ruleType);

    // Widths
    sheet.setColumnWidth(1, 60);  // ON AIR
    sheet.setColumnWidth(2, 40);  // No
    sheet.setColumnWidth(3, 80);  // Type
    sheet.setColumnWidth(4, 100); // Photo 1
    sheet.setColumnWidth(5, 100); // Photo 2
    sheet.setColumnWidth(6, 100); // Photo 3
    sheet.setColumnWidth(7, 300); // Topic
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
        Browser.msgBox("投稿作成ボード(統合版)の準備ができました！\nD・E・F列に画像、P列に分析結果が集約されます。");
    } catch (e) {
        // API実行時はスキップ
        console.log("Setup completed (Headless mode)");
    }
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
    if (lastRow < 4) {
        try { Browser.msgBox("データがありません。"); } catch (e) { }
        return;
    }

    const range = sheet.getRange(4, 1, lastRow - 3, 7);
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
    if (lastRow < 3) return;

    const range = boardSheet.getRange(3, 1, lastRow - 2, 16);
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

                const targetRow = i + 3;
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
    if (lastRow < 3) return;

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
        if (targetRow < 3) return;
        targets.push(targetRow - 3);
    } else {
        // Range up to colCreate (21)
        var data = sheet.getRange(3, 1, lastRow - 2, colCreate).getValues();
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
    var fullData = sheet.getRange(3, 1, lastRow - 2, colCreate).getValues();
    var count = 0;

    for (const dataIndex of targets) {
        try {
            const rowIndex = dataIndex + 3;
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

            // --- PROMPT CONSTRUCTION ---
            const prompt = `
[Role Definition (Evolved Persona)]
You are: 
${evolvedPersona}
(Act as this persona fully.)

[Writing Style (Master Style)]
Adopt the following rhythm and rhetoric style:
${masterStyle || "Professional yet engaging."}

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

            const result = callGeminiSafe(apiKey, prompt);

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
            sheet.getRange(dataIndex + 3, colOutput).setValue("Error: " + e.message);
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

    if (rowIndex < 3) return;

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
    var range = e.range;
    var sheet = range.getSheet();
    if (sheet.getName() !== SHEET_BOARD) return;

    var col = range.getColumn();
    var row = range.getRow();
    if (row < 3) return;

    // 1. Create Checkbox (Column U = 21)
    if (col === 21) {
        if (range.getValue() === true) {
            generatePostsCommon(SHEET_BOARD, row);
            range.setValue(false);
        }
    }

    // 2. DNA Auto-Analysis (Column G = 7)
    if (col === 7) {
        var val = range.getValue();
        var dna = sheet.getRange(row, 16).getValue(); // Col P
        if (val && String(val).length > 20 && !dna) {
            analyzeSingleRowBoard(sheet, row);
        }
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

        var result = analyzeDojoTextBoard(apiKey, rawPost, sheet.getParent());

        if (result.summary) {
            dnaCell.setValue(result.summary);
        }
    } catch (e) {
        dnaCell.setValue("Error: " + e.message);
    }
}

/**
 * AI Analysis logic for the Board
 */
function analyzeDojoTextBoard(apiKey, rawText, ss) {
    var prompt = "あなたは世界最高峰のコンテンツ・ストラテジストです。\n" +
        "以下の「SNS投稿」から、AI生成システムに組み込むための「構造化データ（エッセンス）」を抽出してください。\n\n" +
        "【対象投稿】\n" + rawText + "\n\n" +
        "【抽出項目】\n" +
        "1. General Rules (心得・戦略・フックの癖)\n" +
        "2. Templates (そのまま使える構文テンプレート)\n\n" +
        "必ず以下の形式で簡潔に出力してください。\n" +
        "【DNA要約】\n(ここにルールと型をまとめる)";

    var result = callGeminiSafe(apiKey, prompt);
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
    var isTarget = (row >= 3 && targetCols.indexOf(col) !== -1);

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
