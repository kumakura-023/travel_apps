import React from 'react';
import { useAuthStore } from '../hooks/useAuth';
import { FaUserCircle } from 'react-icons/fa';

const AuthButton: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const signIn = useAuthStore((s) => s.signIn);
  const signOut = useAuthStore((s) => s.signOut);

  const handleClick = async () => {
    if (user) {
      // ログアウトの確認ダイアログなどをここに追加可能
      await signOut();
    } else {
      await signIn();
    }
  };

  return (
    <button
      onClick={handleClick}
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
  );
};

export default AuthButton; 