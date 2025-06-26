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
      },
      {
        name: '浅草寺',
        address: '〒111-0032 東京都台東区浅草２丁目３−１',
        coordinates: { lat: 35.7148, lng: 139.7967 },
        category: 'sightseeing' as const,
        memo: '歴史ある寺院',
        estimatedCost: 500,
        photos: [],
      },
      {
        name: 'スカイツリー',
        address: '〒131-0045 東京都墨田区押上１丁目１−２',
        coordinates: { lat: 35.7101, lng: 139.8107 },
        category: 'sightseeing' as const,
        memo: '展望台',
        estimatedCost: 2000,
        photos: [],
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
      className="fixed bottom-4 right-4 z-50 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
    >
      テスト候補地を追加
    </button>
  );
} 