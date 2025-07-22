import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface InviteUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId?: string;
}

const InviteUrlModal: React.FC<InviteUrlModalProps> = ({ isOpen, onClose, planId }) => {
  const [inviteUrl, setInviteUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!planId) return;
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const functions = getFunctions();
      const generateInviteToken = httpsCallable(functions, 'generateInviteToken');
      const result = await generateInviteToken({ planId });
      const data = result.data as { inviteToken: string };
      const url = `${window.location.origin}/invite/${data.inviteToken}`;
      setInviteUrl(url);
    } catch (e: any) {
      setError(e.message || 'URL生成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  React.useEffect(() => {
    if (isOpen && planId) {
      handleGenerate();
    } else {
      setInviteUrl('');
      setError(null);
      setCopied(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, planId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000] flex items-center justify-center p-4 animate-modal-fade-in" onClick={onClose}>
      <div className="glass-effect rounded-2xl w-full max-w-md p-6 space-y-5 shadow-[0_32px_64px_0_rgba(0,0,0,0.4)] animate-modal-zoom-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
          </div>
          <h2 className="headline text-system-label">URLで招待</h2>
        </div>
        <div className="space-y-3">
          <p className="body text-system-secondary-label">このURLを共有すると、他のユーザーがプランに参加できます。</p>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {loading ? (
            <div className="text-center text-system-secondary-label">生成中...</div>
          ) : inviteUrl ? (
            <div className="flex flex-col items-center space-y-2">
              <input type="text" value={inviteUrl} readOnly className="input w-full text-center" />
              <button className="btn-system w-full" onClick={handleCopy}>
                {copied ? 'コピーしました！' : 'URLをコピー'}
              </button>
            </div>
          ) : null}
        </div>
        <div className="flex justify-end mt-6">
          <button className="btn-text text-system-secondary-label hover:text-system-label" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
};

export default InviteUrlModal; 