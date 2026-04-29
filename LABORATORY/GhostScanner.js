/**
 * GhostScanner.js
 * V5.2 ゴースト・スキャン・システム
 * 変更点: URLが取れない場合のフォールバック処理を追加
 */

function extractHiddenImageUrls(ss, sheet, targetRow, targetColStart, targetColEnd) {
    try {
        var fileId = ss.getId();
        var url = "https://docs.google.com/spreadsheets/export?id=" + fileId + "&exportFormat=html";
        var token = ScriptApp.getOAuthToken();
        var response = UrlFetchApp.fetch(url, {
            headers: { 'Authorization': 'Bearer ' + token },
            muteHttpExceptions: true
        });

        if (response.getResponseCode() !== 200) {
            console.error("GhostScanner: HTMLエクスポート失敗 (" + response.getResponseCode() + ")");
            return [];
        }

        var htmlStr = response.getContentText();
        var foundUrls = [];

        // ★ パターン1: lh3.googleusercontent.com（セル内画像）
        var regex1 = /https?:\/\/lh3\.googleusercontent\.com[^"'\s<>]+/gi;
        var matches1 = htmlStr.match(regex1) || [];

        // ★ パターン2: googleusercontent系の別ドメイン
        var regex2 = /https?:\/\/[^"'\s<>]*googleusercontent\.com[^"'\s<>]+/gi;
        var matches2 = htmlStr.match(regex2) || [];

        // ★ パターン3: data-src や srcset にある隠れURL
        var regex3 = /(?:data-src|srcset)=["']([^"']+)["']/gi;
        var m;
        while ((m = regex3.exec(htmlStr)) !== null) {
            matches2.push(m[1]);
        }

        // 全パターンをマージして重複排除
        var allMatches = matches1.concat(matches2);
        allMatches.forEach(function(url) {
            if (
                url.indexOf('exportFormat') === -1 &&
                url.indexOf('spreadsheets/d/') === -1 &&
                foundUrls.indexOf(url) === -1
            ) {
                foundUrls.push(url);
            }
        });

        // ★ フォールバック: それでも0件なら警告だけ出してスキップ（止まらない）
        if (foundUrls.length === 0) {
            console.warn("GhostScanner: " + targetRow + "行目 - 画像URL抽出できず。スキップして続行します。");
            return [];  // エラーにせずに空配列で返す
        }

        console.log("GhostScanner: " + foundUrls.length + "件のURLを抽出しました。");
        return foundUrls;

    } catch (e) {
        // ★ 例外が起きても止まらずにスキップ
        console.error("GhostScanner Error (行:" + targetRow + "): " + e.message);
        return [];
    }
}
