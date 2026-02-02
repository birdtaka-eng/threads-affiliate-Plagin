/**
 * Board.js
 * 投稿作成ボード (Content Factory) 関連のロジック
 */

/**
 * 【設定】投稿ボード作成 (リセット)
 */
function setupBoardSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = SHEET_BOARD;
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
        sheet = ss.insertSheet(sheetName);
    }

    // 1. クリーニング
    sheet.getRange("A1:T1000").clear();
    sheet.getRange("A1:T1000").clearDataValidations();
    sheet.getRange("A1:T1000").clearFormat();

    // 2. ヘッダー (1行目)
    const headers = [
        ["🚀 Create", "ON AIR", "No", "Type", "Humor", "Topic (ネタ/メモ)", "Assets (画像/URL)", "Output (決定稿)", "Selector", "System ID", "👁️ Views", "❤️ Likes", "💬 Replies", "🔁 Reposts", "📊 Rate", "📝 Judge", "Drafts Source", "Draft 1", "Draft 2", "Draft 3"]
    ];

    sheet.getRange("A1:T1").setValues(headers);
    sheet.getRange("A1:T1").setBackground("#ffe599"); // Yellow
    sheet.getRange("A1:T1").setFontWeight("bold");
    sheet.getRange("A1:T1").setHorizontalAlignment("center");

    // 3. ガイド行 (2行目)
    const guides = [
        "チェックボックス", "チェックボックス", "No", "↓Type", "↓Humor",
        "【ネタ】ここに書きたいことを入力\n（例：今日は疲れた...）",
        "【画像】URLやメモ",
        "←ここにAIが書いた文章が出ます",
        "←表示切替",
        "⛔ ID(触らない)", "閲覧数", "いいね", "返信", "引用/再投稿", "反応率", "判定",
        "", "", "", ""
    ];
    sheet.getRange("A2:T2").setValues([guides]);
    sheet.getRange("A2:T2").setBackground("#f3f3f3").setFontColor("#666666").setFontSize(9).setVerticalAlignment("top").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    sheet.setRowHeight(2, 60);

    // 4. データエリア設定 (3行目以降)
    sheet.getRange("A3:T1000").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    sheet.getRange("A3:T1000").setVerticalAlignment("top");
    sheet.setRowHeight(1, 40);
    sheet.setFrozenRows(2);

    // 5. バリデーション & 幅調整
    // A: Create Checkbox
    const checkboxCreate = SpreadsheetApp.newDataValidation().requireCheckbox().build();
    sheet.getRange("A3:A100").setDataValidation(checkboxCreate);

    // B: ON AIR Checkbox
    const checkboxOnAir = SpreadsheetApp.newDataValidation().requireCheckbox().build();
    sheet.getRange("B3:B100").setDataValidation(checkboxOnAir);

    // D: Type Rule
    const ruleType = SpreadsheetApp.newDataValidation()
        .requireValueInList(["単品", "日常", "有益", "自己紹介", "Free", "まとめ"], true)
        .setAllowInvalid(false).build();
    sheet.getRange("D3:D100").setDataValidation(ruleType);

    // E: Humor Rule
    const ruleHumor = SpreadsheetApp.newDataValidation()
        .requireValueInList(["Lv1: 控えめ", "Lv2: 標準", "Lv3: 全力"], true)
        .setAllowInvalid(false).build();
    sheet.getRange("E3:E100").setDataValidation(ruleHumor);

    // I: Selector Rule
    const selectorRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['すべて', '案1', '案2', '案3'], true).build();
    sheet.getRange("I3:I100").setDataValidation(selectorRule);

    // Widths
    sheet.setColumnWidth(1, 60);  // Create
    sheet.setColumnWidth(2, 60);  // ON AIR
    sheet.setColumnWidth(3, 40);  // No
    sheet.setColumnWidth(4, 80);  // Type
    sheet.setColumnWidth(5, 80);  // Humor
    sheet.setColumnWidth(6, 300); // Topic
    sheet.setColumnWidth(7, 100); // Assets
    sheet.setColumnWidth(8, 400); // Output
    sheet.setColumnWidth(9, 80); // Selector
    sheet.setColumnWidth(10, 50); // System ID

    // Metrics Widths
    sheet.setColumnWidth(11, 60); // Views
    sheet.setColumnWidth(12, 60); // Likes
    sheet.setColumnWidth(13, 60); // Replies
    sheet.setColumnWidth(14, 60); // Reposts
    sheet.setColumnWidth(15, 60); // Rate
    sheet.setColumnWidth(16, 60); // Judge

    // Hide Drafts
    sheet.hideColumns(17, 4); // Q, R, S, T

    Browser.msgBox(`シート「${sheetName}」を放送局仕様(v3.2)にアップデートしました。`);
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
    if (!apiKey) { Browser.msgBox("API Key Missing"); return; }

    const lastRow = sheet.getLastRow();
    if (lastRow < 4) { Browser.msgBox("データがありません。"); return; }

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
        Browser.msgBox(`選択数は2～5個にしてください。\n現在の選択数: ${selectedContents.length}`);
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

        Browser.msgBox("まとめ投稿を作成しました！");
    } catch (e) {
        Browser.msgBox("エラー: " + e.message);
    }
}

/**
 * 放送実行 (Manual Broadcast) (Placeholder)
 */
function runBroadcast() {
    Browser.msgBox("放送機能はまだ実装されていません（スケジュールシート連携予定）");
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
        Browser.msgBox("API設定が見つかりません。");
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
    Browser.msgBox(`${updateCount}件の投稿データを更新しました。`);
}

/**
 * 共通記事生成ロジック (Unified Factory)
 */
function generatePostsCommon(sheetName, targetRow) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    const labSheet = ss.getSheetByName(SHEET_LAB);

    if (!sheet) {
        Browser.msgBox(`シート「${sheetName}」が見つかりません。`);
        return;
    }

    let apiKey = getGeminiApiKey();
    if (!apiKey) {
        if (!targetRow) Browser.msgBox("API Key Missing");
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
    if (dbSheet && dbSheet.getLastRow() > 1) {
        try {
            const lastDbRow = dbSheet.getLastRow();
            templates = dbSheet.getRange(2, 1, lastDbRow - 1, 6).getValues();
        } catch (e) { }
    }

    // --- 4. Target Identification ---
    const lastRow = sheet.getLastRow();
    if (lastRow < 3) return;

    // Column Config
    const colCreate = 1;
    const colType = 4;
    const colHumor = 5;
    const colTopic = 6;
    const colOutput = 8;
    const colDraft1 = 18;
    const colDraft2 = 19;
    const colDraft3 = 20;

    let targets = [];
    if (targetRow) {
        if (targetRow < 3) return;
        targets.push(targetRow - 3);
    } else {
        const data = sheet.getRange(3, 1, lastRow - 2, 8).getValues();
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const check = row[colCreate - 1];
            const topic = row[colTopic - 1];
            const output = row[colOutput - 1];

            if (check === true) {
                targets.push(i);
            } else if (topic && !output && row[colType - 1] !== 'まとめ') {
                targets.push(i);
            }
        }
    }

    if (targets.length === 0) {
        if (!targetRow) Browser.msgBox("生成対象が見つかりませんでした。");
        return;
    }

    // --- 5. Generation Loop ---
    const fullData = sheet.getRange(3, 1, lastRow - 2, 8).getValues();
    let count = 0;

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

                const combinedOutput = `【案1】\n${drafts[0]}\n\n【案2】\n${drafts[1]}\n\n【案3】\n${drafts[2]}`;
                sheet.getRange(rowIndex, colOutput).setValue(combinedOutput);
                sheet.getRange(rowIndex, 9).setValue("すべて");
                sheet.getRange(rowIndex, colCreate).setValue(false);
                count++;
            }
        } catch (e) {
            sheet.getRange(dataIndex + 3, colOutput).setValue("Error: " + e.message);
        }
    }

    if (!targetRow && count > 0) Browser.msgBox(`Completed: ${count} posts generated.`);
}

/**
 * Handle onEdit for Board Sheet
 */
function handleBoardEdit(e) {
    const sheet = e.source.getActiveSheet();
    const range = e.range;

    // 対象列: H列 (Selector) (9列目)
    if (range.getColumn() !== 9 || range.getRow() < 3) return;

    const selectorValue = range.getValue(); // "案1", "案2", "案3"
    const rowIndex = range.getRow();

    let content = "";
    if (selectorValue === "案1") {
        content = sheet.getRange(rowIndex, 18).getValue(); // Draft 1 (R)
    } else if (selectorValue === "案2") {
        content = sheet.getRange(rowIndex, 19).getValue(); // Draft 2 (S)
    } else if (selectorValue === "案3") {
        content = sheet.getRange(rowIndex, 20).getValue(); // Draft 3 (T)
    } else if (selectorValue === "すべて") {
        const d1 = sheet.getRange(rowIndex, 18).getValue();
        const d2 = sheet.getRange(rowIndex, 19).getValue();
        const d3 = sheet.getRange(rowIndex, 20).getValue();
        content = `【案1】\n${d1}\n\n【案2】\n${d2}\n\n【案3】\n${d3}`;
    } else {
        return; // Do nothing
    }

    // Output列 (H=8) に書き込み
    sheet.getRange(rowIndex, 8).setValue(content);
}

/**
 * トリガー: 投稿ボードのチェックボックス監視 (Auto Run)
 */
function onBoardEditInstallable(e) {
    if (!e) return;
    const range = e.range;
    const sheet = range.getSheet();

    if (sheet.getName() !== SHEET_BOARD) return;

    // Col 1 (Create Checkbox) ?
    if (range.getColumn() !== 1 || range.getRow() < 3) return;

    if (range.getValue() === true) {
        // Run generation for this row
        generatePostsCommon(SHEET_BOARD, range.getRow());
        // Uncheck
        range.setValue(false);
    }
}

/**
 * Handle onSelectionChange for Board Sheet
 */
function handleBoardSelectionChange(e) {
    const sheet = e.source.getActiveSheet();
    const range = e.range;
    const row = range.getRow();
    const col = range.getColumn();

    // 対象列: H(8), O(15), P(16), Q(17)
    const targetCols = [8, 15, 16, 17];
    // Ignore Header(1) & Guide(2) -> Start from 3
    const isTarget = (row >= 3 && targetCols.includes(col));

    // ユーザープロパティを使って前回の行を記憶
    const props = PropertiesService.getUserProperties();
    const lastRowKey = 'LAST_EXPANDED_ROW_' + sheet.getSheetId();
    const lastRow = props.getProperty(lastRowKey);

    // 1. 前回の行を元に戻す (今回が違う行の場合)
    if (lastRow && parseInt(lastRow) !== row) {
        try {
            // デフォルトの高さ (80px) に戻す
            if (parseInt(lastRow) > 2) {
                sheet.setRowHeight(parseInt(lastRow), 80);
            }
        } catch (e) { }
        props.deleteProperty(lastRowKey);
    }

    // 2. 今回の行を拡大する (対象列の場合)
    if (isTarget) {
        // 読みやすい高さに設定 (400px)
        sheet.setRowHeight(row, 400);
        props.setProperty(lastRowKey, row);
    }
}
