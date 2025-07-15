import { MdMap, MdAccessTime, MdList, MdEditNote } from 'react-icons/md';
import AuthButton from './AuthButton';

export type TabKey = 'map' | 'travelTime' | 'list';

interface Props {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  labelMode?: boolean;
  onLabelModeToggle?: () => void;
  isVisible: boolean;
}

const tabs: { key: TabKey; icon: React.ReactNode; label: string }[] = [
  { key: 'map', icon: <MdMap size={24} />, label: '地図' },
  { key: 'travelTime', icon: <MdAccessTime size={24} />, label: '移動時間' },
  { key: 'list', icon: <MdList size={24} />, label: 'リスト' },
];

const TabNavigation: React.FC<Props> = ({ active, onChange, labelMode = false, onLabelModeToggle, isVisible }) => {
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
      
      {onLabelModeToggle && (
        <button
          className={`flex flex-col items-center justify-center w-full h-16 rounded-lg mx-1 my-1 group transition-all duration-150 ease-ios-default hover:scale-105 active:scale-95 ${
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
};

export default TabNavigation;
 