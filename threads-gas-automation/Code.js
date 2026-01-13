// ==========================================
// 🚀 Threads職人 (Code.js)
// ==========================================

// --- 定数定義 ---
const SHEET_SINGLE = "単品投稿ファクトリー";
const SHEET_DAILY_USEFUL = "日常有益投稿";
const SHEET_LAB = "バズ研究所";
const SHEET_DB = "テンプレートDB";
const SHEET_SETTINGS = "設定"; // Added Settings sheet
const SHEET_STOCK = "投稿リスト";

// Gemini API Key (本来はプロパティストア推奨だが、ユーザー環境に合わせて変数定義)
// 注: ユーザーはスクリプトプロパティまたは直接コードにキーを設定する必要があります。
// ここでは以前のコンテキストでキーがコード内にあった場合のプレースホルダーとします。
const API_KEY = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY") || "YOUR_API_KEY_HERE";

/**
 * メニュー作成
 */
function onOpen() {
    SpreadsheetApp.getUi().createMenu('無限放送局')
        .addItem('【単品】AI記事生成 (1案執筆)', 'generateSinglePosts')
        .addItem('【単品】倉庫へ出荷', 'shipSingleToStock')
        .addSeparator()
        .addItem('【日常有益】AI記事生成', 'generateDailyUsefulPosts')
        .addItem('【日常有益】倉庫へ出荷', 'shipDailyToStock') // Added
        .addSeparator()
        .addItem('【研究所】スタイル分析 (DNA抽出)', 'runLabAnalysis')
        .addSeparator()
        .addItem('【番組表】今すぐ放送 (手動テスト)', 'forceBroadcastTest')
        .addItem('【設定】自動運転ON (15分トリガー)', 'setupTrigger')
        .addItem('【分析】投稿成績を更新 (全インサイト)', 'updateMetrics')
        .addItem('【進化】表現力を進化させる (B6更新)', 'evolveStyle')
        .addToUi();

    SpreadsheetApp.getUi().createMenu('🤖 Threads職人')
        .addItem('【設定】APIキー登録', 'setupApiKey')
        .addItem('【設定】単品シート修復', 'setupFactorySheet')
        .addItem('【設定】日常有益シート修復', 'setupDailyUsefulSheet')
        .addItem('【設定】番組表シート修復', 'setupScheduleSheet')
        .addItem('【開発用】DB構築 (魔法の杖)', 'setupTemplateDatabase')
        .addItem('【診断】使えるモデル一覧を表示', 'debugListModels')
        .addToUi();
}

/**
 * 【設定】日常有益シート修復
 */
function setupDailyUsefulSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = SHEET_DAILY_USEFUL;
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
        sheet = ss.insertSheet(sheetName);
    }

    // 1. 強力なクリーニング
    sheet.getRange("A1:G1000").clear();
    sheet.getRange("A1:G1000").clearDataValidations();
    sheet.getRange("A1:G1000").clearFormat();

    // 2. プロンプトエリア (1行目: A1:F1結合)
    const promptRange = sheet.getRange("A1:F1");
    promptRange.merge();

    const defaultPrompt =
        `- **ターゲット**: 30代前後の女性\n` +
        `- **共通ルール**: 親近感がありつつ、ためになる情報や共感できる日常を発信。\n` +
        `- **有益ネタの場合**: 「へぇ〜」と思わせる知識やライフハック。聞いた話でもOK。\n` +
        `- **日常ネタの場合**: 人柄が伝わるエピソード。共感を呼ぶ書き方。\n` +
        `- **リンク無しの場合**: 写真メインで、売り込み感ゼロの純粋な投稿。`;

    promptRange.setValue(defaultPrompt);
    promptRange.setBackground("#d0e0e3"); // 薄青
    promptRange.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP); // 折り返し
    promptRange.setVerticalAlignment("top");
    promptRange.setFontSize(10);
    sheet.setRowHeight(1, 100);

    // 3. コントロールボタンエリア (G1:H1)
    // ※ GASではボタン描画は難しいので、セルに文字を入れておく
    sheet.getRange("G1").setValue("📢 生成ボタンは\nメニューから実行");
    sheet.getRange("G1").setBackground("#ea9999");
    sheet.getRange("G1").setFontWeight("bold");
    sheet.getRange("G1").setHorizontalAlignment("center");
    sheet.getRange("G1").setVerticalAlignment("middle");

    // 4. ヘッダー行 (3行目)
    const headers = [
        ["No", "Type", "Topic (ネタ/メモ)", "Output (生成本文)", "Image URL (任意)", "Status", "Date"]
    ];
    sheet.getRange("A3:G3").setValues(headers);
    sheet.getRange("A3:G3").setBackground("#cfe2f3");
    sheet.getRange("A3:G3").setFontWeight("bold");
    sheet.getRange("A3:G3").setHorizontalAlignment("center");

    // 5. データバリデーション (Type列: B列)
    const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['有益ネタ', '日常ネタ', 'リンク無し'], true)
        .setAllowInvalid(false)
        .build();
    sheet.getRange("B4:B100").setDataValidation(rule);

    // 6. 列幅調整
    sheet.setColumnWidth(1, 40);  // No
    sheet.setColumnWidth(2, 100); // Type
    sheet.setColumnWidth(3, 300); // Topic
    sheet.setColumnWidth(4, 400); // Output
    sheet.setColumnWidth(5, 150); // Image
    sheet.setColumnWidth(6, 80);  // Status

    // 7. サンプルデータ
    sheet.getRange("A4").setValue(1);
    sheet.getRange("B4").setValue("有益ネタ");
    sheet.getRange("C4").setValue("寝る前のスマホがやめられない時の対処法");

    Browser.msgBox(`シート「${sheetName}」を修復しました。`);
}

/**
 * 【設定】APIキー登録
 */
function setupApiKey() {
    const result = Browser.inputBox("Gemini API Key 設定", "Google AI Studioで取得したAPIキーを入力してください:", Browser.Buttons.OK_CANCEL);
    if (result === "cancel" || result === "") {
        Browser.msgBox("キャンセルしました。");
        return;
    }
    PropertiesService.getScriptProperties().setProperty("GEMINI_API_KEY", result);
    Browser.msgBox("APIキーを保存しました！\n再度生成を試してください。");
}

/**
 * APIキー取得ヘルパー (優先順: プロパティ > 設定シート > 直接入力)
 */
function getGeminiApiKey() {
    // 1. Script Properties
    let key = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    if (key) return key;

    // 2. Settings Sheet (Row 4 search from '設定' sheet)
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const settingsSheet = ss.getSheetByName(SHEET_SETTINGS);
    if (settingsSheet) {
        // 行4のA-E列あたりを検索 (ユーザー情報: 4行目にある)
        // 値がAIzaで始まるものを探す
        const lastCol = settingsSheet.getLastColumn();
        // A4からE4くらいまでを取得
        const checkRange = settingsSheet.getRange(4, 1, 1, Math.min(lastCol, 10));
        const values = checkRange.getValues()[0];

        for (const cell of values) {
            if (typeof cell === 'string' && cell.startsWith('AIza')) {
                return cell; // API Key found
            }
        }
    }

    return null;
}

/**
 * 【日常有益】AI記事生成
 */
function generateDailyUsefulPosts() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_DAILY_USEFUL);
    const labSheet = ss.getSheetByName(SHEET_LAB);
    const dbSheet = ss.getSheetByName(SHEET_DB);

    if (!sheet) {
        Browser.msgBox(`シート「${SHEET_DAILY_USEFUL}」が見つかりません。設定メニューから修復してください。`);
        return;
    }

    // API Key取得 (プロパティ or 設定シート)
    let apiKey = getGeminiApiKey();

    if (!apiKey) {
        // キーがない場合、その場で尋ねる
        const input = Browser.inputBox("APIキー未設定", "Gemini APIキーが見つかりません(設定シート4行目 or プロパティ)。\nキーを入力してください:", Browser.Buttons.OK_CANCEL);
        if (input !== "cancel" && input !== "") {
            apiKey = input;
            PropertiesService.getScriptProperties().setProperty("GEMINI_API_KEY", apiKey);
        } else {
            Browser.msgBox("APIキーがないため中止しました。");
            return;
        }
    }

    // 0. 設定読み込み (A1)
    const settings = sheet.getRange("A1").getValue();
    const persona = "30代女性、共感を呼ぶインフルエンサー"; // 簡易ペルソナ
    const globalRule = settings;

    // 1. リソース取得 (DNA & Hooks)
    let dnaContext = "";
    if (labSheet && labSheet.getLastRow() > 1) {
        try {
            const dnaData = labSheet.getRange("B2:B5").getValues().flat().filter(String).join("\n");
            if (dnaData) dnaContext = `【バズりDNA (過去の成功パターン)】\n${dnaData}`;
        } catch (e) {
            console.log("DNA Fetch Error: " + e.message);
        }
    }

    let hookContext = "";
    if (dbSheet && dbSheet.getLastRow() > 1) {
        try {
            const hooks = dbSheet.getRange("C2:C10").getValues().flat().filter(String);
            if (hooks.length > 0) {
                hookContext = `【使用可能なフック(書き出し)例】\n${hooks.join("\n")}`;
            }
        } catch (e) {
            console.log("Hook Fetch Error: " + e.message);
        }
    }

    // 2. ターゲット特定
    const lastRow = sheet.getLastRow();
    if (lastRow < 4) return; // データなし

    let targets = [];
    const data = sheet.getRange(4, 1, lastRow - 3, 6).getValues(); // A4からF列まで取得

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const type = row[1];  // B列
        const topic = row[2]; // C列
        const output = row[3];// D列

        if (topic && !output && type) {
            targets.push(i); // 行インデックス(0始まり)を保存
        }
    }

    if (targets.length === 0) {
        Browser.msgBox("生成対象が見つかりませんでした。\nTopicを入力し、Outputを空にして再度実行してください。");
        return;
    }

    // 3. 生成ループ
    let count = 0;
    for (const dataIndex of targets) {
        try {
            // 実際の行番号(4始まり + index)
            const rowIndex = dataIndex + 4;
            const type = data[dataIndex][1];
            const topic = data[dataIndex][2];

            let typeInstruction = "";
            if (type === '有益ネタ') {
                typeInstruction = `【投稿タイプ: 有益ネタ】\n読者が「保存」したくなるような、具体的で役立つ情報を提示してください。`;
            } else if (type === '日常ネタ') {
                typeInstruction = `【投稿タイプ: 日常ネタ】\n親近感が湧くような、日々の気づきやエピソードを語ってください。`;
            } else if (type === 'リンク無し') {
                typeInstruction = `【投稿タイプ: リンク無し(写真メイン)】\n画像キャプションのような、短めで情緒的な文章にしてください。売り込みは厳禁です。`;
            }

            const prompt = `
あなたはThreadsの人気インフルエンサーです。
以下の「ネタ」から、指定されたタイプの投稿を作成してください。

【入力ネタ】
${topic}

【基本設定】
${persona}

【全体ルール(UI設定)】
${globalRule}

${typeInstruction}

${dnaContext}

${hookContext}

【指示】
- バズりDNAのリズムを取り入れつつ、指定されたフック(またはそれに準ずる引きのある言葉)を使って書き出してください。
- 30代女性に刺さる言葉選びを意識してください。
- 改行を適度に入れ、読みやすくしてください。
- **ハッシュタグは一切付けないでください。**
- 出力は**投稿本文のみ**をプレーンテキストで返してください。(解説不要)
`;
            const generatedText = callGemini(apiKey, prompt);

            // 書き込み
            sheet.getRange(rowIndex, 4).setValue(generatedText);
            sheet.getRange(rowIndex, 6).setValue("Generated"); // Status
            count++;

            // API制限考慮の待機
            Utilities.sleep(1000);

        } catch (e) {
            const rowIndex = dataIndex + 4;
            sheet.getRange(rowIndex, 4).setValue("エラー: " + e.message);
        }
    }
    Browser.msgBox(`執筆完了！\n${count}件の投稿を作成しました。`);
}

/**
 * 【日常有益】倉庫へ出荷
 * 生成された投稿を「投稿リスト」シートに移動する
 */
function shipDailyToStock() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_DAILY_USEFUL);

    // 倉庫シート取得 (存在前提: "投稿リスト")
    const stockSheet = ss.getSheetByName(SHEET_STOCK);
    if (!stockSheet) {
        Browser.msgBox(`シート「${SHEET_STOCK}」が見つかりません。作成してください。`);
        return;
    }

    if (!sheet) return;

    const lastRow = sheet.getLastRow();
    if (lastRow < 4) {
        Browser.msgBox("出荷できるデータがありません。");
        return;
    }

    // データ読み込み (A4:F)
    const range = sheet.getRange(4, 1, lastRow - 3, 7); // G列(Date)まで読む
    const values = range.getValues();

    let shippedCount = 0;

    for (let i = 0; i < values.length; i++) {
        const row = values[i];
        const output = row[3];
        const imgUrl = row[4];
        const status = row[5];
        const type = row[1];

        // 条件: Outputがあり、かつ Statusが "Generated" のもの
        if (output && status === 'Generated') {
            // 倉庫へ追加 (C列:カテゴリ, D列:文章)
            stockSheet.appendRow([
                "",     // A
                "",     // B
                type,   // C: Category (Type)
                output, // D: Content
                imgUrl, // E: Image URL (Backup)
                "Shipped from Daily"
            ]);

            // 元シートのステータス更新
            sheet.getRange(4 + i, 6).setValue("Shipped");
            shippedCount++;
        }
    }

    if (shippedCount > 0) {
        Browser.msgBox(`${shippedCount} 件の投稿を「${SHEET_STOCK}」へ移動しました！`);
    } else {
        Browser.msgBox("出荷可能な投稿(Status='Generated')が見つかりませんでした。");
    }
}

/**
 * 【設定】単品シート修復 (簡易版)
 */
function setupFactorySheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_SINGLE);
    if (!sheet) {
        sheet = ss.insertSheet(SHEET_SINGLE);
    }

    sheet.getRange("A1").setValue("Input Topic");
    sheet.getRange("B1").setValue("Generated Output");
    sheet.getRange("A1:B1").setFontWeight("bold");

    Browser.msgBox(`シート「${SHEET_SINGLE}」を初期化しました。(簡易版)`);
}

/**
 * 【単品】AI記事生成
 */
function generateSinglePosts() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_SINGLE);
    if (!sheet) return;

    // 簡易実装: A列にトピックがあればB列に生成
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    // API Key取得 (単品版も同様に)
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        Browser.msgBox("API Key Missing (Check Settings Sheet Row 4 or Script Properties)");
        return;
    }

    for (let i = 2; i <= lastRow; i++) {
        const topic = sheet.getRange(i, 1).getValue();
        const output = sheet.getRange(i, 2).getValue();

        if (topic && !output) {
            try {
                const prompt = `以下のトピックについて、Threads投稿を作成してください。\nハッシュタグは不要です。\nトピック: ${topic}`;
                const text = callGemini(apiKey, prompt);
                sheet.getRange(i, 2).setValue(text);
            } catch (e) {
                sheet.getRange(i, 2).setValue("Error: " + e.message);
            }
        }
    }
}

/**
 * Gemini API呼び出し
 */
function callGemini(apiKey, prompt) {
    const modelName = 'gemini-2.0-flash-exp'; // または gemini-1.5-pro / gemini-2.0-flash-thinking-exp
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const payload = {
        "contents": [{ "parts": [{ "text": prompt }] }],
        "generationConfig": { "temperature": 0.9, "maxOutputTokens": 2000 },
        // 安全設定: ブロック解除(必要に応じて調整)
        "safetySettings": [
            { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
        ]
    };

    const options = {
        "method": "post",
        "contentType": "application/json",
        "payload": JSON.stringify(payload),
        "muteHttpExceptions": true
    };

    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());

    if (response.getResponseCode() !== 200) {
        throw new Error(json.error ? json.error.message : "API Error: " + response.getResponseCode());
    }
    if (!json.candidates || !json.candidates[0].content) {
        throw new Error("No Content Generated");
    }

    return json.candidates[0].content.parts[0].text;
}

// --- スタブ関数 (エラー回避用) ---
function shipSingleToStock() { Browser.msgBox("未実装: shipSingleToStock"); }
function runLabAnalysis() { Browser.msgBox("未実装: runLabAnalysis"); }
function forceBroadcastTest() { Browser.msgBox("未実装: forceBroadcastTest"); }
function setupTrigger() { Browser.msgBox("未実装: setupTrigger"); }
function updateMetrics() { Browser.msgBox("未実装: updateMetrics"); }
function evolveStyle() { Browser.msgBox("未実装: evolveStyle"); }
function setupScheduleSheet() { Browser.msgBox("未実装: setupScheduleSheet"); }
function debugListModels() { Browser.msgBox("未実装: debugListModels"); }
