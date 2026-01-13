// ==========================================
// 🚀 Threads職人 (Code.js)
// ==========================================

// --- 定数定義 ---
const SHEET_SINGLE = "単品投稿ファクトリー";
const SHEET_DAILY_USEFUL = "日常有益投稿";
const SHEET_LAB = "バズ研究所";
const SHEET_DB = "テンプレートDB";
const SHEET_SETTINGS = "設定";
const SHEET_STOCK = "投稿リスト";

// Gemini API Key
const API_KEY = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY") || "YOUR_API_KEY_HERE";

/**
 * メニュー作成
 */
function onOpen() {
    SpreadsheetApp.getUi().createMenu('無限放送局')
        .addItem('【単品】AI記事生成 (1行1ネタ)', 'generateSinglePosts')
        .addItem('【単品】まとめネタ作成 (選択合体)', 'generateSummaryPost') // Added
        .addItem('【単品】倉庫へ出荷', 'shipSingleToStock')
        .addSeparator()
        .addItem('【日常有益】AI記事生成', 'generateDailyUsefulPosts')
        .addItem('【日常有益】投稿リストへ出荷', 'shipDailyToStock')
        .addSeparator()
        .addItem('【研究所】スタイル分析 (DNA抽出)', 'runLabAnalysis')
        .addToUi();

    SpreadsheetApp.getUi().createMenu('🤖 Threads職人')
        .addItem('【設定】APIキー登録', 'setupApiKey')
        .addItem('【設定】単品シート修復 (新Ver)', 'setupFactorySheet') // Updated label
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
    sheet.getRange("A1:H1000").clear(); // H列まで
    sheet.getRange("A1:H1000").clearDataValidations();
    sheet.getRange("A1:H1000").clearFormat();

    // 2. プロンプトエリア (1行目: A1:G1結合)
    const promptRange = sheet.getRange("A1:G1"); // 幅を広げる
    promptRange.merge();

    const defaultPrompt =
        `- **ターゲット**: 30代前後の女性\n` +
        `- **文字数**: 260文字以内\n` +
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

    // 3. コントロールボタンエリア (H1:I1)
    sheet.getRange("H1").setValue("📢 生成ボタンは\nメニューから実行");
    sheet.getRange("H1").setBackground("#ea9999");
    sheet.getRange("H1").setFontWeight("bold");
    sheet.getRange("H1").setHorizontalAlignment("center");
    sheet.getRange("H1").setVerticalAlignment("middle");

    // 4. ヘッダー行 (3行目)
    const headers = [
        ["No", "Type", "Humor (ユーモア)", "Topic (ネタ/メモ)", "Output (生成本文)", "Image URL (任意)", "Status", "Date"]
    ];
    sheet.getRange("A3:H3").setValues(headers);
    sheet.getRange("A3:H3").setBackground("#cfe2f3");
    sheet.getRange("A3:H3").setFontWeight("bold");
    sheet.getRange("A3:H3").setHorizontalAlignment("center");

    // 5. データバリデーション
    const typeRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['有益ネタ', '日常ネタ', 'リンク無し'], true).build();
    sheet.getRange("B4:B100").setDataValidation(typeRule);

    const humorRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['Lv1: 控えめ', 'Lv2: 標準', 'Lv3: 全力'], true).build();
    sheet.getRange("C4:C100").setDataValidation(humorRule);

    // 6. 列幅調整
    sheet.setColumnWidth(1, 40);  // No
    sheet.setColumnWidth(2, 100); // Type
    sheet.setColumnWidth(3, 100); // Humor
    sheet.setColumnWidth(4, 300); // Topic
    sheet.setColumnWidth(5, 400); // Output
    sheet.setColumnWidth(6, 150); // Image
    sheet.setColumnWidth(7, 80);  // Status
    sheet.setColumnWidth(8, 80);  // Date

    // 7. サンプルデータ
    sheet.getRange("A4").setValue(1);
    sheet.getRange("B4").setValue("有益ネタ");
    sheet.getRange("C4").setValue("Lv2: 標準");
    sheet.getRange("D4").setValue("寝る前のスマホがやめられない時の対処法");

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
 * APIキー取得ヘルパー
 */
function getGeminiApiKey() {
    let key = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    if (key) return key;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const settingsSheet = ss.getSheetByName(SHEET_SETTINGS);
    if (settingsSheet) {
        const lastCol = settingsSheet.getLastColumn();
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
    generatePostsCommon(SHEET_DAILY_USEFUL);
}

/**
 * 【単品】AI記事生成 (旧 generateSinglePosts改修版)
 */
function generateSinglePosts() {
    generatePostsCommon(SHEET_SINGLE);
}

/**
 * 共通記事生成ロジック (Daily/Useful & Single Factory兼用)
 */
function generatePostsCommon(sheetName) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    const labSheet = ss.getSheetByName(SHEET_LAB);
    const dbSheet = ss.getSheetByName(SHEET_DB);

    if (!sheet) {
        Browser.msgBox(`シート「${sheetName}」が見つかりません。設定メニューから修復してください。`);
        return;
    }

    let apiKey = getGeminiApiKey();
    if (!apiKey) {
        Browser.msgBox("API Key Missing! Check Settings Sheet Row 4.");
        return;
    }

    // 0. 設定読み込み (A1)
    const settings = sheet.getRange("A1").getValue();
    const persona = "30代女性、共感を呼ぶインフルエンサー";
    const globalRule = settings;

    // 1. リソース取得
    let dnaContext = "";
    if (labSheet && labSheet.getLastRow() > 1) {
        try {
            const dnaData = labSheet.getRange("B2:B5").getValues().flat().filter(String).join("\n");
            if (dnaData) dnaContext = `【バズりDNA (過去の成功パターン)】\n${dnaData}`;
        } catch (e) { }
    }

    let hookContext = "";
    if (dbSheet && dbSheet.getLastRow() > 1) {
        try {
            const hooks = dbSheet.getRange("C2:C10").getValues().flat().filter(String);
            if (hooks.length > 0) {
                hookContext = `【使用可能なフック(書き出し)例】\n${hooks.join("\n")}`;
            }
        } catch (e) { }
    }

    // 2. ターゲット特定
    const lastRow = sheet.getLastRow();
    if (lastRow < 4) return;

    // ヘッダー行調整: Singleシートは A=Select, B=No, C=Type, D=Humor, E=Topic, F=Output, G=Image, H=Status
    // Dailyシートは A=No, B=Type, C=Humor, D=Topic, E=Output, F=Image, G=Status

    // シートによって列インデックスが異なるため調整
    // Single: Topic=E(5), Output=F(6), Status=H(8)
    // Daily:  Topic=D(4), Output=E(5), Status=G(7)

    let isSingleSheet = (sheetName === SHEET_SINGLE);
    let colTopic = isSingleSheet ? 5 : 4; // E or D
    let colOutput = isSingleSheet ? 6 : 5; // F or E
    let colStatus = isSingleSheet ? 8 : 7; // H or G
    let colType = isSingleSheet ? 3 : 2;   // C or B
    let colHumor = isSingleSheet ? 4 : 3;  // D or C
    let numCols = isSingleSheet ? 8 : 7;

    let targets = [];
    const data = sheet.getRange(4, 1, lastRow - 3, numCols).getValues();

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const type = row[colType - 1];
        const topic = row[colTopic - 1];
        const output = row[colOutput - 1];

        // Topicあり、Outputなし
        if (topic && !output) {
            // 単品シートの場合は Type='まとめ' はスキップ (generateSummaryPostでやる)
            if (isSingleSheet && type === 'まとめ') continue;

            targets.push(i);
        }
    }

    if (targets.length === 0) {
        Browser.msgBox("生成対象が見つかりませんでした。");
        return;
    }

    // 3. 生成ループ
    let count = 0;
    for (const dataIndex of targets) {
        try {
            const rowIndex = dataIndex + 4;
            const type = data[dataIndex][colType - 1];
            const humor = data[dataIndex][colHumor - 1];
            const topic = data[dataIndex][colTopic - 1];

            // プロンプト構築 (Dailyと同様)
            let typeInstruction = "";
            if (type === '有益ネタ') typeInstruction = `【投稿タイプ: 有益ネタ】\n読者が「保存」したくなるような、具体的で役立つ情報を提示してください。`;
            else if (type === '日常ネタ') typeInstruction = `【投稿タイプ: 日常ネタ】\n親近感が湧くような、日々の気づきやエピソードを語ってください。`;
            else if (type === 'リンク無し') typeInstruction = `【投稿タイプ: リンク無し(写真メイン)】\n画像キャプションのような、短めで情緒的な文章にしてください。`;
            else typeInstruction = `【投稿タイプ: 単品ネタ】\nシンプルに魅力的な投稿を作成してください。`;

            let humorInstruction = "";
            if (humor && humor.includes("Lv1")) humorInstruction = `【ユーモア度: Lv1 控えめ】\n知的さを保ち、少しのウィットを入れる程度に。`;
            else if (humor && humor.includes("Lv3")) humorInstruction = `【ユーモア度: Lv3 全力】\n**ユーモア全開で！** 自虐やツッコミ、大げさな表現で爆笑を狙ってください。`;
            else humorInstruction = `【ユーモア度: Lv2 標準】\n明るく楽しいトーンで。フフッと笑える「あるある」を盛り込んでください。`;

            // 単品投稿でも、有益ネタ等の指定があればそれを反映
            if (type === 'まとめ') {
                // Skip here (Safety check if logic changed)
                continue;
            }

            const prompt = `
あなたはThreadsの人気インフルエンサーです。
以下の「ネタ」から、投稿を作成してください。

【入力ネタ】
${topic}

【基本設定】
${persona}

【全体ルール】
${globalRule}

${typeInstruction}
${humorInstruction}
${dnaContext}
${hookContext}

【指示】
- バズりDNAのリズムを取り入れつつ、引きのある言葉を使って書き出してください。
- 30代女性に刺さる言葉選びを意識してください。
- 改行を適度に入れ、読みやすくしてください。
- **Threadsの特性上、ハッシュタグは一切付けないでください。**
- 出力は**投稿本文のみ**をプレーンテキストで返してください。(解説不要)
`;
            let generatedText = callGemini(apiKey, prompt);
            generatedText = generatedText.replace(/#\S+/g, '').trim();

            sheet.getRange(rowIndex, colOutput).setValue(generatedText);
            sheet.getRange(rowIndex, colStatus).setValue("Generated");
            count++;

            Utilities.sleep(1000);

        } catch (e) {
            const rowIndex = dataIndex + 4;
            sheet.getRange(rowIndex, colOutput).setValue("エラー: " + e.message);
        }
    }
    Browser.msgBox(`${count}件の投稿を作成しました。`);
}

/**
 * 【単品】まとめネタ作成 (選択合体)
 */
function generateSummaryPost() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_SINGLE);
    if (!sheet) return;

    // API Key
    let apiKey = getGeminiApiKey();
    if (!apiKey) { Browser.msgBox("API Key Missing"); return; }

    const lastRow = sheet.getLastRow();
    if (lastRow < 4) { Browser.msgBox("データがありません。"); return; }

    // データ取得 (A: Select, C: Type, D: Humor, E: Topic)
    // A=0, C=2, D=3, E=4
    const range = sheet.getRange(4, 1, lastRow - 3, 5);
    const values = range.getValues();

    let selectedTopics = [];
    let selectedHumors = [];
    let selectedTypes = [];

    for (let i = 0; i < values.length; i++) {
        if (values[i][0] === true) { // Checked
            const topic = values[i][4]; // Col E (Topic)
            const humor = values[i][3]; // Col D (Humor)
            const type = values[i][2];  // Col C (Type)
            if (topic) {
                selectedTopics.push(topic);
                if (humor) selectedHumors.push(humor);
                if (type) selectedTypes.push(type);
            }
        }
    }

    if (selectedTopics.length < 2 || selectedTopics.length > 5) {
        Browser.msgBox(`選択数は2～5個にしてください。\n現在の選択数: ${selectedTopics.length}`);
        return;
    }

    // まとめ生成
    const combinedTopic = selectedTopics.map((t, idx) => `(${idx + 1}) ${t}`).join("\n");

    // ユーモア決定 (最初の選択 or Lv2)
    const humorLevel = selectedHumors.length > 0 ? selectedHumors[0] : "Lv2: 標準";

    // カテゴリ決定 (最初の選択 or 多数決 or デフォルト)
    // 基本は「有益ネタ」にするが、もし選択されたものが「日常ネタ」なら日常にする
    let targetType = "有益ネタ"; // Default to Useful for composites
    if (selectedTypes.length > 0) {
        const firstType = selectedTypes[0];
        // ユーザーが意図して指定したカテゴリ(有益/日常)があれば継承
        if (['日常ネタ', '有益ネタ', 'リンク無し'].includes(firstType)) {
            targetType = firstType;
        }
    }

    // 設定読み込み (A1)
    const settings = sheet.getRange("A1").getValue();
    const persona = "30代女性、共感を呼ぶインフルエンサー";

    // カテゴリ別指示
    let typeInstruction = "";
    if (targetType === '有益ネタ') {
        typeInstruction = `【投稿タイプ: 有益ネタまとめ】\n複数の情報を整理し、読者が「保存」したくなるような、役立つまとめ記事にしてください。`;
    } else if (targetType === '日常ネタ') {
        typeInstruction = `【投稿タイプ: 日常ネタまとめ】\n複数のエピソードを織り交ぜ、人柄が伝わるような読み応えのある記事にしてください。`;
    } else {
        typeInstruction = `【投稿タイプ: まとめ記事】\n複数のトピックを魅力的にまとめてください。`;
    }

    // プロンプト
    const prompt = `
あなたはThreadsの人気インフルエンサーです。
以下の複数のネタを**1つの「まとめ投稿」**として構成・執筆してください。

【まとめ対象のネタ】
${combinedTopic}

【基本設定】
${persona}

【全体ルール】
${settings}

${typeInstruction}

【ユーモア度: ${humorLevel}】
適切なユーモア・ウィット・楽しさを一貫して持たせてください。

【指示】
- **「◯選」や「まとめ」形式**で、それぞれのネタを簡潔かつ魅力的に紹介してください。
- 全体として一つの読み物になるように、導入と結びをつけてください。
- リズム感を重視し、箇条書きなどを活用して見やすくしてください。
- **Threadsの特性上、ハッシュタグは一切付けないでください。**
- 出力は**投稿本文のみ**をプレーンテキストで返してください。
`;

    try {
        let text = callGemini(apiKey, prompt);
        text = text.replace(/#\S+/g, '').trim();

        // 末尾に追加
        sheet.appendRow([
            false,           // A: Select
            "",              // B: No
            targetType,      // C: Type (Inherited)
            humorLevel,      // D: Humor
            combinedTopic,   // E: Topic (Combined)
            text,            // F: Output
            "",              // G: Image
            "Generated"      // H: Status
        ]);

        Browser.msgBox(`カテゴリ「${targetType}」としてまとめ投稿を作成しました！\n最下行を確認してください。\n(C列でカテゴリ変更可能です)`);

    } catch (e) {
        Browser.msgBox("エラー: " + e.message);
    }
}

/**
 * 【日常有益】投稿リストへ出荷
 */
function shipDailyToStock() {
    shipCommon(SHEET_DAILY_USEFUL);
}
/**
 * 【単品】倉庫へ出荷
 */
function shipSingleToStock() {
    shipCommon(SHEET_SINGLE);
}

/**
 * 共通出荷ロジック
 */
function shipCommon(sheetName) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    const stockSheet = ss.getSheetByName(SHEET_STOCK);

    if (!stockSheet) { Browser.msgBox(`${SHEET_STOCK}が見つかりません。`); return; }
    if (!sheet) return;

    const lastRow = sheet.getLastRow();
    if (lastRow < 4) { Browser.msgBox("データなし"); return; }

    // 列ズレ判定
    let isSingleSheet = (sheetName === SHEET_SINGLE);
    let colType = isSingleSheet ? 3 : 2;   // C or B
    let colOutput = isSingleSheet ? 6 : 5; // F or E
    let colImg = isSingleSheet ? 7 : 6;    // G or F
    let colStatus = isSingleSheet ? 8 : 7; // H or G
    let numCols = isSingleSheet ? 8 : 7;

    const range = sheet.getRange(4, 1, lastRow - 3, numCols);
    const values = range.getValues();
    let count = 0;

    for (let i = 0; i < values.length; i++) {
        const row = values[i];
        const type = row[colType - 1];
        const output = row[colOutput - 1];
        const imgUrl = row[colImg - 1];
        const status = row[colStatus - 1];

        if (output && status === 'Generated') {
            // 倉庫: A=Date, B=x, C=Cat, D=Content, E=Img
            stockSheet.appendRow(["", "", type, output, imgUrl, `Shipped from ${isSingleSheet ? 'Single' : 'Daily'}`]);

            // ステータス更新
            sheet.getRange(4 + i, colStatus).setValue("Shipped");
            count++;
        }
    }

    if (count > 0) Browser.msgBox(`${count}件を出荷しました。`);
    else Browser.msgBox("出荷対象(Status='Generated')がありません。");
}

/**
 * 【設定】単品シート修復 (新Ver)
 * 日常有益シートをベースに、A列に選択用チェックボックスを追加
 */
function setupFactorySheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = SHEET_SINGLE;
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
        sheet = ss.insertSheet(sheetName);
    }

    // 1. クリーニング
    sheet.getRange("A1:H1000").clear();
    sheet.getRange("A1:H1000").clearDataValidations();
    sheet.getRange("A1:H1000").clearFormat();

    // 2. プロンプトエリア (A1:H1)
    const promptRange = sheet.getRange("A1:H1");
    promptRange.merge();

    const defaultPrompt =
        `- **ターゲット**: 30代前後の女性\n` +
        `- **文字数**: 260文字以内\n` +
        `- **機能**: 複数チェックして「まとめネタ作成」で合体投稿が可能。\n` +
        `- **共通ルール**: 親近感がありつつ、ためになる情報や共感できる日常を発信。`;

    promptRange.setValue(defaultPrompt);
    promptRange.setBackground("#fff2cc"); // 薄い黄色 (Dailyと区別)
    promptRange.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    promptRange.setVerticalAlignment("top");
    promptRange.setFontSize(10);
    sheet.setRowHeight(1, 100);

    // 3. ヘッダー (3行目)
    // A:Select, B:No, C:Type, D:Humor, E:Topic, F:Output, G:Img, H:Status
    const headers = [
        ["Select", "No", "Type", "Humor", "Topic (ネタ/メモ)", "Output (生成本文)", "Image URL", "Status"]
    ];
    sheet.getRange("A3:H3").setValues(headers);
    sheet.getRange("A3:H3").setBackground("#ffe599"); // 黄色系
    sheet.getRange("A3:H3").setFontWeight("bold");
    sheet.getRange("A3:H3").setHorizontalAlignment("center");

    // 4. バリデーション
    // A列: Checkbox
    const checkbox = SpreadsheetApp.newDataValidation().requireCheckbox().build();
    sheet.getRange("A4:A100").setDataValidation(checkbox);

    // C列: Type
    const typeRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['単品', 'まとめ', '有益ネタ', '日常ネタ'], true).build();
    sheet.getRange("C4:C100").setDataValidation(typeRule);

    // D列: Humor
    const humorRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['Lv1: 控えめ', 'Lv2: 標準', 'Lv3: 全力'], true).build();
    sheet.getRange("D4:D100").setDataValidation(humorRule);

    // 5. 幅調整
    sheet.setColumnWidth(1, 50);  // Select
    sheet.setColumnWidth(2, 40);  // No
    sheet.setColumnWidth(3, 80);  // Type
    sheet.setColumnWidth(4, 80);  // Humor
    sheet.setColumnWidth(5, 300); // Topic
    sheet.setColumnWidth(6, 400); // Output
    sheet.setColumnWidth(7, 150); // Image
    sheet.setColumnWidth(8, 80);  // Status

    // 6. サンプル
    sheet.getRange("A4").setValue(false);
    sheet.getRange("B4").setValue(1);
    sheet.getRange("C4").setValue("有益ネタ");  // Default sample
    sheet.getRange("D4").setValue("Lv2: 標準");
    sheet.getRange("E4").setValue("朝のコーヒーで目が覚めない問題");

    Browser.msgBox(`シート「${sheetName}」を新Verに修復しました。`);
}


/**
 * Gemini API呼び出し
 */
function callGemini(apiKey, prompt) {
    const modelName = 'gemini-2.0-flash-exp';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const payload = {
        "contents": [{ "parts": [{ "text": prompt }] }],
        "generationConfig": { "temperature": 0.9, "maxOutputTokens": 2000 },
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

// --- スタブ関数 ---
function runLabAnalysis() { Browser.msgBox("未実装: runLabAnalysis"); }
function forceBroadcastTest() { Browser.msgBox("未実装: forceBroadcastTest"); }
function setupTrigger() { Browser.msgBox("未実装: setupTrigger"); }
function updateMetrics() { Browser.msgBox("未実装: updateMetrics"); }
function evolveStyle() { Browser.msgBox("未実装: evolveStyle"); }
function setupScheduleSheet() { Browser.msgBox("未実装: setupScheduleSheet"); }
function debugListModels() { Browser.msgBox("未実装: debugListModels"); }
