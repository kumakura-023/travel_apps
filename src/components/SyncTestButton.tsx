import React from "react";
import { createSyncTestUtils } from "../utils/syncTestUtils";
import { useAuthStore } from "../hooks/useAuth";

/**
 * 同期競合解決機能のテストボタン
 * 開発時のみ表示され、テスト結果をコンソールに出力
 * 単一責任原則に従い、テスト実行のみを担当
 */
const SyncTestButton: React.FC = () => {
  const user = useAuthStore((s) => s.user);

  const handleTestClick = () => {
    console.log("🧪 同期競合解決機能テスト開始");
    console.log("👤 現在のユーザー:", user?.email || "未ログイン");
    const testUtils = createSyncTestUtils();
    testUtils.runAllTests();
  };

  // 本番環境でも表示（テスト用）
  // 必要に応じて特定の条件で非表示にすることも可能
  // 例: 特定のユーザーIDでのみ表示する場合
  // if (user?.uid !== 'test-user-id') {
  //   return null;
  // }

  return (
    <button
      onClick={handleTestClick}
      className="fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm"
      title="同期競合解決機能のテストを実行（本番環境でも利用可能）"
    >
      🧪 同期テスト
    </button>
  );
};

export default SyncTestButton;
