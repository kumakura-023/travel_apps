import React from "react";
import {
  FiX,
  FiCommand,
  FiSearch,
  FiZoomIn,
  FiZoomOut,
  FiRotateCcw,
  FiMapPin,
} from "react-icons/fi";
import { useDeviceDetect } from "../hooks/useDeviceDetect";

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  icon?: React.ReactNode;
  category: "navigation" | "search" | "selection" | "general";
}

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  isOpen,
  onClose,
}) => {
  const { isDesktop } = useDeviceDetect();

  const shortcuts: ShortcutItem[] = [
    {
      keys: ["Ctrl", "F"],
      description: "検索バーにフォーカス",
      icon: <FiSearch className="w-4 h-4" />,
      category: "search",
    },
    {
      keys: ["Esc"],
      description: "検索をクリア / モーダルを閉じる",
      icon: <FiRotateCcw className="w-4 h-4" />,
      category: "general",
    },
    {
      keys: ["+"],
      description: "地図をズームイン",
      icon: <FiZoomIn className="w-4 h-4" />,
      category: "navigation",
    },
    {
      keys: ["-"],
      description: "地図をズームアウト",
      icon: <FiZoomOut className="w-4 h-4" />,
      category: "navigation",
    },
    {
      keys: ["Ctrl", "S"],
      description: "現在の変更を保存",
      icon: <FiCommand className="w-4 h-4" />,
      category: "general",
    },
    {
      keys: ["Ctrl", "Click"],
      description: "2地点間のルート検索",
      icon: <FiMapPin className="w-4 h-4" />,
      category: "selection",
    },
    {
      keys: ["Tab"],
      description: "次のフォーカス可能な要素へ移動",
      category: "navigation",
    },
    {
      keys: ["Enter"],
      description: "編集モードを開始",
      category: "general",
    },
    {
      keys: ["?"],
      description: "このヘルプを表示",
      category: "general",
    },
  ];

  const categoryNames = {
    navigation: "地図ナビゲーション",
    search: "検索",
    selection: "地点操作",
    general: "一般",
  };

  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<string, ShortcutItem[]>,
  );

  // MacとWindowsでModifierキーを適切に表示
  const formatKeys = (keys: string[]) => {
    return keys.map((key) => {
      if (key === "Ctrl" && navigator.platform.indexOf("Mac") > -1) {
        return "⌘";
      }
      if (key === "Alt" && navigator.platform.indexOf("Mac") > -1) {
        return "⌥";
      }
      return key;
    });
  };

  if (!isOpen || !isDesktop) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FiCommand className="mr-2" />
            キーボードショートカット
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="閉じる"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            {Object.entries(groupedShortcuts).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  {categoryNames[category as keyof typeof categoryNames]}
                </h3>
                <div className="space-y-2">
                  {items.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        {shortcut.icon && (
                          <div className="text-gray-500">{shortcut.icon}</div>
                        )}
                        <span className="text-gray-700">
                          {shortcut.description}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {formatKeys(shortcut.keys).map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">
                              {key}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="text-gray-400 text-sm">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* フッター */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">
                ?
              </kbd>
              キーを押すといつでもこのヘルプを表示できます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts;
