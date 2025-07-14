import React from 'react';
import { TravelPlan } from '../types';
import { createEmptyPlan, getActivePlan, savePlan, duplicatePlan, deletePlan, setActivePlan } from '../services/storageService';
import { usePlacesStore } from '../store/placesStore';
import { useLabelsStore } from '../store/labelsStore';
import { useAutoSave } from '../hooks/useAutoSave';
import PlanList from './PlanList';
import { usePlanStore } from '../store/planStore';

const PlanManager: React.FC = () => {
  const { plan, setPlan: setPlanStore, updatePlan } = usePlanStore();

  // 初期化
  React.useEffect(() => {
    if (!plan) {
      const active = getActivePlan() || createEmptyPlan();
      setPlanStore(active);
      setActivePlan(active.id);
    }
  }, []);

  const places = usePlacesStore((s) => s.getFilteredPlaces());
  const labels = useLabelsStore((s) => s.labels);

  // プラン名編集
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updatePlan({ name: e.target.value });
  };

  // 手動保存
  const handleSave = () => {
    if (!plan) return;
    const updated: TravelPlan = {
      ...plan,
      places,
      labels,
      totalCost: places.reduce((sum, p) => sum + (p.estimatedCost || 0), 0),
      updatedAt: new Date(),
    };
    setPlanStore(updated);
    savePlan(updated);
  };

  // 複製
  const handleDuplicate = () => {
    if (!plan) return;
    const copy = duplicatePlan(plan.id, `${plan.name}_コピー`);
    if (copy) {
      setPlanStore(copy);
    }
  };

  // 削除
  const handleDelete = () => {
    if (!confirm('本当に削除しますか？')) return;
    if (!plan) return;
    deletePlan(plan.id);
  };

  // ストア変更に応じてplanデータを同期
  const mergedPlan: TravelPlan | null = React.useMemo(() => {
    if (!plan) return null;
    return {
      ...plan,
      places,
      labels,
      totalCost: places.reduce((sum, p) => sum + (p.estimatedCost || 0), 0),
    };
  }, [plan, places, labels]);

  // 自動保存
  useAutoSave(mergedPlan);

  if (!plan) return null;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-gray-600">計画名</label>
        <input
          type="text"
          value={plan.name}
          onChange={handleNameChange}
          className="w-full border rounded p-2 text-sm"
        />
      </div>
      <div className="flex space-x-2">
        <button className="bg-blue-500 text-white px-3 py-1 rounded text-sm" onClick={handleSave}>保存</button>
        <button className="bg-gray-500 text-white px-3 py-1 rounded text-sm" onClick={handleDuplicate}>複製</button>
        <button className="bg-red-500 text-white px-3 py-1 rounded text-sm" onClick={handleDelete}>削除</button>
      </div>
      <hr />
      <div>
        <h3 className="font-semibold text-sm mb-2">保存済みプラン</h3>
        <PlanList onSelect={() => { /* 選択後にメニューを閉じる場合は親側で */ }} />
      </div>
    </div>
  );
};

export default PlanManager; 