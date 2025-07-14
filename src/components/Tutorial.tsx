import React, { useState, useEffect } from 'react';
import { FiX, FiChevronLeft, FiChevronRight, FiMapPin, FiEdit, FiDollarSign } from 'react-icons/fi';

interface TutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  tips?: string[];
}

const Tutorial: React.FC<TutorialProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: TutorialStep[] = [
    {
      title: '旅行の候補地を計画しよう',
      description: '上部の検索バーで行きたい場所を探し、「候補地に追加」ボタンでプランに追加できます。追加した場所は地図上にピンで表示されます。',
      icon: <FiMapPin className="w-8 h-8" />,
      tips: [
        'レストラン、ホテル、観光地など、あらゆる場所を検索できます。',
        '候補地はカテゴリ別に自動で色分けされ、一目でわかります。',
      ],
    },
    {
      title: '地図上にメモを書き込もう',
      description: '右側のナビゲーションバーにあるメモボタン（鉛筆アイコン）で、地図上の好きな場所にメモを直接配置できます。',
      icon: <FiEdit className="w-8 h-8" />,
      tips: [
        'メモはダブルタップ（スマホ）またはダブルクリック（PC）で編集できます。',
        '近くの候補地とリンクさせて、関連情報をまとめることも可能です。',
      ],
    },
    {
      title: '予算を自動で概算しよう',
      description: '追加した候補地の情報をもとに、旅行全体の概算費用が自動で計算され、リストタブで確認できます。',
      icon: <FiDollarSign className="w-8 h-8" />,
      tips: [
        '⚠️ 注意: 費用はGoogleマップの料金レベル（$, $$, $$$）から計算される「目安」です。',
        '正確な金額は、各店舗の公式サイトなどで必ずご確認ください。',
      ],
    },
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
  }, [isOpen, currentStep, handleNext, handlePrev, onClose]);

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="text-blue-600">
              {currentStepData.icon}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">チュートリアル</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="チュートリアルを閉じる"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

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

        <div className="p-6 overflow-y-auto">
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

        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 mt-auto">
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