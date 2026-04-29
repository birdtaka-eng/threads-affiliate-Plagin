/**
 * AI_Inspector.js
 * 投稿ボードの自動検品エージェント
 * 任務：人間による目視確認を代行し、品質を保証する
 */

/**
 * 選択中の行、または未検品の行を一括検品する
 */
function runAIInspector() {
  const ss = getSS();
  const sheet = ss.getSheetByName(SHEET_BOARD);
  if (!sheet) return;

  const colMap = getBoardColMap(sheet);
  if (!colMap || !colMap.JUDGE) {
    ss.toast("📝 Judge列が見つからないため検品を開始できません。");
    return;
  }

  const selection = sheet.getActiveRange();
  const startRow = Math.max(4, selection.getRow());
  const numRows = Math.min(sheet.getLastRow() - startRow + 1, selection.getNumRows());
  
  if (numRows <= 0) {
    ss.toast("検品対象の行を選択してください。");
    return;
  }

  ss.toast("🕵️ AI Inspector 起動中...", "Audit Engine", 5);
  
  for (let i = 0; i < numRows; i++) {
    const currentRow = startRow + i;
    auditRow(sheet, currentRow, colMap);
  }
  
  ss.toast("✅ 全ての検品が完了しました。", "Audit Engine");
}

/**
 * 特定の1行を監査する
 */
function auditRow(sheet, row, colMap) {
  let results = [];
  let isFailed = false;

  // 1. 画像監査 (Vision Audit)
  const visionReport = auditImageVisibility(sheet, row, colMap);
  if (visionReport.floatingCount === 0) {
    results.push("⚠️ 画像配置：非浮遊（AI視認性低）");
  } else {
    results.push(`✅ 画像配置：OK (${visionReport.floatingCount}枚)`);
  }

  // 2. 文章監査 (Content Audit)
  const hook = (colMap.HOOK) ? sheet.getRange(row, colMap.HOOK).getValue() : "";
  const reply = (colMap.REPLY) ? sheet.getRange(row, colMap.REPLY).getValue() : "";
  
  if (!hook || String(hook).includes("⚠️") || String(hook).includes("エラー")) {
    results.push("❌ 内容：生成エラーまたは未完了");
    isFailed = true;
  } else {
    results.push("✅ 内容：生成済み");
  }

  // 3. AIによる品質採点 (Quality Scorer)
  if (!isFailed && colMap.HOOK) {
     const score = scoreContentQuality(hook, reply);
     results.push(`📊 AI評価：${score}`);
  }

  // 結果の書き込み
  if (!colMap.JUDGE) return;
  const judgeCell = sheet.getRange(row, colMap.JUDGE);
  const statusEmoji = isFailed ? "❌" : "✅";
  judgeCell.setValue(`${statusEmoji}\n${results.join("\n")}`);

  
  // スタイル設定
  judgeCell.setBackground(isFailed ? "#f4cccc" : "#d9ead3")
           .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
           .setVerticalAlignment("top")
           .setFontSize(8);
}

/**
 * 画像の視認性をチェック（Code.jsのロジックを拝借・軽量化）
 */
function auditImageVisibility(sheet, row, colMap) {
  const floatingImages = sheet.getImages();
  const photoStart = colMap.PHOTO_1 || 6;
  const photoEnd = colMap.PHOTO_3 || 8;
  let floatingCount = 0;

  floatingImages.forEach(img => {
      try {
          const anchor = img.getAnchorCell();
          const aCol = anchor.getColumn();
          if (anchor.getRow() === row && (aCol >= photoStart && aCol <= photoEnd)) {
              floatingCount++;
          }
      } catch (e) {}
  });
  return { floatingCount: floatingCount };
}

/**
 * Claudeを使って文章の質を採点（ダミー実装から本実装へ）
 */
function scoreContentQuality(hook, reply) {
  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) return "APIキー不足";
    
    const prompt = `以下のThreads投稿案を「100点満点」で採点し、理由を添えて20文字以内で評価せよ。\n\n【フック】\n${hook}\n\n【リプライ】\n${reply}`;
    const result = callGeminiSafe(apiKey, prompt, [], "あなたは厳格なコンテンツ監査官です。", "gemini-1.5-flash");
    return result || "判定不能";
  } catch (e) {
    return "採点エラー";
  }
}
