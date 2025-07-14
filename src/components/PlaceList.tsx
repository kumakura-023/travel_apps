import React, { useState, useMemo } from 'react';
import { usePlacesStore } from '../store/placesStore';
import { usePlanStore } from '../store/planStore';
import { useLabelsStore } from '../store/labelsStore';
import { Place } from '../types';
import PlaceListItem from './PlaceListItem';
import CategoryFilter from './CategoryFilter';
import DaySelector from './DaySelector';
import CostSummary from './CostSummary';
import CostPieChart from './CostPieChart';
import PlanNameEditModal from './PlanNameEditModal';
import DateSelectionModal from './DateSelectionModal';

export default function PlaceList() {
  const places = usePlacesStore((s) => s.getFilteredPlaces());
  const { plan } = usePlanStore();
  const { labels } = useLabelsStore();
  const [search, setSearch] = useState('');
  const [selectedCats, setSelectedCats] = useState([] as string[]);
  const [selectedDay, setSelectedDay] = useState<number | undefined>(undefined);
  const [sortKey, setSortKey] = useState<'name' | 'cost' | 'date' | 'day'>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [nameModal, setNameModal] = useState(false);
  const [dateModal, setDateModal] = useState(false);
  // メモ関連のフィルタリング
  const [showMemoOnly, setShowMemoOnly] = useState(false);
  const [showLinkedMemos, setShowLinkedMemos] = useState(true);
  const [memoSearch, setMemoSearch] = useState('');

  const filtered = useMemo(() => {
    let arr = places as Place[];
    
    // 名前での検索
    if (search.trim()) {
      arr = arr.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    }
    
    // カテゴリフィルター
    if (selectedCats.length) {
      arr = arr.filter((p) => selectedCats.includes(p.category));
    }
    
    // 日程フィルター
    if (selectedDay !== undefined) {
      arr = arr.filter((p) => p.scheduledDay === selectedDay);
    }
    
    // メモ関連のフィルタリング
    if (showMemoOnly) {
      arr = arr.filter((p) => {
        // 候補地自身にメモがあるか、リンクされたメモがあるかをチェック
        const hasOwnMemo = p.memo && p.memo.trim() !== '';
        const hasLinkedMemo = labels.some(label => label.linkedPlaceId === p.id);
        return hasOwnMemo || hasLinkedMemo;
      });
    }
    
    // メモ内容での検索
    if (memoSearch.trim()) {
      arr = arr.filter((p) => {
        // 候補地自身のメモを検索
        const ownMemoMatch = p.memo?.toLowerCase().includes(memoSearch.toLowerCase());
        // リンクされたメモを検索
        const linkedMemoMatch = labels.some(label => 
          label.linkedPlaceId === p.id && 
          label.text.toLowerCase().includes(memoSearch.toLowerCase())
        );
        return ownMemoMatch || linkedMemoMatch;
      });
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
        case 'day':
          v = (a.scheduledDay || 999) - (b.scheduledDay || 999);
          break;
      }
      return sortAsc ? v : -v;
    });
    return arr;
  }, [places, labels, search, selectedCats, selectedDay, sortKey, sortAsc, showMemoOnly, memoSearch]);

  return (
    <div className="fixed inset-0 glass-effect overflow-y-auto z-30 safe-area-inset">
      <div className="max-w-screen-md mx-auto p-5 space-y-5">
        {/* ヘッダー */}
        <div className="text-center py-5 space-y-3">
          {/* プラン名 */}
          {plan && (
            <div className="space-y-2">
              {/* プラン名 - クリック可能 */}
              <button
                className="title-1 text-system-label font-bold tracking-tight
                           hover:text-coral-500 transition-colors duration-150
                           focus:outline-none focus:text-coral-500 cursor-pointer"
                onClick={() => setNameModal(true)}
                title="プラン名を編集"
              >
                {plan.name}
              </button>
              
              {/* 日程表示 - クリック可能 */}
              {plan.startDate && (
                <button
                  className="flex items-center justify-center gap-2 mx-auto
                             hover:bg-coral-500/5 rounded-lg px-3 py-1.5 transition-all duration-150
                             focus:outline-none focus:bg-coral-500/10 cursor-pointer group"
                  onClick={() => setDateModal(true)}
                  title="日程を編集"
                >
                  <div className="w-4 h-4 text-coral-500 flex-shrink-0 group-hover:scale-110 transition-transform">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <span className="subheadline text-system-secondary-label font-medium group-hover:text-coral-600">
                    {plan.startDate.toLocaleDateString('ja-JP', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                    {plan.endDate && plan.endDate.getTime() !== plan.startDate.getTime() && (
                      <> 〜 {plan.endDate.toLocaleDateString('ja-JP', { 
                        month: 'long', 
                        day: 'numeric' 
                      })}</>
                    )}
                  </span>
                </button>
              )}
            </div>
          )}
          
          {/* 候補地リストのサブタイトル */}
          <div className="pt-2 border-t border-system-separator/30">
            <h2 className="headline text-system-label">候補地リスト</h2>
            <p className="footnote text-system-secondary-label mt-1">
              {places.length}件の候補地が登録されています
            </p>
          </div>
        </div>

        {/* 検索 & フィルター */}
        <div className="glass-effect rounded-xl p-4 space-y-4 shadow-elevation-1">
          <div className="space-y-2">
            <label className="subheadline text-system-label font-medium">検索</label>
            <input
              type="text"
              placeholder="候補地名で検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
            />
          </div>
          
          <div className="space-y-2">
            <label className="subheadline text-system-label font-medium">カテゴリフィルター</label>
            <CategoryFilter selected={selectedCats as any} onChange={setSelectedCats as any} />
          </div>
          
          <div className="space-y-2">
            <label className="subheadline text-system-label font-medium">日程フィルター</label>
            <div className="flex items-center gap-2">
              <DaySelector
                selectedDay={selectedDay}
                onDayChange={setSelectedDay}
                className="flex-1"
                allDaysLabel="全日程"
              />
              {selectedDay !== undefined && (
                <button
                  onClick={() => setSelectedDay(undefined)}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm
                             hover:bg-gray-300 transition-colors"
                >
                  クリア
                </button>
              )}
            </div>
          </div>
          
          {/* メモ関連フィルター */}
          <div className="space-y-3 border-t border-system-separator/30 pt-4">
            <label className="subheadline text-system-label font-medium">メモフィルター</label>
            
            {/* メモ検索 */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="メモ内容で検索..."
                value={memoSearch}
                onChange={(e) => setMemoSearch(e.target.value)}
                className="input text-sm"
              />
            </div>
            
            {/* メモ関連の表示オプション */}
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMemoOnly}
                  onChange={(e) => setShowMemoOnly(e.target.checked)}
                  className="w-4 h-4 text-coral-500 bg-transparent border-2 border-system-separator rounded 
                           focus:ring-coral-500 focus:ring-2 checked:bg-coral-500 checked:border-coral-500"
                />
                <span className="callout text-system-label">メモ付きのみ表示</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLinkedMemos}
                  onChange={(e) => setShowLinkedMemos(e.target.checked)}
                  className="w-4 h-4 text-teal-500 bg-transparent border-2 border-system-separator rounded 
                           focus:ring-teal-500 focus:ring-2 checked:bg-teal-500 checked:border-teal-500"
                />
                <span className="callout text-system-label">リンクメモを表示</span>
              </label>
            </div>
          </div>
        </div>

        {/* ソート */}
        <div className="glass-effect rounded-xl p-4 shadow-elevation-1">
          <div className="space-y-2">
            <label className="subheadline text-system-label font-medium">並び替え</label>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { key: 'name', label: '名前順' },
                { key: 'cost', label: 'コスト順' },
                { key: 'date', label: '追加日順' },
                { key: 'day', label: '日程順' },
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
                  className={`px-4 py-2 rounded-lg border transition-all duration-150 ease-ios-default
                             hover:scale-105 active:scale-95
                             ${
                               sortKey === key 
                                 ? 'bg-coral-500 text-white border-coral-500 shadow-elevation-1' 
                                 : 'bg-system-secondary-background text-system-secondary-label border-system-separator hover:border-coral-500/30 hover:text-coral-500'
                             }`}
                >
                  <span className="callout font-medium">{label}</span>
                  {sortKey === key && (
                    <span className="ml-1 caption-1">
                      {sortAsc ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cost Summary & Chart */}
        {filtered.length > 0 && (
          <>
            <CostSummary places={filtered} />
            <CostPieChart places={filtered} />
          </>
        )}

        {/* List */}
        <div className="space-y-3">
          {filtered.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="headline text-system-label">
                  候補地一覧
                </h2>
                <span className="caption-1 text-system-secondary-label">
                  {filtered.length}件表示
                </span>
              </div>
              {filtered.map((p) => (
                <PlaceListItem 
                  key={p.id} 
                  place={p} 
                  showLinkedMemos={showLinkedMemos}
                />
              ))}
            </>
          ) : (
            <div className="glass-effect rounded-xl p-8 text-center shadow-elevation-1">
              <div className="w-16 h-16 bg-system-secondary-background rounded-full 
                              flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-system-tertiary-label" 
                     viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
              </div>
              <h3 className="headline text-system-secondary-label mb-2">
                候補地が見つかりません
              </h3>
              <p className="subheadline text-system-tertiary-label">
                検索条件を変更するか、新しい候補地を追加してください
              </p>
            </div>
          )}
        </div>

        {/* Bottom padding for safe scrolling */}
        <div className="h-20" />
      </div>

      {/* モーダル */}
      <PlanNameEditModal isOpen={nameModal} onClose={() => setNameModal(false)} />
      <DateSelectionModal isOpen={dateModal} onClose={() => setDateModal(false)} />
    </div>
  );
} 