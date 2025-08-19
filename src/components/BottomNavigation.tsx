import { MdMap, MdAccessTime, MdList, MdEditNote, MdFilterList } from 'react-icons/md';
import { useLabelModeStore } from '../store/labelModeStore';
import { useUIStore } from '../store/uiStore';

export type TabKey = 'map' | 'travelTime' | 'list';

interface Props {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  isVisible: boolean;
}

const tabs: { key: TabKey; icon: React.ReactNode; label: string }[] = [
  { key: 'map', icon: <MdMap size={22} />, label: '地図' },
  { key: 'travelTime', icon: <MdAccessTime size={22} />, label: '移動時間' },
  { key: 'list', icon: <MdList size={22} />, label: 'リスト' },
];

const BottomNavigation: React.FC<Props> = ({ active, onChange, isVisible }) => {
  const { labelMode, toggleLabelMode } = useLabelModeStore();
  const { selectedCategories, openCategoryFilterModal } = useUIStore();
  
  const hasActiveFilters = selectedCategories.length > 0;

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 
                     bg-white/98 backdrop-blur-xl 
                     border-t border-system-separator/20
                     shadow-[0_-1px_8px_rgba(0,0,0,0.04),0_-4px_24px_rgba(0,0,0,0.12)] 
                     px-2 py-1 
                     transition-all duration-300 ease-ios-default 
                     ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
      
      <div className="flex items-center justify-around max-w-md mx-auto h-20">
        
        {/* Main navigation tabs */}
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`relative flex flex-col items-center justify-center 
                       min-w-[56px] h-16 px-3 rounded-2xl
                       transition-all duration-250 ease-out
                       hover:scale-[1.02] active:scale-[0.98]
                       ${active === tab.key 
                         ? 'text-coral-600 bg-coral-500/12' 
                         : 'text-system-secondary-label hover:text-coral-600 hover:bg-coral-500/8'
                       }`}
            onClick={() => onChange(tab.key)}
          >
            {/* State layer for press effect */}
            <div className={`absolute inset-0 rounded-2xl 
                            ${active === tab.key ? 'bg-coral-500/8' : ''} 
                            transition-all duration-150`} />
            
            <div className="relative mb-1 z-10">
              {tab.icon}
            </div>
            <span className="relative text-xs font-medium leading-tight z-10">
              {tab.label}
            </span>
          </button>
        ))}
        
        {/* Label Mode Button */}
        <button
          className={`relative flex flex-col items-center justify-center 
                     min-w-[56px] h-16 px-3 rounded-2xl
                     transition-all duration-250 ease-out
                     hover:scale-[1.02] active:scale-[0.98]
                     ${labelMode
                       ? 'text-white bg-teal-600 shadow-lg shadow-teal-500/20'
                       : 'text-system-secondary-label hover:text-teal-600 hover:bg-teal-500/8'
                     }`}
          onClick={toggleLabelMode}
          title={labelMode ? 'メモ配置を終了' : 'メモを追加'}
        >
          {/* State layer for press effect */}
          <div className={`absolute inset-0 rounded-2xl 
                          ${labelMode ? 'bg-white/12' : ''} 
                          transition-all duration-150`} />
          
          <div className="relative mb-1 z-10">
            <MdEditNote size={22} />
          </div>
          <span className="relative text-xs font-medium leading-tight z-10">
            {labelMode ? '配置中' : 'メモ'}
          </span>
        </button>

        {/* Filter Button */}
        <button
          className={`relative flex flex-col items-center justify-center 
                     min-w-[56px] h-16 px-3 rounded-2xl
                     transition-all duration-250 ease-out
                     hover:scale-[1.02] active:scale-[0.98]
                     ${hasActiveFilters
                       ? 'text-white bg-coral-600 shadow-lg shadow-coral-500/20'
                       : 'text-system-secondary-label hover:text-coral-600 hover:bg-coral-500/8'
                     }`}
          onClick={openCategoryFilterModal}
          title="カテゴリフィルター"
        >
          {/* State layer for press effect */}
          <div className={`absolute inset-0 rounded-2xl 
                          ${hasActiveFilters ? 'bg-white/12' : ''} 
                          transition-all duration-150`} />
          
          <div className="relative mb-1 z-10">
            <MdFilterList size={22} />
            {hasActiveFilters && (
              <div className="absolute -top-1 -right-1 
                             min-w-[18px] h-[18px] bg-white rounded-full 
                             flex items-center justify-center shadow-sm border-2 border-coral-600">
                <span className="text-coral-600 text-xs font-bold leading-none">
                  {selectedCategories.length > 9 ? '9+' : selectedCategories.length}
                </span>
              </div>
            )}
          </div>
          <span className="relative text-xs font-medium leading-tight z-10">
            フィルター
          </span>
        </button>
        
      </div>
    </nav>
  );
};

export default BottomNavigation;