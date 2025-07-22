import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { enableIndexedDbPersistence, getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY as string,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FB_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FB_MSG_SENDER_ID as string,
  appId: import.meta.env.VITE_FB_APP_ID as string,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
// デフォルトはasia-northeast1 (環境変数で上書き可能)
const functionsRegion = (import.meta.env.VITE_FB_FUNCTIONS_REGION as string) || 'asia-northeast1';
export const functions = getFunctions(app, functionsRegion);

// オフラインキャッシュを有効化（エラーは無視）
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch(() => {
    // すでに有効化済み、または複数タブ競合などのケースは無視
  });
} 

console.log('Firebase Config 👉', firebaseConfig);