import { MdMap, MdAccessTime, MdList, MdEditNote } from 'react-icons/md';
import { useDeviceDetect } from '../hooks/useDeviceDetect';

export type TabKey = 'map' | 'travelTime' | 'list';

interface Props {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  labelMode?: boolean;
  onLabelModeToggle?: () => void;
}

const tabs: { key: TabKey; icon: React.ReactNode; label: string }[] = [
  { key: 'map', icon: <MdMap size={24} />, label: '地図' },
  { key: 'travelTime', icon: <MdAccessTime size={24} />, label: '移動時間' },
  { key: 'list', icon: <MdList size={24} />, label: 'リスト' },
];

export default function TabNavigation({ active, onChange, labelMode = false, onLabelModeToggle }: Props) {
  const { isDesktop } = useDeviceDetect();

  if (isDesktop) {
    // Right side vertical nav (centered) - iOS風デザイン
    return (
      <nav className="fixed right-4 top-1/2 -translate-y-1/2 transform w-16 
                      glass-effect rounded-xl shadow-elevation-2 
                      flex flex-col items-center py-3 z-40
                      transition-all duration-150 ease-ios-default">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`flex flex-col items-center justify-center w-full h-16 
                       rounded-lg mx-1 my-1 group
                       transition-all duration-150 ease-ios-default
                       hover:scale-105 active:scale-95
                       ${
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
        
        {/* 区切り線 */}
        <div className="w-8 h-px bg-system-separator my-2" />
        
        {/* メモ追加ボタン */}
        {onLabelModeToggle && (
          <button
            className={`flex flex-col items-center justify-center w-full h-16 
                       rounded-lg mx-1 my-1 group
                       transition-all duration-150 ease-ios-default
                       hover:scale-105 active:scale-95
                       ${
                         labelMode 
                           ? 'text-white bg-teal-500 shadow-elevation-2' 
                           : 'text-system-secondary-label hover:text-teal-500 hover:bg-teal-500/10'
                       }`}
            onClick={onLabelModeToggle}
            title={labelMode ? 'メモ配置を終了' : 'メモを追加'}
          >
            <MdEditNote size={24} />
            <span className="caption-2 mt-1 select-none font-medium">
              {labelMode ? '配置中' : 'メモ'}
            </span>
          </button>
        )}
      </nav>
    );
  }

  // Mobile bottom nav - iOS風デザイン
  return (
    <nav className="fixed bottom-0 left-0 right-0 
                    glass-effect border-t border-system-separator 
                    flex justify-around py-2 z-40 safe-area-inset">
      {tabs.map((t) => (
        <button
          key={t.key}
          className={`flex flex-col items-center justify-center flex-1 py-2 px-1
                     rounded-lg mx-1
                     transition-all duration-150 ease-ios-default
                     active:scale-95
                     ${
                       active === t.key 
                         ? 'text-coral-500 bg-coral-500/10' 
                         : 'text-system-secondary-label hover:text-coral-500'
                     }`}
          onClick={() => onChange(t.key)}
        >
          {t.icon}
          <span className="caption-2 mt-0.5 select-none font-medium">
            {t.label}
          </span>
        </button>
      ))}
      
      {/* メモ追加ボタン */}
      {onLabelModeToggle && (
        <button
          className={`flex flex-col items-center justify-center flex-1 py-2 px-1
                     rounded-lg mx-1
                     transition-all duration-150 ease-ios-default
                     active:scale-95
                     ${
                       labelMode 
                         ? 'text-white bg-teal-500' 
                         : 'text-system-secondary-label hover:text-teal-500'
                     }`}
          onClick={onLabelModeToggle}
        >
          <MdEditNote size={24} />
          <span className="caption-2 mt-0.5 select-none font-medium">
            {labelMode ? '配置中' : 'メモ'}
          </span>
        </button>
      )}
    </nav>
  );
} 