import React from 'react';
import { useAuthStore } from '../hooks/useAuth';
import { FaSignInAlt, FaSignOutAlt } from 'react-icons/fa';

const AuthButton: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const signIn = useAuthStore((s) => s.signIn);
  const signOut = useAuthStore((s) => s.signOut);

  const handleClick = async () => {
    if (user) {
      await signOut();
    } else {
      await signIn();
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1 text-sm text-system-secondary-label hover:text-coral-500 transition-colors"
    >
      {user ? <FaSignOutAlt /> : <FaSignInAlt />}
      <span>{user ? 'ログアウト' : 'ログイン'}</span>
    </button>
  );
};

export default AuthButton; 