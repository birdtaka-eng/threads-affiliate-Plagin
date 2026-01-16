// ==========================================
// 🚀 Threads職人 (Code.js)
// ==========================================

// --- 定数定義 ---
const SHEET_BOARD = "投稿作成ボード"; // Unified Sheet Name
const SHEET_LAB = "バズ研究所";
const SHEET_DB = "テンプレートDB";
const SHEET_SETTINGS = "設定";
const SHEET_SCHEDULE = "番組表"; // New
const SHEET_MANUAL = "マニュアル"; // New Manual Sheet
const SHOW_DEV_TOOLS = true; // ★開発者モード: falseにすると開発用メニューが非表示になります

// Gemini API Key
const API_KEY = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY") || "YOUR_API_KEY_HERE";

/**
 * メニュー作成
 */
function onOpen() {
    SpreadsheetApp.getUi().createMenu('無限放送局')
        .addItem('【作成】投稿一括生成 (全タイプ)', 'generateUnifiedPosts')
        .addItem('【作成】まとめネタ作成 (選択合体)', 'generateSummaryPost')
        .addItem('【放送】手動放送テスト (今放送すべきものを実行)', 'runBroadcast')
        .addItem('【分析】投稿データ更新 (Metrics)', 'updateMetrics')
        .addSeparator()
        .addItem('【ヒント】表示ON', 'showTips')
        .addItem('【ヒント】表示OFF', 'hideTips')
        .addSeparator()
        .addItem('【設定】自動分析トリガー設定 (初回のみ)', 'setupLabTrigger')
        .addToUi();

    const devMenu = SpreadsheetApp.getUi().createMenu('🤖 Threads職人');

    // User Standard Menu
    devMenu.addItem('【設定】マニュアル作成', 'setupManualSheet')
        .addItem('【設定】投稿ボード作成 (リセット)', 'setupBoardSheet')
        .addItem('【設定】番組表リセット', 'setupScheduleSheet')
        .addItem('【設定】バズ研究所シート拡張', 'setupLabSheet');

    // Developer Only Menu
    if (SHOW_DEV_TOOLS) {
        devMenu.addSeparator()
            .addItem('🛑【開発】マニュアル学習 (虎の巻)', 'runDojoAnalysis')
            .addItem('🛑【開発】DNA統合 (グリモワール化)', 'updateMasterDNA')
            .addItem('🛑【開発】DB構築 (魔法の杖)', 'setupTemplateDatabase')
            .addItem('🛑【開発】モデル診断', 'debugListModels');
    }

    devMenu.addToUi();
}

/**
 * トリガー機能: 編集時即時反映
 * 投稿ボードで「Selector(案1,2,3)」を変更した際、Sourceから本文を即座に書き換える
 */
function onEdit(e) {
    const sheet = e.source.getActiveSheet();
    const range = e.range;

    // 対象シート: 投稿作成ボード
    if (sheet.getName() !== SHEET_BOARD) return;

    // 対象列: H列 (Selector) (8列目)
    if (range.getColumn() !== 8 || range.getRow() < 4) return;

    const selectorValue = range.getValue(); // "案1", "案2", "案3"
    const rowIndex = range.getRow();
    const sourceValue = sheet.getRange(rowIndex, 13).getValue(); // M列 (Drafts Source)

    if (!sourceValue || String(sourceValue).length < 20) return; // データなし

    // Parse (Simple Logic mirroring generatePostsCommon)
    let content = "";

    // Regexで抽出
    // 案1: ---案1: ... ---\n(ここで切る)---案2: ...
    if (selectorValue === "案1") {
        const match = sourceValue.match(/---案1:.*?---\n([\s\S]*?)---案2:/);
        if (match) content = match[1].trim();
        else {
            // Fallback
            const split = sourceValue.split("---案2:");
            if (split.length > 0) content = split[0].replace(/---案1:.*?---/, "").trim();
        }
    } else if (selectorValue === "案2") {
        const match = sourceValue.match(/---案2:.*?---\n([\s\S]*?)---案3:/);
        if (match) content = match[1].trim();
    } else if (selectorValue === "案3") {
        const match = sourceValue.match(/---案3:.*?---\n([\s\S]*)/); // 案3は最後まで
        if (match) content = match[1].trim();
    }

    if (content) {
        // Output列(G)を更新 - Shifted +1
        sheet.getRange(rowIndex, 7).setValue(content);
    }
}

/**
 * 【設定】バズ研究所シート拡張
 * 既存のデータを消さずに、DNA分析用の列定義と見た目を整える
 */
function setupLabSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_LAB);

    if (!sheet) {
        sheet = ss.insertSheet(SHEET_LAB);
    }

    // 1. ヘッダー更新 (1行目のみ上書き)
    const headers = [["Type (種類)", "Image Context (写真/背景の説明)", "Raw Post (バズった原文)", "DNA (構造・型)"]];
    sheet.getRange("A1:D1").setValues(headers);
    sheet.getRange("A1:D1").setBackground("#d9d2e9"); // 紫系
    sheet.getRange("A1:D1").setFontWeight("bold");
    sheet.getRange("A1:D1").setHorizontalAlignment("center");

    // 2. 列幅調整
    sheet.setColumnWidth(1, 80);  // Type
    sheet.setColumnWidth(2, 200); // Image Context
    sheet.setColumnWidth(3, 300); // Raw Post
    sheet.setColumnWidth(4, 300); // DNA
    // sheet.setColumnWidth(5, 80);  // Status Removed

    // 3. データバリデーション (A列 Type)
    // まず古いルールをクリア (C列などに残っている場合があるため)
    sheet.getRange("B2:D100").clearDataValidations();

    // BoardのTypeと合わせる
    const typeRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['単品', '日常', '有益', 'まとめ', 'Free'], true).build();
    sheet.getRange("A2:A100").setDataValidation(typeRule);

    // 4. ヒント追加 (Notes)
    const hints = {
        1: "【Type (種類)】\nネタの種類を選んでください。\n(例: 日常ツイートのサンプルなら「日常」)",
        2: "【Image Context (背景)】\nもし画像付きの投稿なら、どんな写真だったかメモしてください。\n(文字だけの投稿なら空欄でOK)",
        3: "【Raw Post (原文)】\nバズった投稿の本文をそのまま貼り付けてください。\n→貼り付けると自動で解析が始まります(数秒後)。\n※初回のみメニューの『自動分析トリガー設定』を実行してください。",
        4: "【DNA (構造・型)】\n🤖 AI分析エリア\nAIがバズりの構造を解析してここに書き込みます。\n※編集不可(ロック中)"
    };
    for (const [col, note] of Object.entries(hints)) {
        sheet.getRange(1, Number(col)).setNote(note);
    }

    // 5. 保護 (Lock Column D)
    const protection = sheet.getRange("D:D").protect();
    protection.setDescription("AI DNA Area");
    protection.setWarningOnly(true); // 警告を表示

    Browser.msgBox(`シート「${SHEET_LAB}」を更新しました！\n\n・E列を削除しました。\n・自動分析トリガーに対応しました。\n・D列を保護しました。`);
}


/**
 * 【作成】投稿一括生成 (全タイプ)
 * 旧 generateSinglePosts / generateDailyUsefulPosts を統合
 */
function generateUnifiedPosts() {
    generatePostsCommon(SHEET_BOARD);
}

/**
 * 【出荷】倉庫へ出荷
// function shipUnifiedToStock() { shipCommon(SHEET_BOARD); } // Removed

/**
 * 【設定】投稿ボード作成 (リセット)
 * 単品・日常・有益・まとめ を一元管理する放送局ボードを作成
 */
function setupBoardSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = SHEET_BOARD;
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
        sheet = ss.insertSheet(sheetName);
    }

    // 1. クリーニング
    sheet.getRange("A1:N1000").clear(); // Extended to N
    sheet.getRange("A1:N1000").clearDataValidations();
    sheet.getRange("A1:N1000").clearFormat();

    // 2. プロンプトガイドエリア (A1:N1)
    const promptRange = sheet.getRange("A1:N1");
    promptRange.merge();

    const defaultPrompt =
        `【投稿作成ボード (+Assets)】\n` +
        `- **Selector**: 「案1〜案3」で投稿内容を切り替え。\n` +
        `- **Assets**: 画像や参照URLメモ用。\n` +
        `- **ON AIR**: チェックで「放送待機」状態になります。`;

    promptRange.setValue(defaultPrompt);
    promptRange.setBackground("#fff2cc"); // Thin Yellow
    promptRange.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);

    // 全体の折り返し設定 (A4以降)
    sheet.getRange("A4:N1000").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    sheet.getRange("A4:N1000").setVerticalAlignment("top"); // 見やすくするため上揃えも追加
    promptRange.setVerticalAlignment("top");
    promptRange.setFontSize(10);
    sheet.setRowHeight(1, 80);

    // 3. ヘッダー (3行目)
    // 3. ヘッダー (3行目)
    // Removed Status (Column I)
    const headers = [
        ["ON AIR", "No", "Type", "Humor", "Topic (ネタ/メモ)", "Assets (画像/URL)", "Output (生成本文)", "Selector", "System ID", "Last Played", "Count", "Analysis", "Drafts Source"]
    ];
    sheet.getRange("A3:M3").setValues(headers); // Reduced to M
    sheet.getRange("A3:M3").setBackground("#ffe599"); // Yellow
    sheet.getRange("A3:M3").setFontWeight("bold");
    sheet.getRange("A3:M3").setHorizontalAlignment("center");

    // 4. バリデーション
    const checkbox = SpreadsheetApp.newDataValidation().requireCheckbox().build();
    sheet.getRange("A4:A100").setDataValidation(checkbox);

    // C列: Type
    const typeRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['単品', '日常', '有益', 'まとめ', 'Free'], true).build();
    sheet.getRange("C4:C100").setDataValidation(typeRule);

    // D列: Humor
    const humorRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['Lv1: 控えめ', 'Lv2: 標準', 'Lv3: 全力'], true).build();
    sheet.getRange("D4:D100").setDataValidation(humorRule);

    // H列: Selector (New Index 8 -> H)
    const selectorRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['案1', '案2', '案3'], true).build();
    sheet.getRange("H4:H100").setDataValidation(selectorRule);

    // 5. 幅調整
    sheet.setColumnWidth(1, 60);  // ON AIR
    sheet.setColumnWidth(2, 40);  // No
    sheet.setColumnWidth(3, 80);  // Type
    sheet.setColumnWidth(4, 80);  // Humor
    sheet.setColumnWidth(5, 250); // Topic
    sheet.setColumnWidth(6, 200); // Assets
    sheet.setColumnWidth(7, 350); // Output
    sheet.setColumnWidth(8, 60);  // Selector
    // Status removed
    sheet.setColumnWidth(9, 100); // System ID

    // Hide Drafts Source (M)
    sheet.hideColumns(13);
    sheet.setColumnWidth(9, 120);  // System ID
    sheet.setColumnWidth(10, 120); // Last Played
    sheet.setColumnWidth(11, 60);  // Count
    sheet.setColumnWidth(12, 150); // Analysis
    sheet.setColumnWidth(13, 100); // Drafts Source (Hidden)
    // sheet.hideColumns(13); // Hidden by default

    // 6. サンプルデータ
    const samples = [
        [false, 1, "単品", "Lv2: 標準", "母の日2026・おしゃれな花瓶", "", "", "案1", "", "", 0, ""],
        [false, 2, "日常", "Lv2: 標準", "最近あったちょっといい話", "", "", "案1", "", "", 0, ""],
        [false, 3, "有益", "Lv1: 控えめ", "初心者向けGAS活用術3選", "", "", "案1", "", "", 0, ""]
    ];

    samples.forEach((row, i) => {
        sheet.getRange(4 + i, 1, 1, 12).setValues([row]);
    });

    Browser.msgBox(`シート「${sheetName}」を放送局仕様にアップデートしました。`);
}


/**
 * 【設定】自動化トリガー設定 (バズ研究所)
 * 編集時(onEdit)にAPIを叩くための権限付きトリガーを作成する
 */
function setupLabTrigger() {
    setupTriggerCommon(SHEET_LAB, "onLabEditInstallable");
}

function setupTriggerCommon(sheetName, functionName) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 既存トリガー削除 (重複防止)
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

    Browser.msgBox("自動分析システムを起動しました！\\n今後は「Raw Post」を貼り付けるだけで、数秒後に自動でDNAが抽出されます。");
}

/**
 * トリガーによって実行されるDNA分析関数
 */
function onLabEditInstallable(e) {
    if (!e) return;
    const range = e.range;
    const sheet = range.getSheet();

    // Check Sheet
    if (sheet.getName() !== SHEET_LAB) return;

    // Check Column: Col 3 (Raw Post)
    const col = range.getColumn();
    const row = range.getRow();
    if (col !== 3 || row < 2) return;

    const rawPost = range.getValue();
    const dnaCell = sheet.getRange(row, 4); // DNA Col

    // 入力がって、まだDNAが無い場合のみ実行 (上書き防止のため、既にDNAがある場合は無視)
    // 修正したい場合はDNAを消してからRawを貼り直す
    if (rawPost && !dnaCell.getValue()) {
        analyzeSingleRow(sheet, row);
    }
}

/**
 * 単一行分析ロジック
 */
function analyzeSingleRow(sheet, row) {
    let apiKey = getGeminiApiKey();
    if (!apiKey) return;

    const data = sheet.getRange(row, 1, 1, 3).getValues()[0];
    const type = data[0]; // A
    const imgDesc = data[1]; // B
    const rawText = data[2]; // C (Raw)

    if (!rawText) return;

    sheet.getRange(row, 4).setValue("⏳ 解析中...");

    const prompt = `
あなたは超一流のプロンプトエンジニアです。
以下の「バズった投稿」を分析し、**その投稿を再現するための「汎用的なプロンプト（設計図）」**を作成してください。

【分析詳細】
- [画像・背景状況]: ${imgDesc || "なし"}
- [投稿本文]:
${rawText}

【指示】
この投稿がバズった要因（論理、構成、心理トリック）を抽象化し、**全く別のテーマ（例：母の日、ダイエット、転職など）でも同じ威力を発揮できる「思考プロセス」**として言語化してください。

【出力形式】
以下のフォーマットで出力してください。

# 役割
（例：あなたは辛口な親友です、など）

# ルール
- （トーンや禁止事項、文体ルール）
- （例：「〜だろ」口調を使う、など）

# 文字数・ボリューム感
- （例：15文字以内の超短文で言い切る / 140文字ギリギリまで使いストーリーを語る）
- （原文の物理的な長さを分析し、その「長さが生む効果」をルール化する）

# 表現のトリック（ユーモアと造語）
- **造語センス**: ターゲットをそのまま呼ばず、「悩人（なやみんちゅ）」のような『愛嬌のある造語』に変換しているか？その法則を抽出する。
- **提案の距離感**: 「買ってください」ではなく「～なんてどう？」と横に座って囁くような『押し付けない提案』の語尾や言い回しを特定する。

# 思考プロセス
1. **ターゲットの再定義（造語化）**: 
   - ターゲットの痛みを特定し、それを愛嬌のある「あだ名（造語）」で呼ぶことで、ネガティブさを笑いに変えるプロセス。
2. **視覚と文章のギャップ**:
   - [画像・背景状況]がある場合、それをそのまま説明せず、どう「裏切る」か、あるいは「意外な角度」から意味付けしているかを分析する。
3. **解決策の提示（処方箋）**:
   - 商品を「商品」としてではなく、その悩みを解決する「選択肢の一つ」として、疑問形で優しく差し出すロジック。
4. **構成のロジック**:
   - 1行目のフック（呼びかけ）と、2行目のオチ（提案）の論理的関係を分解する。

# 構文テンプレート（最重要）
- 原文の構造を「変数」を使って一般化してください。
- 例: \`【[ターゲットの属性]へ】\\n[解決策]はいかが？\`
- 記号（【】や！）や改行の位置は、原文のまま残すこと。

# 出力例（構造のみ）
（具体的な単語は使わず、構造を示す）

出力はこのフォーマットに従った**プロンプト本文のみ**を返してください。
`;
    try {
        let analysis = callGemini(apiKey, prompt);
        // D列に書き込み (ロックされていてもScript所有者は書ける)
        sheet.getRange(row, 4).setValue(analysis);

        // Auto-Update Grimoire
        updateMasterDNA();
    } catch (e) {
        sheet.getRange(row, 4).setValue("Error: " + e.message);
    }
}

/**
 * 共通記事生成ロジック (Unified Factory)
 * Typeに合わせてプロンプトを切り替える
 */
function generatePostsCommon(sheetName) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    const labSheet = ss.getSheetByName(SHEET_LAB);
    const dbSheet = ss.getSheetByName(SHEET_DB); // Unused currently, using Grimoire string

    if (!sheet) {
        Browser.msgBox(`シート「${sheetName}」が見つかりません。設定メニューから修復してください。`);
        return;
    }

    let apiKey = getGeminiApiKey();
    if (!apiKey) {
        Browser.msgBox("API Key Missing");
        return;
    }

    // 0. 設定読み込み
    const settings = sheet.getRange("A1").getValue();
    let persona = "30代女性インフルエンサー。フォロワーの『親友』として、時に自分の体験を語り、時にフォロワーの相談に乗る。";

    // 0.5 Master DNA (Grimoire) & Manual Rules
    let grimoireText = "";
    let manualRules = "";
    try {
        const setSheet = ss.getSheetByName(SHEET_SETTINGS);
        if (setSheet) {
            // 1. User Persona (B5)
            const userPersona = setSheet.getRange("B5").getValue();
            if (userPersona && String(userPersona).length > 2) {
                persona = userPersona;
            }

            // 2. Grimoire (B8) - Moved from B5
            grimoireText = setSheet.getRange("B8").getValue();

            // 3. Manual Rules (B7)
            const b7 = setSheet.getRange("B7").getValue();
            if (b7 && String(b7).length > 5) {
                manualRules = b7;
            }
        }
    } catch (e) { }

    // 1. リソース取得 (Lab Data) - Fallback Logic
    let labData = [];
    if (labSheet && labSheet.getLastRow() > 1) {
        try {
            const lastLabRow = labSheet.getLastRow();
            labData = labSheet.getRange(2, 1, lastLabRow - 1, 4).getValues();
        } catch (e) { }
    }

    // 2. ターゲット特定
    const lastRow = sheet.getLastRow();
    if (lastRow < 4) return;

    // Factory Column Config
    const colType = 3;   // C
    const colHumor = 4;  // D
    const colTopic = 5;  // E
    const colAssets = 6; // F (Assets)
    const colOutput = 7; // G (Output)
    const colSelector = 8; // H (Selector)
    // colStatus Removed
    const colDraftsSource = 13; // M (Drafts)

    let targets = [];
    const data = sheet.getRange(4, 1, lastRow - 3, 13).getValues();

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const type = row[colType - 1]; // Col C
        const topic = row[colTopic - 1]; // Col E
        const output = row[colOutput - 1]; // Col F

        // Topicあり、Outputなし、Type!=まとめ
        if (topic && !output && type !== 'まとめ') {
            targets.push(i);
        }
    }

    if (targets.length === 0) {
        Browser.msgBox("生成対象(Topicあり・Outputなし)が見つかりませんでした。");
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

            // --- DNA Selection (Inside Loop) ---
            let dnaContext = "";
            let usingGrimoire = false;

            if (grimoireText && String(grimoireText).length > 50) {
                usingGrimoire = true;
                dnaContext = grimoireText;
                // Debug Confirmation (First item only)
                if (count === 0) {
                    Browser.msgBox(`【📖 魔導書モード発動】\n最強のスキルリスト(Master DNA)から、3つのアプローチを提案します。\n(Length: ${grimoireText.length})`);
                }
            } else if (grimoireText && count === 0) {
                Browser.msgBox(`【⚠️ 魔導書モード失敗】\n設定シートにデータはありますが、短すぎます(50文字以下)。\n現在の長さ: ${String(grimoireText).length}`);
            } else if (labData.length > 0) {
                // Fallback Logic from Lab if Grimoire is missing
                let candidates = labData
                    .filter(row => row[0] === type && row[3])
                    .map(row => row[3]);

                if (candidates.length === 0) {
                    candidates = labData.map(row => row[3]).filter(String);
                }

                if (candidates.length > 0) {
                    const randomDNA = candidates[Math.floor(Math.random() * candidates.length)];
                    dnaContext = `
【今回の投稿スタイル (以下の設計図に従って書いてください)】
${randomDNA}
`;
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
                    toneInstruction = `友達に「これマジでいいよ！」と教えるような、チャット風で親近感のあるトーン。`;
                    break;
                case "日常":
                    typeInstruction = `【Type: 日常ツイート】\n目的: フォロワーとの共感、エンゲージメント。何気ないエピソードから感情を引き出す。`;
                    lengthInstruction = `文字数: 200〜300文字。`;
                    toneInstruction = `日記のようにならず、読み手に向けて語りかけるスタイル。`;
                    break;
                case "有益":
                    typeInstruction = `【Type: 有益情報】\n目的: 「保存」や「シェア」。役立つ知識やノウハウ。`;
                    lengthInstruction = `文字数: **300文字以内** (Threadsの仕様限界)。\n冗長な表現を削ぎ落とし、情報を圧縮してください。ダラダラ書くのは厳禁。`;
                    toneInstruction = `頼れるお姉さんのような、優しくも説得力のあるトーン。`;
                    break;
                case "Free":
                    typeInstruction = `【Type: Free (推敲・微調整)】\n目的: 原文(Topic)の良さを活かしつつ、プロの視点で「読みやすく」「魅力的」に磨き上げる。`;
                    lengthInstruction = `文字数: 原文の意図を損なわない範囲で調整（極端な短縮や水増しはしない）。`;
                    toneInstruction = `原文のトーンを尊重しつつ、ぎこちない部分だけを整える。大幅なキャラ変更はしない。`;
                    break;
                default:
                    // Fallback (or if user selected nothing)
                    typeInstruction = `【Type: 一般投稿】\n目的: フォロワーを楽しませる。`;
                    lengthInstruction = `文字数: 200文字程度。`;
                    toneInstruction = `明るくポジティブに。`;
            }

            // Humor Handling & Logic Circuits
            let humorInstruction = "";
            if (humor === "Lv3: 全力") {
                humorInstruction = `
【ユーモア戦略: 爆笑・自虐 (Comedy)】
読者を笑わせ、拡散を狙うための強いスパイスを投入します。
**使用可能な公式（ランダムに選択）**:
- **公式1: The Rule of Three (三段オチ)**: 普通→普通→【異常】のリズムを使う。
- **公式4: Me vs. World (自虐)**: 「みんなはキラキラ、私はボロボロ」の対比を使う。
- **公式7: The Benign Violation (緩和された違反)** (New): 「魂を売る」などドキッとする発言を、安全な文脈で使う。
指示: リスクを恐れず、自分の失敗談や情けなさをネタにしてください。
`;
            } else if (humor === "Lv1: 控えめ") {
                humorInstruction = `
【ユーモア戦略: 安心・知的 (Trust)】
読者に「クスッ」とした笑いと安心感を与え、信頼を築きます。
**使用可能な公式（これ以外禁止）**:
- **公式6: The Playful Label (愛嬌のある造語)**: ターゲットを「〇〇民」や「〇〇族」と可愛く呼ぶ。
- **公式5: Metaphor (比喩)**: わかりにくい概念を、身近なもの（例：ダイエット＝自分とのプロレス）に例える。
- **公式9: The Insignificant Detail (どうでもいい話)** (New): 大きなテーマの中で、あえて「靴下が合わない」など些細なことにこだわる。
指示: 決してふざけすぎず、知的なウィットで包むこと。自虐や攻撃は禁止。
`;
            } else {
                // Lv2: 標準
                humorInstruction = `
【ユーモア戦略: 共感・スパイス (Relatability)】
日常の投稿にスパイスを加え、飽きさせない工夫をします。
**使用可能な公式（ランダムに選択）**:
- **公式2: Specific Hyperbole (具体的すぎる誇張)**: 単に「疲れた」ではなく「スマホの充電1%くらい瀕死」と言う。
- **公式3: The Honest Reversal (本音の裏切り)**: カッコいいことを言った直後に、カッコ悪い本音を漏らす。
- **公式8: The Joy of Debugging (思考のバグ)** (New): 「サボりではない、積極的待機だ」のように、あえておかしな理屈を自信満々に言う。
- **公式10: The Ride & Deny (ノリツッコミ)** (New): 「やる気満々です！(嘘です)」のように、一度肯定してから裏切る。
指示: 読者が「わかるｗ」と共感できる、程よい温度感のユーモアを目指すこと。
`;
            }

            // --- DNA Priority Override ---
            // DNAがある場合は、Type指示の制約（文字数など）を緩和または無効化し、DNAの構造を最優先する
            if (usingGrimoire) {
                lengthInstruction = "※文字数・トーン・構成は、選定したスキルのルールに完全に従うこと。";
                toneInstruction = "";
                typeInstruction += "\\nIMPORTANT: 下記の【Master DNA Grimoire】から、このネタに適したスキルを**3つ**選択してください。\\n" +
                    "**選定基準**: ターゲットの感情を動かすための「異なるアプローチ（例：共感型、笑い型、有益型）」を3つ提案すること。\\n" +
                    "**執筆ルール**: 各案について、選択したスキルの**「構文・改行位置・語尾」を完全にコピー**してください。内容（名詞や動詞）だけを入れ替え、**リズムや構造はDNAのまま**にすること。\\n" +
                    "【出力形式】\\n" +
                    "---案1: [スキル名]---\\n(選択したスキルの構文をトレースして執筆)\\n\\n" +
                    "---案2: [スキル名]---\\n(選択したスキルの構文をトレースして執筆)\\n\\n" +
                    "---案3: [スキル名]---\\n(選択したスキルの構文をトレースして執筆)\\n" +
                    "※普通の文章は禁止です。必ず「魔導書のスキル」の構造をトレースしてください。\\n" +
                    "※選定理由や解説は一切出力しないでください。投稿内容のみを出力すること。";
            } else if (dnaContext) {
                if (type === "単品") {
                    lengthInstruction = "※文字数制限なし（DNAの設計図に従うこと）";
                    toneInstruction = "※トーン指定なし（DNAの設計図に従うこと）";
                    typeInstruction += "\nIMPORTANT Override: 下記の【投稿スタイル(設計図)】の構成とリズムを完全再現してください。デフォルトのルールより設計図を優先すること。";
                } else {
                    typeInstruction += "\nIMPORTANT: 下記の【投稿スタイル(設計図)】がある場合、その構成を優先してください。";
                }
            }

            const prompt = `
あなたはThreadsの人気インフルエンサーです。
以下の「ネタ」から、指定されたTypeに合わせて投稿を作成してください。

【入力ネタ】
${topic}

【基本設定】
${persona}
**【重要定義: バラエティ番組モデル】**
あなたの役割は「真面目な解説」を「エンタメ」に変えることです。
ただし、**「DNA（スタイル）」のトーンを最優先**してください。

1.  **世界観の統一**:
    - DNAが「毒舌系」なら毒舌で笑わせて、「癒やし系」なら優しいユーモア（比喩など）で包んでください。無理にハイテンションにする必要はありません。
2.  **天才的な言葉選び (Wordplay)**:
    - 平凡な言葉（例: 疲れた）を避けてください。「HP残り1」のように、**自分のキャラに合った造語**に変換する癖をつけてください。
3.  **【禁止事項】安易な呼びかけの排除**:
    - **「同志よ」や「皆の衆」といった呼びかけはダサいので禁止します。**
    - 読者とは「言葉にしなくても通じ合っている」関係です。わざわざ呼びかけず、中身で共感させてください。

【思考プロセス（DNAに記載がある場合、必ず実行せよ）】
DNAに \`# 思考プロセス\` がある場合、書く前に必ずそのステップをシミュレーションすること。
いきなり書くのではなく、「ターゲットのあだ名」や「悩みの定義」を先に脳内で決定してから、テンプレートに当てはめてください。

【Type指示】
${typeInstruction}
${lengthInstruction}
${toneInstruction}

【ユーモア指示】
${humorInstruction}

${dnaContext || ""} 

【追加ルール (秘伝のタレ)】
${manualRules ? "参考にしているマニュアルからの重要心得:\n" + manualRules : "特になし"}

【指示】
- 30代女性に刺さる言葉選び。
- ハッシュタグは**一切禁止** (Threadsの仕様)。
- **マニュアルの戦略的適用 (超重要)**:
    - 「追加ルール(秘伝のタレ)」に記載された**具体的な戦略やバイラルワード（例：特定のブランド名など）**を、文脈に合わせて自然に織り交ぜてください。
    - **SEO/検索流入狙い**: トピックが「椅子」など抽象的な場合、「無印の椅子です」と嘘をつくのではなく、**「無印やIKEAが好きな人なら絶対ハマる」**や**「ニトリの家具とも相性良さそう」**のように、**検索されやすい関連ワードを会話の中にドロップ**してください。
- **文脈判定**: 「母の日」「父の日」「出産祝い」などは、**自分が貰うのではなく、誰かに贈る話**です。この「主語とターゲット」を間違えないでください。
- **最重要: 「投稿スタイル(設計図)」が指定されている場合、その構文・改行位置・文体を100%再現してください。内容だけを変えて、形はそのまま真似ること。**
- **「同志」などの古臭い呼びかけは絶対に使わないこと。**
- 出力は**投稿本文のみ** (解説不要)。
`;

            let generatedText = callGemini(apiKey, prompt);
            generatedText = generatedText.replace(/#\S+/g, '').trim();

            if (usingGrimoire) {
                // Save Full Blob to Col M
                sheet.getRange(rowIndex, colDraftsSource).setValue(generatedText);

                // Set Selector to "案1"
                sheet.getRange(rowIndex, colSelector).setValue("案1");

                // Parse "Draft 1"
                let draft1 = generatedText;
                const match = generatedText.match(/---案1:.*?---\n([\s\S]*?)---案2:/);
                if (match && match[1]) {
                    draft1 = match[1].trim();
                } else {
                    // Fallback
                    const split = generatedText.split("---案2:");
                    if (split.length > 0) draft1 = split[0].replace(/---案1:.*?---/, "").trim();
                }

                sheet.getRange(rowIndex, colOutput).setValue(draft1);

            } else {
                sheet.getRange(rowIndex, colOutput).setValue(generatedText);
                sheet.getRange(rowIndex, colDraftsSource).clearContent();
                sheet.getRange(rowIndex, colSelector).clearContent();
            }


            count++;

            Utilities.sleep(1000); // 

        } catch (e) {
            const rowIndex = dataIndex + 4;
            sheet.getRange(rowIndex, colOutput).setValue("エラー: " + e.message);
        }
    }
    Browser.msgBox(`${count}件の投稿を作成しました！`);
}


/**
 * 【単品】まとめネタ作成 (選択合体)
 */
function generateSummaryPost() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_BOARD);
    if (!sheet) return;

    // API Key
    let apiKey = getGeminiApiKey();
    if (!apiKey) { Browser.msgBox("API Key Missing"); return; }

    const lastRow = sheet.getLastRow();
    if (lastRow < 4) { Browser.msgBox("データがありません。"); return; }

    // データ取得 (A:Select, C:Type, D:Humor, E:Topic, F:Assets, G:Output)
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
    const settings = sheet.getRange("A1").getValue();

    const prompt = `
あなたはThreadsの人気インフルエンサーです。
以下の「複数の投稿内容(またはネタ)」を素材として、**1つの「まとめ投稿」**を新規に書き下ろしてください。

【素材リスト】
${combinedContent}

【基本設定】
30代女性、共感を呼ぶインフルエンサー

【ユーモア度: ${humorLevel}】

【指示】
- タイトルや導入で「これだけは見て！」という引きを作ってください。
- 「○選」や「まとめ」の形式で再構成。
- 読みやすさ重視。
- **ハッシュタグ禁止。**
- 出力は**投稿本文のみ**。
`;

    try {
        let text = callGemini(apiKey, prompt);
        text = text.replace(/#\S+/g, '').trim();

        // 末尾に追加
        sheet.appendRow([
            false,           // Select
            "",              // No
            "まとめ",        // Type
            humorLevel,      // Humor
            "選択されたネタのまとめ", // Topic
            text,            // Output
            "",              // Image
            "Generated"      // Status
        ]); // sheet.appendRow maps to col A onwards. A=False.

        // Fix status manually if needed or trust appendRow aligns (A-H is 8 cols)
        // appendRow appends to the first empty row.

        Browser.msgBox("まとめ投稿を作成しました！");
    } catch (e) {
        Browser.msgBox("エラー: " + e.message);
    }
}

// function shipCommon() { ... } // Removed



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
    if (lastRow < 4) return;

    // I: System ID (Index 8), L: Analysis (Index 11)
    const range = boardSheet.getRange(4, 1, lastRow - 3, 12); // Reduced width
    const data = range.getValues();
    let updateCount = 0;

    data.forEach((row, i) => {
        const sysId = row[8]; // Index 8 (I列)
        if (!sysId) return;

        try {
            // Get Insights
            // Insights API: GET /{media_id}/insights?metric=views,likes,replies,reposts,quotes
            const url = `https://graph.threads.net/v1.0/${sysId}/insights?metric=views,likes,replies,reposts,quotes&access_token=${token}`;
            const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
            const json = JSON.parse(resp.getContentText());

            if (json.data) {
                // Format: [{name: "likes", values: [{value: 10}]}, ...]
                let analysis = {};
                json.data.forEach(item => {
                    const val = item.values && item.values.length > 0 ? item.values[0].value : 0;
                    analysis[item.name] = val;
                });

                // Write back JSON string (Col L = 12)
                boardSheet.getRange(4 + i, 12).setValue(JSON.stringify(analysis));
                updateCount++;
            }
        } catch (e) {
            // IDが無効等の場合、スキップ
        }
    });

    Browser.msgBox(`${updateCount}件の投稿データを更新しました。`);
}

function debugListModels() {
    // Debug: Explicitly check Settings B4
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let b4Val = "";
    try {
        const sheet = ss.getSheetByName(SHEET_SETTINGS);
        if (sheet) b4Val = sheet.getRange("B4").getValue();
    } catch (e) { b4Val = "Error reading B4"; }

    const apiKey = getGeminiApiKey();
    const b4Show = b4Val ? String(b4Val).substring(0, 4) : "EMPTY";
    const keyShow = apiKey ? String(apiKey).substring(0, 4) : "EMPTY";

    Browser.msgBox(`Debug Start:\nSettings!B4: ${b4Show}...\nResolved Key: ${keyShow}...`);

    if (!apiKey) {
        Browser.msgBox("API Keyが見つかりません。");
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
    try {
        const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        const json = JSON.parse(response.getContentText());

        if (json.models) {
            const genModels = json.models
                .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
                .map(m => m.name.replace("models/", ""))
                .join("\\n");
            Browser.msgBox("【使用可能なモデル一覧】\\n" + genModels);
        } else {
            Browser.msgBox("モデル一覧が取得できませんでした。\nError: " + JSON.stringify(json));
        }
    } catch (e) {
        Browser.msgBox("通信エラー: " + e.message);
    }
}

/**
 * テンプレートDBシートの構築
 * スキル（DNA）を管理するデータベースを作成する
 */
function setupTemplateDatabase() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let dbSheet = ss.getSheetByName(SHEET_DB);
    if (!dbSheet) {
        dbSheet = ss.insertSheet(SHEET_DB);
    }

    // Headers
    const headers = [
        "A: ID (Auto)", "B: Skill Name", "C: Context/Target", "D: Syntax Template",
        "E: Humor Formula", "F: Type", "G: Source (Lab URL)", "H: Status (Active/Archived)", "I: Rating (1-5)"
    ];

    // Set Headers if row 1 is empty
    if (dbSheet.getLastRow() === 0) {
        dbSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        dbSheet.setFrozenRows(1);
        dbSheet.getRange("A:I").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP); // Wrap text
        dbSheet.setColumnWidth(2, 200); // Name
        dbSheet.setColumnWidth(3, 200); // Context
        dbSheet.setColumnWidth(4, 300); // Syntax

        // Add Validation for Status
        const rule = SpreadsheetApp.newDataValidation().requireValueInList(["Active", "Archived"]).build();
        dbSheet.getRange("H2:H1000").setDataValidation(rule);

        // Add sample
        dbSheet.getRange(2, 1, 1, 8).setValues([[
            Utilities.getUuid(),
            "Sample Skill: The Whisper",
            "Target: Mothers. Context: Gift giving.",
            "【[Target]へ】\n[Suggestion]はいかが？",
            "None",
            "Offer",
            "Manual",
            "Active"
        ]]);
    }
    Browser.msgBox("テンプレートDBを初期化しました。");
}

/**
 * 【設定】DNA統合 (グリモワール化)
 * 研究所の全てのDNAを統合し、一つの「汎用スキルリスト」を作成する
 */
const HUMOR_LIBRARY = `
## 1. The Rule of Three (三段オチ)
**Establish pattern, then break it.**
- **Structure**: "Normal A, Normal B, [Absurd C]"

## 2. Specific Hyperbole (具体的すぎる誇張)
**Replaces generic adjectives with absurdly specific visuals.**
- **Structure**: "Not just [Adjective], but [Adjective] like [Specific Scene]"

## 3. The Honest Reversal (急な裏切り/本音)
**High status introduction -> Low status confession.**
- **Structure**: [Serious/Professional Statement] + [Pathetic/Lazy Reality]

## 4. The "Me vs. World" Contrast (自虐)
**Blaming oneself for a universal problem.**
- **Structure**: "Everyone else: [Success]. Me: [Struggle]."

## 5. Metaphorical Juxtaposition (異種格闘技戦)
**Comparing the topic to something completely unrelated.**
- **Structure**: "[Topic] is like [Unrelated Thing] because [Shared Trait]."

## 6. The Playful Label (愛嬌のある造語)
**Converting a negative or boring attribute into a cute "Character Name".**
- **Structure**: [Target Attribute] -> [Playful Neologism]

## 7. The Benign Violation (緩和された違反)
**Something "wrong" (violation) + something "safe" (benign) = Humor.**
- **Structure**: [A mild threat/taboo/insult] + [Playful context/Safety net]

## 8. The Joy of Debugging (思考のバグ)
**Presenting a logical error that the reader's brain enjoys "fixing".**
- **Structure**: [Impossible Logic] + [Confident Assertion]

## 9. The Insignificant Detail (どうでもいい話)
**Focusing intensely on a trivial detail while ignoring the main event.**
- **Structure**: [Big Event] -> [Focus on tiny, irrelevant detail]

## 10. The Ride & Deny (ノリツッコミ/1回肯定)
**Agreeing with a false premise to build tension, then dropping it.**
- **Structure**: [Total Agreement/Praise] -> [Sudden Denial/Reality Check]
`;

function updateMasterDNA() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // 0. Ensure DB exists
    setupTemplateDatabase();

    const labSheet = ss.getSheetByName(SHEET_LAB);
    const dbSheet = ss.getSheetByName(SHEET_DB);
    let setSheet = ss.getSheetByName(SHEET_SETTINGS);

    if (!labSheet || !dbSheet) return;

    // --- Phase 1: Sync Lab -> DB ---
    const lastLabRow = labSheet.getLastRow();
    if (lastLabRow > 1) {
        // Lab Data: Type(A), Context(B), DNA(D)
        const labValues = labSheet.getRange(2, 1, lastLabRow - 1, 4).getValues();

        // Read Existing Syntaxes from Col D (Index 3)
        const lastDbRow = dbSheet.getLastRow();
        const existingSyntaxes = lastDbRow > 1 ? dbSheet.getRange(2, 4, lastDbRow - 1, 1).getValues().flat().map(String) : [];

        const newRows = [];
        labValues.forEach(row => {
            const type = row[0];
            const context = row[1];
            const dna = row[3];

            // Generate UUID if needed, but here simple sync
            // Check uniqueness by full Syntax string
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
    // Analyze rows where Humor Formula (Col E/Index 4) is 'Auto-Analyze required'
    const dbLastRow = dbSheet.getLastRow();
    if (dbLastRow > 1) {
        const checkRange = dbSheet.getRange(2, 1, dbLastRow - 1, 9);
        const checkValues = checkRange.getValues();

        const apiKey = getGeminiApiKey(); // Get Key for this phase

        checkValues.forEach((row, idx) => {
            const formula = row[4];
            const status = row[7];

            if (status === "Active" && (formula === "Auto-Analyze required" || formula === "")) {
                // Classify this DNA
                const skillName = row[1];
                const syntax = row[3];
                const classifyPrompt = `
あなたはユーモア分析のスペシャリストです。
以下の「SNS投稿テンプレート（DNA）」に、最も相性の良い「ユーモア公式」を1つ選んでください。

【分析対象DNA】
名称: ${skillName}
構文:
${syntax}

【ユーモア公式リスト】
${HUMOR_LIBRARY}

【指示】
- このDNAの構文やリズムに、最もフィットする公式を1つだけ選んでください。
- 例: 「自虐的な構文」なら「Formula 4」、「対比構造」なら「Formula 5」など。
- 出力は**公式名のみ**（例: Formula 4: Me vs. World）を返してください。解説不要。
`;
                try {
                    if (apiKey) {
                        let bestFormula = callGemini(apiKey, classifyPrompt).trim();
                        // Update DB Cell (Col E is Index 5 in Sheet, but Row is idx + 2)
                        dbSheet.getRange(idx + 2, 5).setValue(bestFormula);
                        Utilities.sleep(500); // Rate limit
                    }
                } catch (e) {
                    // Ignore error, try next time
                }
            }
        });
    }

    // --- Phase 2: DB -> Grimoire ---
    // Read ONLY Active rows from DB
    const finalDbRow = dbSheet.getLastRow();
    if (finalDbRow < 2) {
        Browser.msgBox("テンプレートDBに有効なスキルがありません。");
        return;
    }

    const dbData = dbSheet.getRange(2, 1, finalDbRow - 1, 9).getValues();
    // Filter Active (Col H = 'Active')
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

1. **Persona Extraction (口調・キャラの抽出)**:
   - 登録されたスキル全体に共通する「語尾」「リズム」「絵文字の使い方」を分析してください。
   - 例: 「〜だよね」が多いなら「親近感MAXの友達キャラ」、「言い切り」が多いなら「辛口ご意見番キャラ」。
   - これを「Character DNA」として定義し、**ユーザーが入力した基本プロフィール（性別・年齢）に上乗せすべき「性格」**として言語化すること。

2. **Skill Synthesis (スキルの体系化)**:
   - 個別のスキルを、あらゆるシチュエーションに応用できる「汎用ルール」に昇華させてください。
   - 理論知（ユーモア公式）と組み合わせて、最強のリストにすること。

【出力形式】
# 🃏 Master DNA Grimoire

## 🧬 Character DNA (人格・口調定義)
- **Voice**: (例：サバサバしているが、実は面倒見が良い姉御肌)
- **Ending**: (例：語尾は「〜じゃん？」「〜かも。」を多用し、堅苦しさを消す)
- **Formatting**: (例：改行を細かく入れて、空白を恐れない)

## 🟢 Skill: 処方箋コピー（共感×提案）
...(略)...
`;

    const apiKey = getGeminiApiKey();
    if (!apiKey) return;

    try {
        const grimoire = callGemini(apiKey, prompt);

        // Save to Settings Sheet (Col B, Row 8) -> Moved from B5
        if (!setSheet) {
            setSheet = ss.insertSheet(SHEET_SETTINGS);
        }

        // Label update if needed (Optional, user might handle manual setup)
        // But let's ensure labels exist.
        setSheet.getRange("A5").setValue("Persona (基本プロフィール)");

        setSheet.getRange("A8").setValue("Master DNA (Grimoire)");
        setSheet.getRange("B8").setValue(grimoire);
        setSheet.getRange("B9").setValue("Last Updated: " + new Date());


        // No popup needed for auto-run.
    } catch (e) {
        Browser.msgBox("Error: " + e.message);
    }
}

// ------------------------------------------
// 共通関数
// ------------------------------------------

function getGeminiApiKey() {
    let key = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    if (!key) {
        // Fallback: Check Settings Sheet (Row 4, Col B)
        try {
            const ss = SpreadsheetApp.getActiveSpreadsheet();
            const sheet = ss.getSheetByName(SHEET_SETTINGS);
            if (sheet) {
                key = sheet.getRange("B4").getValue();
            }
        } catch (e) {
            // Ignore error
        }
    }
    return key;
}

function getThreadsCredentials() {
    // Placeholder (Implement PropertiesService or direct input)
    // For now, assume stored properties: THREADS_USER_ID, THREADS_TOKEN
    const p = PropertiesService.getScriptProperties();
    const userId = p.getProperty("THREADS_USER_ID");
    const token = p.getProperty("THREADS_TOKEN");
    if (!userId || !token) return null;
    return { userId, token };
}

function callGemini(apiKey, prompt) {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
    const payload = {
        contents: [{ parts: [{ text: prompt }] }]
    };
    const options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());

    if (json.candidates && json.candidates.length > 0) {
        return json.candidates[0].content.parts[0].text;
    } else {
        throw new Error("Gemini API Error: " + JSON.stringify(json));
    }
}

/**
 * 【設定】番組表リセット
 * 曜日×時間のグリッド形式でスケジュールを作成
 */
function setupScheduleSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = SHEET_SCHEDULE; // "番組表"
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
        sheet = ss.insertSheet(sheetName);
    }

    // 1. Clear & Init
    sheet.clear();
    sheet.getRange("A:I").clearDataValidations(); // A-I

    // 2. Col A: Description (Usage Guide)
    sheet.setColumnWidth(1, 250); // A
    sheet.getRange("A1").setValue("【番組表の使い方】");
    sheet.getRange("A1").setFontWeight("bold").setBackground("#fff2cc"); // Light Yellow

    const guideText =
        "1. 投稿ボードで放送したいネタの\n" +
        "   「ON AIR」にチェック✅\n\n" +
        "2. この表で「放送タイプ」を指定\n" +
        "   (例: 12:00は「日常」)\n\n" +
        "3. 時間になると自動で\n" +
        "   ボットが放送を開始します！\n\n" +
        "※枠が空欄の場合は放送しません。\n" +
        "※同じタイプが複数ON AIRの\n" +
        "   場合は、順番に放送されます。";

    sheet.getRange("A2").setValue(guideText);
    sheet.getRange("A2").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    sheet.getRange("A2").setVerticalAlignment("top");
    sheet.getRange("A2:A11").merge(); // Merge for cleaner look alongside grid
    sheet.getRange("A2:A11").setBackground("#fff2cc");

    // 3. Grid Setup (Times x Days) -> Shifted to B (Time), C-I (Days)

    // Headers (C1:I1) -> Mon, Tue, ...
    const days = ["Mon (月)", "Tue (火)", "Wed (水)", "Thu (木)", "Fri (金)", "Sat (土)", "Sun (日)"];
    sheet.getRange("C1:I1").setValues([days]);
    sheet.getRange("B1").setValue("Time");

    // Style Headers
    const headerRange = sheet.getRange("B1:I1");
    headerRange.setBackground("#4a86e8"); // Blue
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");

    // 4. Time Slots (Col B, 10 slots)
    // Validation for Time
    const timeOptions = [];
    for (let h = 6; h <= 23; h++) {
        timeOptions.push(`${("0" + h).slice(-2)}:00`);
        timeOptions.push(`${("0" + h).slice(-2)}:30`);
    }
    const timeRule = SpreadsheetApp.newDataValidation().requireValueInList(timeOptions, true).build();
    sheet.getRange("B2:B11").setDataValidation(timeRule);

    // Default Times (Sample)
    const sampleTimes = [["08:00"], ["10:00"], ["12:00"], ["15:00"], ["18:00"], ["19:00"], ["20:00"], ["21:00"], ["22:00"], ["23:00"]];
    sheet.getRange("B2:B11").setValues(sampleTimes);

    // 5. Content Grid (C2:I11)
    // Validation for Type
    const typeRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['単品', '日常', '有益', 'まとめ', 'Free'], true).build();
    sheet.getRange("C2:I11").setDataValidation(typeRule);

    // Style Grid
    sheet.setColumnWidth(2, 80); // Time (B)
    for (let c = 3; c <= 9; c++) sheet.setColumnWidth(c, 100); // Days (C-I)

    // Borders
    sheet.getRange("B1:I11").setBorder(true, true, true, true, true, true, "#cccccc", SpreadsheetApp.BorderStyle.SOLID);

    Browser.msgBox("番組表をリニューアルしました！\nA列に使い方説明を追加しました。");
}

/**
 * 【設定】マニュアル作成
 * APIキーやIDの取得方法をまとめたシートを作成
 */
/**
 * 【設定】マニュアル作成
 * ユーザー向けの詳細な取扱説明書を作成する
 */
function setupManualSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = SHEET_MANUAL; // "マニュアル"
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
        sheet = ss.insertSheet(sheetName);
    }

    sheet.clear();

    // --- タイトルエリア ---
    sheet.getRange("A1").setValue("📘 Threads職人 運用マニュアル (v2.0)");
    sheet.getRange("A1").setFontSize(16).setFontWeight("bold").setFontColor("#1e3a8a"); // Dark Blue
    sheet.getRange("A2").setValue("このシステムは、あなたの投稿を管理し、最強のAIパートナーとして進化し続ける運用ツールです。");

    // --- セクションスタイル定義 ---
    const setHeaderStyle = (range, color = "#cfe2f3") => {
        range.setBackground(color).setFontWeight("bold").setFontSize(11).setBorder(true, true, true, true, true, true);
    };
    const setBodyStyle = (range) => {
        range.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP).setVerticalAlignment("top");
    };

    // (Old Section 1 Moved to Bottom)


    const sheetGuides = [
        [
            "シート名", "趣旨・役割", "ここがポイント！ (活用テクニック)"
        ],
        [
            "🧪 バズ研究所\n(Lab)",
            "【最強の「文体」収集施設】\nバズった他人の投稿をここに貼り付けると、AIがその「バズりの構造(DNA)」を解析・抽出します。\n\nただの保存場所ではありません。\nここは「AIの学習データ」そのものです。",
            "★入れれば入れるほど進化する！\nDNAデータが増えれば増えるほど、AIの引き出しが増えます。\n\n★『口調』もコピー可能です\nあなたが「こういうキャラになりたい！」と思う人の投稿を意図的に集めてください。\n（統一感のある学習データを入れることで、AIのキャラがブレずに確立されます！）"
        ],
        [
            "📝 投稿作成ボード\n(Board)",
            "【メインの作業場所】\nネタ出しから投稿文の生成、放送予約までを一元管理するコックピットです。\n\n放送局の調整卓のように、複数の「案」を見比べながらベストな投稿を作り上げます。",
            "★テキトーでOK！\n「Topic」に入れる言葉は、完成された文章である必要はありません。\n「ダイエット 辛い」「最近のAI すごい」といった単語や、思いついた独り言を入れるだけで、AIが魅力的な投稿に仕上げてくれます。"
        ],
        [
            "📅 番組表\n(Schedule)",
            "【完全自動化の司令塔】\n「いつ」「どのジャンル」を放送するかを決めるスケジュール表です。\n\nここに予定を入れておけば、あとはボードで「ON AIR」にするだけで、時間通りに勝手に投稿されます。",
            "★リズムを作ろう\n「朝は有益」「夜は日常（共感）」のように、フォロワーの生活リズムに合わせて番組を編成するのがコツです。"
        ]
    ];

    // 書き込み & スタイリング
    // Shifted down by roughly 18 rows
    sheet.getRange("B24:D28").setValues(sheetGuides);
    setHeaderStyle(sheet.getRange("B24:D24"), "#4a86e8"); // Header Blue
    sheet.getRange("B24:D24").setFontColor("white");

    setBodyStyle(sheet.getRange("B25:D28"));
    sheet.getRange("B25:D28").setBorder(true, true, true, true, true, true, "#cccccc", SpreadsheetApp.BorderStyle.SOLID);

    // 特定セルの強調
    sheet.getRange("C25").setFontColor("#c90000").setFontWeight("bold"); // Labの趣旨
    sheet.getRange("D25").setBackground("#fff2cc"); // Labのポイント背景

    sheet.setColumnWidth(1, 20);  // Spacer
    sheet.setColumnWidth(2, 120); // Name
    sheet.setColumnWidth(3, 300); // Purpose
    sheet.setColumnWidth(4, 300); // Tips

    // ==========================================
    // 1. 初期設定 (Setup) - 最優先で表示
    // ==========================================
    sheet.getRange("A4").setValue("⚙️ 初期設定 (最初にこれだけやってください)");
    sheet.getRange("A4").setFontSize(12).setFontWeight("bold");

    // 詳細な手順を復活 (Expanded Text)
    const setupDetails = [
        ["1. Gemini API Key (AIの頭脳)", "必須", "無料で取得できます。"],
        ["   手順:", "1. https://aistudio.google.com/app/apikey にアクセス", ""],
        ["", "2. Googleアカウントでログインし、「Create API key」をクリック", ""],
        ["", "3. 生成されたキーをコピーし、「設定」シートのB4セルに貼り付け", ""],

        ["2. Threads User ID (あなたのアカウントID)", "必須", "自分の投稿を取得するために必要です。"],
        ["   手順:", "1. PCで自分のプロフィールページ (threads.net/@user) を開く", ""],
        ["", "2. 何もないところで右クリック -> 「ページのソースを表示」", ""],
        ["", "3. Ctrl + F で「user_id」と検索", ""],
        ["", "4. 近くにある数字（例: 1234567890）をコピーし、「設定」シートのB2セルに貼り付け", ""],

        ["3. Access Token (自動投稿用の鍵)", "任意", "自動投稿したい場合のみ必要です（未設定でも生成は可能）。"],
        ["   手順:", "1. Meta for Developers (developers.facebook.com) でアプリを作成", ""],
        ["", "2. 「Threads API」を追加し、テスターとして自分を追加", ""],
        ["", "3. トークン生成ツールで発行し、「設定」シートのB3セルに貼り付け", ""],

        ["4. Persona (あなたの基本プロフィール)", "必須", "AIのキャラ設定の土台になります。"],
        ["   手順:", "1. 「設定」シートのB5セルに「28歳女性、会社員」のように入力", ""]
    ];

    sheet.getRange("B6:D19").setValues(setupDetails);

    // Style
    sheet.getRange("B6:D19").setVerticalAlignment("middle");
    sheet.getRange("B6:D6").setFontWeight("bold").setBackground("#d9d2e9"); // Header like row
    sheet.getRange("B10:D10").setFontWeight("bold").setBackground("#d9d2e9");
    sheet.getRange("B15:D15").setFontWeight("bold").setBackground("#d9d2e9");
    sheet.getRange("B19:D19").setFontWeight("bold").setBackground("#d9d2e9");

    // ==========================================
    // 2. 各シートの役割 (Sheet Guide) - 下に移動
    // ==========================================
    sheet.getRange("A22").setValue("🚀 各シートの役割と「できること」");
    sheet.getRange("A22").setFontSize(12).setFontWeight("bold");

    // ... (Sheet Guide Data maps to B24)
    const sheetGuideStartRow = 24;
    // ==========================================
    // 3. 使い方の流れ (Flow)
    // ==========================================
    sheet.getRange("A39").setValue("🔄 毎日の運用フロー");
    sheet.getRange("A39").setFontSize(12).setFontWeight("bold");

    const flowText =
        "1. 【仕入れ】\n" +
        "   X(旧Twitter)やThreadsで「いいな」と思った投稿を見つけたら、すぐに『バズ研究所』にコピペします。\n" +
        "   (これがAIの栄養になります)\n\n" +
        "2. 【制作】\n" +
        "   『投稿作成ボード』を開き、Topicにネタ（今日あったこと、言いたいこと）を書き殴ります。\n" +
        "   メニューから「投稿一括生成」を実行し、出てきた3案から好きなものを選びます。\n\n" +
        "3. 【予約】\n" +
        "   内容がOKなら「ON AIR」にチェックを入れます。\n" +
        "   これだけで、あとは『番組表』のスケジュールに従って自動で世に放たれます。";

    sheet.getRange("B41").setValue(flowText);
    sheet.getRange("B41").setBackground("#f3f6f4").setBorder(true, true, true, true, true, true);
    sheet.getRange("B41").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP).setVerticalAlignment("top").setPadding(10, 10, 10, 10);
    sheet.getRange("B41:D41").merge(); // Wide box
    sheet.setRowHeight(41, 200);

    Browser.msgBox("マニュアルシートを大幅リニューアルしました！(v2.0)");
}

/**
 * 【ヒント】表示切替
 * 投稿作成ボードのヘッダーに解説(Note)を付与/削除する
 */
function showTips() { toggleTips(true); }
function hideTips() { toggleTips(false); }

/**
 * 【ヒント】表示切替
 * アクティブなシートに応じて、ヘッダーに解説(Note)を付与/削除する
 */
function showTips() { toggleTips(true); }
function hideTips() { toggleTips(false); }

function toggleTips(enable) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();
    const sheetName = sheet.getName();

    let hints = {};
    let targetRow = 1;

    // シートごとのヒント定義
    if (sheetName === SHEET_BOARD) {
        targetRow = 3;
        hints = {
            1: "【ON AIR (放送予約)】\nチェックを入れると、番組表のスケジュールに従って自動で放送（投稿）されます。",
            2: "【No】\n投稿の管理番号です。",
            3: "【Type (投稿タイプ)】\n・単品: 短い紹介 (140字)\n・日常: 共感ツイート (250字)\n・有益: ノウハウ解説 (300字以内)\n・まとめ: 複数ネタの合体\n・Free: 原文の推敲・ブラッシュアップ",
            4: "【Humor (面白さ)】\n・Lv1: 控えめ (知的)\n・Lv2: 標準 (共感)\n・Lv3: 全力 (自虐・毒舌)",
            5: "【Topic (ネタ)】\nここに書きたいことのメモや下書きを入力してください。\nFreeタイプの場合は、ここに書いた文章がそのまま推敲されます。",
            6: "【Assets (素材)】\n画像URLやファイル名をメモする場所です。(AI生成には影響しません)",
            7: "【Output (生成結果)】\nAIが書いた文章がここに出ます。\n自由に手直ししてOKです！",
            8: "【Selector (案)】\n案1〜3を切り替えられます。\n切り替えるとOutputが上書きされるので注意！"
        };
    } else if (sheetName === SHEET_LAB) {
        targetRow = 1;
        hints = {
            1: "【Type (種類)】\nネタの種類を選んでください。\n(例: 日常ツイートのサンプルなら「日常」)",
            2: "【Image Context (背景)】\nもし画像付きの投稿なら、どんな写真だったかメモしてください。\n(文字だけの投稿なら空欄でOK)",
            3: "【Raw Post (原文)】\nバズった投稿の本文をそのまま貼り付けてください。\n→貼り付けると自動で解析が始まります(数秒後)。\n※初回のみメニューの『自動分析トリガー設定』を実行してください。",
            4: "【DNA (構造・型)】\n🤖 AI分析エリア\nAIがバズりの構造を解析してここに書き込みます。\n※編集不可(ロック中)"
        };
    } else if (sheetName === SHEET_SETTINGS) {
        // Settings Sheet (Target B5 for Grimoire)
        // Usually hints are on Headers, but Grimoire is a specific cell (B5)
        // Let's just put it on the Title "Master DNA" if it exists, roughly B4?
        // Assuming B4 is label.
        // Or directly on B5.
        targetRow = 5;
        // For Settings, map is slightly different, key is column index for that specific row? 
        // Let's assume user wants to know what B5 is.
        // Let's target specific cells for Settings.
        if (enable) {
            sheet.getRange("B5").setNote("【Master DNA (魔導書)】\nAIの「脳みそ」が入っています。\n研究所とDBから抽出された「勝ちパターン」がここに集約され、すべての生成時に参照されます。");
            Browser.msgBox("設定シートにヒントを表示しました。");
        } else {
            sheet.getRange("B5").clearNote();
            Browser.msgBox("設定シートのヒントを非表示にしました。");
        }
        return; // Special case for Settings
    } else {
        Browser.msgBox("このシートにはヒント機能がありません。\n(投稿ボード、バズ研究所、設定シートで実行してください)");
        return;
    }

    // Apply for Board & Lab
    if (enable) {
        for (const [col, note] of Object.entries(hints)) {
            sheet.getRange(targetRow, Number(col)).setNote(note);
        }
        Browser.msgBox(`シート「${sheetName}」にヒントを表示しました。`);
    } else {
        sheet.getRange(targetRow, 1, 1, 15).clearNote(); // Clear wider range just in case
        Browser.msgBox(`シート「${sheetName}」のヒントを非表示にしました。`);
    }
}

// --- Dojo (虎の巻) ---
const SHEET_DOJO = "虎の巻DB";

function setupDojoSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_DOJO);
    if (!sheet) sheet = ss.insertSheet(SHEET_DOJO);

    sheet.clear();

    // Header
    sheet.getRange("A1").setValue("🐯 虎の巻 (Knowledge Import)");
    sheet.getRange("A1").setFontSize(14).setFontWeight("bold");

    sheet.getRange("A3").setValue("【学習させたいマニュアル・秘伝のタレをここに貼ってください】");
    sheet.getRange("A4").setValue("ここにテキストを貼り付け(Ctrl+V)");
    sheet.getRange("A4").setBackground("#fff2cc"); // Yellow
    sheet.getRange("A4").setFontSize(10);
    sheet.getRange("A4").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    sheet.getRange("A4").setVerticalAlignment("top");

    // B3: Button Logic via Menu
    sheet.getRange("B3").setValue("貼り付けたら、メニューの「【設定】マニュアル学習」を実行！");
    sheet.getRange("B3").setFontColor("red").setFontWeight("bold");

    // Layout
    sheet.setColumnWidth(1, 600); // A4 Text Area
    sheet.setRowHeight(4, 300);   // Big input box
}

/**
 * 虎の巻分析 (Extract Rules & Templates)
 */
function runDojoAnalysis() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_DOJO);
    if (!sheet) { setupDojoSheet(); return; }

    const rawText = sheet.getRange("A4").getValue();
    if (!rawText || String(rawText).length < 10) {
        Browser.msgBox("テキストが短すぎます。A4セルにマニュアルを貼り付けてください。");
        return;
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) return;

    Browser.msgBox("マニュアルの学習を開始します...\\n(30秒〜1分ほどかかります)");

    // Define Prompt
    const prompt = `
あなたは世界最高峰のコンテンツ・ストラテジストです。
以下の「SNS運用のマニュアル（秘伝のタレ）」の**「一節（断片）」**を読み込み、そこに隠された深い意図を汲み取ってください。
そして、私のAI生成システムに組み込むための**「構造化データ」**として抽出・整理してください。

【読み込むマニュアル本文】
${rawText}

【抽出ミッション】
ユーザーは「時間をかけても良いから、完全な理解をしてほしい」と望んでいます。
表面的な要約ではなく、**「なぜそのテクニックが効くのか？」という『背景にある深いロジック』や『微妙なニュアンス』**まで言語化してください。

これを以下の2つのカテゴリに分類して抽出してください。

### 1. General Rules (心得・戦略ルール) (Deep Dive)
- 投稿全体に通底する「思想」や「禁止事項」。
- **重要**: 「〇〇のジャンルなら××というブランド名を出すべき」といった『具体的な戦略・勝ちパターン』もここに含めてください。
- **重要**: 「なぜ？」の部分も含めてルール化してください。（例：「ターゲットに寄り添うため、あえて断定口調を避ける」など）

### 2. Templates (型・テンプレート)
- そのまま使える「穴埋め式の構文」や「構成パターン」。
- 例: 「【〇〇な人へ】実は××なんです。」というフックの作り方など。

【出力形式 (JSON)】
必ず以下のJSON形式のみを出力してください。Markdownバッククォートは不要です。

{
  "general_rules": "ここに『心得』を箇条書きでまとめたテキスト(500文字以内)",
  "templates": [
    {
      "name": "テクニック名 (例: 〇〇の法則)",
      "syntax": "構文テンプレート (例: 【[ターゲット]へ】...)",
      "context": "どのような場面で使うべきか"
    },
    ... (複数あれば)
  ]
}
`;

    try {
        const result = callGemini(apiKey, prompt);
        // Parse JSON
        let jsonStr = result.replace(/```json/g, "").replace(/```/g, "").trim();
        const data = JSON.parse(jsonStr);

        // 1. Save Rules to Settings (B7) - Append Logic
        const setSheet = ss.getSheetByName(SHEET_SETTINGS);
        if (setSheet) {
            setSheet.getRange("A7").setValue("Manual Rules (心得)");

            // Get existing content
            const currentRules = setSheet.getRange("B7").getValue();
            let newRules = data.general_rules;

            if (currentRules && String(currentRules).length > 5) {
                // Append with separator and timestamp for clarity
                const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm");
                newRules = currentRules + `\n\n--- [追記: ${timestamp}] ---\n` + newRules;
            }

            setSheet.getRange("B7").setValue(newRules);
            setSheet.getRange("B7").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
        }

        // 2. Save Templates to DB
        const dbSheet = ss.getSheetByName(SHEET_DB);
        let addedCount = 0;
        if (dbSheet && data.templates && data.templates.length > 0) {
            const lastRow = dbSheet.getLastRow();
            const newRows = data.templates.map(t => [
                Utilities.getUuid(),
                `Dojo: ${t.name}`,
                t.context,
                t.syntax,
                "Auto-Analyze required", // Humor Formula
                "Manual", // Type
                "Dojo Import", // Source
                "Active",
                "3" // Priority
            ]);
            dbSheet.getRange(lastRow + 1, 1, newRows.length, 9).setValues(newRows);
            addedCount = newRows.length;
        }

        // 3. Update Master DNA
        updateMasterDNA();

        Browser.msgBox(`学習完了！🐯\\n\\n【心得】を設定シート(B7)に追記しました。(既存のルールは維持されています)\\n【テクニック】を${addedCount}件、データベースに追加しました。\\n\\n断片的な学習を繰り返すことで、AIはより賢くなります！`);

    } catch (e) {
        Browser.msgBox("エラーが発生しました: " + e.message + "\\nJSON: " + jsonStr);
    }
}




