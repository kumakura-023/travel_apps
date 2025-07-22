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
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000] flex items-center justify-center p-4
                 animate-modal-fade-in"
      onClick={onClose}
    >
      <div 
        className="glass-effect rounded-2xl w-full max-w-md p-6 space-y-5 
                   shadow-[0_32px_64px_0_rgba(0,0,0,0.4)] 
                   animate-modal-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
          </div>
          <h2 className="headline text-system-label">プランを共有する</h2>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <p className="body text-system-secondary-label">
            招待したいユーザーのメールアドレスを入力してください。
          </p>
          <input 
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="input w-full"
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-between mt-6 space-x-2">
          <button 
            className="btn-text text-system-secondary-label hover:text-system-label flex-1" 
            onClick={onClose}
          >
            キャンセル
          </button>
          <button 
            className="btn-primary min-w-[100px] flex-1 disabled:opacity-50 disabled:cursor-not-allowed" 
            onClick={handleShare}
            disabled={!email}
          >
            招待する
          </button>
        </div>
        <div className="mt-4 text-center">
          <button
            className="btn-system w-full"
            onClick={onInviteUrlClick}
            type="button"
          >
            <span className="body">URLで招待</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SharePlanModal;