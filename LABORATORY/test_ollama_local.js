/**
 * test_ollama_local.js
 * CLI経由で Ollama (gemma4:e4b_custom) の動作を検証するスクリプト
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 11434,
  path: '/api/generate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

const payload = {
  model: "gemma4:e4b_custom",
  prompt: "楽天ROOMの紹介文を作成して。フォーマットはJSONで、項目は 'room_text', 'threads_hook', 'threads_reply' を含めて。",
  stream: false,
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log("--- Ollama Response ---");
      console.log(response.response);
      console.log("--- End ---");
    } catch (e) {
      console.error("Parse Error:", e.message);
      console.log("Raw Data:", data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Ollama connection failed: ${e.message}`);
  console.log("Ollamaが起動しているか、gemma4:e4b_custom がロードされているか確認してください。");
});

req.write(JSON.stringify(payload));
req.end();
