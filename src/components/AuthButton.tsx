import React from 'react';
import { useAuthStore } from '../hooks/useAuth';
import { FaUserCircle } from 'react-icons/fa';

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
      aria-label={user ? 'ログアウト' : 'ログイン'}
      className="flex items-center justify-center text-system-secondary-label hover:text-coral-500 transition-colors"
    >
      {user && user.photoURL ? (
        <img
          src={user.photoURL}
          alt="ユーザーアイコン"
          className="w-8 h-8 rounded-full"
        />
      ) : (
        <FaUserCircle className="w-8 h-8" />
      )}
    </button>
  );
};

export default AuthButton; 