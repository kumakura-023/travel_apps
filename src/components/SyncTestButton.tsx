import React from 'react';
import { createSyncTestUtils } from '../utils/syncTestUtils';

/**
 * 同期競合解決機能のテストボタン
 * 開発時のみ表示され、テスト結果をコンソールに出力
 * 単一責任原則に従い、テスト実行のみを担当
 */
const SyncTestButton: React.FC = () => {
  const handleTestClick = () => {
    console.log('🧪 同期競合解決機能テスト開始');
    const testUtils = createSyncTestUtils();
    testUtils.runAllTests();
  };

  // 開発環境でのみ表示
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <button
      onClick={handleTestClick}
      className="fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50"
      title="同期競合解決機能のテストを実行"
    >
      🧪 同期テスト
    </button>
  );
};

export default SyncTestButton; 