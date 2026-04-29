/**
 * DiagnosticTest.js
 * V12.0 - キャッシュシステム（GEM）の動作確認テスト
 */

function TEST_GeminiCacheSystem() {
  const personaKey = 'A'; // テスト人格
  
  Logger.log("🧪 --- キャッシュシステム テスト開始 ---");
  
  try {
    // 1. キャッシュの取得（初回なら作成、2回目なら再利用されるはず）
    Logger.log("1. キャッシュIDの取得を試みます...");
    const cacheName = getEffectiveCacheId(personaKey);
    Logger.log("✅ 取得成功: " + cacheName);
    
    // 2. 実際にそのキャッシュを使って生成テスト
    const apiKey = getGeminiApiKey();
    const userPrompt = "【任務】キャッシュされたDNAに基づき、この『魔法の杖』という商品について30文字以内のフックを一つだけ生成せよ。JSONは不要、テキストのみで。";
    
    Logger.log("2. キャッシュを利用した生成を実行します...");
    const result = callGeminiSafe(apiKey, userPrompt, [], "", "gemini-1.5-flash-001", cacheName);
    
    Logger.log("✅ 生成結果:");
    Logger.log(result);
    
    Logger.log("✨ --- テスト完了 ---");
    Browser.msgBox("キャッシュテスト成功！\n\n結果: " + result);

  } catch (e) {
    Logger.log("❌ テスト失敗: " + e.message);
    Browser.msgBox("エラー: " + e.message);
  }
}
