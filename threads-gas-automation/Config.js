/**
 * Config.js
 * 全ての設定、レイアウト定義、定数はここで管理します。
 * 画面の見た目を変えたいときは、このファイルを修正してください。
 */

// --- 1. Sheet Names ---
var SHEET_BOARD = "投稿作成ボード";
var SHEET_LAB = "バズ研究所";
var SHEET_DB = "テンプレートDB";
var SHEET_TORANOMAKI = "虎の巻DB"; // User defined sheet
var SHEET_SCHEDULE = "番組表";
var SHEET_SETTINGS = "設定";

// --- 2. System Constants ---
var APP_NAME = "Threads職人 (AI Agent)";
var SHOW_DEV_TOOLS = true;

// --- 3. Gemini Models ---
var AI_MODELS = [
   "gemini-2.0-flash-exp",
   "gemini-1.5-flash",
   "gemini-1.5-pro"
];
var DEFAULT_MODEL = "gemini-1.5-flash";

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

// --- Humor Library (for Analysis) ---
var HUMOR_LIBRARY = `
1. The Absurd List (3段落ち)
   Structure: "Normal A, Normal B, [Absurd C]"
2. Specific Hyperbole (具体的すぎる誇張)
   Structure: "Not just [Adjective], but [Adjective] like [Specific Scene]"
3. The Honest Reversal (急な裏切り/本音)
   Structure: [Serious/Professional Statement] + [Pathetic/Lazy Reality]
4. The "Me vs. World" Contrast (自虐)
   Structure: "Everyone else: [Success]. Me: [Struggle]."
5. Metaphorical Juxtaposition (異種格闘技戦)
   Structure: "[Topic] is like [Unrelated Thing] because [Shared Trait]."
6. The Playful Label (愛嬌のある造語)
   Structure: [Target Attribute] -> [Playful Neologism]
7. The Benign Violation (緩和された違反)
   Structure: [A mild threat/taboo/insult] + [Playful context/Safety net]
8. The Joy of Debugging (思考のバグ)
   Structure: [Impossible Logic] + [Confident Assertion]
9. The Insignificant Detail (どうでもいい話)
   Structure: [Big Event] -> [Focus on tiny, irrelevant detail]
10. The Ride & Deny (ノリツッコミ/1回肯定)
   Structure: [Total Agreement/Praise] -> [Sudden Denial/Reality Check]
   Structure: [Total Agreement/Praise] -> [Sudden Denial/Reality Check]
`;

