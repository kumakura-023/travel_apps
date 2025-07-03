import { MdMap, MdAccessTime, MdList, MdEditNote } from 'react-icons/md';
import { useDeviceDetect } from '../hooks/useDeviceDetect';
import useMediaQuery from '../hooks/useMediaQuery';

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
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isMobile = !isDesktop && !isTablet;

  // 全デバイス共通で右端縦配置
  return (
    <nav className={`fixed right-4 top-1/2 -translate-y-1/2 transform w-16 
                    glass-effect-border rounded-xl 
                    flex flex-col items-center py-3 z-40
                    transition-all duration-150 ease-ios-default`}>
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
                         ? 'text-white bg-teal-500 border border-teal-400/30' 
                         : 'text-system-secondary-label hover:text-teal-500 hover:bg-white/10'
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