/**
 * PatternMaster.js
 * 文例集・型マスタの管理 - 10種の型・ランダム抽出機能強化版
 */

// (省略：既存の setupPatternMasterSheet, setupPatternExamplesSheet は維持)

/**
 * AI生成用の型情報を取得します。
 * 全体ではなく「1つの型」に絞り込んで高い密度で渡すように強化。
 */
function getPatternDataForAI(personaKey) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = { patternName: "", patternLogic: "", examples: "" };
  
  // 1. 型（ロジック）のランダム抽出
  const pSheet = ss.getSheetByName(SHEET_PATTERN_MASTER);
  if (pSheet) {
    const pValues = pSheet.getRange(2, 1, 10, 3).getValues(); // 10個の型を取得
    const randomIdx = Math.floor(Math.random() * 10);
    const selectedRow = pValues[randomIdx];
    
    // index 1 が人格A, 2 が人格B の型説明
    const colIdx = (personaKey === 'A') ? 1 : 2;
    const fullPatternText = selectedRow[colIdx];
    
    // 型名と極意を分離（※名称[型名]\n【極意】: の形式を想定）
    data.patternName = fullPatternText.split("\n")[0];
    data.patternLogic = fullPatternText;
  }
  
  // 2. 選出された型に「一致する文例」を優先的に取得
  const eSheet = ss.getSheetByName(SHEET_PATTERN_EXAMPLES);
  if (eSheet) {
    const eValues = eSheet.getRange(2, 1, 200, 4).getValues(); // A(ID), B(型名), C(人格), D(文面) 
    
    // 人格が一致し、かつ型名が一部でも重なるものをフィルタリング
    let matchedExamples = eValues.filter(row => {
      return (row[2] === personaKey && data.patternName.includes(row[1].substring(0, 5)));
    }).map(row => row[3]);
    
    // 候補が少ない場合は、人格の一致のみでランダムに補う
    if (matchedExamples.length < 5) {
      const fallback = eValues.filter(row => row[2] === personaKey).map(row => row[3]);
      matchedExamples = matchedExamples.concat(fallback.sort(() => Math.random() - 0.5).slice(0, 5));
    }

    // 最終的に5〜8件を提示
    data.examples = "・" + matchedExamples.sort(() => Math.random() - 0.5).slice(0, 8).join("\n・");
  }
  
  return data;
}
