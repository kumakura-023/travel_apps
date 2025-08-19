import React, { useState, useRef } from "react";
import { useAuthStore } from "../hooks/useAuth";
import { FaUserCircle } from "react-icons/fa";
import SharePlanModal from "./SharePlanModal";
import InviteUrlModal from "./InviteUrlModal";
import { usePlanStore } from "../store/planStore";

const AuthButton: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const signIn = useAuthStore((s) => s.signIn);
  const signOut = useAuthStore((s) => s.signOut);
  const { plan } = usePlanStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [inviteUrlModalOpen, setInviteUrlModalOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleMenuToggle = () => setMenuOpen((v) => !v);

  const handleLoginLogout = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (user) {
      await signOut();
    } else {
      await signIn();
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    setTimeout(() => setShareModalOpen(true), 0);
  };
  const handleInviteUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    setTimeout(() => setInviteUrlModalOpen(true), 0);
  };

  // メニュー外クリックで閉じる
  React.useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        !btnRef.current?.contains(e.target as Node) &&
        !menuRef.current?.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <>
      <div className="relative">
        <button
          ref={btnRef}
          onClick={handleMenuToggle}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium text-system-label hover:text-coral-600 transition-all duration-200 ease-out hover:scale-105 active:scale-95"
          aria-label={
            user ? `アカウント: ${user.displayName}` : "Googleでログイン"
          }
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
        </button>
        {menuOpen && (
          <div
            ref={menuRef}
            className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg z-[2000] py-2 border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full text-left px-4 py-3 hover:bg-gray-100 text-system-label"
              onClick={handleLoginLogout}
            >
              {user ? "ログアウト" : "Googleでログイン"}
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
      </div>
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
