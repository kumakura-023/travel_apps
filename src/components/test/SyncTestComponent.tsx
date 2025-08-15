import React from 'react';
import { useSync } from '../../hooks/useSync';
import { usePlanStore } from '../../store/planStore';
import { useAuthStore } from '../../hooks/useAuth';

export const SyncTestComponent: React.FC = () => {
  const plan = usePlanStore((s) => s.plan);
  const user = useAuthStore((s) => s.user);
  
  const { isSaving, isConflicting, lastSaved, error, forceSync } = useSync(
    plan,
    user?.uid || null,
    {
      strategy: 'debounced',
      debounceMs: 2000,
      enableRealtime: true
    }
  );

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      padding: '10px', 
      background: 'white', 
      border: '1px solid #ccc',
      borderRadius: '4px',
      fontSize: '12px',
      zIndex: 1000
    }}>
      <h4>New Sync System</h4>
      <div>Status: {isSaving ? 'Saving...' : 'Idle'}</div>
      <div>Conflicts: {isConflicting ? 'Yes' : 'No'}</div>
      <div>Last Saved: {lastSaved ? lastSaved.toLocaleTimeString() : 'Never'}</div>
      {error && <div style={{ color: 'red' }}>Error: {error.message}</div>}
      <button onClick={forceSync} disabled={isSaving}>
        Force Sync
      </button>
    </div>
  );
};