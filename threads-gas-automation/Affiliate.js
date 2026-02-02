/**
 * Affiliate.js
 * 楽天アフィリエイト工場 (Rakuten Affiliate Factory)
 * "Best in Japan" logic for high-conversion threading.
 */

// Sheet Name Constant
const SHEET_AFFILIATE = "楽天アフィリエイト工場";

/**
 * 【設定】楽天工場シート作成
 */
function setupRakutenSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_AFFILIATE);

    if (!sheet) {
        sheet = ss.insertSheet(SHEET_AFFILIATE);
    }

    // 1. Reset
    sheet.clear();
    sheet.getRange("A:Z").clearDataValidations();

    // 2. Header
    const headers = [
        ["🚀 Create", "Status", "Strategy (型)", "Item Name (商品名)", "URL (アフィリンク)", "Memo (訴求点/割引等)", "Post 1 (Hook)", "Post 2 (Body)", "Post 3 (Close/Link)"]
    ];
    sheet.getRange("A1:I1").setValues(headers);
    sheet.getRange("A1:I1").setBackground("#ea4335"); // Rakuten Red
    sheet.getRange("A1:I1").setFontColor("#ffffff");
    sheet.getRange("A1:I1").setFontWeight("bold");

    // 3. Widths
    sheet.setColumnWidth(1, 50);  // Create
    sheet.setColumnWidth(2, 60);  // Status
    sheet.setColumnWidth(3, 100); // Strategy
    sheet.setColumnWidth(4, 200); // Item Name
    sheet.setColumnWidth(5, 100); // URL
    sheet.setColumnWidth(6, 200); // Memo
    sheet.setColumnWidth(7, 300); // Post 1
    sheet.setColumnWidth(8, 300); // Post 2
    sheet.setColumnWidth(9, 300); // Post 3

    // 4. Validations
    const ruleCheck = SpreadsheetApp.newDataValidation().requireCheckbox().build();
    sheet.getRange("A2:A500").setDataValidation(ruleCheck);

    const ruleStrategy = SpreadsheetApp.newDataValidation()
        .requireValueInList([
            "セール速報", "正直レビュー", "生活改善",
            "🚪 謎の激安ガチャ", "📢 ポイ活/イベント速報", "📦 在庫復活/激レア", "🗓️ 今日のやること(備忘録)"
        ], true)
        .build();
    sheet.getRange("C2:C500").setDataValidation(ruleStrategy);

    // 5. Sample Data
    sheet.getRange("A2").setValue(false);
    sheet.getRange("B2").setValue("");
    sheet.getRange("C2").setValue("📢 ポイ活/イベント速報");
    sheet.getRange("D2").setValue("お買い物マラソン");
    sheet.getRange("E2").setValue("https://a.r10.to/sample_event_page");
    sheet.getRange("F2").setValue("エントリー忘れると数千ポイント損する。今夜20時から開始。");

    // 6. Freeze
    sheet.setFrozenRows(1);

    Browser.msgBox("楽天アフィリエイト工場(v3)を建設しました！\nクリック誘発型の新戦略が追加されています。");
}

/**
 * 【製造】記事一括生成 (工場稼働)
 */
function generateRakutenPosts() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_AFFILIATE);
    if (!sheet) {
        setupRakutenSheet();
        return;
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) { Browser.msgBox("API Keyが見つかりません (設定シートを確認)"); return; }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    // --- Resources ---
    let persona = "愛されるインフルエンサー";
    let style = "共感重視";

    // Load Settings
    const setSheet = ss.getSheetByName(SHEET_SETTINGS);
    if (setSheet) {
        persona = setSheet.getRange("B8").getValue() || setSheet.getRange("B6").getValue() || persona;
        style = setSheet.getRange("B9").getValue() || style;
    }

    // Load Buzz DNA (Optional)
    let viralDna = "";
    const labSheet = ss.getSheetByName(SHEET_LAB);
    if (labSheet && labSheet.getLastRow() >= 4) {
        // Simply grab the last analyzed DNA as a spice
        viralDna = labSheet.getRange(labSheet.getLastRow(), 5).getValue();
    }

    // --- Processing ---
    const data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const isChecked = row[0];
        if (!isChecked) continue; // Skip unchecked

        const rowIndex = i + 2;

        sheet.getRange(rowIndex, 2).setValue("🤖 Generating...");
        SpreadsheetApp.flush();

        const strategy = row[2];
        const itemName = row[3];
        const itemUrl = row[4];
        const memo = row[5];

        // --- Strategy-Specific Instructions ---
        let strategyInstruction = "";

        if (strategy === "🚪 謎の激安ガチャ") {
            strategyInstruction = `
            【戦略: ミステリーガチャ (Mystery Box)】
            - 目的: 「中身が気になる」という好奇心だけでクリックさせる。
            - ルール: 商品名や価格を具体的に書かない。「80%OFFの衝撃」「見なきゃ損する」といった煽りを重視。
            - 1通目: 「これヤバくない？」「伝説のあれが帰ってきた」と匂わす。
            - 2通目: ヒントだけ出す（「ヒント: 〇〇好きにはたまらない」）。
            - 3通目: 「答えはここ」でリンク。`;
        } else if (strategy === "📢 ポイ活/イベント速報") {
            strategyInstruction = `
            【戦略: イベント速報 (News Reporter)】
            - 目的: 「損をしたくない」という心理（損失回避）を刺激する。
            - ルール: 商品ではなく「イベントそのもの」や「ポイント倍率」を売る。
            - 1通目: 「緊急。これエントリー済み？」と問いかける。
            - 2通目: 「忘れると3000円分くらい損するかも」とメリット/デメリットを提示。
            - 3通目: 「会場はこちら」でリンク。`;
        } else if (strategy === "📦 在庫復活/激レア") {
            strategyInstruction = `
            【戦略: 在庫復活アラート (Restock Alert)】
            - 目的: スピード勝負でのクリック誘発。
            - ルール: 「今だけ」「残りわずか」を強調。事務的かつ緊急性の高いトーンで。
            - 1通目: 「【速報】在庫復活しました。」
            - 2通目: 「すぐ売り切れると思います。転売ヤーに負けないで。」
            - 3通目: 「急げ↓」でリンク。`;
        } else if (strategy === "🗓️ 今日のやること(備忘録)") {
            strategyInstruction = `
            【戦略: 備忘録 (Daily Reminder)】
            - 目的: 生活の一部として「確認」させる。
            - ルール: 「今日はオムツが安い日」「今日は本を買う日」など、カレンダー的な役立ち情報。
            - 1通目: 「今日は何の日か知ってる？」
            - 2通目: 「実は今日だけポイント〇倍。消耗品の補充なら今日。」
            - 3通目: 「忘れないうちにカゴへ↓」でリンク。`;
        } else {
            // Default (Sales, Reviews, etc.)
            strategyInstruction = `
            【戦略: ${strategy}】
            - 商品やサービス自体の魅力を、ペルソナを通して語る。
            - 共感 -> 価値 -> 行動 の王道フロー。`;
        }

        // --- Prompt Engineering ---
        const prompt = `
あなたは日本最高峰のカリスマアフィリエイターです。
ターゲット読者の心を動かし、自然とリンクをクリックさせる「魔法の3連ツイート（ツリー）」を作成してください。

【Persona (書き手)】
${persona}

【Style (文体・リズム)】
${style}

【Target Strategy (今回の戦略)】
${strategyInstruction}

【Spices (バズの法則)】
${viralDna ? "以下のような要素を取り入れてください:\n" + viralDna : ""}

【入力情報】
- 商品/イベント名: ${itemName}
- 訴求メモ/ヒント: ${memo}

【構成指示: 3つの投稿によるストーリーテリング】
1. **Post 1 (The Hook - 集客)**
   - 目的: タイムラインで指を止めさせる。
   - 禁止: ここには**リンクを貼らない**でください（アルゴリズム対策）。

2. **Post 2 (The Value - 教育・信頼・煽り)**
   - 目的: クリックへの動機づけ（好奇心、損失回避、メリット）。

3. **Post 3 (The Close - 行動)**
   - 目的: リンクをクリックさせる。
   - 必須: URL「${itemUrl}」を最後に必ず含めること。

【出力形式】
以下の区切り文字を使って3つに分けて出力してください。余計な解説は不要です。

///POST1
(Post 1の本文)
///POST2
(Post 2の本文)
///POST3
(Post 3の本文)
`;

        try {
            const result = callGeminiSafe(apiKey, prompt);

            // Parse Result
            const parts = result.split("///POST");
            let p1 = "", p2 = "", p3 = "";

            parts.forEach(part => {
                if (part.startsWith("1")) p1 = part.substring(1).trim();
                if (part.startsWith("2")) p2 = part.substring(1).trim();
                if (part.startsWith("3")) p3 = part.substring(1).trim();
            });

            // Write to Sheet
            sheet.getRange(rowIndex, 7).setValue(p1); // G
            sheet.getRange(rowIndex, 8).setValue(p2); // H
            sheet.getRange(rowIndex, 9).setValue(p3); // I

            // Update Status
            sheet.getRange(rowIndex, 1).setValue(false); // Uncheck
            sheet.getRange(rowIndex, 2).setValue("✨ Done");

        } catch (e) {
            sheet.getRange(rowIndex, 2).setValue("Error: " + e.message);
        }
    }

    Browser.msgBox("記事生成が完了しました！");
}
