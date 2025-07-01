import React, { useState, useEffect } from 'react';
import { usePlanStore } from '../store/planStore';
import { savePlan } from '../services/storageService';

interface PlanEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PlanEditModal: React.FC<PlanEditModalProps> = ({ isOpen, onClose }) => {
  const { plan, updatePlan } = usePlanStore();
  const [name, setName] = useState('');
  const todayStr = new Date().toISOString().substring(0,10);
  const [start, setStart] = useState(todayStr);
  const [end, setEnd] = useState(todayStr);

  useEffect(() => {
    if (plan) {
      setName(plan.name);
      setStart(plan.startDate ? plan.startDate.toISOString().substring(0, 10) : todayStr);
      setEnd(plan.endDate ? plan.endDate.toISOString().substring(0, 10) : todayStr);
    }
  }, [plan, isOpen]);

  if (!isOpen || !plan) return null;

  const save = () => {
    updatePlan({
      name,
      startDate: start ? new Date(start) : null,
      endDate: end ? new Date(end) : null,
    });
    savePlan({ ...plan, name, startDate: start ? new Date(start) : null, endDate: end ? new Date(end) : null });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000] flex items-center justify-center p-4
                 animate-modal-fade-in"
      onClick={onClose}
    >
      <div 
        className="glass-effect rounded-2xl w-full max-w-sm p-6 space-y-5 
                   shadow-[0_32px_64px_0_rgba(0,0,0,0.4)] 
                   animate-modal-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="headline text-center text-system-label">プラン編集</h2>
        
        <div className="space-y-4">
          <div>
            <label className="subheadline block mb-2 text-system-label">プラン名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="プラン名を入力"
            />
          </div>
          
          <div>
            <label className="subheadline block mb-2 text-system-label">出発日</label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="input"
            />
          </div>
          
          <div>
            <label className="subheadline block mb-2 text-system-label">帰宅日</label>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="input"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-white/20">
          <button 
            className="btn-text text-system-secondary-label hover:text-system-label" 
            onClick={onClose}
          >
            キャンセル
          </button>
          <button 
            className="btn-primary min-w-[80px]" 
            onClick={save}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanEditModal; 