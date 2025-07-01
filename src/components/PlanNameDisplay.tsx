import React, { useState } from 'react';
import { usePlanStore } from '../store/planStore';
import PlanNameEditModal from './PlanNameEditModal';
import DateSelectionModal from './DateSelectionModal';

const PlanNameDisplay: React.FC = () => {
  const { plan } = usePlanStore();
  const [nameModal, setNameModal] = useState(false);
  const [dateModal, setDateModal] = useState(false);

  if (!plan) return null;

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
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 
                      glass-effect rounded-xl shadow-elevation-2 animate-spring
                      px-6 py-3 max-w-[280px] w-auto
                      text-system-label
                      transition-all duration-150 ease-ios-default">
        
        <div className="flex flex-col items-center space-y-1">
          {/* プラン名 - クリック可能 */}
          <button
            className="text-[20px] leading-[24px] font-semibold tracking-[-0.408px]
                       hover:text-coral-500 transition-colors duration-150
                       focus:outline-none focus:text-coral-500"
            onClick={() => setNameModal(true)}
            title="プラン名を編集"
          >
            {plan.name}
          </button>
          
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
      <PlanNameEditModal isOpen={nameModal} onClose={() => setNameModal(false)} />
      <DateSelectionModal isOpen={dateModal} onClose={() => setDateModal(false)} />
    </>
  );
};

export default PlanNameDisplay; 