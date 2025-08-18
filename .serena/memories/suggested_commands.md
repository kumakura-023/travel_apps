# 開発用コマンド

## 基本的な開発コマンド
- `npm run dev` - 開発サーバー起動 (http://localhost:5173)
- `npm run build` - プロダクションビルド
- `npm run preview` - プロダクションビルドのプレビュー
- `npm run type-check` - TypeScript型チェック実行
- `npm run lint` - src/ディレクトリのESLint実行

## Gitコマンド
- `git status` - 変更状態を確認
- `git diff` - 変更内容を確認
- `git add .` - 全ての変更をステージング
- `git commit -m "message"` - コミット作成
- `git push` - リモートにプッシュ

## ファイル操作（Windows）
- `dir` - ディレクトリ内容表示
- `type filename` - ファイル内容表示
- `cd path` - ディレクトリ移動
- `mkdir dirname` - ディレクトリ作成

## タスク完了時のチェック
1. `npm run type-check` - 型エラーがないことを確認
2. `npm run lint` - リントエラーがないことを確認
3. `npm run dev` - 開発サーバーで動作確認