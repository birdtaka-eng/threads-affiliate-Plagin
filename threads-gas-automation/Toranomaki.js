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
    let successtraits = "";
    let styleSamples = "";

    if (labSheet && labSheet.getLastRow() >= 4) {
        try {
            const lastRow = labSheet.getLastRow();
            // Col E = DNA (Analysis)
            const data = labSheet.getRange(4, 5, lastRow - 3, 1).getValues();
            const samples = data.flat().filter(s => s && String(s).length > 10);

            // Limit samples to prevent token overflow
            const recentSamples = samples.slice(-10).join("\\n\\n");
            styleSamples = recentSamples;
            successtraits = recentSamples;
        } catch (e) { }
    }

    // --- Phase 1: Evolve Persona (B6 + Lab -> B8) ---
    // User Wish (Seed) + Success Traits => Strong Evolved Persona
    if (seedPersona) {
        try {
            const prompt = `
あなたは世界最高のキャラクタープロデューサーです。
クライアント（ユーザー）の「なりたい姿（種）」を、市場で成功している「ロールモデル（分析データ）」の要素で強化し、
**「誰からも愛される最強のインフルエンサー人格定義書」**を作成してください。

【1. User Wish (ユーザーの願い)】
${seedPersona}

【2. Market Success Traits (成功者の特徴)】
${successtraits || "(まだデータがありません。ユーザーの願いを最大限尊重してください)"}

【指示】
ユーザーの願いを核（コア）にしつつ、成功者の持つ「愛される要素（共感性、ユーモア、誠実さなど）」を肉付けしてください。
※注意: 口調や文体はここでは定義しません。「内面・性格・スタンス」を定義してください。

【出力形式】
                        const data = labSheet.getRange(4, 5, lastRow - 3, 1).getValues(); // Col E only
                        const styles = data.flat().filter(s => s && String(s).length > 10).join("\\n\\n");

                        if (styles) {
                            const apiKey = getGeminiApiKey();
                            const prompt = `
            あなたは優秀なゴーストライターです。
            以下の「分析データ（DNA）」は、参考にしたいロールモデルの文章スタイルです。
            ここから **「文体のリズム」「言葉選びのセンス」「構成の癖」などの『エッセンス』だけ ** を抽出してください。

🚨 ** 重要: 人格の分離 ** 🚨
            このスタイルを適用するのは「別人（クライアント）」です。
            したがって、** 元の書き手の人格（年齢、性別、職業、一人称「ワシ」「俺」など）は完全に削除・抽象化 ** してください。

            例えば：
            NG: 「ワシのような老人が語る、重みのある口調」
            OK: 「断定的な語尾を使い、権威性を感じさせるショートセンテンスのリズム」

【分析対象データ】
${ styles }

【指示】
            このエッセンスを、AIへのスタイル指定プロンプトとしてまとめてください。
            `;
                            const styleEssence = callGeminiSafe(apiKey, prompt);
                            setSheet.getRange("B9").setValue(styleEssence.trim());
                        }
                    }
                } catch (e) { console.error(e); }
            }

            setSheet.getRange("B10").setValue("Last Updated: " + new Date().toString());
            Browser.msgBox("学習完了！\nB8(ルール) と B9(スタイル) を更新しました。\n人格(B6)は変更されていません。");
        }
