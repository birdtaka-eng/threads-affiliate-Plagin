/**
 * Toranomaki.js
 * 虎の巻DB (Techniques) & Buzz Lab (Style) Merge Logic
 */

/**
 * 虎の巻DB(マニュアル/技術) と バズ研究所(文体/スタイル) を統合し、
 * 「戦略・技術書 (Grimoire)」を生成・更新する。
 */
/**
 * 虎の巻.js
 * 人格進化(Evolution) & スタイル抽出(Extraction) ロジック
 */
function updateMasterDNA() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const labSheet = ss.getSheetByName(SHEET_LAB);
    let setSheet = ss.getSheetByName(SHEET_SETTINGS);

    if (!setSheet) setSheet = ss.insertSheet(SHEET_SETTINGS);

    // Get Seed Data
    const seedPersona = setSheet.getRange("B6").getValue(); // User Wish
    if (!seedPersona || seedPersona === "ここにプロフィールを入力") {
        Browser.msgBox("先に設定シートB6に「あなたのなりたい姿(種)」を入力してください。");
        return;
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) { Browser.msgBox("API Key Missing"); return; }

    // --- Collect Lab Data (Success Traits) ---
    var successtraits = "";
    var styleSamples = "";

    if (labSheet && labSheet.getLastRow() >= 4) {
        try {
            var lastRow = labSheet.getLastRow();
            // Col E = DNA (Analysis)
            var data = labSheet.getRange(4, 5, lastRow - 3, 1).getValues();
            var samples = data.flat().filter(function (s) { return s && String(s).length > 10; });

            // Limit samples to prevent token overflow
            var recentSamples = samples.slice(-10).join("\n\n");
            styleSamples = recentSamples;
            successtraits = recentSamples;
        } catch (e) { }
    }

    // --- Phase 1: Evolve Persona (B6 + Lab -> B8) ---
    // User Wish (Seed) + Success Traits => Strong Evolved Persona
    if (seedPersona) {
        try {
            var prompt1 = "あなたは世界最高のキャラクタープロデューサーです。\n" +
                "クライアント（ユーザー）の「なりたい姿（種）」を、市場で成功している「ロールモデル（分析データ）」の要素で強化し、\n" +
                "**「誰からも愛される最強のインフルエンサー人格定義書」**を作成してください。\n\n" +
                "【1. User Wish (ユーザーの願い)】\n" + seedPersona + "\n\n" +
                "【2. Market Success Traits (成功者の特徴)】\n" + (successtraits || "(まだデータがありません。ユーザーの願いを最大限尊重してください)") + "\n\n" +
                "【指示】\n" +
                "ユーザーの願いを核（コア）にしつつ、成功者の持つ「愛される要素（共感性、ユーモア、誠実さなど）」を肉付けしてください。\n" +
                "※注意: 口調や文体はここでは定義しません。「内面・性格・スタンス」を定義してください。";

            var evolvedPersona = callGeminiSafe(apiKey, prompt1);
            setSheet.getRange("B8").setValue(evolvedPersona);
        } catch (e) { }
    }

    // --- Phase 2: Extract Style (Lab -> B9) ---
    if (styleSamples) {
        try {
            var prompt2 = "あなたは優秀なゴーストライターです。\n" +
                "以下の「分析データ（DNA）」は、参考にしたいロールモデルの文章スタイルです。\n" +
                "ここから **「文体のリズム」「言葉選びのセンス」「構成の癖」などの『エッセンス』だけ ** を抽出してください。\n\n" +
                "🚨 ** 重要: 人格の分離 ** 🚨\n" +
                "このスタイルを適用するのは「別人（クライアント）」です。\n" +
                "したがって、** 元の書き手の人格（年齢、性別、職業、一人称「ワシ」「俺」など）は完全に削除・抽象化 ** してください。\n\n" +
                "例えば：\n" +
                "NG: 「ワシのような老人が語る、重みのある口調」\n" +
                "OK: 「断定的な語尾を使い、権威性を感じさせるショートセンテンスのリズム」\n\n" +
                "【分析データ (DNA)】\n" + styleSamples;

            var extractedStyle = callGeminiSafe(apiKey, prompt2);
            setSheet.getRange("B9").setValue(extractedStyle);
        } catch (e) { }
    }

    Browser.msgBox("Master DNA (人格 & スタイル) のアップデートが完了しました！");
}
