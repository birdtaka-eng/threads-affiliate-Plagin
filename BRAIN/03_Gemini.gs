/**
 * 03_Gemini.gs
 * Gemini API (Multimodal) との通信および文章生成ロジック。
 */

/**
 * 🚀 写真を読み取り、人格DNA（AとBのハイブリッド）を統合して3種類の文章を生成・書き込み
 */
function generateThreadsPost(row, persona = 'A') {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  // 1. シートから画像と情報を取得
  const itemName = sheet.getRange(row, COL.ITEM_NAME).getValue();
  const imageParts = getImageParts(sheet, row);
  
  // 2. 魂（DNA）を取得
  const dnaA = getSoul('A'); // 偏愛・毒
  const dnaB = getSoul('B'); // 勝利・ノーマル
  
  const systemPrompt = `あなたはタカ様の「異常な偏愛」と「社会的勝利」を司る二面性を持ったAIコピーライターです。
以下の2つの人格DNAを融合させ、3つの異なる用途の文章を生成してください。

【人格DNA-A：偏愛と毒】
${dnaA}

【人格DNA-B：社会的勝利】
${dnaB}
`;

  // 3. ユーザープロンプトの構成（文字数制限を徹底）
  const imageStatus = imageParts.length > 0 ? `（${imageParts.length}枚の写真を認識済み）` : "（写真は認識できません。アイテム名から想像せよ）";
  const userPrompt = `
以下のアイテムについて、提供された写真のディテールを観察し、3種類の文章を【厳格な文字数制限】の下で作成せよ。
${imageStatus}

【アイテム名】: ${itemName || "（写真から判断せよ）"}

---
①【Threadsフック（J列用）】
- 性格: 人格DNA-A（偏愛・10の型）
- 制約: 30文字前後で脳を焼く。
- 用途: 投稿の1枚目。

②【リプライ（K列用）】
- 性格: 人格DNA-A（感情的・吐露）
- 戦略: フックで突き放した読者を、個人的な「独白」や「心の震え」で共犯者にする。
- 制約: 30文字前後。感嘆符（！）よりも、余韻のある句読点（。）や、ため息の漏れるような一文。
- 用途: 投稿のすぐ下の自分へのリプライ。

③【ROOM投稿用（I列用）】
- 性格: 人格DNA-B（ノーマル・本物志向）
- 制約: 最大60文字以内。
- 用途: 楽天ROOMでの着地文章。
---

出力は必ず以下のJSON形式で返せ。余計な挨拶や解説、markdownの装飾は一切不要。
{
  "hook": "Threadsフック案",
  "reply": "リプライ案",
  "room": "ROOM投稿案",
  "archetype": "フックで使用した型の名前"
}`;

  // 4. Gemini API 呼び出し
  const resultText = callGeminiApi(systemPrompt, userPrompt, imageParts);
  
  try {
    const match = resultText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AIの回答にJSONが含まれていません。");
    
    const res = JSON.parse(match[0]);

    // 5. 三位一体の書き込み
    sheet.getRange(row, COL.GEN_HOOK).setValue(res.hook);
    sheet.getRange(row, COL.GEN_REPLY).setValue(res.reply);
    sheet.getRange(row, COL.GEN_ROOM).setValue(res.room);

    return { status: "success", hook: res.hook, reply: res.reply, room: res.room };

  } catch (e) {
    console.error("Parse Error: " + e.message, resultText);
    throw new Error("調合結果の解析に失敗しました。内容: " + resultText.substring(0, 100));
  }
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
