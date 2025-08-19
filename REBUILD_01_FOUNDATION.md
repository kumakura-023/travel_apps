# Phase 1: 基盤構築 - 詳細実装指示

## 目標

新しいVoyageSketchの基盤となるプロジェクト構造、型定義、ストア、ルーティングを構築する。

## 実装期間

1-2週間

## 前提条件

- 既存プロジェクトの構造と問題点を理解済み
- メモ機能の同期問題の根本原因を把握済み

## タスクリスト

### 1. プロジェクト初期化とクリーンアップ

#### A. 新しいプロジェクト構造の作成

```bash
# 新しいプロジェクトディレクトリを作成
mkdir voyage-sketch-v2
cd voyage-sketch-v2

# Vite + React + TypeScriptプロジェクトを初期化
npm create vite@latest . -- --template react-ts
npm install
```

#### B. 必要なパッケージのインストール

```bash
# UI・スタイリング
npm install tailwindcss @tailwindcss/forms @tailwindcss/typography
npm install @headlessui/react @heroicons/react
npm install clsx

# 状態管理
npm install zustand immer

# 地図・場所
npm install @react-google-maps/api @googlemaps/markerclusterer
npm install @types/google.maps

# Firebase
npm install firebase

# ルーティング
npm install react-router-dom
npm install @types/react-router-dom

# ユーティリティ
npm install uuid date-fns
npm install @types/uuid

# PWA
npm install vite-plugin-pwa workbox-window

# 開発依存関係
npm install -D @types/node
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install -D prettier eslint-config-prettier eslint-plugin-prettier
```

#### C. 設定ファイルの構築

**vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/maps\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-maps-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1年
              },
              cacheKeyWillBeUsed: async ({ request }) => {
                return `${request.url}?v=1`;
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          maps: ["@react-google-maps/api", "@googlemaps/markerclusterer"],
          utils: ["zustand", "uuid", "date-fns"],
          firebase: ["firebase/app", "firebase/firestore", "firebase/auth"],
        },
      },
    },
  },
});
```

**tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff6ff",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        gray: {
          50: "#f9fafb",
          100: "#f3f4f6",
          900: "#111827",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")],
};
```

### 2. ディレクトリ構造の構築

```bash
mkdir -p src/{components,hooks,stores,services,types,utils}
mkdir -p src/components/{map,places,plans,routes,memo,shared}
mkdir -p src/hooks/{map,places,plans,sync}
mkdir -p src/services/{sync,api,core}
```

### 3. 基本型定義の作成

#### A. コア型定義 (`src/types/core.ts`)

```typescript
// 基本的なエンティティ
export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Place {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId?: string; // Google Places API ID
  category: PlaceCategory;
  memo: string;
  cost?: number;
  rating?: number;
  photos?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface Plan {
  id: string;
  title: string;
  description: string;
  places: Place[];
  startDate?: Date;
  endDate?: Date;
  isPublic: boolean;
  members: PlanMember[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // 同期システム用メタデータ
  lastOperationId?: string;
  lastOperatorId?: string;
}

export interface PlanMember {
  userId: string;
  role: "owner" | "editor" | "viewer";
  joinedAt: Date;
}

export interface Route {
  id: string;
  planId: string;
  fromPlaceId: string;
  toPlaceId: string;
  travelMode: "DRIVING" | "WALKING" | "TRANSIT" | "BICYCLING";
  duration?: number; // 秒
  distance?: number; // メートル
  polyline?: string;
  createdAt: Date;
}

export type PlaceCategory =
  | "restaurant"
  | "hotel"
  | "attraction"
  | "shopping"
  | "transport"
  | "other";
```

#### B. 同期システム型定義 (`src/types/sync.ts`)

```typescript
// 新しい同期システムの型定義（問題解決版）
export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  userId: string;
  timestamp: number;
  planId: string;
  data: any;
  status: "pending" | "completed" | "failed";
}

export type SyncOperationType =
  | "memo_update"
  | "place_add"
  | "place_update"
  | "place_delete"
  | "plan_update"
  | "route_update";

export interface SyncState {
  isOnline: boolean;
  pendingOperations: SyncOperation[];
  lastSyncTime: number;
  conflictResolution: "local_wins" | "remote_wins" | "merge";
}

// UI状態とクラウド状態の分離
export interface MemoState {
  // UI状態（即座反映）
  localValue: string;
  // 同期状態
  syncedValue: string;
  // メタデータ
  lastLocalUpdate: number;
  lastSyncUpdate: number;
  isLocalDirty: boolean;
  isSyncing: boolean;
}
```

#### C. API型定義 (`src/types/api.ts`)

```typescript
// Google Maps API関連
export interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  rating?: number;
  photos?: google.maps.places.PlacePhoto[];
}

// Firebase関連
export interface FirestorePlan {
  id: string;
  title: string;
  description: string;
  places: FirestorePlace[];
  startDate?: firebase.firestore.Timestamp;
  endDate?: firebase.firestore.Timestamp;
  isPublic: boolean;
  members: PlanMember[];
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
  createdBy: string;
  lastOperationId?: string;
  lastOperatorId?: string;
}

export interface FirestorePlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
  category: PlaceCategory;
  memo: string;
  cost?: number;
  rating?: number;
  photos?: string[];
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
  createdBy: string;
}
```

### 4. 基本ストアの構築

#### A. 認証ストア (`src/stores/authStore.ts`)

```typescript
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { User } from "@/types/core";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  immer((set) => ({
    // State
    user: null,
    isLoading: true,
    error: null,

    // Actions
    setUser: (user) =>
      set((state) => {
        state.user = user;
      }),

    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),

    clearError: () =>
      set((state) => {
        state.error = null;
      }),
  })),
);
```

#### B. プランストア (`src/stores/planStore.ts`)

```typescript
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Plan, Place } from "@/types/core";

interface PlanState {
  currentPlan: Plan | null;
  plans: Plan[];
  isLoading: boolean;
  error: string | null;
}

interface PlanActions {
  setCurrentPlan: (plan: Plan | null) => void;
  setPlans: (plans: Plan[]) => void;
  addPlan: (plan: Plan) => void;
  updatePlan: (planId: string, updates: Partial<Plan>) => void;
  deletePlan: (planId: string) => void;

  // 場所関連
  addPlace: (planId: string, place: Place) => void;
  updatePlace: (
    planId: string,
    placeId: string,
    updates: Partial<Place>,
  ) => void;
  deletePlace: (planId: string, placeId: string) => void;

  // ユーティリティ
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const usePlanStore = create<PlanState & PlanActions>()(
  immer((set, get) => ({
    // State
    currentPlan: null,
    plans: [],
    isLoading: false,
    error: null,

    // Actions
    setCurrentPlan: (plan) =>
      set((state) => {
        state.currentPlan = plan;
      }),

    setPlans: (plans) =>
      set((state) => {
        state.plans = plans;
      }),

    addPlan: (plan) =>
      set((state) => {
        state.plans.push(plan);
      }),

    updatePlan: (planId, updates) =>
      set((state) => {
        const index = state.plans.findIndex((p) => p.id === planId);
        if (index !== -1) {
          Object.assign(state.plans[index], updates);
        }
        if (state.currentPlan?.id === planId) {
          Object.assign(state.currentPlan, updates);
        }
      }),

    deletePlan: (planId) =>
      set((state) => {
        state.plans = state.plans.filter((p) => p.id !== planId);
        if (state.currentPlan?.id === planId) {
          state.currentPlan = null;
        }
      }),

    // 場所関連
    addPlace: (planId, place) =>
      set((state) => {
        const plan = state.plans.find((p) => p.id === planId);
        if (plan) {
          plan.places.push(place);
          plan.updatedAt = new Date();
        }
        if (state.currentPlan?.id === planId) {
          state.currentPlan.places.push(place);
          state.currentPlan.updatedAt = new Date();
        }
      }),

    updatePlace: (planId, placeId, updates) =>
      set((state) => {
        const plan = state.plans.find((p) => p.id === planId);
        if (plan) {
          const placeIndex = plan.places.findIndex((p) => p.id === placeId);
          if (placeIndex !== -1) {
            Object.assign(plan.places[placeIndex], updates);
            plan.updatedAt = new Date();
          }
        }
        if (state.currentPlan?.id === planId) {
          const placeIndex = state.currentPlan.places.findIndex(
            (p) => p.id === placeId,
          );
          if (placeIndex !== -1) {
            Object.assign(state.currentPlan.places[placeIndex], updates);
            state.currentPlan.updatedAt = new Date();
          }
        }
      }),

    deletePlace: (planId, placeId) =>
      set((state) => {
        const plan = state.plans.find((p) => p.id === planId);
        if (plan) {
          plan.places = plan.places.filter((p) => p.id !== placeId);
          plan.updatedAt = new Date();
        }
        if (state.currentPlan?.id === planId) {
          state.currentPlan.places = state.currentPlan.places.filter(
            (p) => p.id !== placeId,
          );
          state.currentPlan.updatedAt = new Date();
        }
      }),

    // ユーティリティ
    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),

    clearError: () =>
      set((state) => {
        state.error = null;
      }),
  })),
);
```

#### C. 同期ストア (`src/stores/syncStore.ts`)

```typescript
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { SyncState, SyncOperation, MemoState } from "@/types/sync";

interface SyncStoreState extends SyncState {
  // メモの状態管理（場所ID -> メモ状態）
  memoStates: Record<string, MemoState>;
}

interface SyncStoreActions {
  // 基本操作
  setOnlineStatus: (isOnline: boolean) => void;
  addPendingOperation: (operation: SyncOperation) => void;
  completePendingOperation: (operationId: string) => void;
  clearPendingOperations: () => void;

  // メモ状態管理
  setLocalMemo: (placeId: string, value: string) => void;
  setSyncedMemo: (placeId: string, value: string) => void;
  setMemoSyncing: (placeId: string, isSyncing: boolean) => void;
  getMemoState: (placeId: string) => MemoState | undefined;
}

export const useSyncStore = create<SyncStoreState & SyncStoreActions>()(
  immer((set, get) => ({
    // State
    isOnline: navigator.onLine,
    pendingOperations: [],
    lastSyncTime: 0,
    conflictResolution: "local_wins",
    memoStates: {},

    // Actions
    setOnlineStatus: (isOnline) =>
      set((state) => {
        state.isOnline = isOnline;
      }),

    addPendingOperation: (operation) =>
      set((state) => {
        state.pendingOperations.push(operation);
      }),

    completePendingOperation: (operationId) =>
      set((state) => {
        state.pendingOperations = state.pendingOperations.filter(
          (op) => op.id !== operationId,
        );
      }),

    clearPendingOperations: () =>
      set((state) => {
        state.pendingOperations = [];
      }),

    // メモ状態管理
    setLocalMemo: (placeId, value) =>
      set((state) => {
        if (!state.memoStates[placeId]) {
          state.memoStates[placeId] = {
            localValue: value,
            syncedValue: "",
            lastLocalUpdate: Date.now(),
            lastSyncUpdate: 0,
            isLocalDirty: true,
            isSyncing: false,
          };
        } else {
          state.memoStates[placeId].localValue = value;
          state.memoStates[placeId].lastLocalUpdate = Date.now();
          state.memoStates[placeId].isLocalDirty = true;
        }
      }),

    setSyncedMemo: (placeId, value) =>
      set((state) => {
        if (!state.memoStates[placeId]) {
          state.memoStates[placeId] = {
            localValue: value,
            syncedValue: value,
            lastLocalUpdate: 0,
            lastSyncUpdate: Date.now(),
            isLocalDirty: false,
            isSyncing: false,
          };
        } else {
          state.memoStates[placeId].syncedValue = value;
          state.memoStates[placeId].lastSyncUpdate = Date.now();
          state.memoStates[placeId].isLocalDirty = false;
          state.memoStates[placeId].isSyncing = false;
        }
      }),

    setMemoSyncing: (placeId, isSyncing) =>
      set((state) => {
        if (state.memoStates[placeId]) {
          state.memoStates[placeId].isSyncing = isSyncing;
        }
      }),

    getMemoState: (placeId) => {
      return get().memoStates[placeId];
    },
  })),
);
```

### 5. 基本ルーティングの構築

#### A. ルーター設定 (`src/App.tsx`)

```typescript
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/shared/Layout';
import { AuthGuard } from '@/components/shared/AuthGuard';

// ページコンポーネント（後で実装）
import { LoginPage } from '@/components/auth/LoginPage';
import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { PlanPage } from '@/components/plans/PlanPage';
import { NotFoundPage } from '@/components/shared/NotFoundPage';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* 認証なしページ */}
        <Route path="/login" element={<LoginPage />} />

        {/* 認証ありページ */}
        <Route element={<AuthGuard />}>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/plans/:planId" element={<PlanPage />} />
          </Route>
        </Route>

        {/* 404ページ */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}
```

### 6. 環境設定

#### A. 環境変数設定 (`.env`)

```
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

#### B. Firebase設定 (`src/services/firebase.ts`)

```typescript
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

## 完成チェックリスト

- [ ] プロジェクトが正常に起動する (`npm run dev`)
- [ ] TypeScriptエラーが0件 (`npm run type-check`)
- [ ] ESLintエラーが0件 (`npm run lint`)
- [ ] 基本ルーティングが動作する
- [ ] ストアが正常に動作する
- [ ] Firebase接続が確立される

## 次のフェーズ

基盤構築が完了したら、`REBUILD_02_MAP_PLACES.md`に進んで地図と場所機能の実装を開始してください。

---

**重要**: この基盤構築により、メモ機能の同期問題を根本的に解決するための土台が整います。特に状態の分離（UI状態/同期状態）と操作ベースの同期システムが鍵となります。
