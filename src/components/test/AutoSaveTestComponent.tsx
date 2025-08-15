import React from 'react';
import { useAutoSaveNew } from '../../hooks/useAutoSaveNew';
import { usePlanStore } from '../../store/planStore';
import { useAuthStore } from '../../hooks/useAuth';

export const AutoSaveTestComponent: React.FC = () => {
  const plan = usePlanStore((s) => s.plan);
  const user = useAuthStore((s) => s.user);
  
  const { isSaving, lastSaved, error, saveImmediate } = useAutoSaveNew(
    plan,
    user?.uid || null,
    {
      strategy: 'debounced',
      debounceMs: 2000,
      autoSave: true
    }
  );

  return (
    <div style={{ 
      position: 'fixed', 
      top: '60px', 
      right: '10px', 
      padding: '10px', 
      background: 'lightblue', 
      border: '1px solid #007acc',
      borderRadius: '4px',
      fontSize: '12px',
      zIndex: 1000
    }}>
      <h4>New AutoSave System</h4>
      <div>Status: {isSaving ? 'Saving...' : 'Idle'}</div>
      <div>Last Saved: {lastSaved ? lastSaved.toLocaleTimeString() : 'Never'}</div>
      {error && <div style={{ color: 'red' }}>Error: {error.message}</div>}
      <button onClick={saveImmediate} disabled={isSaving}>
        Save Now
      </button>
    </div>
  );
};