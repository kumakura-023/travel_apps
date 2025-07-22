import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import ModalPortal from './ModalPortal';

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
      try {
        const textarea = document.createElement('textarea');
        textarea.value = inviteUrl;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        setCopied(false);
      }
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
    <ModalPortal>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000] flex justify-center items-center p-4 animate-modal-fade-in" onClick={onClose}>
        <div className="glass-effect rounded-xl w-auto max-w-md min-w-[280px] mx-auto p-6 md:p-8 space-y-6 shadow-elevation-5 animate-modal-zoom-in flex flex-col" onClick={e => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="modal-header mb-4 flex items-center space-x-3">
          <div className="modal-header-icon">
            <svg className="w-5 h-5 text-coral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
          </div>
          <h2 className="modal-header-title">URLで招待</h2>
        </div>
        {/* 本文 */}
        <div className="space-y-4 text-center">
          <p className="body text-system-secondary-label whitespace-normal">
            このURLを共有すると、他のユーザーがプランに参加できます。
          </p>
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          {loading ? (
            <div className="text-center text-system-secondary-label">生成中...</div>
          ) : inviteUrl ? (
            <div className="flex flex-col items-center space-y-2">
              <input type="text" value={inviteUrl} readOnly className="input text-center" onClick={e => (e.currentTarget as HTMLInputElement).select()} />
            </div>
          ) : null}
        </div>
        {/* ボタン */}
        <div className="flex flex-row justify-end gap-3 pt-6">
          <button className="btn-text" onClick={onClose}>閉じる</button>
          <button className="btn-primary min-w-[100px]" onClick={handleCopy} disabled={!inviteUrl}>
            {copied ? 'コピーしました！' : 'URLをコピー'}
          </button>
        </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default InviteUrlModal; 