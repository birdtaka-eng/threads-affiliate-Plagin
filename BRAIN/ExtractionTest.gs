/**
 * LABORATORY/ExtractionTest.gs
 * 商品URLから「数値ID」を自動抽出できるかテストする
 */

function testIdExtraction() {
  const testUrl = "https://item.rakuten.co.jp/roomy/ymz17feb24h13/";
  
  console.log("🛰️ EUC-JP完全解読モード起動...");

  try {
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    };
    const response = UrlFetchApp.fetch(testUrl, { headers: headers, muteHttpExceptions: true });
    
    // 💡 楽天はEUC-JPなので、明示的に指定して文字化けを防ぐ
    const html = response.getContentText("EUC-JP");
    
    // 1. 【目視確認】日本語が化けていないか確認
    console.log("📄 ソースの断片（解読済み）:");
    console.log(html.substring(0, 1000));

    // 2. 【深層スキャン】ありとあらゆるIDパターンを試行
    const patterns = [
      /"productId":\s*(\d+)/,
      /"item_id":\s*"(\d+)"/,
      /"manageNumber":\s*"(\d+)"/,
      /item_id=(\d+)/,
      /11000\d{10,12}/
    ];

    let found = false;
    patterns.forEach(regex => {
      const match = html.match(regex);
      if (match) {
        const id = match[1] || match[0];
        console.log("🎯 ターゲット捕捉！ [" + regex + "] -> " + id);
        found = true;
      }
    });

    if (!found) {
      console.log("❌ 全方位スキャンでも捕捉できませんでした。");
    }

  } catch (e) {
    console.log("🚨 通信エラー: " + e.message);
  }
}
