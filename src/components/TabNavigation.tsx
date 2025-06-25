import { MdMap, MdAccessTime, MdList } from 'react-icons/md';
import { useDeviceDetect } from '../hooks/useDeviceDetect';

export type TabKey = 'map' | 'travelTime' | 'list';

interface Props {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

const tabs: { key: TabKey; icon: React.ReactNode; label: string }[] = [
  { key: 'map', icon: <MdMap size={24} />, label: '地図' },
  { key: 'travelTime', icon: <MdAccessTime size={24} />, label: '移動時間' },
  { key: 'list', icon: <MdList size={24} />, label: 'リスト' },
];

export default function TabNavigation({ active, onChange }: Props) {
  const { isDesktop } = useDeviceDetect();

  if (isDesktop) {
    // Right side vertical nav (centered)
    return (
      <nav className="fixed right-4 top-1/2 -translate-y-1/2 transform w-16 bg-white shadow-elevation-2 rounded-lg flex flex-col items-center py-2 z-40">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`flex flex-col items-center justify-center w-full h-16 group ${
              active === t.key ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => onChange(t.key)}
          >
            {t.icon}
            <span className="text-[10px] mt-1 select-none">{t.label}</span>
          </button>
        ))}
      </nav>
    );
  }

  // Mobile bottom nav
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-1 z-40">
      {tabs.map((t) => (
        <button
          key={t.key}
          className={`flex flex-col items-center justify-center flex-1 py-2 ${
            active === t.key ? 'text-blue-600' : 'text-gray-500'
          }`}
          onClick={() => onChange(t.key)}
        >
          {t.icon}
          <span className="text-[10px] mt-0.5 select-none">{t.label}</span>
        </button>
      ))}
    </nav>
  );
} 