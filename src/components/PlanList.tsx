import React from 'react';
import { TravelPlan } from '../types';
import { useSavedPlacesStore } from '../store/savedPlacesStore';
import { useLabelsStore } from '../store/labelsStore';
import { usePlanStore } from '../store/planStore';
import { usePlanListStore } from '../store/planListStore';
import { useAuth } from '../hooks/useAuth';
import { deletePlanFromCloud, updatePlanName } from '../services/planListService';
import { FiTrash2, FiEdit2 } from 'react-icons/fi';

interface PlanListProps {
  onSelect?: () => void;
}

/**
 * 保存済みプランの一覧を表示するコンポーネント
 */
const PlanList: React.FC<PlanListProps> = ({ onSelect }) => {
  const { user } = useAuth();
  const { plans, isLoading, error, startListening, stopListening, refreshPlans } = usePlanListStore();
  const { listenToPlan } = usePlanStore();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState('');

  React.useEffect(() => {
    if (user) {
      // デバッグ用にユーザー情報を保存
      (window as any).currentUser = user;
      startListening(user);
    }
    return () => {
      stopListening();
      (window as any).currentUser = null;
    };
  }, [user]);

  const handleSelect = (planId: string) => {
    console.log('[PlanList] Selecting plan:', planId);
    listenToPlan(planId);
    if (onSelect) onSelect();
  };

  const handleDelete = async (planId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('このプランを削除しますか？')) return;
    
    try {
      await deletePlanFromCloud(planId);
    } catch (error) {
      console.error('[PlanList] Failed to delete plan:', error);
      alert('プランの削除に失敗しました');
    }
  };

  const handleEditName = async (planId: string, newName: string) => {
    if (!newName.trim()) return;
    
    try {
      await updatePlanName(planId, newName);
      setEditingId(null);
    } catch (error) {
      console.error('[PlanList] Failed to update plan name:', error);
      alert('プラン名の更新に失敗しました');
    }
  };

  const handleRetry = () => {
    if (user) {
      console.log('[PlanList] Retrying to load plans');
      refreshPlans();
    }
  };

  if (!user) {
    return <p className="text-gray-500 text-sm">ログインしてください。</p>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-gray-500 text-sm">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        <span>プラン一覧を読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="text-red-500 text-sm p-3 bg-red-50 border border-red-200 rounded">
          <div className="font-medium mb-1">プラン一覧の取得に失敗しました</div>
          <div className="text-xs text-red-600">{error}</div>
        </div>
        <button 
          onClick={handleRetry}
          className="px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          再試行
        </button>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="text-center py-8 space-y-2">
        <p className="text-gray-500 text-sm">保存されたプランはありません。</p>
        <p className="text-gray-400 text-xs">新しいプランを作成してください。</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {plans.map((plan) => (
        <li key={plan.id} className="border rounded p-2 hover:bg-gray-50 cursor-pointer group" onClick={() => handleSelect(plan.id)}>
          <div className="flex items-center justify-between">
            {editingId === plan.id ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => handleEditName(plan.id, editingName)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleEditName(plan.id, editingName);
                  } else if (e.key === 'Escape') {
                    setEditingId(null);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-sm border-b border-blue-500 outline-none"
                autoFocus
              />
            ) : (
              <div className="font-semibold text-sm">{plan.name}</div>
            )}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(plan.id);
                  setEditingName(plan.name);
                }}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <FiEdit2 className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => handleDelete(plan.id, e)}
                className="p-1 hover:bg-red-100 rounded text-red-500"
              >
                <FiTrash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {plan.placeCount} 地点 • {plan.totalCost.toLocaleString()} 円 • 
            {plan.memberCount} 人
          </div>
        </li>
      ))}
    </ul>
  );
};

export default PlanList; 