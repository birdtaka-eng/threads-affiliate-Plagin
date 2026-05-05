# 🚀 Sanctuary All-in-One Save Script

Write-Host "📡 1. GAS (Google Apps Script) へプッシュ中..." -ForegroundColor Cyan
npx @google/clasp push -f

Write-Host "`n📦 2. GitHub へバックアップ中..." -ForegroundColor Green
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$branch = git branch --show-current
git add .
git commit -m "Auto-save: $timestamp"
git push origin $branch

Write-Host "`n✨ すべての保存とバックアップが完了しました！ (Branch: $branch) [S1-Grade Saved]" -ForegroundColor Magenta
