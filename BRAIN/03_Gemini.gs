/**
 * 03_Gemini.gs
 * Gemini API (Multimodal) との通信および文章生成ロジック。
 */

/**
 * 🚀 写真を読み取り、ランダム変数を用いて3パターンの文章を生成・3行に展開して書き込み
 */
function generateThreadsPost(row) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  // 1. シートから画像と情報を取得
  const itemName = sheet.getRange(row, COL.ITEM_NAME).getValue();
  const imageParts = getImageParts(sheet, row);
  
  // 2. 3つの異なる変数セットをランダムに排出
  const vars = [getRandomVariables(), getRandomVariables(), getRandomVariables()];
  
  const dnaA = getSoul('A');
  const dnaB = getSoul('B');
  
  const systemPrompt = `あなたはタカ様の「偏愛」と「戦略」を司るAIコピーライターです。
【人格DNA-A：偏愛・毒】
${dnaA}
【人格DNA-B：信頼・実用】
${dnaB}`;

  const userPrompt = `
以下のアイテムについて、3組の異なる文章セットを生成せよ。各セットは指定された「変数」に基づき、全く異なる切り口で作成すること。

【アイテム名】: ${itemName || "（写真から判断）"}

---
【セット1 変数】: 毒=${vars[0].tone}, フォーカス=${vars[0].focus}, ターゲット=${vars[0].target}
【セット2 変数】: 毒=${vars[1].tone}, フォーカス=${vars[1].focus}, ターゲット=${vars[1].target}
【セット3 変数】: 毒=${vars[2].tone}, フォーカス=${vars[2].focus}, ターゲット=${vars[2].target}

各セット、以下の3つを含めること。
①hook: 人格DNA-A (30文字前後)
②reply: 人格DNA-A (30文字前後、hookとの連動重視)
③room: 人格DNA-B (80文字前後、実用的メリット)

出力は以下のJSON配列形式で返せ。
[
  {"hook": "...", "reply": "...", "room": "..."},
  {"hook": "...", "reply": "...", "room": "..."},
  {"hook": "...", "reply": "...", "room": "..."}
]`;

  // 3. Gemini API 呼び出し
  const resultText = callGeminiApi(systemPrompt, userPrompt, imageParts);
  
  try {
    const match = resultText.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("JSON形式のリストが見つかりません。");
    const resList = JSON.parse(match[0]);

    // 4. 3行にわたって展開（行の挿入とコピー）
    if (resList.length > 1) {
      sheet.insertRowsAfter(row, resList.length - 1);
      const sourceRange = sheet.getRange(row, 1, 1, sheet.getLastColumn());
      for (let i = 1; i < resList.length; i++) {
        sourceRange.copyTo(sheet.getRange(row + i, 1));
      }
    }

    // 5. 各行に生成文章を流し込み
    resList.forEach((res, i) => {
      const targetRow = row + i;
      sheet.getRange(targetRow, COL.GEN_HOOK).setValue(res.hook);
      sheet.getRange(targetRow, COL.GEN_REPLY).setValue(res.reply);
      sheet.getRange(targetRow, COL.GEN_ROOM).setValue(res.room);
    });

    return { status: "success", count: resList.length };

  } catch (e) {
    console.error("Parse Error: " + e.message, resultText);
    throw new Error("調合結果の解析に失敗しました。");
  }
}

/**
 * 🔍 利用可能なGeminiモデルを表示する
 */
function listAvailableGeminiModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const json = JSON.parse(response.getContentText());
  
  if (json.models) {
    const modelList = json.models.map(m => m.name.replace("models/", "")).join("\n");
    SpreadsheetApp.getUi().alert("🛠️ 利用可能なモデル一覧:\n\n" + modelList);
  } else {
    SpreadsheetApp.getUi().alert("❌ モデル一覧を取得できませんでした。");
  }
}

/**
 * 🎲 ランダムな変数を生成する
 */
function getRandomVariables() {
  const tones = ["猛毒", "皮肉", "渇望", "悦楽", "絶望"];
  const focuses = ["素材の変態性", "所有欲の解放", "社会への反逆", "機能の美学", "圧倒的な個"];
  const targets = ["理解を拒む者", "本物を知る者", "退屈な日常に飽きた者", "聖域の住人"];
  
  return {
    tone: tones[Math.floor(Math.random() * tones.length)],
    focus: focuses[Math.floor(Math.random() * focuses.length)],
    target: targets[Math.floor(Math.random() * targets.length)]
  };
}

/**
 * 📸 指定された行の画像セル（メモ）から画像データを取得する
 */
function getImageParts(sheet, row) {
  const cols = [COL.IMAGE_F, COL.IMAGE_G, COL.IMAGE_H];
  const parts = [];

  cols.forEach(col => {
    const range = sheet.getRange(row, col);
    const note = range.getNote();
    if (note) {
      try {
        const file = DriveApp.getFileById(note);
        const blob = file.getBlob();
        parts.push({
          inlineData: { mimeType: "image/jpeg", data: Utilities.base64Encode(blob.getBytes()) }
        });
      } catch (e) { console.warn("Image ID: " + note + " の取得失敗"); }
    }
  });
  return parts;
}

/**
 * 📡 Gemini API (Multimodal) を叩く
 */
function callGeminiApi(systemPrompt, userPrompt, imageParts) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`;
  
  const payload = {
    contents: [
      { role: "user", parts: [ { text: userPrompt }, ...imageParts ] }
    ],
    systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ],
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 4096,
      responseMimeType: "application/json"
    }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const resText = response.getContentText();
  
  if (response.getResponseCode() !== 200) {
    throw new Error(`Gemini API Error: ${resText}`);
  }

  const json = JSON.parse(resText);
  if (!json.candidates || json.candidates.length === 0) {
    throw new Error("Geminiから回答が返されませんでした。");
  }

  const candidate = json.candidates[0];
  if (!candidate.content || !candidate.content.parts) {
    throw new Error("AIの回答が空です。理由: " + (candidate.finishReason || "不明"));
  }

  return candidate.content.parts[0].text;
}
