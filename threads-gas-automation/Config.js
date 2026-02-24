/**
 * Config.js
 * 全ての設定、レイアウト定義、定数はここで管理します。
 * 画面の見た目を変えたいときは、このファイルを修正してください。
 */

// --- 1. Sheet Names ---
var SHEET_BOARD = "投稿作成ボード";
// var SHEET_LAB = "バズ研究所"; // [LEGACY]
// var SHEET_DB = "テンプレートDB"; // [LEGACY]
// var SHEET_TORANOMAKI = "虎の巻DB"; // [LEGACY] User defined sheet
var SHEET_SCHEDULE = "番組表";
var SHEET_SETTINGS = "設定";
var SHEET_SETTINGS_AI_LOCK = "B19"; // New safety lock cell
var SHEET_SCHEDULE_A = "番組表A (ノーマル)";
var SHEET_SCHEDULE_B = "番組表B (5と0の日)";
var SHEET_SCHEDULE_C = "番組表C (マラソン)";
var SHEET_SCHEDULE_D = "番組表D (スーパーSALE)";

// --- 2. System Constants ---
var APP_NAME = "Threads職人 (AI Agent)";
var SHOW_DEV_TOOLS = true;

// --- 3. Gemini Models ---
var AI_MODELS = [
   "gemini-2.0-flash-lite",
   "gemini-2.0-flash",
   "gemini-2.0-flash-001",
   "gemini-2.0-flash-lite-001",
   "gemini-2.5-flash-lite",
   "gemini-2.5-flash",
   "gemini-2.5-pro",
   "gemini-1.5-flash",
   "gemini-1.5-pro"
];
var DEFAULT_MODEL = "gemini-2.0-flash-lite";

// --- 3.5 Master GEM URLs (Custom Chatbots) ---
var MASTER_GEMS = {
   "Basic": "https://gemini.google.com/gem/1aBiJAfolAvFZCOx3prhXY2xIMDiurNaF?usp=sharing",
   "Var": "https://gemini.google.com/gem/1Q21gMYOlJkmgOgj33WLcJHdMVHUm99Sp?usp=sharing",
   "Rewrite": "https://gemini.google.com/gem/1X6e0002_wnx0zUVSDJgSG9ZVW04p3qIX?usp=sharing",
   "Poison": "https://gemini.google.com/gem/1MQ43EwCup8o6Eh6nZPODcFi0JdWidJUT?usp=sharing",
   "ROOM": "https://gemini.google.com/app",
   "Mix": "https://gemini.google.com/gem/0a654a7558d1?usp=sharing"
};

// --- 4. Layout Definitions (Buzz Lab) ---
/* [LEGACY] - Buzz Lab Config
var LAB_CONFIG = {
   // Row 1: Description
   description: "【使い方】\n1. 「Raw Post」にバズった投稿の本文を貼り付けます。\n2. 「🚀 Run」にチェックを入れるとAIが分析を開始します。\n3. 結果(DNA)が右側に出力され、自動的に「テンプレートDB」に登録されます。",

   // Rows 2 & 3: Headers and Guides
   columns: [
      {
         name: "Run",
         header: "🚀 Run",
         guide: "↓分析開始",
         width: 60,
         type: "CHECKBOX"
      },
      {
         name: "Type",
         header: "Type",
         guide: "↓種類を選択",
         width: 80,
         type: "DROPDOWN",
         options: ["単品", "日常", "有益", "自己紹介", "Free", "まとめ"]
      },
      {
         name: "Context",
         header: "Image Context (背景・状況)",
         guide: "【画像】あれば内容をメモ",
         width: 150,
         type: "TEXT"
      },
      {
         name: "Raw",
         header: "Raw Post (原文)",
         guide: "【原文】ここにバズッた投稿をコピペ",
         width: 350,
         type: "TEXT_WRAP"
      },
      {
         name: "DNA",
         header: "DNA (Analysis Result)",
         guide: "←ここにAI分析結果が出ます",
         width: 400,
         type: "TEXT_WRAP_BG"
      }
   ]
};
*/

/* [LEGACY] - Humor Library
var HUMOR_LIBRARY = `
... (Omitted for brevity)
`;
*/

