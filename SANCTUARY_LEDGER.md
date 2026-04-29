# 💎 聖域台帳 (SANCTUARY LEDGER)

このファイルは、Threads職人システムの「真実」を記録したものです。AIや人間が入れ替わっても、このルールを破ってはなりません。

## 📍 現在の座標 (ID)
- **スプレッドシート ID**: `1vgpoDggisreX8xYDarTGMjWdE5qNgy9sGKp5fe9toP8`
- **スクリプト ID**: `12rd0Cl8Ksf66Ps2VR6W3evLLRoXNhJy_V0orHGdyHU1gct6FTVQuB-Xw`
- **GAS エンドポイント**: `https://script.google.com/macros/s/AKfycbxbXwMHFdGYLp_vR39U6iVHoIf1XmWuz3aESCU7n8X308-vlNRC1nXuvmCZFPnidpgShw/exec`

## ⚔️ 一本刀の掟 (File Rule)
このシステムは以下のファイル構成のみを「正義」とする。これ以外のファイルがブラウザ上に存在する場合、メニューが消える等のエラーが発生する。
1. `00_Main`: 司令塔（メニュー、通信受付）
2. `01_Config`: 設計図（列、モデル設定）
3. `10_Cloud_Flash`: 通信兵（Gemini API）
4. `30_Soul_DNA`: 魂（人格定義）

## ⚠️ 二度と間違えないためのチェックリスト
1. **幽霊ファイルの排除**:
   ブラウザのスクリプトエディタに、上記以外の「動いているコード」が残っていないか？ 残っている場合は、中身を空にするか削除せよ。
2. **多重 onOpen の禁止**:
   `onOpen` 関数は `00_Main` にのみ存在させる。
3. **IDの不一致**:
   `.clasp.json` の `scriptId` が、上記の「スクリプト ID」と一致しているか常に確認せよ。

---
*「聖域の純度は、コードの短さに比例する。」*
