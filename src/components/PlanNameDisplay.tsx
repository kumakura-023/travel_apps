import React, { useState } from 'react';
import { MdEdit } from 'react-icons/md';
import { usePlanStore } from '../store/planStore';
import PlanNameEditModal from './PlanNameEditModal';
import DateSelectionModal from './DateSelectionModal';
import { TabKey } from './TabNavigation';
import useMediaQuery from '../hooks/useMediaQuery';

interface PlanNameDisplayProps {
  activeTab?: TabKey;
}

const PlanNameDisplay: React.FC<PlanNameDisplayProps> = ({ activeTab }) => {
  const { plan, isLoading, error } = usePlanStore();
  const [nameModal, setNameModal] = useState(false);
  const [dateModal, setDateModal] = useState(false);
  const [isNewPlanCreation, setIsNewPlanCreation] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isMobile = !isDesktop && !isTablet;

  // リスト表示画面では非表示にする
  if (activeTab === 'list') return null;

  // 基本のクラス名
  const baseClassName = `fixed z-30 
                        glass-effect-border rounded-xl 
                        px-4 py-3 
                        text-system-label
                        transition-all duration-150 ease-ios-default
                        ${
                          isDesktop
                            ? 'top-4 left-1/2 -translate-x-1/2 max-w-[280px]'
                            : isTablet
                            ? 'top-4 right-4 max-w-[280px]'
                            : 'top-20 left-1/2 -translate-x-1/2 w-[60%] max-w-[calc(100vw-3rem)] scale-[0.70] origin-top'
                        }`;

  // ローディング中の表示
  if (isLoading) {
    return (
      <div className={baseClassName}>
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-coral-500"></div>
          <span className="text-system-secondary-label text-sm">読み込み中...</span>
        </div>
      </div>
    );
  }

  // エラー時の表示（デバッグ用）
  if (error && !plan) {
    return (
      <div className={baseClassName}>
        <div className="text-red-500 text-sm">
          エラー: {error}
        </div>
      </div>
    );
  }

  // プランがない場合の表示
  if (!plan) {
    return (
      <>
        <div className={baseClassName}>
          <div className="flex flex-col items-center space-y-2">
            <button
              onClick={() => {
                setIsNewPlanCreation(true);
                setNameModal(true);
              }}
              className="flex items-center space-x-2 text-coral-500 hover:text-coral-600 
                         font-medium transition-all duration-150 ease-ios-default"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              <span className="text-[16px]">新しいプランを作成</span>
            </button>
            <p className="text-system-secondary-label text-[12px]">
              プランがありません
            </p>
          </div>
        </div>

        {/* モーダル */}
        <PlanNameEditModal 
          isOpen={nameModal} 
          onClose={() => {
            setNameModal(false);
            setIsNewPlanCreation(false);
          }}
          isNewPlanCreation={isNewPlanCreation}
        />
      </>
    );
  }

  const formatDateRange = () => {
    if (!plan.startDate) return null;
    
    const formatDate = (date: Date) => {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}/${day}`;
    };

    const startDate = formatDate(plan.startDate);
    const endDate = plan.endDate ? formatDate(plan.endDate) : startDate;
    
    if (startDate === endDate) {
      return {
        display: startDate,
        year: plan.startDate.getFullYear()
      };
    }
    
    return {
      display: `${startDate}〜${endDate}`,
      year: plan.startDate.getFullYear()
    };
  };

  const dateInfo = formatDateRange();

  return (
    <>
      <div className={baseClassName}>
        
        <div className="flex flex-col items-center space-y-1">
          {/* プラン名 & 編集アイコン */}
          <div className="flex items-center space-x-2">
            {/* 編集アイコン（鉛筆） */}
            <button
              onClick={() => setNameModal(true)}
              className="w-4 h-4 text-coral-500 flex-shrink-0
                         hover:scale-110 hover:text-coral-600
                         transition-all duration-150 ease-ios-default
                         focus:outline-none focus:scale-110"
              title="プラン名を編集"
            >
              <MdEdit size={16} />
            </button>

            {/* プラン名 */}
            <span className="text-[20px] leading-[24px] font-semibold tracking-[-0.408px] text-system-label">
              {plan.name}
            </span>
          </div>
          
          {/* 日付情報 */}
          {dateInfo && (
            <div className="flex items-center space-x-2">
              {/* カレンダーアイコン - クリック可能 */}
              <button
                className="w-4 h-4 text-coral-500 flex-shrink-0 
                           hover:scale-110 hover:text-coral-600 
                           transition-all duration-150 ease-ios-default
                           focus:outline-none focus:scale-110"
                onClick={() => setDateModal(true)}
                title="日程を編集"
              >
                <svg 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  className="w-full h-full"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </button>
              
              {/* 日付バッジ */}
              <div className="bg-coral-500/10 text-coral-600 px-3 py-1 rounded-full 
                              text-[14px] font-medium tracking-[-0.24px]
                              border border-coral-500/20 pointer-events-none">
                <span className="text-system-secondary-label text-[12px] mr-1">
                  {dateInfo.year}
                </span>
                <span className="text-coral-600 font-semibold">
                  {dateInfo.display}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* モーダル */}
      <PlanNameEditModal 
        isOpen={nameModal} 
        onClose={() => {
          setNameModal(false);
          setIsNewPlanCreation(false);
        }}
        isNewPlanCreation={isNewPlanCreation}
      />
      <DateSelectionModal isOpen={dateModal} onClose={() => setDateModal(false)} />
    </>
  );
};

export default PlanNameDisplay; 