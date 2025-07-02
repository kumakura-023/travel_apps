import React from 'react';
import { usePlacesStore } from '../store/placesStore';

export default function TestPlacesButton() {
  const { addPlace } = usePlacesStore();

  const addTestPlaces = () => {
    console.log('テスト候補地追加ボタンがクリックされました');
    console.log('現在の候補地数:', usePlacesStore.getState().places.length);
    
    // テスト用の候補地を追加
    const testPlaces = [
      {
        name: '東京駅',
        address: '〒100-0005 東京都千代田区丸の内１丁目',
        coordinates: { lat: 35.6812, lng: 139.7671 },
        category: 'transport' as const,
        memo: 'JRの主要駅',
        estimatedCost: 0,
        photos: [],
        scheduledDay: 1,
      },
      {
        name: '浅草寺',
        address: '〒111-0032 東京都台東区浅草２丁目３−１',
        coordinates: { lat: 35.7148, lng: 139.7967 },
        category: 'sightseeing' as const,
        memo: '歴史ある寺院',
        estimatedCost: 500,
        photos: [],
        scheduledDay: 1,
      },
      {
        name: 'スカイツリー',
        address: '〒131-0045 東京都墨田区押上１丁目１−２',
        coordinates: { lat: 35.7101, lng: 139.8107 },
        category: 'sightseeing' as const,
        memo: '展望台',
        estimatedCost: 2000,
        photos: [],
        scheduledDay: 2,
      },
    ];

    testPlaces.forEach(place => {
      console.log('候補地を追加中:', place.name);
      addPlace(place);
    });
    
    console.log('追加後の候補地数:', usePlacesStore.getState().places.length);
    alert('テスト候補地を追加しました！');
  };

  return (
    <button
      onClick={addTestPlaces}
      className="fixed bottom-4 right-4 z-50 
                 glass-effect rounded-lg shadow-elevation-2
                 bg-teal-500/10 border-teal-500/20 text-teal-600
                 px-4 py-2 font-medium text-[14px] tracking-[-0.24px]
                 hover:bg-teal-500/20 hover:text-teal-700 hover:scale-105
                 active:scale-95 transition-all duration-150 ease-ios-default"
      title="開発用：テスト候補地を追加"
    >
      <span className="flex items-center space-x-2">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        <span>テスト候補地</span>
      </span>
    </button>
  );
} 