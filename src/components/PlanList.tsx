import React from 'react';
import { getAllPlans, setActivePlan, savePlan } from '../services/storageService';
import { TravelPlan } from '../types';
import { usePlacesStore } from '../store/placesStore';
import { useLabelsStore } from '../store/labelsStore';
import { usePlanStore } from '../store/planStore';

interface PlanListProps {
  onSelect?: () => void;
}

/**
 * 保存済みプランの一覧を表示するコンポーネント
 */
const PlanList: React.FC<PlanListProps> = ({ onSelect }) => {
  const [plans, setPlans] = React.useState<TravelPlan[]>([]);

  React.useEffect(() => {
    setPlans(getAllPlans());
  }, []);

  const handleSelect = (plan: TravelPlan) => {
    const setPlanStore = usePlanStore.getState().setPlan;
    setPlanStore(plan);
    // 他ストアへ反映
    usePlacesStore.setState({ places: plan.places });
    useLabelsStore.setState({ labels: plan.labels });
    setActivePlan(plan.id);
    savePlan({ ...plan, isActive: true });
    if (onSelect) onSelect();
  };

  if (plans.length === 0) {
    return <p className="text-gray-500 text-sm">保存されたプランはありません。</p>;
  }

  return (
    <ul className="space-y-2">
      {plans.map((p) => (
        <li key={p.id} className="border rounded p-2 hover:bg-gray-50 cursor-pointer" onClick={() => handleSelect(p)}>
          <div className="font-semibold text-sm">{p.name}</div>
          <div className="text-xs text-gray-500">{p.places.length} 地点 • {p.totalCost.toLocaleString()} 円</div>
        </li>
      ))}
    </ul>
  );
};

export default PlanList; 