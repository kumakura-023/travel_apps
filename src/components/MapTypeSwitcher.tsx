import { useState } from 'react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';

export default function MapTypeSwitcher() {
  const { map } = useGoogleMaps();
  const [type, setType] = useState<'roadmap' | 'hybrid'>('roadmap');

  const switchType = (t: 'roadmap' | 'hybrid') => {
    setType(t);
    map?.setMapTypeId(t);
  };

  return (
    <div className="fixed top-4 right-4 z-50 
                    glass-effect rounded-lg shadow-elevation-2 
                    flex overflow-hidden
                    transition-all duration-150 ease-ios-default">
      <button
        className={`px-4 py-2 text-[15px] font-medium tracking-[-0.24px] font-system
                   transition-all duration-150 ease-ios-default
                   ${
                     type === 'roadmap' 
                       ? 'bg-coral-500 text-white shadow-elevation-1' 
                       : 'text-system-label hover:text-coral-500 hover:bg-coral-500/5'
                   }`}
        onClick={() => switchType('roadmap')}
      >
        地図
      </button>
      <button
        className={`px-4 py-2 text-[15px] font-medium tracking-[-0.24px] font-system
                   border-l border-system-separator
                   transition-all duration-150 ease-ios-default
                   ${
                     type === 'hybrid' 
                       ? 'bg-coral-500 text-white shadow-elevation-1' 
                       : 'text-system-label hover:text-coral-500 hover:bg-coral-500/5'
                   }`}
        onClick={() => switchType('hybrid')}
      >
        航空写真
      </button>
    </div>
  );
} 