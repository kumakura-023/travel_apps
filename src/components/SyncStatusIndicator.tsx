import React from 'react';
import { useAutoSave } from '../hooks/useAutoSave';
import { usePlanStore } from '../store/planStore';
import { usePlacesStore } from '../store/placesStore';
import { useLabelsStore } from '../store/labelsStore';
import { FaCloudUploadAlt, FaCloud, FaExclamationTriangle } from 'react-icons/fa';

const SyncStatusIndicator: React.FC = () => {
  const plan = usePlanStore((s) => s.plan);
  const places = usePlacesStore((s) => s.places);
  const labels = useLabelsStore((s) => s.labels);

  const mergedPlan = React.useMemo(() => {
    if (!plan) return null;
    return {
      ...plan,
      places,
      labels,
      totalCost: places.reduce((sum, p) => sum + (p.estimatedCost || 0), 0),
    };
  }, [plan, places, labels]);

  const { isSaving, isSynced } = useAutoSave(mergedPlan);

  const isOffline = !navigator.onLine;

  const icon = isOffline ? (
    <FaExclamationTriangle className="text-yellow-500" />
  ) : isSaving ? (
    <FaCloudUploadAlt className="animate-spin" />
  ) : isSynced ? (
    <FaCloud className="text-green-500" />
  ) : (
    <FaCloudUploadAlt className="text-gray-400" />
  );

  const title = isOffline
    ? 'オフライン'
    : isSaving
    ? '同期中...'
    : isSynced
    ? '同期済み'
    : 'ローカル保存のみ';

  return (
    <div
      className="fixed top-3 right-3 z-50 glass-effect rounded-full p-2 shadow-elevation-2 bg-white/80"
      title={title}
    >
      {icon}
    </div>
  );
};

export default SyncStatusIndicator; 