/**
 * 03_Gemini.gs
 * Gemini API (Multimodal) との通信および文章生成ロジック。
 */

/**
 * 📸 画像を読み取り、DNAの変数を用いて3パターンの文章を生成・展開する
 */
function generateThreadsPost(row, personaKey = 'A') {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = personaKey === 'A' ? SHEET_A : SHEET_B;
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    throw new Error(`シート '${sheetName}' が見つかりません。シートをコピーして作成してください。`);
  }

  const itemName = sheet.getRange(row, COL.ITEM_NAME).getValue();
  const imageParts = getImageParts(sheet, row);
  
  // 1. 人格DNAの選択（外部ファイル 31_Soul_DNA_X.gs から取得）
  const dna = personaKey === 'A' ? SOUL_A : SOUL_B;
  const systemPrompt = dna.systemInstruction;
  const temp = dna.temperature || 0.7;

  // 2. DNAに基づいた3つの異なる変数セットをランダムに抽出
  const vars = [
    getRandomVariablesFromDna(dna),
    getRandomVariablesFromDna(dna),
    getRandomVariablesFromDna(dna)
  ];
  
  const userPrompt = `
【最優先指令：思考プロセスを実行せよ】
1. 分析：材料、塗装、精度を瞬時に見抜け。
2. 選定：下記の変数と画像に基づき、最適な型を選べ。
3. 憑依：師匠の事例を完全模倣し、魂を吹き込め。

【アイテム名】: ${itemName || "（写真から判断）"}

【セット1 変数】: 韻=${vars[0].tone}, フォーカス=${vars[0].focus}, ターゲット=${vars[0].target}
【セット2 変数】: 韻=${vars[1].tone}, フォーカス=${vars[1].focus}, ターゲット=${vars[2].target}
【セット3 変数】: 韻=${vars[2].tone}, フォーカス=${vars[2].focus}, ターゲット=${vars[1].target}

出力は以下のJSON配列形式（3パターン分）で返せ。
[
  {
    "analysis": "職人視点での分析",
    "selected_type": "選んだ型名",
    "hook": "25文字以内の衝撃",
    "reply": "期待値を高めるリプライ",
    "room": "商品の物理的価値（80文字前後）"
  },
  ...
]`;

  // 3. Gemini API 呼び出し
  const resultText = callGeminiApi(systemPrompt, userPrompt, imageParts, temp);
  
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
      
      // 分析結果をメモとして残す
      if (res.analysis) {
        sheet.getRange(targetRow, COL.GEN_HOOK).setNote(`【分析】: ${res.analysis}\n【型】: ${res.selected_type}`);
      }
    });

    return { status: "success", count: resList.length };

  } catch (e) {
    console.error("Parse Error: " + e.message, resultText);
    throw new Error("AI応答の解析に失敗しました。");
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
    SpreadsheetApp.getUi().alert("🛠 利用可能なモデル一覧:\n\n" + modelList);
  } else {
    SpreadsheetApp.getUi().alert("モデル一覧を取得できませんでした。");
  }
}

/**
 * 🎲 DNAからランダムな変数を生成する
 */
function getRandomVariablesFromDna(dna) {
  const v = dna.variables;
  return {
    tone: v.tones[Math.floor(Math.random() * v.tones.length)],
    focus: v.focuses[Math.floor(Math.random() * v.focuses.length)],
    target: v.targets[Math.floor(Math.random() * v.targets.length)]
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
 * 📡 Gemini API (Multimodal) を叩く（一本化された通信関数）
 */
function callGeminiApi(systemPrompt, userPrompt, imageParts, temperature) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  
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
      temperature: temperature, 
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
