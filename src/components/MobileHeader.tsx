import React, { useState } from 'react';
import { MdEdit } from 'react-icons/md';
import { BellIcon } from '@heroicons/react/24/outline';
import { usePlanStore } from '../store/planStore';
import { useAuthStore } from '../hooks/useAuth';
import { useNotificationStore } from '../store/notificationStore';
import AuthButton from './AuthButton';
import PlanNameEditModal from './PlanNameEditModal';
import DateSelectionModal from './DateSelectionModal';
import NotificationListModal from './NotificationListModal';
import { TabKey } from './TabNavigation';

interface MobileHeaderProps {
  activeTab?: TabKey;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ activeTab }) => {
  const { plan, isLoading, error } = usePlanStore();
  const { user } = useAuthStore();
  const { getUnreadCount } = useNotificationStore();
  const [nameModal, setNameModal] = useState(false);
  const [dateModal, setDateModal] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isNewPlanCreation, setIsNewPlanCreation] = useState(false);

  const unreadCount = user ? getUnreadCount(user.uid) : 0;

  // リスト表示画面では非表示にする
  if (activeTab === 'list') return null;

  const formatDateRange = () => {
    if (!plan?.startDate) return null;
    
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

  // コンパクトなパディングクラスを状態に応じて決定
  const getPaddingClass = () => {
    if (plan && dateInfo) return 'px-3 py-1.5'; // 2行コンテンツでもコンパクト
    return 'px-3 py-1.5'; // 1行コンテンツも同様
  };

  return (
    <>
      <div className="fixed top-20 left-4 right-4 z-30 
                     flex items-center justify-center gap-3">
        
        {/* Left side - Plan info */}
        <div className="flex-shrink-0">
          {isLoading ? (
            <div className={`glass-effect-border rounded-2xl ${getPaddingClass()} inline-block
                           shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.08)]`}>
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-coral-500"></div>
                <span className="text-system-secondary-label text-xs">読み込み中...</span>
              </div>
            </div>
          ) : error && !plan ? (
            <div className={`glass-effect-border rounded-2xl ${getPaddingClass()} inline-block
                           shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.08)]`}>
              <div className="text-red-500 text-xs">
                エラー: {error}
              </div>
            </div>
          ) : !plan ? (
            <div className={`glass-effect-border rounded-2xl ${getPaddingClass()} inline-block
                           shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.08)]`}>
              <button
                onClick={() => {
                  setIsNewPlanCreation(true);
                  setNameModal(true);
                }}
                className="flex items-center space-x-2 text-coral-600 hover:text-coral-700 
                           font-medium transition-all duration-200 ease-out
                           hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                <span className="text-xs">新しいプランを作成</span>
              </button>
            </div>
          ) : (
            <div className={`glass-effect-border rounded-2xl ${getPaddingClass()} inline-block
                           shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.08)]`}>
              <div className="flex flex-col space-y-0.5">
                {/* プラン名 & 編集アイコン */}
                <div className="flex items-center justify-center space-x-1.5">
                  <button
                    onClick={() => setNameModal(true)}
                    className="w-3 h-3 text-coral-600 flex-shrink-0
                               hover:scale-110 hover:text-coral-700
                               transition-all duration-200 ease-out"
                    title="プラン名を編集"
                  >
                    <MdEdit size={12} />
                  </button>
                  <span className="text-sm font-semibold text-system-label truncate">
                    {plan.name}
                  </span>
                </div>
                
                {/* 日付情報 */}
                {dateInfo && (
                  <div className="flex items-center justify-center space-x-1.5">
                    <button
                      className="w-3 h-3 text-coral-600 flex-shrink-0 
                                 hover:scale-110 hover:text-coral-700 
                                 transition-all duration-200 ease-out"
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
                    
                    <div className="bg-coral-500/10 text-coral-600 px-1.5 py-0.5 rounded-full 
                                    text-xs font-medium border border-coral-500/20">
                      <span className="text-system-secondary-label text-[10px] mr-0.5">
                        {dateInfo.year}
                      </span>
                      <span className="text-coral-600 font-semibold text-xs">
                        {dateInfo.display}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right side - Action buttons */}
        <div className="absolute right-0 flex items-center space-x-2">
          
          {/* Auth Button */}
          <div className="glass-effect-border rounded-2xl p-2
                          shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.08)]
                          w-12 h-12 flex items-center justify-center">
            <AuthButton />
          </div>

          {/* Notification Button */}
          <div className="glass-effect-border rounded-2xl p-2
                          shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.08)]
                          w-12 h-12 flex items-center justify-center">
            <button
              className="relative w-8 h-8 flex items-center justify-center
                         text-system-secondary-label hover:text-coral-600 
                         transition-all duration-200 ease-out
                         hover:scale-[1.05] active:scale-[0.95]"
              onClick={() => setIsNotificationModalOpen(true)}
              title="通知"
            >
              <BellIcon className="w-6 h-6" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 
                               min-w-[18px] h-[18px] bg-coral-600 rounded-full 
                               flex items-center justify-center shadow-sm">
                  <span className="text-white text-xs font-bold leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </div>
              )}
            </button>
          </div>
          
        </div>
      </div>

      {/* Modals */}
      <PlanNameEditModal 
        isOpen={nameModal} 
        onClose={() => {
          setNameModal(false);
          setIsNewPlanCreation(false);
        }}
        isNewPlanCreation={isNewPlanCreation}
      />
      <DateSelectionModal isOpen={dateModal} onClose={() => setDateModal(false)} />
      <NotificationListModal 
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />
    </>
  );
};

export default MobileHeader;