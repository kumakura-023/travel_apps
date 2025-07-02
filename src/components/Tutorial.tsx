import React, { useState, useEffect } from 'react';
import { FiX, FiChevronLeft, FiChevronRight, FiMap, FiSearch, FiMapPin, FiList, FiClock } from 'react-icons/fi';

interface TutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  image?: string;
  tips?: string[];
}

const Tutorial: React.FC<TutorialProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: TutorialStep[] = [
    {
      title: 'Travel Planner Mapへようこそ！',
      description: '旅行計画を効率的に立てるためのマップアプリです。地図上で候補地を管理し、移動時間を確認できます。',
      icon: <FiMap className="w-8 h-8" />,
      tips: [
        'Google Mapsと同様の操作で地図をナビゲート',
        'オフラインでも基本機能が使用可能',
        'すべてのデータはブラウザに安全に保存'
      ]
    },
    {
      title: '場所を検索して追加',
      description: '上部の検索バーから行きたい場所を検索し、「候補地に追加」ボタンで旅行プランに追加できます。',
      icon: <FiSearch className="w-8 h-8" />,
      tips: [
        'レストラン、ホテル、観光地など様々な場所を検索',
        'カテゴリを選択してアイコンで分類',
        'メモや予想コストも記録可能'
      ]
    },
    {
      title: '地点の詳細を編集',
      description: 'マーカーをクリックすると詳細パネルが開き、地点名、メモ、予想コストなどを編集できます。',
      icon: <FiMapPin className="w-8 h-8" />,
      tips: [
        '地点名とメモは自由に編集可能',
        '予想コストを入力して予算管理',
        'カテゴリ変更でアイコンも変更'
      ]
    },
    {
      title: 'リスト表示で一覧管理',
      description: '下部のリストタブで候補地を一覧表示。カテゴリフィルターや検索で整理できます。',
      icon: <FiList className="w-8 h-8" />,
      tips: [
        'カテゴリ別にフィルタリング',
        'コスト集計を円グラフで表示',
        'リストから地点をクリックで地図移動'
      ]
    },
    {
      title: '移動時間を確認',
      description: '移動時間タブで起点を選択し、他の地点までの移動時間を表示。効率的なルート計画が可能です。',
      icon: <FiClock className="w-8 h-8" />,
      tips: [
        '徒歩、車、電車の移動手段を選択',
        '時間圏内の地点をハイライト表示',
        'Ctrl+クリックで2地点間のルート検索'
      ]
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="text-blue-600">
              {currentStepData.icon}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              チュートリアル
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="チュートリアルを閉じる"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* プログレスバー */}
        <div className="px-6 pt-4">
          <div className="flex items-center space-x-2 mb-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-600 text-center">
            {currentStep + 1} / {steps.length}
          </p>
        </div>

        {/* コンテンツ */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              {currentStepData.icon}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {currentStepData.title}
            </h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              {currentStepData.description}
            </p>
          </div>

          {/* Tips */}
          {currentStepData.tips && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-900 mb-2">💡 ポイント:</h4>
              <ul className="space-y-1">
                {currentStepData.tips.map((tip, index) => (
                  <li key={index} className="text-blue-800 text-sm">
                    • {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleSkip}
            className="text-gray-600 hover:text-gray-800 transition-colors text-sm font-medium"
          >
            スキップ
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FiChevronLeft className="w-4 h-4 mr-1" />
              戻る
            </button>

            <button
              onClick={handleNext}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors"
            >
              {currentStep === steps.length - 1 ? (
                '始める'
              ) : (
                <>
                  次へ
                  <FiChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* キーボードヒント */}
        <div className="px-6 pb-2">
          <p className="text-xs text-gray-500 text-center">
            <kbd className="px-1 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
              ←
            </kbd>
            {' '}
            <kbd className="px-1 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
              →
            </kbd>
                         {' '}キーでナビゲート / {' '}
            <kbd className="px-1 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
              Esc
            </kbd>
            {' '}で閉じる
          </p>
        </div>
      </div>
    </div>
  );
};

export default Tutorial; 