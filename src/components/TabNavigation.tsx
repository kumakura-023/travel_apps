import { MdMap, MdAccessTime, MdList, MdEditNote, MdFilterList } from 'react-icons/md';
import { BellIcon } from '@heroicons/react/24/outline';
import AuthButton from './AuthButton';
import { useLabelModeStore } from '../store/labelModeStore';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../hooks/useAuth';
import { useUIStore } from '../store/uiStore';
import { useState } from 'react';
import NotificationListModal from './NotificationListModal';

export type TabKey = 'map' | 'travelTime' | 'list';

interface Props {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  isVisible: boolean;
}

const tabs: { key: TabKey; icon: React.ReactNode; label: string }[] = [
  { key: 'map', icon: <MdMap size={24} />, label: '地図' },
  { key: 'travelTime', icon: <MdAccessTime size={24} />, label: '移動時間' },
  { key: 'list', icon: <MdList size={24} />, label: 'リスト' },
];

const TabNavigation: React.FC<Props> = ({ active, onChange, isVisible }) => {
  const { labelMode, toggleLabelMode } = useLabelModeStore();
  const { user } = useAuthStore();
  const { getUnreadCount } = useNotificationStore();
  const { selectedCategories, openCategoryFilterModal } = useUIStore();
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  
  const unreadCount = user ? getUnreadCount(user.uid) : 0;
  const hasActiveFilters = selectedCategories.length > 0;
  return (
    <nav className={`glass-effect-border rounded-xl flex flex-col items-center py-3 z-40 transition-all duration-300 ease-ios-default ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
      <AuthButton />
      <div className="w-8 h-px bg-system-separator my-2" />
      {tabs.map((t) => (
        <button
          key={t.key}
          className={`flex flex-col items-center justify-center w-full h-16 rounded-lg mx-1 my-1 group transition-all duration-150 ease-ios-default hover:scale-105 active:scale-95 ${
            active === t.key 
              ? 'text-coral-500 bg-coral-500/10' 
              : 'text-system-secondary-label hover:text-coral-500 hover:bg-coral-500/5'
          }`}
          onClick={() => onChange(t.key)}
        >
          {t.icon}
          <span className="caption-2 mt-1 select-none font-medium">
            {t.label}
          </span>
        </button>
      ))}
      
      <div className="w-8 h-px bg-system-separator my-2" />
      
      <button
        className={`flex flex-col items-center justify-center w-full h-16 rounded-lg mx-1 my-1 group transition-all duration-150 ease-ios-default hover:scale-105 active:scale-95 ${
          labelMode
            ? 'text-white bg-teal-500 border border-teal-400/30'
            : 'text-system-secondary-label hover:text-teal-500 hover:bg-white/10'
        }`}
        onClick={toggleLabelMode}
        title={labelMode ? 'メモ配置を終了' : 'メモを追加'}
      >
        <MdEditNote size={24} />
        <span className="caption-2 mt-1 select-none font-medium">
          {labelMode ? '配置中' : 'メモ'}
        </span>
      </button>

      <button
        className={`relative flex flex-col items-center justify-center w-full h-16 rounded-lg mx-1 my-1 group transition-all duration-150 ease-ios-default hover:scale-105 active:scale-95 ${
          hasActiveFilters
            ? 'text-white bg-coral-500 border border-coral-400/30'
            : 'text-system-secondary-label hover:text-coral-500 hover:bg-coral-500/5'
        }`}
        onClick={openCategoryFilterModal}
        title="カテゴリフィルター"
      >
        <div className="relative">
          <MdFilterList size={24} />
          {hasActiveFilters && (
            <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-white rounded-full flex items-center justify-center">
              <span className="text-coral-500 text-xs font-bold px-1">
                {selectedCategories.length > 9 ? '9+' : selectedCategories.length}
              </span>
            </div>
          )}
        </div>
        <span className="caption-2 mt-1 select-none font-medium">
          フィルター
        </span>
      </button>

      <div className="w-8 h-px bg-system-separator my-2" />
      
      <button
        className="relative flex flex-col items-center justify-center w-full h-16 rounded-lg mx-1 my-1 group transition-all duration-150 ease-ios-default hover:scale-105 active:scale-95 text-system-secondary-label hover:text-coral-500 hover:bg-coral-500/5"
        onClick={() => setIsNotificationModalOpen(true)}
        title="通知"
      >
        <div className="relative">
          <BellIcon className="w-6 h-6" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-coral-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </div>
          )}
        </div>
        <span className="caption-2 mt-1 select-none font-medium">
          通知
        </span>
      </button>

      <NotificationListModal 
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />
    </nav>
  );
};

export default TabNavigation;
 