function FORCE_UPDATE_DROPDOWN() {
    var sheet = SpreadsheetApp.getActiveSheet();
    var rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(["Basic", "Var", "Rewrite", "Poison", "ROOM", "Mix"], true)
        .setAllowInvalid(false)
        .build();

    // Apply to G3:G1000 ("Select Master")
    sheet.getRange("G3:G1000").setDataValidation(rule);

    Browser.msgBox("✅ 強制アップデート完了！\nG列のドロップダウンに「Mix」が入っているか確認してください。");
}
