import { useEffect } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { create } from 'zustand';
import { auth } from '../firebase';
import { useBrowserPromptStore } from '../store/browserPromptStore';

// アプリ内ブラウザを検出する関数
const isInAppBrowser = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    userAgent.includes('line') ||
    userAgent.includes('instagram') ||
    userAgent.includes('facebook') ||
    userAgent.includes('fbav') ||
    userAgent.includes('fban') ||
    userAgent.includes('fb_iab') ||
    userAgent.includes('twitter') ||
    userAgent.includes('whatsapp') ||
    userAgent.includes('telegram') ||
    userAgent.includes('kakao') ||
    userAgent.includes('wechat')
  );
};

interface AuthState {
  user: User | null;
  isInitializing: boolean;
  setUser: (user: User | null) => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isInitializing: true,
  setUser: (user) => set({ user }),
  signIn: async () => {
    const provider = new GoogleAuthProvider();

    if (isInAppBrowser()) {
      console.log('アプリ内ブラウザを検出: 外部ブラウザ案内を表示');
      useBrowserPromptStore.getState().setShowExternalBrowserPrompt(true);
      return;
    }

    // 通常のブラウザではリダイレクト方式を使用（ポップアップの問題を回避）
    console.log('通常のブラウザ: リダイレクト認証を使用');
    try {
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error('リダイレクト認証開始に失敗:', error);
      // 何らかの理由でリダイレクトが開始できなかった場合も
      // 外部ブラウザで開き直すよう案内する
      useBrowserPromptStore.getState().setShowExternalBrowserPrompt(true);
    }
  },
  signOut: async () => {
    await firebaseSignOut(auth);
  },
}));

// フック: アプリ起動時と provider を同期
export function useAuth() {
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  useEffect(() => {
    // リダイレクト結果を処理
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('リダイレクト認証成功:', result.user.email);
        }
      } catch (error) {
        console.error('リダイレクト認証エラー:', error);
      }
    };

    // 認証状態の監視
    const unsub = onAuthStateChanged(auth, (u: User | null) => {
      setUser(u);
      useAuthStore.setState({ isInitializing: false });
    });

    // 初回起動時にリダイレクト結果を処理
    handleRedirectResult();

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    user,
    isInitializing,
    signIn: useAuthStore.getState().signIn,
    signOut: useAuthStore.getState().signOut,
  };
} 