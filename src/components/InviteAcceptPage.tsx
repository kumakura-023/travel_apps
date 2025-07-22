import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../hooks/useAuth';

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
        const functions = getFunctions();
        const acceptInviteToken = httpsCallable(functions, 'acceptInviteToken');
        const result = await acceptInviteToken({ token });
        const data = result.data as { success?: boolean; alreadyMember?: boolean; planId?: string };
        if (data.alreadyMember) {
          setStatus('already');
          setMessage('すでにこのプランのメンバーです。');
          setTimeout(() => navigate('/', { replace: true }), 2000);
        } else if (data.success) {
          setStatus('success');
          setMessage('プランに参加しました！');
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
    await signIn();
  };

  return (
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
        {status === 'success' && <div className="text-green-600 font-bold">{message}</div>}
        {status === 'already' && <div className="text-blue-600 font-bold">{message}</div>}
        {status === 'error' && <div className="text-red-500 font-bold">{message}</div>}
      </div>
    </div>
  );
};

export default InviteAcceptPage; 