# 🛡️ SCOUT V42 PRO [ARCHITECTURE]

このドキュメントは、楽天ROOM自動化システムの「全知全能の地図」である。
AIアシスタントは、開発・修正を行う前に必ずこの設計図を読み込み、構造を理解しなければならない。

## 🎯 システムの目的
楽天市場の商品ページから楽天ROOMの投稿画面まで、**「ワンクリック・全自動・思考停止」** で文章を運び込み、投稿を完結させる。

## ⚔️ 三権分立システム (Tripartite System)

システムは以下の3つの独立したコンポーネントが連携して動作する。

### 1. 斥候 (Content Script: `content.js`)
*   **稼働場所**: 楽天市場 (`item.rakuten.co.jp`)、楽天ROOM (`room.rakuten.co.jp`)
*   **役割**: 現場の実行部隊
*   **主要機能**:
    *   **Auto-Reflector**: URL内の `row=\d+` を検知し、ROOMボタンを自動でクリックしてジャンプする。
    *   **記憶保持**: ジャンプ直前に `chrome.storage.local` に行番号（row）を刻み込む。
    *   **自動注入**: `INJECT_TEXT` メッセージを受け取り、Reactの壁を突破して文章を流し込む。

### 2. 司令塔 (Background Script: `background.js`)
*   **稼働場所**: 拡張機能のバックグラウンド
*   **役割**: 通信のハブ & 環境整備
*   **主要機能**:
    *   **Message Relay**: 斥候と本陣の間で、ドメインを跨いでも通信が途絶えないようメッセージを中継する。
    *   **SidePanel Auto-Open**: ROOM着地を検知した瞬間、サイドパネルを強制展開する。

### 3. 本陣 (Sidepanel: `sidepanel.js`)
*   **稼働場所**: Chromeサイドパネル
*   **役割**: 情報の司令部（GASとの唯一の通信窓口）
*   **主要機能**:
    *   **GAS通信**: 行番号を元に `GAS_ENDPOINT` へアクセスし、対象行の文章を取得する。
    *   **Cold Start Injection**: 起動時にストレージを自発的に確認し、やり残した仕事（行番号）があれば即座に注入プロセスを開始する。

## 📡 通信プロトコル

1.  **発火**: 楽天ページ読み込み時、`content.js` が `row=` を検知。
2.  **記憶**: `content.js` が `chrome.storage.local` に `row` を保存。
3.  **跳躍**: `content.js` が ROOMボタンをクリック。
4.  **着地**: ROOMページで `content.js` が着地を検知し、`background.js` へ `ROOM_LANDED` を送信。
5.  **展開**: `background.js` がサイドパネルをオープンし、メッセージを `sidepanel.js` へリレー。
6.  **調合**: `sidepanel.js` が GAS から文章を取得。
7.  **完了**: `sidepanel.js` が `content.js` へ `INJECT_TEXT` を送信し、注入完了。

## ⚠️ 開発の掟
*   **一文字の不純物も許さない**: 括弧のバランス、不正な文字コードは Python スクリプトで厳格に検証すること。
*   **権限の確認**: 新たなAPIを使う際は必ず `manifest.json` の `permissions` を確認すること。
*   **同一オリジンポリシー**: ドメインを跨ぐデータの受け渡しは、`sessionStorage` ではなく `chrome.storage.local` を使用すること。

---
**Version**: 42.2.1 [PHOENIX]
**Last Restoration Point**: `0d022da`
