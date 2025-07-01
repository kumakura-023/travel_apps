import React, { useState, useMemo } from 'react';
import { usePlacesStore } from '../store/placesStore';
import { Place } from '../types';
import PlaceListItem from './PlaceListItem';
import CategoryFilter from './CategoryFilter';
import CostSummary from './CostSummary';
import CostPieChart from './CostPieChart';

export default function PlaceList() {
  const { places } = usePlacesStore();
  const [search, setSearch] = useState('');
  const [selectedCats, setSelectedCats] = useState([] as string[]);
  const [sortKey, setSortKey] = useState<'name' | 'cost' | 'date'>('date');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let arr = places as Place[];
    if (search.trim()) {
      arr = arr.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    }
    if (selectedCats.length) {
      arr = arr.filter((p) => selectedCats.includes(p.category));
    }
    // ソート
    arr = [...arr].sort((a, b) => {
      let v = 0;
      switch (sortKey) {
        case 'name':
          v = a.name.localeCompare(b.name);
          break;
        case 'cost':
          v = (a.estimatedCost || 0) - (b.estimatedCost || 0);
          break;
        case 'date':
          v = a.createdAt.getTime() - b.createdAt.getTime();
          break;
      }
      return sortAsc ? v : -v;
    });
    return arr;
  }, [places, search, selectedCats, sortKey, sortAsc]);

  return (
    <div className="fixed inset-0 bg-white overflow-y-auto z-30">
      <div className="max-w-screen-md mx-auto p-6 space-y-6">
        <h1 className="title-2 text-center">候補地リスト</h1>

        {/* 検索 & フィルター */}
        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
          />
          <CategoryFilter selected={selectedCats as any} onChange={setSelectedCats as any} />
        </div>

        {/* ソート */}
        <div className="flex items-center gap-2 text-sm">
          <span>並び替え:</span>
          {[
            { key: 'name', label: '名前' },
            { key: 'cost', label: 'コスト' },
            { key: 'date', label: '追加日' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                if (sortKey === key) {
                  setSortAsc(!sortAsc);
                } else {
                  setSortKey(key as any);
                  setSortAsc(true);
                }
              }}
              className={`px-3 py-1 rounded-lg border transition-all ${
                sortKey === key ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-100 border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Cost Summary & Chart */}
        <CostSummary places={filtered} />
        <CostPieChart places={filtered} />

        {/* List */}
        <div className="space-y-3">
          {filtered.map((p) => (
            <PlaceListItem key={p.id} place={p} />
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-gray-500 mt-10">候補地がありません</p>
          )}
        </div>

        <div className="h-20" /> {/* for padding bottom */}
      </div>
    </div>
  );
} 