// ==========================================
// 🚀 Threads職人 (Code.js)
// ==========================================

// --- 定数定義 ---
// Moved to Config.js
// const SHEET_BOARD = "投稿作成ボード";
// const SHEET_LAB = "バズ研究所";
// const SHEET_DB = "テンプレートDB";
// const SHEET_SETTINGS = "設定";
// const SHEET_SCHEDULE = "番組表";
// const SHEET_MANUAL = "マニュアル";
// const SHOW_DEV_TOOLS = true;

// Gemini API Key
// Gemini API Key: Retrieved dynamically from getGeminiApiKey()

/**
 * メニュー作成
 */
function onOpen() {
    SpreadsheetApp.getUi().createMenu('🚀 Threads運用メニュー')
        .addItem('【作成】投稿一括生成 (全タイプ)', 'generateUnifiedPosts')
        .addItem('【作成】まとめネタ作成 (選択合体)', 'generateSummaryPost')
        .addItem('【放送】手動放送テスト (今放送すべきものを実行)', 'runBroadcast')
        .addItem('【分析】投稿データ更新 (Metrics)', 'updateMetrics')
        .addSeparator()
        .addItem('【ヒント】表示ON', 'showTips')
        .addItem('【ヒント】表示OFF', 'hideTips')
        .addSeparator()
        .addItem('👁️ ドラフトビューワーを開く', 'showSidebar')
        .addToUi();

    const devMenu = SpreadsheetApp.getUi().createMenu('🤖 Threads職人');

    // User Standard Menu
    devMenu.addItem('【設定】操作マニュアル更新', 'setupManualSheet') // Renamed for clarity
        .addItem('【設定】全体設定シート作成 (リセット)', 'setupSettingsSheet')
        .addItem('【設定】投稿ボード作成 (リセット)', 'setupBoardSheet')
        .addItem('【設定】番組表リセット', 'setupScheduleSheet')
        .addItem('【設定】バズ研究所シート拡張', 'setupLabSheet')
        .addSeparator()
        .addItem('【設定】自動分析トリガー設定', 'setupAllTriggers');

    // Developer Only Menu
    // Check Settings Sheet B20 for "ON" flag
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
 * トリガー機能: 編集時即時反映
 */
function onEdit(e) {
    const sheet = e.source.getActiveSheet();
    const range = e.range;

    // 対象シート: 投稿作成ボード
    if (sheet.getName() !== SHEET_BOARD) return;

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
    // Prevent recursive loop? onEdit doesn't trigger onEdit (usually).
    sheet.getRange(rowIndex, 8).setValue(content);
}

/**
 * トリガー機能: 選択範囲変更時に行の高さを自動調整
 */
function onSelectionChange(e) {
    const sheet = e.source.getActiveSheet();
    if (sheet.getName() !== SHEET_BOARD) return;

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

// setupLabSheet at top moved to Lab.js

// ------------------------------------------
// Board Logic
// ------------------------------------------

/**
 * 【作成】投稿一括生成 (全タイプ)
 */
function generateUnifiedPosts() {
    generatePostsCommon(SHEET_BOARD);
}

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
 * 【設定】自動化トリガー設定 (バズ研究所)
 */
function setupLabTrigger() {
    setupTriggerCommon(SHEET_LAB, "onLabEditInstallable");
}

function setupTriggerCommon(sheetName, functionName) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 既存トリガー削除
    const existing = ScriptApp.getProjectTriggers();
    for (const t of existing) {
        if (t.getHandlerFunction() === functionName) {
            ScriptApp.deleteTrigger(t);
        }
    }

    // 新規作成
    ScriptApp.newTrigger(functionName)
        .forSpreadsheet(ss)
        .onEdit()
        .create();

    Browser.msgBox("自動分析システムを起動しました！");
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

    analyzeSingleRow(sheet, row);
    range.setValue(false);
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
            dnaCell.setValue("✅ Analyzed & Added to DB");
        }
    } catch (e) {
        dnaCell.setValue("Error: " + e.message);
    }
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

            let generatedText = callGemini(apiKey, prompt);
            generatedText = generatedText.replace(/#\S+/g, '').trim();

            sheet.getRange(rowIndex, colDraftsSource).setValue(generatedText);

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
            // error info
        }
    }

    if (count > 0) Browser.msgBox(`${count}件の投稿を生成しました！`);
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
        let text = callGemini(apiKey, prompt);
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
// 4. API & Helper Functions
// ------------------------------------------

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

function callGemini(apiKey, prompt) {
    const model = getGeminiModel();
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };
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
            if (responseCode === 200 && json.candidates && json.candidates.length > 0) {
                return json.candidates[0].content.parts[0].text;
            }
            if ([429, 500, 503].includes(responseCode)) {
                Utilities.sleep(1000 * Math.pow(2, attempt));
                attempt++;
                continue;
            }
            throw new Error(`Gemini Error (${responseCode})`);
        } catch (e) {
            if (attempt === maxRetries - 1) throw e;
            Utilities.sleep(1000);
            attempt++;
        }
    }
}

/**
 * 【設定】番組表リセット
 */
function setupScheduleSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = SHEET_SCHEDULE;
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
        sheet = ss.insertSheet(sheetName);
    }
    sheet.clear();
    sheet.getRange("A:I").clearDataValidations();

    // Description
    sheet.setColumnWidth(1, 250);
    sheet.getRange("A1").setValue("【番組表の使い方】");
    sheet.getRange("A1").setFontWeight("bold").setBackground("#fff2cc");
    const guideText = "1. 投稿ボードで放送したいネタの「ON AIR」にチェック\n2. この表で「放送タイプ」を指定\n3. 時間になると自動放送";
    sheet.getRange("A2").setValue(guideText);
    sheet.getRange("A2:A11").merge();
    sheet.getRange("A2:A11").setBackground("#fff2cc").setVerticalAlignment("top").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);

    // Headers
    const days = ["Mon (月)", "Tue (火)", "Wed (水)", "Thu (木)", "Fri (金)", "Sat (土)", "Sun (日)"];
    sheet.getRange("C1:I1").setValues([days]);
    sheet.getRange("B1").setValue("Time");
    sheet.getRange("B1:I1").setBackground("#4a86e8").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");

    // Time Slots
    const timeOptions = [];
    for (let h = 6; h <= 23; h++) {
        timeOptions.push(`${("0" + h).slice(-2)}:00`);
        timeOptions.push(`${("0" + h).slice(-2)}:30`);
    }
    const timeRule = SpreadsheetApp.newDataValidation().requireValueInList(timeOptions, true).build();
    sheet.getRange("B2:B11").setDataValidation(timeRule);
    const sampleTimes = [["08:00"], ["10:00"], ["12:00"], ["15:00"], ["18:00"], ["19:00"], ["20:00"], ["21:00"], ["22:00"], ["23:00"]];
    sheet.getRange("B2:B11").setValues(sampleTimes);

    // Content Grid
    const ruleGenre = SpreadsheetApp.newDataValidation()
        .requireValueInList(["単品", "日常", "有益", "まとめ", "Free", "議論", "実体験", "自己紹介", "Promotion"], true)
        .setAllowInvalid(false).build();
    sheet.getRange("C2:I11").setDataValidation(ruleGenre);
    sheet.setColumnWidth(2, 80);
    for (let c = 3; c <= 9; c++) sheet.setColumnWidth(c, 100);
    sheet.getRange("B1:I11").setBorder(true, true, true, true, true, true, "#cccccc", SpreadsheetApp.BorderStyle.SOLID);

    Browser.msgBox("番組表をリニューアルしました！");
}

/**
 * 【設定】マニュアル作成
 */
function setupManualSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = SHEET_MANUAL;
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
        sheet = ss.insertSheet(sheetName);
    }
    sheet.clear();

    sheet.getRange("A1").setValue("📘 Threads職人 運用マニュアル (v2.0)");
    sheet.getRange("A1").setFontSize(16).setFontWeight("bold").setFontColor("#1e3a8a");
    sheet.getRange("A2").setValue("このシステムは、あなたの投稿を管理し、最強のAIパートナーとして進化し続ける運用ツールです。");

    // Sheet Guides etc... (Simplified for brevity as this function is cosmetic)
    // Preserving main setup instructions
    sheet.getRange("A4").setValue("⚙️ 初期設定");
    sheet.getRange("A4").setFontSize(12).setFontWeight("bold");

    sheet.getRange("B6").setValue("1. Config Sheet (【設定】シート) を開いてください。");
    sheet.getRange("B7").setValue("2. API Key, User ID を入力してください。");
    sheet.getRange("B8").setValue("3. バズ研究所で「トリガー設定」を実行してください。");

    Browser.msgBox("マニュアルシートを更新しました！");
}

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

/**
 * 【設定】全体設定シート作成
 */
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
    const ruleModel = SpreadsheetApp.newDataValidation().requireValueInList(["gemini-2.5-flash", "gemini-1.5-pro"], true).build();
    sheet.getRange("B5").setDataValidation(ruleModel).setValue(existingModel || "gemini-2.5-flash");

    sheet.getRange("A6").setValue("Basic Profile (Persona)");
    sheet.getRange("B6").setValue(existingPersona || "ここにプロフィールを入力");

    sheet.getRange("A7").setValue("【以下、AI自動管理エリア】");
    sheet.getRange("A7").setFontWeight("bold").setBackground("#e6b8af");

    sheet.getRange("A8").setValue("Manual Rules (心得)");
    sheet.getRange("A9").setValue("Master DNA (Grimoire)");

    Browser.msgBox("設定シートをリセットしました！");
}

function isDevMode() {
    return SHOW_DEV_TOOLS;
}

/**
 * 【開発】モデル診断
 * 利用可能なモデル一覧を取得して表示する
 */
// function debugListModels() { ... } // Defined above
// Note: debugListModels was defined above in Part A logic. 
// I moved it up in this construction.

// targetConnection
function testConnection() {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        Browser.msgBox("API Key Missing");
        return;
    }
    // Simple test
    try {
        const res = callGemini(apiKey, "Hi");
        Browser.msgBox("Success: " + res);
    } catch (e) {
        Browser.msgBox("Error: " + e.message);
    }
}

function setupAllTriggers() {
    setupTriggerCommon(SHEET_LAB, "onLabEditInstallable");
    setupTriggerCommon(SHEET_BOARD, "onBoardEditInstallable");
    Browser.msgBox("自動化トリガーを設定しました！");
}
