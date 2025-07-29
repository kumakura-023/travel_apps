import React from 'react';
import { TravelPlan } from '../types';
import { createEmptyPlan } from '../services/storageService';
import { usePlacesStore } from '../store/placesStore';
import { useLabelsStore } from '../store/labelsStore';
import { useAutoSave } from '../hooks/useAutoSave';
import PlanList from './PlanList';
import { usePlanStore } from '../store/planStore';
import { createNewPlan, deletePlanFromCloud } from '../services/planListService';
import { serializePlan } from '../utils/planSerializer';
import { useAuth } from '../hooks/useAuth';

const PlanManager: React.FC = () => {
  const { plan, setPlan: setPlanStore, updatePlan } = usePlanStore();

  const { user } = useAuth();
  
  // 新規プラン作成
  const handleCreateNewPlan = async () => {
    if (!user) return;
    
    const newPlan = createEmptyPlan('新しいプラン');
    const payload = serializePlan(newPlan);
    
    try {
      const planId = await createNewPlan(user, newPlan.name, payload);
      // 作成したプランをリッスンする
      usePlanStore.getState().listenToPlan(planId);
    } catch (error) {
      console.error('[PlanManager] Failed to create new plan:', error);
      alert('プランの作成に失敗しました');
    }
  };

  const places = usePlacesStore((s) => s.getFilteredPlaces());
  const labels = useLabelsStore((s) => s.labels);

  // プラン名編集
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updatePlan({ name: e.target.value });
  };

  // 手動保存（自動保存があるので基本的に不要だが、UI上は残す）
  const handleSave = () => {
    // 自動保存されているのでメッセージのみ表示
    console.log('[PlanManager] Manual save triggered (auto-save is active)');
  };

  // 複製
  const handleDuplicate = async () => {
    if (!plan || !user) return;
    
    const duplicatedPlan = {
      ...plan,
      id: '', // 新しいIDは作成時に割り当てられる
      name: `${plan.name}_コピー`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const payload = serializePlan(duplicatedPlan);
    
    try {
      const planId = await createNewPlan(user, duplicatedPlan.name, payload);
      // 複製したプランをリッスンする
      usePlanStore.getState().listenToPlan(planId);
    } catch (error) {
      console.error('[PlanManager] Failed to duplicate plan:', error);
      alert('プランの複製に失敗しました');
    }
  };

  // 削除
  const handleDelete = async () => {
    if (!confirm('本当に削除しますか？')) return;
    if (!plan) return;
    
    try {
      await deletePlanFromCloud(plan.id);
      // 削除後は新規プランを作成
      handleCreateNewPlan();
    } catch (error) {
      console.error('[PlanManager] Failed to delete plan:', error);
      alert('プランの削除に失敗しました');
    }
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

  if (!user) {
    return (
      <div className="text-gray-500 text-sm">
        プラン管理にはログインが必要です。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button 
        className="w-full bg-green-500 text-white px-3 py-2 rounded text-sm hover:bg-green-600"
        onClick={handleCreateNewPlan}
      >
        新規プランを作成
      </button>
      
      {plan && (
        <>
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
        </>
      )}
      
      <hr />
      <div>
        <h3 className="font-semibold text-sm mb-2">保存済みプラン</h3>
        <PlanList onSelect={() => { /* 選択後にメニューを閉じる場合は親側で */ }} />
      </div>
    </div>
  );
};

export default PlanManager; 