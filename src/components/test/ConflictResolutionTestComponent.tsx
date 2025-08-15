import React, { useState } from 'react';
import { useConflictResolution } from '../../hooks/useConflictResolution';
import { useAuth } from '../../hooks/useAuth';
import { usePlanStore } from '../../store/planStore';
import { ConflictResolutionStrategy } from '../../types/ConflictResolution';

export const ConflictResolutionTestComponent: React.FC = () => {
  const { user } = useAuth();
  const { plan } = usePlanStore();
  const [strategy, setStrategy] = useState<ConflictResolutionStrategy>('merge-non-conflicting');
  const [testResult, setTestResult] = useState<string>('');

  const {
    isInitialized,
    handleRemoteChange,
    setStrategy: updateStrategy,
    getSessionInfo,
    refreshSession
  } = useConflictResolution(user?.uid || null);

  const handleStrategyChange = (newStrategy: ConflictResolutionStrategy) => {
    setStrategy(newStrategy);
    updateStrategy(newStrategy);
  };

  const handleTestConflict = () => {
    if (!plan) {
      setTestResult('プランが選択されていません');
      return;
    }

    // 模擬的な競合を作成
    const localPlan = { ...plan };
    const remotePlan = { 
      ...plan, 
      name: plan.name + '_Remote_Modified',
      description: (plan.description || '') + ' [リモートで追加された説明]',
      updatedAt: new Date(Date.now() + 1000) // 1秒後のタイムスタンプ
    };

    try {
      const result = handleRemoteChange(localPlan, remotePlan);
      
      if (result) {
        setTestResult(`
競合解決結果:
- 競合有無: ${result.hadConflicts ? 'あり' : 'なし'}
- 解決理由: ${result.resolutionLog.reason}
- 戦略: ${result.resolutionLog.strategy || 'N/A'}
- 詳細: ${result.resolutionLog.details || 'N/A'}
- 解決後プラン名: ${result.resolved.name}
        `.trim());
      } else {
        setTestResult('競合解決に失敗しました');
      }
    } catch (error) {
      setTestResult(`エラー: ${error}`);
    }
  };

  const handleShowSessionInfo = () => {
    const info = getSessionInfo();
    if (info) {
      setTestResult(`
セッション情報:
- セッションID: ${info.sessionId}
- ユーザーID: ${info.userId}
- 開始時刻: ${new Date(info.startTime).toLocaleString()}
- 経過時間: ${Math.round(info.age / 1000)}秒
- 期限切れ: ${info.isExpired ? 'はい' : 'いいえ'}
      `.trim());
    } else {
      setTestResult('セッション情報の取得に失敗しました');
    }
  };

  const handleRefreshSession = () => {
    refreshSession();
    setTestResult('セッションを更新しました');
  };

  if (!user) {
    return (
      <div style={{ 
        position: 'fixed', 
        top: '220px', 
        right: '10px', 
        padding: '10px', 
        background: 'lightyellow', 
        border: '1px solid #daa520',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 1000
      }}>
        <h4>Conflict Resolution</h4>
        <div>ログインが必要です</div>
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: '220px', 
      right: '10px', 
      padding: '10px', 
      background: 'lightyellow', 
      border: '1px solid #daa520',
      borderRadius: '4px',
      fontSize: '12px',
      zIndex: 1000,
      minWidth: '280px',
      maxWidth: '400px'
    }}>
      <h4>Conflict Resolution Test</h4>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>初期化:</strong> {isInitialized ? '✓' : '✗'}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>戦略:</strong>
        <select 
          value={strategy} 
          onChange={(e) => handleStrategyChange(e.target.value as ConflictResolutionStrategy)}
          style={{ marginLeft: '5px', fontSize: '11px' }}
        >
          <option value="last-write-wins">Last Write Wins</option>
          <option value="merge-non-conflicting">Smart Merge</option>
          <option value="user-choice">User Choice</option>
        </select>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
        <button 
          onClick={handleTestConflict}
          disabled={!isInitialized || !plan}
          style={{ 
            padding: '4px 8px', 
            fontSize: '11px',
            opacity: (isInitialized && plan) ? 1 : 0.5
          }}
        >
          競合テスト実行
        </button>
        
        <button 
          onClick={handleShowSessionInfo}
          disabled={!isInitialized}
          style={{ 
            padding: '4px 8px', 
            fontSize: '11px',
            backgroundColor: '#f0f0f0',
            opacity: isInitialized ? 1 : 0.5
          }}
        >
          セッション情報
        </button>
        
        <button 
          onClick={handleRefreshSession}
          disabled={!isInitialized}
          style={{ 
            padding: '4px 8px', 
            fontSize: '11px',
            backgroundColor: '#e0e0e0',
            opacity: isInitialized ? 1 : 0.5
          }}
        >
          セッション更新
        </button>
      </div>
      
      {testResult && (
        <div style={{ 
          marginTop: '8px',
          padding: '8px',
          backgroundColor: '#fff',
          border: '1px solid #ccc',
          borderRadius: '2px',
          fontSize: '10px',
          whiteSpace: 'pre-line',
          maxHeight: '200px',
          overflow: 'auto'
        }}>
          {testResult}
        </div>
      )}
    </div>
  );
};