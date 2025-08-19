import React from "react";
import { syncDebugUtils } from "../utils/syncDebugUtils";

/**
 * 同期デバッグレポートを表示するボタン
 * 本番環境でも利用可能で、詳細な同期分析結果をコンソールに出力
 * 単一責任原則に従い、デバッグレポート表示のみを担当
 */
const SyncDebugButton: React.FC = () => {
  const handleDebugClick = () => {
    console.log("🔍 同期デバッグレポート生成開始");
    syncDebugUtils.printDetailedReport();
  };

  const handleClearLogs = () => {
    syncDebugUtils.clearLogs();
  };

  return (
    <div className="fixed bottom-4 left-4 flex flex-col gap-2 z-50">
      <button
        onClick={handleDebugClick}
        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm"
        title="同期デバッグレポートを表示"
      >
        🔍 同期分析
      </button>
      <button
        onClick={handleClearLogs}
        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm"
        title="デバッグログをクリア"
      >
        🗑️ ログクリア
      </button>
    </div>
  );
};

export default SyncDebugButton;
