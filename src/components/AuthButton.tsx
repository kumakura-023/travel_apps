import React, { useState, useRef } from 'react';
import { useAuthStore } from '../hooks/useAuth';
import { FaUserCircle } from 'react-icons/fa';
import SharePlanModal from './SharePlanModal';
import InviteUrlModal from './InviteUrlModal';
import { usePlanStore } from '../store/planStore';

const AuthButton: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const signIn = useAuthStore((s) => s.signIn);
  const signOut = useAuthStore((s) => s.signOut);
  const { plan } = usePlanStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [inviteUrlModalOpen, setInviteUrlModalOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleMenuToggle = () => setMenuOpen((v) => !v);
  const handleMenuClose = () => setMenuOpen(false);

  const handleLoginLogout = async () => {
    handleMenuClose();
    if (user) {
      await signOut();
    } else {
      await signIn();
    }
  };

  const handleShare = () => {
    setMenuOpen(false);
    setTimeout(() => setShareModalOpen(true), 0);
  };
  const handleInviteUrl = () => {
    setMenuOpen(false);
    setTimeout(() => setInviteUrlModalOpen(true), 0);
  };

  // メニュー外クリックで閉じる
  React.useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!btnRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleMenuToggle}
        className="glass-effect flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-system-label hover:bg-gray-100/50 transition-colors duration-150"
        aria-label={user ? `アカウント: ${user.displayName}` : 'Googleでログイン'}
      >
        {user && user.photoURL ? (
          <img
            src={user.photoURL}
            alt="ユーザーアイコン"
            className="w-6 h-6 rounded-full border-2 border-white/50"
          />
        ) : (
          <FaUserCircle className="w-6 h-6 text-gray-400" />
        )}
        <span className="hidden md:inline">
          {user ? user.displayName || 'アカウント' : 'ログイン'}
        </span>
      </button>
      {menuOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg z-[2000] py-2 border border-gray-200">
          <button
            className="w-full text-left px-4 py-3 hover:bg-gray-100 text-system-label"
            onClick={handleLoginLogout}
          >
            {user ? 'ログアウト' : 'Googleでログイン'}
          </button>
          <button
            className="w-full text-left px-4 py-3 hover:bg-gray-100 text-system-label"
            onClick={handleShare}
            disabled={!plan}
          >
            ほかのアカウントを招待
          </button>
          <button
            className="w-full text-left px-4 py-3 hover:bg-gray-100 text-system-label"
            onClick={handleInviteUrl}
            disabled={!plan}
          >
            URLで招待
          </button>
        </div>
      )}
      <SharePlanModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        onShare={() => {}}
        onInviteUrlClick={() => {
          setShareModalOpen(false);
          setTimeout(() => setInviteUrlModalOpen(true), 0);
        }}
      />
      <InviteUrlModal
        isOpen={inviteUrlModalOpen}
        onClose={() => setInviteUrlModalOpen(false)}
        planId={plan?.id}
      />
    </>
  );
};

export default AuthButton; 