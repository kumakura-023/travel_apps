import { useEffect } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { create } from 'zustand';
import { auth } from '../firebase';
import { useBrowserPromptStore } from '../store/browserPromptStore';

const INVITE_TOKEN_KEY = 'pending_invite_token';

// アプリ内ブラウザを検出する関数
export const isInAppBrowser = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();

  // 代表的なSNS系アプリのUA片と一般的なWebView判定を組み合わせる
  const knownApps =
    ua.includes('line') ||
    ua.includes('instagram') ||
    ua.includes('facebook') ||
    ua.includes('fbav') ||
    ua.includes('fban') ||
    ua.includes('fb_iab') ||
    ua.includes('twitter') ||
    ua.includes('whatsapp') ||
    ua.includes('telegram') ||
    ua.includes('kakao') ||
    ua.includes('wechat');

  // Android WebView は `wv` を含むことが多い
  const isAndroidWebView = /android/.test(ua) && ua.includes('wv');

  // iOS のWebViewは Safari を含まない UA になるケースが多い
  const isIOSWebView = /iphone|ipad|ipod/.test(ua) && !ua.includes('safari');

  return knownApps || isAndroidWebView || isIOSWebView;
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

    console.log('通常のブラウザ: ポップアップ認証を試行');
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('ポップアップ認証失敗:', error);
      console.log('リダイレクト認証へフォールバック');
      try {
        await signInWithRedirect(auth, provider);
      } catch (redirectError) {
        console.error('リダイレクト認証開始に失敗:', redirectError);
        // 何らかの理由でリダイレクトが開始できなかった場合も
        // 外部ブラウザで開き直すよう案内する
        useBrowserPromptStore.getState().setShowExternalBrowserPrompt(true);
      }
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

      // If an invite token is stored and we're not already on the invite page,
      // redirect so the invitation can be processed after authentication.
      const pendingToken = u ? localStorage.getItem(INVITE_TOKEN_KEY) : null;
      if (
        u &&
        pendingToken &&
        !window.location.pathname.startsWith('/invite/')
      ) {
        window.location.assign(`/invite/${pendingToken}`);
      }
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