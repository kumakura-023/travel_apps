# Windows PowerShell用デプロイスクリプト

Write-Host "=== Travel App デプロイスクリプト ===" -ForegroundColor Green

# 環境変数の確認
if (-not $env:VITE_GOOGLE_MAPS_API_KEY) {
    Write-Host "エラー: VITE_GOOGLE_MAPS_API_KEY 環境変数が設定されていません" -ForegroundColor Red
    Write-Host "実行例: `$env:VITE_GOOGLE_MAPS_API_KEY='your-api-key'; .\deploy.ps1" -ForegroundColor Yellow
    exit 1
}

# 依存関係のインストール
Write-Host "依存関係をインストールしています..." -ForegroundColor Blue
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "エラー: npm install が失敗しました" -ForegroundColor Red
    exit 1
}

# ビルド実行
Write-Host "アプリケーションをビルドしています..." -ForegroundColor Blue
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "エラー: npm run build が失敗しました" -ForegroundColor Red
    exit 1
}

Write-Host "ビルドが完了しました! distフォルダの内容を静的ホスティングサービスにアップロードしてください。" -ForegroundColor Green
Write-Host ""
Write-Host "推奨デプロイ方法:" -ForegroundColor Yellow
Write-Host "1. Netlify: https://app.netlify.com/drop" -ForegroundColor White
Write-Host "2. Surge.sh: npm install -g surge && surge dist" -ForegroundColor White
Write-Host "3. Firebase: firebase deploy" -ForegroundColor White 