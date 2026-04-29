/**
 * ClaudeAPI.js
 * V2.0 - Gemini Pro Direct Wrapper
 * Gemini Proを直接呼び出すためのラッパーとして機能します。
 * APIHandlerなどの既存コードから「ペルソナを持つAI」として透過的に利用されるための「箱」です。
 */

/**
 * Gemini Pro へリクエストを送信する
 * @param {string} topic ユーザーからの入力プロンプト
 * @param {string} soulDNA システムプロンプト（ペルソナ設定など）
 * @param {GoogleAppsScript.Base.Blob[]} imageBlobs - 画像Blob配列 (オプション)
 * @returns {object} Geminiからのレスポンス（JSONオブジェクト）
 */
function askClaude(topic, soulDNA = "", imageBlobs = []) {
    console.log("Gemini Pro (via ClaudeAPI) にリクエスト送信中...");

    try {
        // GeminiAPI.js の callGeminiDirectV12 を呼び出す
        const result = callGeminiDirectV12(soulDNA, imageBlobs, topic);
        console.log("Gemini Pro 回答受信:", result);
        return result;

    } catch (error) {
        console.error("Gemini Pro 通信失敗:", error);
        // エラーが発生した場合でも、後続処理が止まらないようにエラー情報を返す
        return { error: true, message: error.message };
    }
}

/**
 * 動作テスト用の関数
 */
function testClaude() {
    console.log("Gemini Pro (via ClaudeAPI) のテストを開始します...");
    try {
        const result = askClaude("こんにちは！自己紹介をしてください。", "あなたは優秀なアシスタントです。");
        console.log("テスト成功:", result);
    } catch (error) {
        console.error("テスト失敗:", error);
    }
}

/**
 * エラーをGemini Proに自動相談する関数
 * Flash君がエラー時に呼び出す
 */
function consultClaudeOnError(functionName, errorMessage, codeContext) {
    var systemPrompt = "あなたはGAS（Google Apps Script）の専門家です。";
    var userPrompt = "以下のエラーが発生しました。原因と修正方法を簡潔にJSON形式で分析してください。分析には'error_cause'（原因）と'suggested_fix'（修正案）の2つのキーを含めてください。\n\n" +
        "【発生場所】" + functionName + "\n" +
        "【エラー内容】" + errorMessage + "\n" +
        "【関連コード】\n" + codeContext;

    var result = askClaude(userPrompt, systemPrompt);

    // ログに記録
    console.log("=== Gemini Pro 診断結果 ===");
    console.log(result);

    // スプレッドシートにも記録
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName(SHEET_BOARD) ||
        ss.insertSheet(SHEET_BOARD);

    // 結果がオブジェクトの場合は文字列に変換して保存
    var resultString = (typeof result === 'object') ? JSON.stringify(result) : result;

    logSheet.appendRow([
        new Date(),
        functionName,
        errorMessage,
        resultString
    ]);

    return result;
}

/**
 * (廃止互換) ネット検索機能付きのClaude相談関数
 */
function askClaudeWithSearch(prompt) {
    console.warn("askClaudeWithSearch is deprecated. Using standard askClaude.");
    return askClaude(prompt, "あなたはWeb検索の専門家として、知っている情報から回答を生成してください。");
}

/**
 * Antigravity（AIエージェント）へ報告を投げる関数
 */
function reportToAntigravity(message) {
    var webhookUrl = PropertiesService.getScriptProperties()
        .getProperty("ANTIGRAVITY_WEBHOOK_URL");

    if (!webhookUrl) {
        console.warn("ANTIGRAVITY_WEBHOOK_URL is not set.");
        return;
    }

    UrlFetchApp.fetch(webhookUrl, {
        method: "POST",
        contentType: "application/json",
        payload: JSON.stringify({
            result: message,
            timestamp: new Date().toISOString()
        }),
        muteHttpExceptions: true
    });
}
