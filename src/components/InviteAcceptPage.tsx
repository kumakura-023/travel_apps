import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useAuth, useAuthStore, isInAppBrowser } from '../hooks/useAuth';
import { usePlanStore } from '../store/planStore';
import { usePlacesStore } from '../store/placesStore';
import { useLabelsStore } from '../store/labelsStore';
import { useBrowserPromptStore } from '../store/browserPromptStore';
import { setActivePlan } from '../services/storageService';
import ExternalBrowserPrompt from './ExternalBrowserPrompt';

const InviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, isInitializing, signIn } = useAuth();
  const [status, setStatus] = useState<'pending' | 'success' | 'error' | 'already' | 'auth'>('pending');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isInitializing) return;
    if (!token) {
      setStatus('error');
      setMessage('招待トークンが無効です');
      return;
    }
    if (!user) {
      setStatus('auth');
      return;
    }
    const accept = async () => {
      setStatus('pending');
      setMessage('プランに参加しています...');
      try {
        const acceptInviteToken = httpsCallable(functions, 'acceptInviteToken');
        const result = await acceptInviteToken({ token });
        const data = result.data as { success?: boolean; alreadyMember?: boolean; planId?: string };
        
        if (data.alreadyMember || data.success) {
          setStatus(data.alreadyMember ? 'already' : 'success');
          setMessage(data.alreadyMember ? 'すでにこのプランのメンバーです。' : 'プランに参加しました！');
          
          // プランストアの状態をクリア
          usePlanStore.getState().unsubscribeFromPlan();
          usePlanStore.getState().setPlan(null);
          usePlacesStore.setState({ places: [] });
          useLabelsStore.setState({ labels: [] });
          
          // アクティブプランを設定
          if (data.planId) {
            setActivePlan(data.planId);
            
            // 新しいプランを読み込む
            try {
              const { loadPlanById } = await import('../services/planCloudService');
              const loadedPlan = await loadPlanById(user.uid, data.planId);
              if (loadedPlan) {
                if (import.meta.env.DEV) {
                  console.log('🎉 招待参加後プラン読み込み成功:', {
                    planId: loadedPlan.id,
                    planName: loadedPlan.name,
                    placesCount: loadedPlan.places.length,
                    labelsCount: loadedPlan.labels.length,
                    members: loadedPlan.members
                  });
                }
                usePlanStore.getState().setPlan(loadedPlan);
                usePlacesStore.setState({ places: loadedPlan.places });
                useLabelsStore.setState({ labels: loadedPlan.labels });
              } else {
                console.error('プランの読み込みに失敗: プランが見つかりません');
              }
            } catch (error) {
              console.error('プランの読み込みに失敗しました:', error);
            }
          }
          
          setTimeout(() => navigate('/', { replace: true }), 2000);
        } else {
          setStatus('error');
          setMessage('参加処理に失敗しました');
        }
      } catch (e: any) {
        setStatus('error');
        setMessage(e.message || '参加処理に失敗しました');
      }
    };
    accept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isInitializing, token]);

  const handleLogin = async () => {
    if (isInAppBrowser()) {
      useBrowserPromptStore.getState().setShowExternalBrowserPrompt(true);
      return;
    }
    await signIn();
  };

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center bg-white z-[2000]">
        <div className="glass-effect rounded-2xl max-w-md w-full p-8 shadow-lg text-center space-y-6">
        <h2 className="headline text-system-label">プランに参加</h2>
        {status === 'pending' && <div className="text-system-secondary-label">{message || '処理中...'}</div>}
        {status === 'auth' && (
          <>
            <div className="text-system-secondary-label mb-4">プランに参加するにはログインが必要です。</div>
            <button className="btn-primary w-full" onClick={handleLogin}>Googleでログイン</button>
          </>
        )}
        {status === 'success' && (
          <div className="text-system-secondary-label">{message}</div>
        )}
        {status === 'already' && (
          <div className="text-system-secondary-label">{message}</div>
        )}
        {status === 'error' && (
          <div className="text-system-secondary-label text-red-500">{message}</div>
        )}
        </div>
      </div>
      <ExternalBrowserPrompt />
    </>
  );
};

export default InviteAcceptPage; 