import React, { useState, useEffect } from 'react';
import { usePlanStore } from '../store/planStore';
import { useSavedPlacesStore } from '../store/savedPlacesStore';
import { useLabelsStore } from '../store/labelsStore';
import { 
  setActivePlan 
} from '../services/storageService';
import { TravelPlan } from '../types';
import { deletePlanFromCloud, createNewPlan, PlanListItem } from '../services/planListService';
import { usePlanListStore } from '../store/planListStore';
import { useAuthStore } from '../hooks/useAuth';
import { serializePlan } from '../utils/planSerializer';
import { getPlanCoordinator } from '../services/ServiceContainer';

interface PlanNameEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  isNewPlanCreation?: boolean;
}

const PlanNameEditModal: React.FC<PlanNameEditModalProps> = ({ isOpen, onClose, isNewPlanCreation = false }) => {
  const { plan, setPlan, updatePlan } = usePlanStore();
  const places = useSavedPlacesStore((s) => s.getFilteredPlaces());
  const { labels } = useLabelsStore();
  const planList = usePlanListStore((state) => state.plans);
  
  const [name, setName] = useState('');
  const [activeTab, setActiveTab] = useState<'edit' | 'manage'>('edit');
  const [savedPlans, setSavedPlans] = useState<(TravelPlan | PlanListItem)[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(new Set());
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isNewPlan, setIsNewPlan] = useState(isNewPlanCreation);

  useEffect(() => {
    if (isOpen) {
      if (isNewPlanCreation && plan) {
        // 新規作成時は名前フィールドを空にして、編集タブを開く
        setName('');
        setActiveTab('edit');
        setIsNewPlan(true);
      } else if (plan) {
        setName(plan.name);
        setActiveTab('edit');
      } else {
        // プランがない場合は管理タブを開く
        setActiveTab('manage');
      }
      // planListStoreからプランを設定
      setSavedPlans(planList);
    }
  }, [plan, isOpen, planList, isNewPlanCreation]);

  if (!isOpen) return null;

  const save = () => {
    if (!name.trim()) {
      alert('プラン名を入力してください');
      return;
    }
    
    if (plan) {
      const updatedPlan = { 
        ...plan, 
        name: name.trim(),
        places,
        labels,
        totalCost: places.reduce((sum, p) => sum + (p.estimatedCost || 0), 0),
        updatedAt: new Date()
      };
      
      // 新規作成フラグをリセット
      if (isNewPlan) {
        setIsNewPlan(false);
      }
      
      // updatePlanを呼ぶだけで、onPlanUpdatedコールバックが自動保存を実行
      updatePlan(updatedPlan);
      onClose();
    }
  };

  const handleCreateNew = async () => {
    const { user } = useAuthStore.getState();
    if (!user) {
      alert('ログインが必要です');
      return;
    }
    
    try {
      // ServiceContainerから取得
      const coordinator = getPlanCoordinator();
      
      // 仮の名前で新規プラン作成
      const tempName = `新しいプラン_${new Date().toLocaleDateString('ja-JP')}`;
      await coordinator.createNewPlan(user.uid, tempName);
      
      // 新規作成フラグを立てて、編集タブに切り替え
      setIsNewPlan(true);
      setName('');
      setActiveTab('edit');
      
      // モーダルは開いたままにする
    } catch (error) {
      console.error('[PlanNameEditModal] Failed to create new plan:', error);
      alert('プランの作成に失敗しました。もう一度お試しください。');
    }
  };

  const handleDuplicate = async () => {
    const { user } = useAuthStore.getState();
    if (!user || !plan) return;
    
    try {
      // ServiceContainerから取得
      const coordinator = getPlanCoordinator();
      const planService = coordinator.getPlanService();
      
      // プランを複製（新規作成と同じ流れ）
      const duplicatedPlan = await planService.createPlan(
        user.uid, 
        `${plan.name}_コピー`
      );
      
      // 既存のデータをコピー
      duplicatedPlan.places = [...plan.places];
      duplicatedPlan.labels = [...plan.labels];
      duplicatedPlan.startDate = plan.startDate;
      duplicatedPlan.endDate = plan.endDate;
      
      // 保存
      await planService.savePlan(duplicatedPlan);
      
      // プランリストを更新
      await usePlanListStore.getState().refreshPlans();
      
      // 新しいプランに切り替え
      await coordinator.switchPlan(user.uid, duplicatedPlan.id);
      
      onClose();
    } catch (error) {
      console.error('[PlanNameEditModal] Failed to duplicate plan:', error);
      alert('プランの複製に失敗しました。もう一度お試しください。');
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    const { user } = useAuthStore.getState();
    if (!user || !plan) return;
    
    try {
      console.log('[PlanNameEditModal] Starting plan deletion:', plan.id);
      setShowDeleteConfirm(false);
      
      // ServiceContainerから取得
      const coordinator = getPlanCoordinator();
      
      // Coordinatorを通じて削除
      await coordinator.deletePlan(user.uid, plan.id);
      
      console.log('[PlanNameEditModal] Plan deletion completed');
      
      // 削除後は管理タブに切り替え
      setActiveTab('manage');
      
      // savedPlansを更新（削除されたプランを除外）
      setSavedPlans(prev => prev.filter(p => p.id !== plan.id));
    } catch (error) {
      console.error('[PlanNameEditModal] Failed to delete plan:', error);
      alert('プランの削除に失敗しました。もう一度お試しください。');
      setShowDeleteConfirm(false);
    }
  };

  const handlePlanSelect = async (selectedPlan: TravelPlan | PlanListItem) => {
    const { user } = useAuthStore.getState();
    if (!user) return;
    
    try {
      // ServiceContainerから取得
      const coordinator = getPlanCoordinator();
      
      // Coordinatorを通じてプランを切り替え
      await coordinator.switchPlan(user.uid, selectedPlan.id);
      
      onClose();
    } catch (error) {
      console.error('[PlanNameEditModal] Failed to switch plan:', error);
      alert('プランの切り替えに失敗しました。もう一度お試しください。');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && activeTab === 'edit') {
      save();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const togglePlanSelection = (planId: string) => {
    setSelectedPlanIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(planId)) {
        newSet.delete(planId);
      } else {
        newSet.add(planId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPlanIds.size === savedPlans.length) {
      setSelectedPlanIds(new Set());
    } else {
      setSelectedPlanIds(new Set(savedPlans.map(p => p.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedPlanIds.size === 0) return;
    setShowBulkDeleteConfirm(true);
  };
  
  const confirmBulkDelete = async () => {
    setShowBulkDeleteConfirm(false);
    
    const { user } = useAuthStore.getState();
    if (!user) return;
    
    try {
      const coordinator = getPlanCoordinator();
      const planService = coordinator.getPlanService();
      
      // 削除処理を並行実行
      const deletePromises = Array.from(selectedPlanIds).map(planId => 
        planService.deletePlan(user.uid, planId)
      );
      
      await Promise.all(deletePromises);
      
      // プランリストを更新
      await usePlanListStore.getState().refreshPlans();
      
      // 削除後の処理
      const remainingPlans = savedPlans.filter(p => !selectedPlanIds.has(p.id));
      setSavedPlans(remainingPlans);
      
      if (remainingPlans.length > 0) {
        // アクティブプランが削除された場合、最初のプランをアクティブに
        if (plan && selectedPlanIds.has(plan.id)) {
          await coordinator.switchPlan(user.uid, remainingPlans[0].id);
        }
      } else {
        // 全プラン削除の場合、新規プラン作成
        await coordinator.createNewPlan(user.uid, '新しいプラン');
      }
      
      // UI状態をリセット
      setSelectedPlanIds(new Set());
      setIsDeleteMode(false);
      
    } catch (error) {
      console.error('[PlanNameEditModal] Failed to delete plans:', error);
      alert('プランの削除に失敗しました');
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
          <h2 className="headline text-system-label">
            {isNewPlan ? '新しいプランの作成' : 'プラン管理'}
          </h2>
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
          plan ? (
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
                placeholder={isNewPlan ? '例: 沖縄旅行2024' : '例: 東京旅行'}
                autoFocus={isNewPlan}
                maxLength={50}
              />
              <div className="text-right">
                <span className="caption-1 text-system-tertiary-label">
                  {name.length}/50
                </span>
              </div>
              {isNewPlan && (
                <p className="text-sm text-gray-500 mt-2">
                  わかりやすいプラン名を付けると、後で見つけやすくなります
                </p>
              )}
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
                    {plan?.updatedAt.toLocaleDateString('ja-JP')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-system-secondary-label">プランが選択されていません</p>
              <p className="text-system-tertiary-label text-sm mt-2">管理タブから既存のプランを選択するか、新しいプランを作成してください</p>
            </div>
          )
        ) : (
          <div className="space-y-4">
            {/* 削除モード切り替えボタン */}
            <div className="flex justify-between items-center mb-3">
              <button
                onClick={() => {
                  setIsDeleteMode(!isDeleteMode);
                  setSelectedPlanIds(new Set());
                }}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isDeleteMode 
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                    : 'bg-coral-100 text-coral-700 hover:bg-coral-200'
                }`}
              >
                {isDeleteMode ? (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    <span>キャンセル</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <path d="M9 11l3 3L22 4"/>
                    </svg>
                    <span>複数選択</span>
                  </>
                )}
              </button>
              
              {isDeleteMode && (
                <button
                  onClick={toggleSelectAll}
                  className="text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors duration-150"
                >
                  {selectedPlanIds.size === savedPlans.length ? '全解除' : '全選択'}
                </button>
              )}
            </div>
            
            {/* プラン操作ボタン */}
            {!isDeleteMode && (
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
            )}

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
                        plan && savedPlan.id === plan.id 
                          ? 'bg-coral-500/10 border border-coral-500/20' 
                          : 'hover:bg-system-secondary-background'
                      } ${
                        isDeleteMode && selectedPlanIds.has(savedPlan.id)
                          ? 'bg-red-50 border-red-200'
                          : ''
                      }`}
                      onClick={() => !isDeleteMode ? handlePlanSelect(savedPlan) : togglePlanSelection(savedPlan.id)}
                    >
                      <div className="flex items-center justify-between">
                        {/* チェックボックス（削除モード時のみ表示） */}
                        {isDeleteMode && (
                          <div className="mr-3">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-150 ${
                              selectedPlanIds.has(savedPlan.id)
                                ? 'bg-coral-500 border-coral-500'
                                : 'border-system-separator hover:border-coral-300'
                            }`}>
                              {selectedPlanIds.has(savedPlan.id) && (
                                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <path d="M20 6L9 17l-5-5"/>
                                </svg>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="subheadline font-medium text-system-label truncate">
                            {savedPlan.name}
                          </h4>
                          <p className="caption-1 text-system-secondary-label mt-1">
                            {'places' in savedPlan ? `${savedPlan.places.length}地点 • ¥${savedPlan.totalCost.toLocaleString()}` : `${(savedPlan as PlanListItem).placeCount}地点 • ¥${(savedPlan as PlanListItem).totalCost.toLocaleString()}`}
                          </p>
                        </div>
                        {!isDeleteMode && plan && savedPlan.id === plan.id && (
                          <div className="w-2 h-2 bg-coral-500 rounded-full ml-2 flex-shrink-0"></div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 削除ボタン */}
            <div className="pt-2 border-t border-system-separator">
              {isDeleteMode && selectedPlanIds.size > 0 ? (
                <button 
                  className="btn-primary w-full bg-red-500 hover:bg-red-600 active:bg-red-700 shadow-red-500/25"
                  onClick={handleBulkDelete}
                >
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"/>
                    </svg>
                    <span>選択した{selectedPlanIds.size}件を削除</span>
                  </span>
                </button>
              ) : (
                !isDeleteMode && plan && (
                  <button 
                    className="w-full py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150 font-medium"
                    onClick={handleDelete}
                  >
                    このプランを削除
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* ボタン */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-white/20">
          <button 
            className="btn-text text-system-secondary-label hover:text-system-label" 
            onClick={async () => {
              // 新規作成時に名前が入力されていない場合の処理
              if (isNewPlan && name.trim() === '' && plan) {
                if (confirm('プラン名が入力されていません。このプランを削除しますか？')) {
                  try {
                    const { user } = useAuthStore.getState();
                    if (user) {
                      const coordinator = getPlanCoordinator();
                      await coordinator.deletePlan(user.uid, plan.id);
                    }
                  } catch (error) {
                    console.error('[PlanNameEditModal] Failed to delete empty plan:', error);
                  }
                }
              }
              setIsNewPlan(false);
              onClose();
            }}
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
                「{plan?.name}」を削除しますか？<br/>
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
      
      {/* 複数削除確認ダイアログ */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1002] flex items-center justify-center p-4
                       animate-modal-fade-in">
          <div className="glass-effect rounded-2xl w-full max-w-sm p-6 text-center space-y-5
                         shadow-[0_32px_64px_0_rgba(0,0,0,0.4)]
                         animate-modal-zoom-in">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v4m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
              </svg>
            </div>
            <div>
              <h3 className="title-3 text-system-label mb-2">プランを削除</h3>
              <p className="body text-system-secondary-label">
                {selectedPlanIds.size === 1 
                  ? '選択したプランを削除しますか？'
                  : `${selectedPlanIds.size}件のプランを削除しますか？`
                }
              </p>
              <p className="footnote text-system-tertiary-label mt-2">
                この操作は取り消せません。
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button 
                className="btn-secondary flex-1" 
                onClick={() => setShowBulkDeleteConfirm(false)}
              >
                キャンセル
              </button>
              <button 
                className="btn-primary flex-1 bg-red-500 hover:bg-red-600 active:bg-red-700"
                onClick={confirmBulkDelete}
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