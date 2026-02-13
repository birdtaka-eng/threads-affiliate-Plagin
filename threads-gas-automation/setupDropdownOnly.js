/**
 * Standalone script to force-apply the dropdown validation to Column G.
 * Run this function directly to fix the dropdown.
 */
function forceSetupDropdown() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = "投稿作成ボード"; // Hardcoded to be absolutely sure
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
        Browser.msgBox("Sheet not found: " + sheetName);
        return;
    }

    // Define the range for Master Selection (Column G, Row 3 to 1000)
    var range = sheet.getRange("G3:G1000");

    // Clear existing validation to avoid conflicts
    range.clearDataValidations();

    // Create the Dropdown Rule
    var rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(["Basic", "Var", "Rewrite", "Poison"], true) // true = Show dropdown arrow
        .setAllowInvalid(true) // Allow other values just in case
        .build();

    // Apply the rule
    range.setDataValidation(rule);

    // Update Header 
    sheet.getRange("G1").setValue("Select Master (師匠選択)");
    sheet.getRange("G2").setValue("↓使用する師匠を選択");

    // Set Column Width to be visible
    sheet.setColumnWidth(7, 150);

    Browser.msgBox("G列 (Master Selection) にプルダウンを設定しました！\n確認してください。");
}
