import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { enableIndexedDbPersistence, getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { config } from './config/environment';

const firebaseConfig = {
  apiKey: config.firebase.apiKey,
  authDomain: config.firebase.authDomain,
  projectId: config.firebase.projectId,
  storageBucket: config.firebase.storageBucket,
  messagingSenderId: config.firebase.messagingSenderId,
  appId: config.firebase.appId,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, config.firebase.functionsRegion);

// オフラインキャッシュを有効化（エラーは無視）
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch(() => {
    // すでに有効化済み、または複数タブ競合などのケースは無視
  });
}