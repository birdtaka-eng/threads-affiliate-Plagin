/**
 * 40_Threads.gs [Threads自動投稿エンジン]
 * スケジュールでシートからHook+Replyを取得し、Threads APIで投稿する。
 */

// ===== 設定 =====
const ROOM_PROFILE_URL = "https://room.rakuten.co.jp/room_4730aa5203/items";
const COL_THREADS_STATUS = 12; // L列: 投稿ステータス

/**
 * 🔧 初回セットアップ（一度だけ実行してトークンを封印）
 * 実行後、この関数は削除してOK
 */
function setupThreadsCredentials() {
  PropertiesService.getScriptProperties().setProperty('THREADS_ACCESS_TOKEN', 'ここにアクセストークン');
  PropertiesService.getScriptProperties().setProperty('THREADS_USER_ID', 'ここにユーザーID（数字）');
  Logger.log("✅ Threadsクレデンシャルを封印しました。");
}

/**
 * ⏰ スケジュール実行エントリーポイント
 * GASのトリガーからこれを呼び出す
 */
function postToThreadsScheduled() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  for (const sheetName of [SHEET_A, SHEET_B]) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) continue;

    const lastRow = sheet.getLastRow();
    for (let row = 3; row <= lastRow; row++) {
      const hook   = sheet.getRange(row, COL.GEN_HOOK).getValue();
      const reply  = sheet.getRange(row, COL.GEN_REPLY).getValue();
      const status = sheet.getRange(row, COL_THREADS_STATUS).getValue();

      // Hook・Reply両方あり、かつ未投稿の行を狙う
      if (hook && reply && status !== '✅投稿済') {
        const result = _postWithReply(row, sheet, hook, reply);
        if (result.success) {
          sheet.getRange(row, COL_THREADS_STATUS).setValue('✅投稿済');
          Logger.log(`✅ Row ${row} (${sheetName}) を投稿しました。`);
        } else {
          Logger.log(`❌ Row ${row} 投稿失敗: ${result.error}`);
        }
        return; // 1トリガーにつき1投稿
      }
    }
  }

  Logger.log("📭 投稿対象行なし。");
}

/**
 * 📡 Hook投稿 → Reply投稿 の本体
 */
function _postWithReply(row, sheet, hookText, replyText) {
  const token  = PropertiesService.getScriptProperties().getProperty('THREADS_ACCESS_TOKEN');
  const userId = PropertiesService.getScriptProperties().getProperty('THREADS_USER_ID');

  if (!token || !userId) {
    return { success: false, error: "アクセストークンまたはユーザーIDが未設定です。setupThreadsCredentials() を実行してください。" };
  }

  // ===== ROOM URL をランダム選択（50/50）=====
  let roomUrl;
  const savedItemUrl = sheet.getRange(row, COL.ROOM_ITEM_URL).getValue();
  if (Math.random() < 0.5 || !savedItemUrl) {
    roomUrl = savedItemUrl || ROOM_PROFILE_URL;
  } else {
    roomUrl = ROOM_PROFILE_URL;
  }
  // どちらも無ければプロフィールURLにフォールバック
  if (!roomUrl) roomUrl = ROOM_PROFILE_URL;

  const fullReplyText = `${replyText}\n\n${roomUrl}`;

  try {
    // ===== Step 1: Hookコンテナ作成 =====
    const createRes = UrlFetchApp.fetch(
      `https://graph.threads.net/v1.0/${userId}/threads`,
      {
        method: 'POST',
        payload: { text: hookText, media_type: 'TEXT', access_token: token }
      }
    );
    const containerId = JSON.parse(createRes.getContentText()).id;
    if (!containerId) throw new Error("Hookコンテナ作成失敗");

    Utilities.sleep(3000);

    // ===== Step 2: Hook公開 =====
    const publishRes = UrlFetchApp.fetch(
      `https://graph.threads.net/v1.0/${userId}/threads_publish`,
      {
        method: 'POST',
        payload: { creation_id: containerId, access_token: token }
      }
    );
    const threadId = JSON.parse(publishRes.getContentText()).id;
    if (!threadId) throw new Error("Hook公開失敗");

    Utilities.sleep(3000);

    // ===== Step 3: Replyコンテナ作成 =====
    const replyCreateRes = UrlFetchApp.fetch(
      `https://graph.threads.net/v1.0/${userId}/threads`,
      {
        method: 'POST',
        payload: {
          text: fullReplyText,
          media_type: 'TEXT',
          reply_to_id: threadId,
          access_token: token
        }
      }
    );
    const replyContainerId = JSON.parse(replyCreateRes.getContentText()).id;
    if (!replyContainerId) throw new Error("Replyコンテナ作成失敗");

    Utilities.sleep(3000);

    // ===== Step 4: Reply公開 =====
    UrlFetchApp.fetch(
      `https://graph.threads.net/v1.0/${userId}/threads_publish`,
      {
        method: 'POST',
        payload: { creation_id: replyContainerId, access_token: token }
      }
    );

    return { success: true };

  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
