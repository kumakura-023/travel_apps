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
    <div className="fixed top-4 right-4 z-50 bg-white rounded shadow-md flex">
      <button
        className={`px-4 py-2 text-sm ${
          type === 'roadmap' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
        }`}
        onClick={() => switchType('roadmap')}
      >
        地図
      </button>
      <button
        className={`px-4 py-2 text-sm border-l ${
          type === 'hybrid' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
        }`}
        onClick={() => switchType('hybrid')}
      >
        航空写真
      </button>
    </div>
  );
} 