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

    // 0. 設定読み込み
    const settings = sheet.getRange("A1").getValue();
    let persona = "30代女性インフルエンサー。";

    // 0.5 Master DNA & Manual Rules
    let grimoireText = "";
    let manualRules = "";
    try {
        const setSheet = ss.getSheetByName(SHEET_SETTINGS);
        if (setSheet) {
            const userPersona = setSheet.getRange("B6").getValue();
            if (userPersona && String(userPersona).length > 2) persona = userPersona;
            grimoireText = setSheet.getRange("B9").getValue();
            const b8 = setSheet.getRange("B8").getValue();
            if (b8 && String(b8).length > 5) manualRules = b8;
        }
    } catch (e) { }

    // 1. リソース取得 (Lab Data)
    let labData = [];
    if (labSheet && labSheet.getLastRow() > 1) {
        try {
            const lastLabRow = labSheet.getLastRow();
            labData = labSheet.getRange(2, 1, lastLabRow - 1, 5).getValues();
        } catch (e) { }
    }

    // 2. ターゲット特定
    const lastRow = sheet.getLastRow();
    if (lastRow < 3) return;

    // Column Config
    const colCreate = 1;
    const colType = 4;
    const colHumor = 5;
    const colTopic = 6;
    const colOutput = 8;
    const colSelector = 9;
    const colDraftsSource = 17; // Q
    const colDraft1 = 18; // R
    const colDraft2 = 19; // S
    const colDraft3 = 20; // T

    let targets = [];

    if (targetRow) {
        if (targetRow < 3) return;
        targets.push(targetRow - 3);
    } else {
        const data = sheet.getRange(3, 1, lastRow - 2, 14).getValues();
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const createCheck = row[colCreate - 1]; // Col A
            const topic = row[colTopic - 1];
            const output = row[colOutput - 1];

            if (createCheck === true) {
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

    // 3. 生成ループ
    const fullData = sheet.getRange(3, 1, lastRow - 2, 14).getValues();

    let count = 0;
    for (const dataIndex of targets) {
        try {
            const rowIndex = dataIndex + 3;
            const dataRow = fullData[dataIndex];

            const type = dataRow[colType - 1];
            const humor = dataRow[colHumor - 1];
            const topic = dataRow[colTopic - 1];
            if (!topic) {
                throw new Error("Error: Topic is empty. Please enter a topic.");
            }
            if (!topic) {
                throw new Error("Error: Topic is empty. Please enter a topic.");
            }

            // DNA Selection
            let dnaContext = "";
            let usingGrimoire = false;

            if (grimoireText && String(grimoireText).length > 50) {
                usingGrimoire = true;
                dnaContext = grimoireText;
                if (count === 0 && !targetRow) {
                    Browser.msgBox(`【📖 魔導書モード発動】\n最強のスキルリスト(Master DNA)から、3つのアプローチを提案します。`);
                }
            } else if (labData.length > 0) {
                // Fallback Logic
                let candidates = labData
                    .filter(r => r[1] === type && r[4])
                    .map(r => r[4]);

                if (candidates.length === 0) {
                    candidates = labData.map(r => r[4]).filter(String);
                }

                if (candidates.length > 0) {
                    const randomDNA = candidates[Math.floor(Math.random() * candidates.length)];
                    dnaContext = `【今回の投稿スタイル】\n${randomDNA}\n`;
                }
            }

            // --- Dynamic Prompt Switching ---
            let typeInstruction = "";
            let toneInstruction = "";
            let lengthInstruction = "";

            switch (type) {
                case "単品":
                    typeInstruction = `【Type: 単品紹介】\n目的: アフィリエイト誘導や商品への興味喚起。短く、勢いで読ませる。`;
                    lengthInstruction = `文字数: 140文字程度。短文推奨。`;
                    break;
                case "日常":
                    typeInstruction = `【Type: 日常ツイート】\n目的: フォロワーとの共感、エンゲージメント。何気ないエピソードから感情を引き出す。`;
                    lengthInstruction = `文字数: 200〜300文字。`;
                    break;
                case "有益":
                    typeInstruction = `【Type: 有益情報】\n目的: 「保存」や「シェア」。役立つ知識やノウハウ。`;
                    lengthInstruction = `文字数: **300文字以内**。`;
                    break;
                case "自己紹介":
                    lengthInstruction = "文字数: 長文OKだが、読ませる工夫が必須。";
                    typeInstruction = "【Type: 自己紹介】\n目的: ファン化を促進するストーリーテリング。";
                    break;
                case "Free":
                    typeInstruction = `【Type: Free (推敲・微調整)】\n目的: プロの視点で「読みやすく」「魅力的」に磨き上げる。`;
                    lengthInstruction = `文字数: 原文の意図を損なわない範囲で調整。`;
                    break;
                default:
                    typeInstruction = `【Type: 一般投稿】`;
                    lengthInstruction = `文字数: 200文字程度。`;
            }

            // Humor Handling
            let humorInstruction = "";
            if (humor === "Lv3: 全力") {
                humorInstruction = `【ユーモア: 爆笑・自虐】\n読者を笑わせる強いスパイス。自虐や誇張を恐れない。`;
            } else if (humor === "Lv1: 控えめ") {
                humorInstruction = `【ユーモア: 安心・知的】\nクスッとした笑いと安心感。知的でウィットに富んだ表現。`;
            } else {
                humorInstruction = `【ユーモア: 共感・スパイス】\n「あるある」と共感できる程よい温度感。`;
            }

            // DNA Override
            if (usingGrimoire) {
                toneInstruction = "";
                typeInstruction += "\\nIMPORTANT: 【Master DNA Grimoire】から、このネタに適したスキルを**3つ**選択し、その構文・文体をトレースしてください。";
            } else if (dnaContext) {
                typeInstruction += "\nIMPORTANT: 【投稿スタイル(設計図)】の構成とリズムを完全再現してください。";
            }

            const formatInstruction = `
【出力形式 (区切り文字を使用)】
以下の「///」を区切り文字として、3つの案を出力してください。
///案1
(案1の本文)
///案2
(案2の本文)
///案3
(案3の本文)
`;

            const prompt = `
あなたはThreadsの人気インフルエンサーです。
以下の「ネタ」から、指定されたTypeに合わせて投稿を作成してください。
${formatInstruction}

【入力ネタ】
${topic}

【基本設定】
${persona}

【Type指示】
${typeInstruction}
${lengthInstruction}
${toneInstruction}

【ユーモア指示】
${humorInstruction}

${dnaContext || ""} 

【追加ルール】
${manualRules ? "参考にしているマニュアルからの重要心得:\n" + manualRules : ""}

【指示】
- ハッシュタグは**一切禁止** (Threadsの仕様)。
- 出力は**投稿本文のみ** (解説不要)。
`;

            sheet.getRange(rowIndex, colOutput).setValue("⏳ AI執筆中... (3案を作成しています)");
            SpreadsheetApp.flush();

            let generatedText = callGeminiSafe(apiKey, prompt);
            if (!generatedText) {
                throw new Error("No response (blocked or empty).");
            }
            generatedText = generatedText.replace(/#\S+/g, '').trim();

            // Parsing
            let drafts = ["", "", ""];
            const parts = generatedText.split("///");
            let dIndex = 0;
            for (let p of parts) {
                let clean = p.replace(/^案\d+\s*/, "").trim();
                if (clean) {
                    if (dIndex < 3) drafts[dIndex] = clean;
                    dIndex++;
                }
            }

            sheet.getRange(rowIndex, colDraft1).setValue(drafts[0]);
            sheet.getRange(rowIndex, colDraft2).setValue(drafts[1]);
            sheet.getRange(rowIndex, colDraft3).setValue(drafts[2]);

            const combinedOutput = `【案1】\n${drafts[0]}\n\n【案2】\n${drafts[1]}\n\n【案3】\n${drafts[2]}`;
            sheet.getRange(rowIndex, colSelector).setValue("すべて");
            sheet.getRange(rowIndex, colOutput).setValue(combinedOutput);

            count++;
            Utilities.sleep(1000);

        } catch (e) {
            sheet.getRange(dataIndex + 3, colOutput).setValue("Error: " + e.message);
        }
    }

    if (count > 0) Browser.msgBox(`${count}件の投稿を生成しました！`);
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
