import React, { useState } from 'react';

interface SharePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (email: string) => void;
  onInviteUrlClick: () => void;
}

const SharePlanModal: React.FC<SharePlanModalProps> = ({ isOpen, onClose, onShare, onInviteUrlClick }) => {
  const [email, setEmail] = useState('');

  if (!isOpen) return null;

  const handleShare = () => {
    if (email) {
      onShare(email);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000] flex justify-center items-center p-4 animate-modal-fade-in" onClick={onClose}>
      <div className="glass-effect rounded-xl w-auto max-w-md min-w-[280px] mx-auto p-6 md:p-8 space-y-6 shadow-elevation-5 animate-modal-zoom-in flex flex-col" onClick={e => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="modal-header mb-4 flex items-center space-x-3">
          <div className="modal-header-icon">
            <svg className="w-5 h-5 text-coral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
          </div>
          <h2 className="modal-header-title">メールで招待</h2>
        </div>
        {/* 本文 */}
        <div className="space-y-4 text-center">
          <p className="body text-system-secondary-label whitespace-normal">
            招待したいユーザーのメールアドレスを入力してください。
          </p>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="input"
            autoFocus
          />
        </div>
        {/* ボタン */}
        <div className="flex flex-row justify-end gap-3 pt-6">
          <button className="btn-text" onClick={onClose}>キャンセル</button>
          <button className="btn-primary min-w-[100px]" onClick={handleShare} disabled={!email}>招待する</button>
        </div>
        <div className="pt-2">
          <button className="btn-system w-full" onClick={onInviteUrlClick} type="button">
            <span className="body">URLで招待</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SharePlanModal;