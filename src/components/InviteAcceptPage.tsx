import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useAuth, isInAppBrowser } from '../hooks/useAuth';
import { useBrowserPromptStore } from '../store/browserPromptStore';
import { setActivePlan } from '../services/storageService';
import { getPlanCoordinator } from '../services/ServiceContainer';
import ExternalBrowserPrompt from './ExternalBrowserPrompt';

const INVITE_TOKEN_KEY = 'pending_invite_token';

const InviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const storedToken = token || localStorage.getItem(INVITE_TOKEN_KEY) || undefined;
  const navigate = useNavigate();
  const { user, isInitializing, signIn } = useAuth();
  const [status, setStatus] = useState<'pending' | 'success' | 'error' | 'already' | 'auth'>('pending');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isInitializing) return;
    if (!storedToken) {
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
        const result = await acceptInviteToken({ token: storedToken });
        const data = result.data as { success?: boolean; alreadyMember?: boolean; planId?: string };
        
        if (data.alreadyMember || data.success) {
          setStatus(data.alreadyMember ? 'already' : 'success');
          setMessage(data.alreadyMember ? 'すでにこのプランのメンバーです。' : 'プランに参加しました！');
          
          // アクティブプランを設定
          if (data.planId) {
            setActivePlan(data.planId);
            
            // 新しいプランを読み込む - 通常のアプリ初期化フローを再実行
            try {
              console.log('[InviteAcceptPage] プラン参加後の初期化を開始:', data.planId);
              
              // PlanCoordinatorを取得して通常の初期化フローを実行
              const coordinator = getPlanCoordinator();
              
              // クリーンアップしてから再初期化
              coordinator.cleanup();
              
              // 少し待機してから初期化
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // 通常の初期化フローを実行（アクティブプランの自動読み込み）
              await coordinator.initialize(user.uid);
              
              console.log('[InviteAcceptPage] プラン初期化完了');
              
              // 成功メッセージの表示を延長
              setMessage(data.alreadyMember ? 'プランに参加済みです。アプリに移動します...' : 'プランに参加しました！アプリに移動します...');
              
            } catch (error) {
              console.error('プランの初期化に失敗しました:', error);
              setMessage('プランの読み込みに失敗しました');
            }
          }
          
          localStorage.removeItem(INVITE_TOKEN_KEY);
          setTimeout(() => navigate('/', { replace: true }), 2000);
        } else {
          setStatus('error');
          setMessage('参加処理に失敗しました');
          localStorage.removeItem(INVITE_TOKEN_KEY);
        }
      } catch (e: any) {
        setStatus('error');
        setMessage(e.message || '参加処理に失敗しました');
        localStorage.removeItem(INVITE_TOKEN_KEY);
      }
    };
    accept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isInitializing, storedToken]);

  const handleLogin = async () => {
    if (isInAppBrowser()) {
      useBrowserPromptStore.getState().setShowExternalBrowserPrompt(true);
      return;
    }
    if (token) {
      localStorage.setItem(INVITE_TOKEN_KEY, token);
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