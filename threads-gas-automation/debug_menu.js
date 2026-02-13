function debugForceMenu() {
    SpreadsheetApp.getUi().createMenu('🔹Threads職人 (Debug)')
        .addItem('💎 Studio Gem (Sidebar)', 'openStudioGem')
        .addToUi();
    Browser.msgBox("Menu created! Check if '🔹Threads職人 (Debug)' appears.");
}
