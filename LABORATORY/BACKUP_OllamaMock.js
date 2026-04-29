いな/**
 * OllamaMock.js
 * ローカルテスト用：Ollama (gemma4:e4b_custom) を直接叩くための代替ロジック
 * 
 * ※ GAS環境からは localhost を叩けないため、このコードは Chrome 拡張機能の
 *    サイドパネル (sidepanel.js) 等、ローカル環境で動作するコンテキストで利用します。
 */

const OLLAMA_CONFIG = {
  endpoint: "http://localhost:11434/api/generate", // Ollama ネイティブ API
  model: "gemma4:e4b_custom"
};

/**
 * Ollama へリクエストを送信する
 * @param {string} prompt - ユーザープロンプト
 * @param {string} masterPrompt - マスタープロンプト
 * @param {string} systemInstruction - システムインストラクション
 */
async function callOllamaLocal(prompt, masterPrompt = "", systemInstruction = "") {
  console.log("Ollama にリクエスト送信中...");

  const finalSystemInstruction = `${masterPrompt}\n\n${systemInstruction}`.trim();

  try {
    const response = await fetch(OLLAMA_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_CONFIG.model,
        prompt: prompt,
        system: finalSystemInstruction,
        stream: false,
        format: "json" // JSON出力を強制
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama エラー: ${response.status}`);
    }

    const data = await response.json();
    console.log("Ollama 回答受信:", data.response);

    return JSON.parse(data.response);
  } catch (error) {
    console.error("Ollama 通信失敗:", error);
    throw error;
  }
}

/**
 * AIAdapterからの呼び出しを想定したモック関数
 * @param {string} personaKey - ペルソナキー (例: "A")
 * @param {string} topic - 投稿のトピック
 * @param {string} [masterPrompt=""] - AIに思考や指示を直接注入するためのマスタープロンプト
 * @returns {{text: string}} - 生成されたテキストを含むオブジェクト
 */
async function Ollama_generateMockPost(personaKey, topic, masterPrompt = "") {
  console.log(`Ollama_generateMockPost called with persona: ${personaKey}, topic: ${topic}`);

  // 1. ペルソナに応じたシステムプロンプトを取得
  const persona = PersonaMaster.getPersona(personaKey);
  if (!persona) {
    throw new Error(`Persona with key ${personaKey} not found.`);
  }
  const systemInstruction = persona.system_prompt;

  // 2. ユーザープロンプトを組み立て
  //    ※ CollageService.generatePrompt と同じロジックを再現
  const userPrompt = `
    あなたは以下のペルソナになりきって、SNS投稿を作成してください。

    # ペルソナ
    ${persona.description}

    # 投稿のテーマ
    ${topic}

    # 指示
    - ユーザーの心に響くような、魅力的で共感を呼ぶ投稿を作成してください。
    - ハッシュタグは3個以上、最大5個まで付けてください。
    - 全体の文字数は200文字以内に収めてください。
    - 出力は必ずJSON形式で、"post_text"というキーに投稿内容を入れてください。
    `;

  // 3. Ollamaを呼び出す
  const generatedJson = await callOllamaLocal(userPrompt, masterPrompt, systemInstruction);

  // 4. レスポンスを返す
  return { text: generatedJson.post_text };
}


// 拡張機能側での統合テスト用
if (typeof chrome !== 'undefined' && chrome.runtime) {
  console.log("OllamaMock loaded in Extension context.");
}
