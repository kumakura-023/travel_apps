import React, { useState, useEffect } from 'react';
import { usePlanStore } from '../store/planStore';
import { usePlacesStore } from '../store/placesStore';
import { useLabelsStore } from '../store/labelsStore';
import { 
  savePlan, 
  createEmptyPlan, 
  duplicatePlan, 
  deletePlan, 
  getAllPlans, 
  setActivePlan 
} from '../services/storageService';
import { TravelPlan } from '../types';

interface PlanNameEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PlanNameEditModal: React.FC<PlanNameEditModalProps> = ({ isOpen, onClose }) => {
  const { plan, setPlan, updatePlan } = usePlanStore();
  const places = usePlacesStore((s) => s.getFilteredPlaces());
  const { labels } = useLabelsStore();
  
  const [name, setName] = useState('');
  const [activeTab, setActiveTab] = useState<'edit' | 'manage'>('edit');
  const [savedPlans, setSavedPlans] = useState<TravelPlan[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (plan && isOpen) {
      setName(plan.name);
      setSavedPlans(getAllPlans());
    }
  }, [plan, isOpen]);

  if (!isOpen || !plan) return null;

  const save = () => {
    if (name.trim()) {
      const updatedPlan = { 
        ...plan, 
        name: name.trim(),
        places,
        labels,
        totalCost: places.reduce((sum, p) => sum + (p.estimatedCost || 0), 0),
        updatedAt: new Date()
      };
      updatePlan(updatedPlan);
      savePlan(updatedPlan);
      onClose();
    }
  };

  const handleCreateNew = () => {
    const newPlan = createEmptyPlan('新しいプラン');
    setPlan(newPlan);
    setActivePlan(newPlan.id);
    onClose();
  };

  const handleDuplicate = () => {
    const copy = duplicatePlan(plan.id, `${plan.name}_コピー`);
    if (copy) {
      setPlan(copy);
      setActivePlan(copy.id);
      setSavedPlans(getAllPlans());
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    deletePlan(plan.id);
    setShowDeleteConfirm(false);
    const remaining = getAllPlans();
    if (remaining.length > 0) {
      const nextPlan = remaining[0];
      setPlan(nextPlan);
      usePlacesStore.setState({ places: nextPlan.places });
      useLabelsStore.setState({ labels: nextPlan.labels });
      setActivePlan(nextPlan.id);
    } else {
      const newPlan = createEmptyPlan();
      setPlan(newPlan);
      usePlacesStore.setState({ places: [] });
      useLabelsStore.setState({ labels: [] });
      setActivePlan(newPlan.id);
    }
    onClose();
  };

  const handlePlanSelect = (selectedPlan: TravelPlan) => {
    setPlan(selectedPlan);
    usePlacesStore.setState({ places: selectedPlan.places });
    useLabelsStore.setState({ labels: selectedPlan.labels });
    setActivePlan(selectedPlan.id);
    savePlan({ ...selectedPlan, isActive: true });
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && activeTab === 'edit') {
      save();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000] flex items-center justify-center p-4
                 animate-modal-fade-in"
      onClick={onClose}
    >
      <div 
        className="glass-effect rounded-2xl w-full max-w-md p-6 space-y-5 
                   shadow-[0_32px_64px_0_rgba(0,0,0,0.4)] 
                   animate-modal-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-coral-500/10 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-coral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <h2 className="headline text-system-label">プラン管理</h2>
        </div>

        {/* タブ */}
        <div className="flex bg-system-secondary-background rounded-lg p-1">
          <button
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-150 ${
              activeTab === 'edit'
                ? 'bg-white text-system-label shadow-sm'
                : 'text-system-secondary-label hover:text-system-label'
            }`}
            onClick={() => setActiveTab('edit')}
          >
            編集
          </button>
          <button
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-150 ${
              activeTab === 'manage'
                ? 'bg-white text-system-label shadow-sm'
                : 'text-system-secondary-label hover:text-system-label'
            }`}
            onClick={() => setActiveTab('manage')}
          >
            管理
          </button>
        </div>

        {/* コンテンツ */}
        {activeTab === 'edit' ? (
          <div className="space-y-4">
            {/* プラン名入力 */}
            <div className="space-y-3">
              <label className="subheadline block text-system-label">プラン名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyPress}
                className="input text-lg"
                placeholder="例: 東京旅行"
                autoFocus
                maxLength={50}
              />
              <div className="text-right">
                <span className="caption-1 text-system-tertiary-label">
                  {name.length}/50
                </span>
              </div>
            </div>

            {/* プラン情報 */}
            <div className="bg-coral-500/5 rounded-lg p-3 border border-coral-500/10">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-system-secondary-label">地点数:</span>
                  <span className="text-system-label font-medium">{places.length}箇所</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-system-secondary-label">総費用:</span>
                  <span className="text-system-label font-medium">
                    ¥{places.reduce((sum, p) => sum + (p.estimatedCost || 0), 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-system-secondary-label">最終更新:</span>
                  <span className="text-system-label font-medium">
                    {plan.updatedAt.toLocaleDateString('ja-JP')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* プラン操作ボタン */}
            <div className="grid grid-cols-2 gap-3">
              <button 
                className="btn-secondary text-sm py-3 flex items-center justify-center space-x-2"
                onClick={handleCreateNew}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                <span>新規作成</span>
              </button>
              <button 
                className="btn-secondary text-sm py-3 flex items-center justify-center space-x-2"
                onClick={handleDuplicate}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
                <span>複製</span>
              </button>
            </div>

            {/* 保存済みプラン */}
            <div>
              <h3 className="subheadline text-system-label mb-3">保存済みプラン ({savedPlans.length})</h3>
              <div className="max-h-60 overflow-y-auto space-y-2 scrollbar-hide">
                {savedPlans.length === 0 ? (
                  <p className="text-system-tertiary-label text-sm text-center py-4">
                    保存されたプランはありません
                  </p>
                ) : (
                  savedPlans.map((savedPlan) => (
                    <div
                      key={savedPlan.id}
                      className={`list-item rounded-lg cursor-pointer transition-colors duration-150 p-3 ${
                        savedPlan.id === plan.id 
                          ? 'bg-coral-500/10 border border-coral-500/20' 
                          : 'hover:bg-system-secondary-background'
                      }`}
                      onClick={() => handlePlanSelect(savedPlan)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="subheadline font-medium text-system-label truncate">
                            {savedPlan.name}
                          </h4>
                          <p className="caption-1 text-system-secondary-label mt-1">
                            {savedPlan.places.length}地点 • ¥{savedPlan.totalCost.toLocaleString()}
                          </p>
                        </div>
                        {savedPlan.id === plan.id && (
                          <div className="w-2 h-2 bg-coral-500 rounded-full ml-2 flex-shrink-0"></div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 削除ボタン */}
            <div className="pt-2 border-t border-white/20">
              <button 
                className="w-full py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150 font-medium"
                onClick={handleDelete}
              >
                このプランを削除
              </button>
            </div>
          </div>
        )}

        {/* ボタン */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-white/20">
          <button 
            className="btn-text text-system-secondary-label hover:text-system-label" 
            onClick={onClose}
          >
            {activeTab === 'edit' ? 'キャンセル' : '閉じる'}
          </button>
          {activeTab === 'edit' && (
            <button 
              className="btn-primary min-w-[80px] disabled:opacity-50 disabled:cursor-not-allowed" 
              onClick={save}
              disabled={!name.trim()}
            >
              保存
            </button>
          )}
        </div>
      </div>

      {/* 削除確認ダイアログ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1001] flex items-center justify-center p-4">
          <div className="glass-effect rounded-xl w-full max-w-xs p-5 text-center space-y-4">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v4m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
              </svg>
            </div>
            <div>
              <h3 className="headline text-system-label">プランを削除</h3>
              <p className="footnote text-system-secondary-label mt-2">
                「{plan.name}」を削除しますか？<br/>
                この操作は取り消せません。
              </p>
            </div>
            <div className="flex space-x-3">
              <button 
                className="btn-text flex-1" 
                onClick={() => setShowDeleteConfirm(false)}
              >
                キャンセル
              </button>
              <button 
                className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors duration-150 flex-1"
                onClick={confirmDelete}
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanNameEditModal; 