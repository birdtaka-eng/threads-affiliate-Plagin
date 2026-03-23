/**
 * Board.js
 * 投稿作成ボード (Content Factory) 関連のロジック
 */

/**
 * 【設定】投稿ボード作成 (リセット)
 */

/**
 * 【設定】投稿ボード作成 (リセット)
 */
function setupBoardSheet() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = SHEET_BOARD;
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
        sheet = ss.insertSheet(sheetName);
    }

    // 1. クリーニング
    sheet.getRange("A1:Z1000").clear();
    sheet.getRange("A1:Z1000").clearDataValidations();
    sheet.getRange("A1:Z1000").clearFormat();

    // 2. ヘッダー行 (2行目)
    var headers = [
        ["ON AIR", "No", "Type", "Photo 1", "Photo 2", "Photo 3", "ROOM Content (ROOM投稿用)", "Threads Post (フック)", "Reply Post (リプライ用)", "System ID", "👁️ Views", "❤️ Likes", "💬 Replies", "🔁 Reposts", "📊 Rate", "📝 Judge", "DNA (分析)", "Last Broadcast"]
    ];

    sheet.getRange("A2:R2").setValues(headers);
    sheet.getRange("A2:R2").setBackground("#ffe599"); // Yellow
    sheet.getRange("A2:R2").setFontWeight("bold");
    sheet.getRange("A2:R2").setHorizontalAlignment("center");

    // 3. ガイド行 (3行目)
    var guides = [
        "チェックボックス", "No", "↓Type", "[Auto1]", "[Auto2]", "[Auto3]",
        "↓ここでROOM用文章をコピペ",
        "←ここに1通目フック文章",
        "←ここに2通目返信文章",
        "⛔ ID", "閲覧数", "いいね", "返信", "引用/再投稿", "反応率", "判定",
        "←ここにAI分析結果が出ます",
        "自動記録(ループ用)"
    ];
    sheet.getRange("A3:R3").setValues([guides]);
    sheet.getRange("A3:R3").setBackground("#f3f3f3").setFontColor("#666666").setFontSize(9).setVerticalAlignment("top").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    sheet.setRowHeight(3, 60);

    // 4. データエリア設定 (4行目以降)
    sheet.getRange("A4:R1000").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    sheet.getRange("A4:R1000").setVerticalAlignment("top");
    sheet.setRowHeight(2, 40); // Header height
    sheet.setFrozenRows(3);    // Freeze top 3 rows

    // 5. バリデーション & 幅調整
    // A: ON AIR Checkbox
    var checkboxOnAir = SpreadsheetApp.newDataValidation().requireCheckbox().build();
    sheet.getRange("A4:A100").setDataValidation(checkboxOnAir);

    // C: Type Rule
    var ruleType = SpreadsheetApp.newDataValidation()
        .requireValueInList(["単品", "日常", "有益", "自己紹介", "Free", "まとめ"], true)
        .setAllowInvalid(false).build();
    sheet.getRange("C4:C100").setDataValidation(ruleType);

    // Widths
    sheet.setColumnWidth(1, 60);  // ON AIR
    sheet.setColumnWidth(2, 40);  // No
    sheet.setColumnWidth(3, 80);  // Type
    sheet.setColumnWidth(4, 100); // Photo 1
    sheet.setColumnWidth(5, 100); // Photo 2
    sheet.setColumnWidth(6, 100); // Photo 3
    // G: ROOM Content
    sheet.getRange("G4:G100").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);

    // Widths
    sheet.setColumnWidth(1, 60);  // ON AIR
    sheet.setColumnWidth(2, 40);  // No
    sheet.setColumnWidth(3, 80);  // Type
    sheet.setColumnWidth(4, 150); // Photo 1 (Larger width)
    sheet.setColumnWidth(5, 150); // Photo 2 (Larger width)
    sheet.setColumnWidth(6, 150); // Photo 3 (Larger width)
    sheet.setColumnWidth(7, 300); // ROOM Content (Wider for text)
    sheet.setColumnWidth(8, 400); // Output
    sheet.setColumnWidth(9, 400); // Reply Post
    sheet.setColumnWidth(10, 50);  // System ID

    // Metrics Widths
    sheet.setColumnWidth(11, 60); // Views
    sheet.setColumnWidth(12, 60); // Likes
    sheet.setColumnWidth(13, 60); // Replies
    sheet.setColumnWidth(14, 60); // Reposts
    sheet.setColumnWidth(15, 60); // Rate
    sheet.setColumnWidth(16, 60); // Judge
    sheet.setColumnWidth(17, 200); // DNA
    sheet.setColumnWidth(18, 120); // Last Broadcast

    try {
        Browser.msgBox("投稿作成ボード(Pro版)の準備ができました！");
    } catch (e) {
        // API実行時はスキップ
        console.log("Setup completed (Headless mode)");
    }
}

/**
 * 投稿データ更新 (Metrics)
 */
function updateMetrics() {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const settingsSheet = ss.getSheetByName(SHEET_SETTINGS);
        if (!settingsSheet) return;

        const token = String(settingsSheet.getRange("B4").getValue()).trim();
        if (!token) {
            Browser.msgBox("エラー: 設定シートにAPI Tokenが入力されていません。");
            return;
        }

        const boardSheet = ss.getSheetByName(SHEET_BOARD);
        if (!boardSheet) return;

        const lastRow = Math.max(boardSheet.getLastRow(), 4);
        if (lastRow < 4) return;

        const boardData = boardSheet.getRange(`A4:R${lastRow}`).getValues();

        let updatedCount = 0;

        for (let i = 0; i < boardData.length; i++) {
            const mediaId = String(boardData[i][9]).trim(); // Column J (System ID)

            if (mediaId && mediaId.length > 5 && mediaId !== "undefined") {
                // Fetch metrics
                const res = getThreadsMetricsAPI(mediaId, token);
                if (res.success && res.metrics) {
                    // K=11, L=12, M=13, N=14
                    const rowNum = i + 4;
                    boardSheet.getRange(rowNum, 11).setValue(res.metrics.views || 0);
                    boardSheet.getRange(rowNum, 12).setValue(res.metrics.likes || 0);
                    boardSheet.getRange(rowNum, 13).setValue(res.metrics.replies || 0);
                    boardSheet.getRange(rowNum, 14).setValue(res.metrics.reposts || 0);

                    // Simple Engagement Rate calculation (Likes+Replies / Views)
                    if (res.metrics.views > 0) {
                        const rate = ((res.metrics.likes + res.metrics.replies) / res.metrics.views);
                        boardSheet.getRange(rowNum, 15).setValue(rate).setNumberFormat("0.0%"); // O
                    }

                    updatedCount++;
                }
            }
        }

        Browser.msgBox(`更新完了\n${updatedCount}件の投稿データを最新に更新しました！`);

    } catch (e) {
        Browser.msgBox("エラー: " + e.message);
    }
}

/**
 * 【作成】投稿一括生成 (全タイプ)
 */
function generateUnifiedPosts() {
    generatePostsCommon(SHEET_BOARD);
}

/**
 * 【単品】まとめネタ作成 (選択合体)
 */
function generateSummaryPost() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_BOARD);
    if (!sheet) return;

    let apiKey = getGeminiApiKey();
    if (!apiKey) {
        try { Browser.msgBox("API Key Missing"); } catch (e) { }
        return;
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 5) { // Needs at least 2 checked items, so checks start from row 4
        try { Browser.msgBox("データがありません。"); } catch (e) { }
        return;
    }

    const range = sheet.getRange(4, 1, lastRow - 3, 7); // Start from Row 4
    const values = range.getValues();

    let selectedContents = [];
    let selectedHumors = [];

    for (let i = 0; i < values.length; i++) {
        if (values[i][0] === true) { // Checked
            const output = values[i][6]; // Col G (Output)
            const topic = values[i][4];  // Col E (Topic)
            const humor = values[i][3];  // Col D (Humor)

            const content = output ? output : topic;
            if (content) {
                selectedContents.push(content);
                if (humor) selectedHumors.push(humor);
            }
        }
    }

    if (selectedContents.length < 2 || selectedContents.length > 5) {
        try {
            Browser.msgBox(`選択数は2～5個にしてください。\n現在の選択数: ${selectedContents.length}`);
        } catch (e) { }
        return;
    }

    const combinedContent = selectedContents.map((t, idx) => `【ネタ${idx + 1}】\n${t}`).join("\n\n");
    const humorLevel = selectedHumors.length > 0 ? selectedHumors[0] : "Lv2: 標準";

    const prompt = `
あなたはThreadsの人気インフルエンサーです。
以下の「複数の投稿内容(またはネタ)」を素材として、**1つの「まとめ投稿」**を新規に書き下ろしてください。

【素材リスト】
${combinedContent}

【指示】
- 「○選」や「まとめ」の形式で再構成。
- ハッシュタグ禁止。
- 出力は**投稿本文のみ**。
`;

    try {
        let text = callGeminiSafe(apiKey, prompt);
        text = text.replace(/#\S+/g, '').trim();

        sheet.appendRow([
            false,           // Select
            "",              // No
            "まとめ",        // Type
            humorLevel,      // Humor
            "選択されたネタのまとめ", // Topic
            text,            // Output
            "",              // Image
            "Generated"      // Status
        ]);

        try { Browser.msgBox("まとめ投稿を作成しました！"); } catch (e) { }
    } catch (e) {
        try { Browser.msgBox("エラー: " + e.message); } catch (err) { }
    }
}

/**
 * 自動放送実行 (Scheduled Broadcast)
 */
function runScheduledBroadcast() {
    let internalLog = [];
    const _log = (msg) => {
        internalLog.push(msg);
        debugLog(msg);
    };

    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();

        // Which pattern is active? (設定シートのB17: A/B/C/D)
        // Single sheet layout: B,C=A / E,F=B / H,I=C / K,L=D (startCol = 2/5/8/11)
        const settingsSheet = ss.getSheetByName(SHEET_SETTINGS);
        const activePattern = settingsSheet ? String(settingsSheet.getRange("B17").getValue()).trim().toUpperCase() : "A";
        const colMap = { "A": 2, "B": 5, "C": 8, "D": 11 };
        const timeCol = colMap[activePattern] || 2;
        const genreCol = timeCol + 1;
        _log(`[Schedule] Active pattern: ${activePattern} (cols ${timeCol},${genreCol})`);

        const scheduleSheet = ss.getSheetByName(SHEET_SCHEDULE);
        if (!scheduleSheet) {
            _log("[Abort] 番組表シートが見つかりません。「番組表リセット」を実行してください。");
            return internalLog.join("\\n");
        }

        const now = new Date();
        const hour = now.getHours();
        const min = now.getMinutes();

        // Match exact HH:MM (5-min trigger, so we accept ±3 min window)
        const nowMinTotal = hour * 60 + min;

        _log(`[Schedule] Checking time: ${("0" + hour).slice(-2)}:${("0" + min).slice(-2)}`);

        // Only process each unique Date+Time slot once (rounded to 5-min block)
        const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd");
        const blockMin = Math.floor(min / 5) * 5;
        const uniqueSlotId = `${dateStr}_${("0" + hour).slice(-2)}:${("0" + blockMin).slice(-2)}_${activePattern}`;
        const props = PropertiesService.getScriptProperties();
        if (props.getProperty("LAST_PROCESSED_SLOT") === uniqueSlotId) {
            _log(`[Abort] すでに処理済みのスロットです: ${uniqueSlotId}`);
            return internalLog.join("\\n");
        }

        // 1. Find matching time in schedule column, read genre from adjacent column
        // Data starts at row 3 (row1=title, row2=headers)
        const lastRowSchedule = Math.max(scheduleSheet.getLastRow(), 3);
        const scheduleData = scheduleSheet.getRange(3, timeCol, lastRowSchedule - 2, 2).getDisplayValues();

        _log(`[Schedule] Scanning ${scheduleData.length} rows for pattern ${activePattern}...`);

        let targetRowIndex = -1;
        let genre = "";

        for (let i = 0; i < scheduleData.length; i++) {
            const cellTime = String(scheduleData[i][0]).trim();
            if (!cellTime) continue;

            const match = cellTime.match(/(\d{1,2})[:時]\s*(\d{1,2})?/);
            if (!match) continue;

            const cellHour = parseInt(match[1], 10);
            const cellMin = match[2] ? parseInt(match[2], 10) : 0;
            const cellMinTotal = cellHour * 60 + cellMin;

            if (Math.abs(cellMinTotal - nowMinTotal) <= 3) {
                targetRowIndex = i + 3;
                genre = scheduleData[i][1];
                break;
            }
        }

        if (targetRowIndex === -1) {
            _log(`[Schedule] No scheduled slot found near current time for pattern ${activePattern}.`);
            return internalLog.join("\\n");
        }

        if (!genre) {
            _log(`[Schedule] Abort: Row ${targetRowIndex} has no genre set.`);
            props.setProperty("LAST_PROCESSED_SLOT", uniqueSlotId);
            return internalLog.join("\\n");
        }

        _log(`[Schedule] Triggered slot ${uniqueSlotId} for Genre: ${genre}`);

        // 2. Find Candidate in Board
        const boardSheet = ss.getSheetByName(SHEET_BOARD);
        if (!boardSheet) {
            _log("[Abort] 投稿作成ボードが見つかりません。");
            return internalLog.join("\\n");
        }

        const lastRow = Math.max(boardSheet.getLastRow(), 4);
        const boardData = boardSheet.getRange(`A4:Q${lastRow}`).getValues();

        let oldestRow = -1;
        let oldestTime = null;
        let selectedData = null;

        for (let i = 0; i < boardData.length; i++) {
            const isChecked = boardData[i][0] === true;
            const type = boardData[i][2];

            if (isChecked && type === genre) {
                const lastBroadcast = boardData[i][16]; // Q column (0-indexed 16)

                if (!lastBroadcast) {
                    oldestRow = i + 4;
                    selectedData = boardData[i];
                    break; // Prioritize unbroadcasted
                }

                const lbTime = new Date(lastBroadcast).getTime();
                if (oldestTime === null || lbTime < oldestTime) {
                    oldestTime = lbTime;
                    oldestRow = i + 4;
                    selectedData = boardData[i];
                }
            }
        }

        if (oldestRow === -1) {
            _log(`[Schedule] No ON AIR materials for genre '${genre}'`);
            props.setProperty("LAST_PROCESSED_SLOT", uniqueSlotId);
            return internalLog.join("\\n");
        }

        // 3. Fetch Settings (UserID, Token) - reuse settingsSheet from above
        if (!settingsSheet) {
            _log(`[Schedule] Error: Settings sheet missing.`);
            return internalLog.join("\\n");
        }

        const userId = String(settingsSheet.getRange("B3").getValue()).trim();
        const token = String(settingsSheet.getRange("B4").getValue()).trim();

        if (!userId || !token) {
            _log(`[Schedule] Error: User ID or Token is empty in Settings.`);
            return internalLog.join("\\n");
        }

        // 4. Send Broadcast to official Threads API
        _log(`[Schedule] Selected Row ${oldestRow}, calling Official API...`);
        const type = selectedData[2] || ""; // C column
        const roomContent = selectedData[6] || ""; // G column
        const threadsText = selectedData[7] || ""; // H column
        const replyText = selectedData[8] || ""; // I column

        // Extract Images 1, 2, 3
        let extractedUrls = [];
        for (let colOffset = 4; colOffset <= 6; colOffset++) { // D=4, E=5, F=6
            let rawUrl = selectedData[colOffset - 1] || "";
            let formula = boardSheet.getRange(oldestRow, colOffset).getFormula();

            let url = "";
            if (formula && formula.toUpperCase().includes("IMAGE")) {
                let match = formula.match(/["'](https?:\/\/[^"']+)["']/i);
                if (match) url = match[1];
            } else if (typeof rawUrl === 'string' && rawUrl.startsWith('=IMAGE')) {
                let match = rawUrl.match(/["'](https?:\/\/[^"']+)["']/i);
                if (match) url = match[1];
            } else if (typeof rawUrl === 'string' && rawUrl.startsWith('http')) {
                url = rawUrl;
            }
            extractedUrls.push(url);
        }

        let res;

        if (type === "単品") {
            _log(`[Schedule] Two-Step Reply Mode (Type: 単品)`);
            let post1Images = extractedUrls[0] ? [extractedUrls[0]] : [];
            res = postToThreadsAPI(userId, token, threadsText, post1Images);

            if (res.success) {
                _log(`[Schedule] Success Post 1! Parent ID: ${res.mediaId}`);
                let parentId = res.mediaId;

                let post2Images = [];
                if (extractedUrls[1]) post2Images.push(extractedUrls[1]);
                if (extractedUrls[2]) post2Images.push(extractedUrls[2]);

                if (replyText || post2Images.length > 0) {
                    _log(`[Schedule] Creating Post 2 (Reply)...`);
                    const res2 = postToThreadsAPI(userId, token, replyText, post2Images, parentId);
                    if (res2.success) {
                        _log(`[Schedule] Success Post 2 (Reply)! ID: ${res2.mediaId}`);
                    } else {
                        _log(`[Schedule] Post 2 Failed: ${res2.error}`);
                    }
                }
            } else {
                _log(`[Schedule] Post 1 Failed: ${res.error}`);
            }

        } else {
            // Existing unified logic for others
            let imageUrlsToPost = extractedUrls.filter(u => u !== "");
            res = postToThreadsAPI(userId, token, threadsText, imageUrlsToPost);

            if (res.success) {
                _log(`[Schedule] Success Unified Post! Media ID: ${res.mediaId}`);
            } else {
                _log(`[Schedule] API Payload Failed: ${res.error}`);
            }
        }

        // Common Success Handler
        if (res && res.success) {
            boardSheet.getRange(oldestRow, 10).setValue(res.mediaId); // Col J System ID
            boardSheet.getRange(oldestRow, 18).setValue(new Date()); // Col R Last Broadcast
        } else {
            // If res is null or not successful, log the error from the main post attempt
            if (res && res.error) {
                _log(`[Schedule] Final API Call Failed: ${res.error}`);
            } else {
                _log(`[Schedule] Final API Call Failed: Unknown error or no post made.`);
            }
        }

        // Always mark as processed to avoid retry loop within the same 30-min window
        props.setProperty("LAST_PROCESSED_SLOT", uniqueSlotId);

        return internalLog.join("\\n");

    } catch (e) {
        _log("[Schedule] Fatal Error: " + e.message);
        return internalLog.join("\\n");
    }
}

/**
 * 手動放送用 (Menu Trigger)
 */
function runBroadcast() {
    // Force clear the lock for manual testing
    PropertiesService.getScriptProperties().deleteProperty("LAST_PROCESSED_SLOT");

    // 実行結果のログを受け取る
    const logStr = runScheduledBroadcast();

    // 無言で終了しないよう、何が起きたかをそのまま画面に出す
    Browser.msgBox("実行ログ:\\n" + (logStr || "何も実行されませんでした。"));
}

/**
 * APIを使って分析データを更新 (Update Metrics)
 */
function updateMetrics() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const boardSheet = ss.getSheetByName(SHEET_BOARD);
    if (!boardSheet) return;

    const creds = getThreadsCredentials();
    if (!creds) {
        try { Browser.msgBox("API設定が見つかりません。"); } catch (e) { }
        return;
    }
    const { token } = creds;

    const lastRow = boardSheet.getLastRow();
    if (lastRow < 4) return;

    const range = boardSheet.getRange(4, 1, lastRow - 3, 16);
    const data = range.getValues();
    let updateCount = 0;

    data.forEach((row, i) => {
        const sysId = row[9]; // Index 9 (J列)
        if (!sysId) return;

        try {
            const url = `https://graph.threads.net/v1.0/${sysId}/insights?metric=views,likes,replies,reposts,quotes&access_token=${token}`;
            const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
            const json = JSON.parse(resp.getContentText());

            if (json.data) {
                let views = 0, likes = 0, replies = 0, reposts = 0, quotes = 0;
                json.data.forEach(item => {
                    const val = (item.values && item.values.length > 0) ? item.values[0].value : 0;
                    if (item.name === 'views') views = val;
                    if (item.name === 'likes') likes = val;
                    if (item.name === 'replies') replies = val;
                    if (item.name === 'reposts') reposts = val;
                    if (item.name === 'quotes') quotes = val;
                });

                const totalDiffusion = reposts + quotes;
                let rate = 0;
                if (views > 0) rate = ((likes + replies + totalDiffusion) / views) * 100;
                const rateStr = rate.toFixed(2) + "%";
                let judge = "-";
                if (views > 1000 && rate > 5.0) judge = "🔥バズ";
                else if (views > 500 && rate > 3.0) judge = "🎯良";
                else if (views > 100) judge = "👀";

                const targetRow = i + 4;
                boardSheet.getRange(targetRow, 11).setValue(views);
                boardSheet.getRange(targetRow, 12).setValue(likes);
                boardSheet.getRange(targetRow, 13).setValue(replies);
                boardSheet.getRange(targetRow, 14).setValue(totalDiffusion);
                boardSheet.getRange(targetRow, 15).setValue(rateStr);
                boardSheet.getRange(targetRow, 16).setValue(judge);
                updateCount++;
            }
        } catch (e) { }
    });
    try { Browser.msgBox(`${updateCount}件の投稿データを更新しました。`); } catch (e) { }
}

/**
 * 共通記事生成ロジック (Unified Factory)
 */
function generatePostsCommon(sheetName, targetRow) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    const labSheet = ss.getSheetByName(SHEET_LAB);

    if (!sheet) {
        try { Browser.msgBox(`シート「${sheetName}」が見つかりません。`); } catch (e) { }
        return;
    }

    let apiKey = getGeminiApiKey();
    if (!apiKey) {
        if (!targetRow) {
            try { Browser.msgBox("API Key Missing"); } catch (e) { }
        }
        return;
    }

    // --- 1. Resources: Personas & Style ---
    let evolvedPersona = "30代女性インフルエンサー";
    let masterStyle = "";

    try {
        const setSheet = ss.getSheetByName(SHEET_SETTINGS);
        if (setSheet) {
            // Evolved Persona (B8)
            const p = setSheet.getRange("B8").getValue();
            if (p && String(p).length > 10) evolvedPersona = p;
            else {
                // Fallback to Seed (B6)
                const seed = setSheet.getRange("B6").getValue();
                if (seed) evolvedPersona = seed;
            }

            // Master Style (B9)
            const s = setSheet.getRange("B9").getValue();
            if (s) masterStyle = s;
        }
    } catch (e) { }

    // --- 2. Resources: Expert Tips (Toranomaki DB) ---
    // Read raw tips (Techniques)
    let expertTips = "";
    const toraSheet = ss.getSheetByName(SHEET_TORANOMAKI);
    if (toraSheet && toraSheet.getLastRow() >= 2) {
        try {
            const rawTips = toraSheet.getRange(2, 2, toraSheet.getLastRow() - 1, 1).getValues();
            expertTips = rawTips.flat().filter(String).join("\n- ");
        } catch (e) { }
    }

    // --- 3. Resources: Template DB (Skeleton) ---
    let templates = [];
    const dbSheet = ss.getSheetByName(SHEET_DB);
    if (dbSheet && dbSheet.getLastRow() > 1) {
        try {
            const lastDbRow = dbSheet.getLastRow();
            templates = dbSheet.getRange(2, 1, lastDbRow - 1, 6).getValues();
        } catch (e) { }
    }

    // --- 4. Target Identification ---
    const lastRow = sheet.getLastRow();
    if (lastRow < 4) return;

    // Column Config (Ref: LAYOUT_MASTER.md)
    var colOnAir = 1;
    var colType = 3;
    var colTopic = 7;
    var colOutput = 8;
    var colHumor = 4; // 仮定：LAYOUT_MASTERにないのでPhoto1と被らないよう配慮が必要だが、既存ロジックが参照しているため。

    var targets = [];
    if (targetRow) {
        if (targetRow < 4) return;
        targets.push(targetRow - 4);
    } else {
        // Range up to colOutput (8)
        var data = sheet.getRange(4, 1, lastRow - 3, colOutput).getValues();
        for (let i = 0; i < data.length; i++) {
            var row = data[i];
            var topic = row[colTopic - 1];  // G: Topic
            var output = row[colOutput - 1]; // H: Output

            if (topic && !output && row[colType - 1] !== 'まとめ') {
                targets.push(i);
            }
        }
    }

    if (targets.length === 0) {
        if (!targetRow) {
            try { Browser.msgBox("生成対象が見つかりませんでした。"); } catch (e) { }
        }
        return;
    }

    // --- 5. Generation Loop ---
    var fullData = sheet.getRange(4, 1, lastRow - 3, colOutput).getValues();
    var count = 0;

    for (const dataIndex of targets) {
        try {
            const rowIndex = dataIndex + 4;
            const dataRow = fullData[dataIndex];
            const type = dataRow[colType - 1];
            const humor = dataRow[colHumor - 1];
            const topic = dataRow[colTopic - 1];

            if (!topic) continue;

            sheet.getRange(rowIndex, colOutput).setValue("⏳ AI思考中 (Full Synthesis)...");
            SpreadsheetApp.flush();

            // --- SELECT TEMPLATES ---
            let selectedHook = "";
            let selectedCTA = "";

            if (templates.length > 0) {
                const hooks = templates.filter(r => r[5] === 'HOOK' || (r[1] && String(r[1]).toUpperCase().includes('HOOK')));
                const ctas = templates.filter(r => r[5] === 'CTA' || (r[1] && String(r[1]).toUpperCase().includes('CTA')));

                if (hooks.length > 0) selectedHook = hooks[Math.floor(Math.random() * hooks.length)][3];
                if (ctas.length > 0) selectedCTA = ctas[Math.floor(Math.random() * ctas.length)][3];
            }

            // --- FETCH IMAGES ---
            // D(4), E(5), F(6)
            var imageUrls = [dataRow[3], dataRow[4], dataRow[5]]; // D, E, F
            var encodedImages = [];

            imageUrls.forEach(url => {
                if (url && String(url).startsWith("http")) {
                    var imgData = fetchImageAsBase64(url);
                    if (imgData) encodedImages.push(imgData);
                }
            });

            var imageContextMsg = "";
            if (encodedImages.length > 0) {
                imageContextMsg = `[Visual Context]\nI have attached ${encodedImages.length} image(s) from the post. Please refer to them for visual details (colors, atmosphere, text in image).\n`;
            }

            // --- PROMPT CONSTRUCTION ---
            const prompt = `
[Role Definition (Evolved Persona)]
You are: 
${evolvedPersona}
(Act as this persona fully.)

[Writing Style (Master Style)]
Adopt the following rhetoric style:
${masterStyle || "Professional yet engaging."}

${imageContextMsg}

[Structural Constraints (Template Skeleton)]
Structure the post as follows:
- **Hook**: "${selectedHook || "Catchy opening"}"
- **Body**: Develop the topic using your Persona and Style.
- **CTA**: "${selectedCTA || "Engagement prompt"}"
- **Humor**: ${humor}

[Expert Tips (Techniques)]
Incorporate these applicable techniques if relevant to the topic:
- ${expertTips.slice(0, 1000) || "No specific tips."} (Selected tips)

[Task]
Write a Threads post about: "${topic}".

[Output Format]
Output ONLY the post content.
 ///案1
 (Draft 1)
 ///案2
 (Draft 2)
 ///案3
 (Draft 3)
`;

            const result = callGeminiSafe(apiKey, prompt, encodedImages);

            if (result) {
                // Just output the directly generated text to the Output column
                sheet.getRange(rowIndex, colOutput).setValue(result.trim());
                count++;
            }
        } catch (e) {
            sheet.getRange(dataIndex + 4, colOutput).setValue("Error: " + e.message);
        }
    }

    if (!targetRow && count > 0) {
        try { Browser.msgBox("Completed: " + count + " posts generated."); } catch (e) { }
    }
}

/**
 * Handle onEdit for Board Sheet (Selector) - Removed Draft Selection
 */
function handleBoardEdit(e) {
    // Draft selection logic has been removed.
}

/**
 * トリガー: 投稿ボードのチェックボックス監視 (Create) & DNA自動分析
 */
function onBoardEditInstallable(e) {
    if (!e) return;

    // 0. Absolute First Diagnostic (MsgBox)
    // Browser.msgBox("トリガー起動検知！これが出れば設定は成功しています。");

    var range = e.range;
    var sheet = range.getSheet();
    var ss = e.source;
    var sheetName = sheet.getName();
    var col = range.getColumn();
    var row = range.getRow();

    // 1. Reliable Toast using e.source
    try {
        ss.toast("⚡️ 分析・合体トリガー検知 (Sheet: " + sheetName + " / Col: " + col + ")", "System", 3);
    } catch (err) { }

    if (sheetName !== SHEET_BOARD) return;
    if (row < 4) return;

    // 1.5. Auto-Collage Trigger (Columns D, E, F = 4, 5, 6)
    // DISABLED: Moved to Chrome Extension Screenshot Flow (v2.6.5+)
    /*
    if (col >= 4 && col <= 6 && row >= 4) {
        generateRowCollage(sheet, row);
    }
    */

    // 2. DNA Auto-Analysis (Column G = 7) [FROZEN]
    /*
    if (col === 7 && row >= 4) {
        var val = range.getValue();
        var dna = sheet.getRange(row, 16).getValue(); // Col P
        if (val && String(val).length > 20 && !dna) {
            analyzeSingleRowBoard(sheet, row);
        }
    }
    */
}

/**
 * Stage 1: 複数画像を1枚に合体してシートに配置する
 */
/**
 * Stage 1: 複数画像を1枚に合体してシートに配置する (Production Horizontal Version)
 */
function generateRowCollage(sheet, row) {
    if (row < 4) return;
    console.log("--- Starting Horizontal Collage Generation for Row: " + row + " ---");

    var images = [];
    var imageRange = sheet.getRange(row, 4, 1, 3); // D, E, F
    var vals = imageRange.getValues()[0];
    var formulas = imageRange.getFormulas()[0];

    // Debug Toast
    // SpreadsheetApp.getActive().toast("Scan D-F values: " + JSON.stringify(vals).substring(0, 50), "Debug", 3);

    // 1. Extract URLs
    for (var i = 0; i < 3; i++) {
        var v = vals[i];
        var f = formulas[i];
        var url = "";

        if (typeof v === "string" && v.startsWith("http")) {
            url = v;
        } else if (f && f.toUpperCase().indexOf("IMAGE") !== -1) {
            // Support both "http..." and 'http...'
            var match = f.match(/["'](https?:\/\/[^"']+)["']/i);
            if (match) url = match[1];
        }
        if (url) images.push(url);
    }

    if (images.length === 0) {
        SpreadsheetApp.getActive().toast("⚠️ 画像URLが見つかりません(0件)", "合体プロセス", 5);
        return;
    }

    SpreadsheetApp.getActive().toast("🔍 画像URLを" + images.length + "件検知しました... (D-F: " + row + ")", "合体プロセス", 5);

    try {
        // --- 1. Fetch Blobs ---
        var blobs = [];
        images.forEach((url, idx) => {
            try {
                SpreadsheetApp.getActive().toast((idx + 1) + "枚目の画像を読み込み中...", "合体プロセス", 3);
                var response = UrlFetchApp.fetch(url);
                if (response.getResponseCode() === 200) {
                    blobs.push(response.getBlob());
                }
            } catch (e) {
                console.error("Fetch error: " + e.message);
                SpreadsheetApp.getActive().toast("⚠️ 画像(" + (idx + 1) + ")の取得に失敗: " + e.message, "警告", 5);
            }
        });

        if (blobs.length === 0) {
            SpreadsheetApp.getActive().toast("❌ 有効な画像データを取得できませんでした。", "中止", 5);
            return;
        }

        // --- 2. Create Merged Image (Horizontal) using Google Slides ---
        SpreadsheetApp.getActive().toast("🛠 スライドで合成画像を生成中...", "合体プロセス", 5);
        var tempPresentation = SlidesApp.create("TempCollageH_" + new Date().getTime());
        var presentationId = tempPresentation.getId();
        var slide = tempPresentation.getSlides()[0];
        slide.getShapes().forEach(s => s.remove());

        var pageWidth = tempPresentation.getPageWidth();
        var pageHeight = tempPresentation.getPageHeight();

        var spacing = 10;
        var availableWidth = pageWidth - (spacing * (blobs.length + 1));
        var imgWidth = availableWidth / blobs.length;

        blobs.forEach((blob, idx) => {
            var img = slide.insertImage(blob);
            var ratio = img.getWidth() / img.getHeight();

            var targetW = imgWidth;
            var targetH = targetW / ratio;

            if (targetH > pageHeight - 20) {
                targetH = pageHeight - 20;
                targetW = targetH * ratio;
            }

            img.setWidth(targetW);
            img.setHeight(targetH);
            img.setTop((pageHeight - targetH) / 2);
            img.setLeft(spacing + idx * (imgWidth + spacing));
        });

        tempPresentation.saveAndClose();

        // --- 3. Export Slide as PNG ---
        SpreadsheetApp.getActive().toast("📤 画像として書き出し(PNG)中...", "合体プロセス", 5);
        var exportUrl = "https://docs.google.com/presentation/d/" + presentationId + "/export/png";
        var token = ScriptApp.getOAuthToken();
        var options = { headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true };
        var exportResp = UrlFetchApp.fetch(exportUrl, options);
        if (exportResp.getResponseCode() !== 200) {
            SpreadsheetApp.getActive().toast("❌ スライド変換失敗: " + exportResp.getContentText(), "エラー", 5);
            return;
        }

        var collageBlob = exportResp.getBlob().setName("collage_h_row_" + row + ".png");

        // --- 4. Cleanup Old Images and Insert New (Floating for Blob Access) ---
        SpreadsheetApp.getActive().toast("🖼 シートに貼り付け中...", "合体プロセス", 3);

        // H列(8列目)の対象セルと画像をリセット
        const targetCell = sheet.getRange(row, 8);
        targetCell.setValue("🖼️ READY").setFontColor("#94a3b8").setFontSize(9).setHorizontalAlignment("center");

        sheet.getImages().forEach(img => {
            try {
                let anchor = img.getAnchorCell();
                if (anchor.getRow() === row && anchor.getColumn() === 8) {
                    img.remove();
                }
            } catch (e) { }
        });

        // Insert exactly anchored to (8, row)
        const insertedImg = sheet.insertImage(collageBlob, 8, row);

        // Adjust size to fit row height nicely
        const rowHeight = sheet.getRowHeight(row);
        const sH = insertedImg.getHeight();
        const sW = insertedImg.getWidth();
        const targetH = rowHeight - 4;
        const scale = targetH / sH;

        insertedImg.setWidth(sW * scale);
        insertedImg.setHeight(targetH);
        insertedImg.setTop(insertedImg.getTop() + 2); // Minor vertical centering

        // --- 5. Cleanup Drive ---
        DriveApp.getFileById(presentationId).setTrashed(true);
        SpreadsheetApp.getActive().toast("✅ 合体完了！(" + Math.round(sW * scale) + "x" + targetH + ")", "Threads職人", 5);

    } catch (e) {
        console.error("Horizontal Collage Error: " + e.message);
    }
}

/**
 * 単一行分析ロジック
 */
/* [FROZEN] - Legacy Analysis Logic
function analyzeSingleRowBoard(sheet, row) { 
    ... (Omitted) 
}
function analyzeDojoTextBoard(apiKey, rawText, sheet, row) {
    ... (Omitted)
}
*/

/**
 * Handle onSelectionChange for Board Sheet (Auto-Expanding)
 */
function handleBoardSelectionChange(e) {
    var sheet = e.source.getActiveSheet();
    var range = e.range;
    var row = range.getRow();
    var col = range.getColumn();

    // 対象列: G, H, P (7, 8, 16)
    var targetCols = [7, 8, 16];
    var isTarget = (row >= 4 && targetCols.indexOf(col) !== -1);

    var props = PropertiesService.getUserProperties();
    var lastRowKey = 'LAST_EXPANDED_ROW_' + sheet.getSheetId();
    var lastRow = props.getProperty(lastRowKey);

    if (lastRow && parseInt(lastRow) !== row) {
        try {
            if (parseInt(lastRow) > 2) {
                sheet.setRowHeight(parseInt(lastRow), 80);
            }
        } catch (e) { }
        props.deleteProperty(lastRowKey);
    }

    if (isTarget) {
        sheet.setRowHeight(row, 400);
        props.setProperty(lastRowKey, row);
    }
}
