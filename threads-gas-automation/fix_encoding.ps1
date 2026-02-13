
$c = Get-Content Code.js -Raw -Encoding UTF8
$c = $c -replace "createMenu.*", "createMenu('🤖 Threads職人 (v2)').addItem('💎 Studio Gem (Sidebar)', 'openStudioGem').addSeparator()"
$c = $c -replace "'縲宣幕逋ｺ縲大・菴楢ｨｭ螳壹す繝ｼ繝井ｽ懈・ \(繝ｪ繧ｻ繝・ヨ\)'", "'【設定】全体設定シート作成 (リセット)'"
$c = $c -replace "少縲占｣ｽ騾縲第･ｽ螟ｩ蟾･蝣ｴ \(繧ｷ繝ｼ繝井ｽ懈・\)", "🏭【製造】楽天工場 (シート作成)"
$c = $c -replace "少縲占｣ｽ騾縲代い繝輔ぅ繝ｪ繧ｨ繧､繝育函謌・\(螳溯｡・", "🏭【製造】アフィリエイト生成 (実行)"
$c = $c -replace "縲舌ヲ繝ｳ繝医€題｡ｨ遉ｺON", "【ヒント】表示ON"
$c = $c -replace "縲舌ヲ繝ｳ繝医€題｡ｨ遉ｺOFF", "【ヒント】表示OFF"
$c = $c -replace "早・・繝峨Λ繝輔ヨ繝薙Η繝ｼ繝ｯ繝ｼ繧帝幕縺・, "👁️ ドラフトビューワーを開く"
$c = $c -replace "､・Threads閨ｷ莠ｺ", "🤖 Threads職人"
$c = $c -replace "縲占ｨｭ螳壹€第桃菴懊・繝九Η繧｢繝ｫ譖ｴ譁ｰ", "【設定】操作マニュアル更新"
$c = $c -replace "縲占ｨｭ螳壹€大・菴楢ｨｭ螳壹す繝ｼ繝井ｽ懈・ \(繝ｪ繧ｻ繝・ヨ\)", "【設定】全体設定シート作成 (リセット)"
$c = $c -replace "縲占ｨｭ螳壹€第兜遞ｿ繝懊・繝我ｽ懈・ \(繝ｪ繧ｻ繝・ヨ\)", "【設定】投稿ボード作成 (リセット)"
$c = $c -replace "縲占ｨｭ螳壹€醍分邨・｡ｨ繝ｪ繧ｻ繝・ヨ", "【設定】番組表リセット"
$c = $c -replace "縲占ｨｭ螳壹€代ヰ繧ｺ遐皮ｩｶ謇€繧ｷ繝ｼ繝域僑蠑ｵ", "【設定】バズ研究所シート拡張"
$c = $c -replace "耳縲舌ョ繧ｶ繧､繝ｳ縲閃idnight Glass驕ｩ逕ｨ", "🎨【デザイン】Midnight Glass適用"
$c = $c -replace "縲占ｨｭ螳壹€大・蜍募・譫舌ヨ繝ｪ繧ｬ繝ｼ險ｭ螳・, "【設定】自動分析トリガー設定"
Set-Content Code.js -Value $c -Encoding UTF8
