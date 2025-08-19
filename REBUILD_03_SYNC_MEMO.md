# Phase 3: 同期・メモ機能 - 詳細実装指示

## 目標

メモ機能の無限ループ問題を根本的に解決する新しい同期システムを構築し、安定したリアルタイム共同編集機能を実現する。

## 実装期間

1-2週間

## 前提条件

- Phase 1, 2が完了済み
- 既存の同期問題の根本原因を理解済み
- Firebase/Firestoreが設定済み

## 核心的な解決アプローチ

### 問題の根本原因（再確認）

1. **重複する状態更新**: 同じデータが2回更新される
2. **不正確な自己更新判定**: Firebase通知遅延を考慮していない
3. **UI状態とクラウド状態の混在**: 状態管理の責任が不明確
4. **競合状態**: 並行実行による不整合

### 解決戦略

1. **状態の完全分離**: UI状態とクラウド状態を明確に分離
2. **操作ベースの同期**: タイムスタンプではなく操作IDで管理
3. **単一責任の同期マネージャー**: クラウド同期のみに責任を限定
4. **段階的な競合解決**: 自動・手動の組み合わせ

## タスクリスト

### 1. 新しい同期システムの設計・実装

#### A. 操作管理サービス (`src/services/sync/OperationManager.ts`)

```typescript
import { v4 as uuidv4 } from "uuid";
import type { SyncOperation, SyncOperationType } from "@/types/sync";

class OperationManager {
  private pendingOperations = new Map<string, SyncOperation>();
  private recentOperations = new Map<string, number>(); // operationId -> timestamp
  private currentUserId: string | null = null;

  setCurrentUser(userId: string) {
    this.currentUserId = userId;
  }

  createOperation(
    type: SyncOperationType,
    planId: string,
    data: any,
  ): SyncOperation {
    const operation: SyncOperation = {
      id: uuidv4(),
      type,
      userId: this.currentUserId || "anonymous",
      timestamp: Date.now(),
      planId,
      data,
      status: "pending",
    };

    this.pendingOperations.set(operation.id, operation);
    this.recentOperations.set(operation.id, operation.timestamp);

    // 古い操作履歴をクリーンアップ（10分以上前）
    this.cleanupOldOperations();

    return operation;
  }

  markOperationCompleted(operationId: string) {
    const operation = this.pendingOperations.get(operationId);
    if (operation) {
      operation.status = "completed";
      this.pendingOperations.delete(operationId);
    }
  }

  markOperationFailed(operationId: string) {
    const operation = this.pendingOperations.get(operationId);
    if (operation) {
      operation.status = "failed";
      // 失敗した操作も一旦削除（リトライ機能は後で追加）
      this.pendingOperations.delete(operationId);
    }
  }

  // 操作が自分のものかどうかを判定
  isOwnOperation(operationId: string, userId: string): boolean {
    return (
      this.recentOperations.has(operationId) && this.currentUserId === userId
    );
  }

  // 最近の操作かどうかを判定（Firebase通知遅延を考慮）
  isRecentOperation(operationId: string): boolean {
    const timestamp = this.recentOperations.get(operationId);
    if (!timestamp) return false;

    const now = Date.now();
    return now - timestamp < 15000; // 15秒以内なら最近の操作
  }

  getPendingOperations(): SyncOperation[] {
    return Array.from(this.pendingOperations.values());
  }

  private cleanupOldOperations() {
    const now = Date.now();
    const cutoff = 10 * 60 * 1000; // 10分

    for (const [operationId, timestamp] of this.recentOperations.entries()) {
      if (now - timestamp > cutoff) {
        this.recentOperations.delete(operationId);
      }
    }
  }
}

export const operationManager = new OperationManager();
```

#### B. クラウド同期サービス (`src/services/sync/CloudSyncService.ts`)

```typescript
import {
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/services/firebase";
import { operationManager } from "./OperationManager";
import type { Plan } from "@/types/core";
import type { SyncOperation } from "@/types/sync";

class CloudSyncService {
  private listeners = new Map<string, Unsubscribe>();

  async syncPlanToCloud(plan: Plan, operation: SyncOperation): Promise<void> {
    try {
      const planRef = doc(db, "plans", plan.id);

      // Firestoreに保存するデータ（操作メタデータ付き）
      const firestoreData = {
        ...plan,
        updatedAt: serverTimestamp(),
        lastOperationId: operation.id,
        lastOperatorId: operation.userId,
        lastOperationType: operation.type,
        // 日付オブジェクトをTimestampに変換
        startDate: plan.startDate ? plan.startDate : null,
        endDate: plan.endDate ? plan.endDate : null,
        places: plan.places.map((place) => ({
          ...place,
          createdAt: place.createdAt,
          updatedAt: place.updatedAt,
        })),
      };

      await updateDoc(planRef, firestoreData);

      // 操作を完了としてマーク
      operationManager.markOperationCompleted(operation.id);

      console.log(`Plan synced to cloud with operation ${operation.id}`);
    } catch (error) {
      console.error("Cloud sync failed:", error);
      operationManager.markOperationFailed(operation.id);
      throw error;
    }
  }

  subscribeToRealtimeUpdates(
    planId: string,
    onUpdate: (plan: Plan, isOwnOperation: boolean) => void,
  ): Unsubscribe {
    // 既存のリスナーがあれば削除
    this.unsubscribeFromPlan(planId);

    const planRef = doc(db, "plans", planId);

    const unsubscribe = onSnapshot(
      planRef,
      (doc) => {
        if (!doc.exists()) {
          console.warn(`Plan ${planId} does not exist`);
          return;
        }

        const data = doc.data();

        // 操作メタデータを使用した自己更新判定
        const lastOperationId = data.lastOperationId;
        const lastOperatorId = data.lastOperatorId;

        const isOwnOperation = this.isOwnOperation(
          lastOperationId,
          lastOperatorId,
        );

        if (isOwnOperation) {
          console.log("Self-update detected via operation metadata, skipping");
          return;
        }

        // FirestoreデータをPlan型に変換
        const plan: Plan = {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          startDate: data.startDate?.toDate(),
          endDate: data.endDate?.toDate(),
          places:
            data.places?.map((place: any) => ({
              ...place,
              createdAt: place.createdAt?.toDate() || new Date(),
              updatedAt: place.updatedAt?.toDate() || new Date(),
            })) || [],
        };

        onUpdate(plan, false);
      },
      (error) => {
        console.error("Realtime listener error:", error);
      },
    );

    this.listeners.set(planId, unsubscribe);
    return unsubscribe;
  }

  private isOwnOperation(operationId?: string, operatorId?: string): boolean {
    if (!operationId || !operatorId) {
      return false;
    }

    // 操作IDとユーザーIDの両方で判定
    return (
      operationManager.isOwnOperation(operationId, operatorId) ||
      operationManager.isRecentOperation(operationId)
    );
  }

  unsubscribeFromPlan(planId: string) {
    const listener = this.listeners.get(planId);
    if (listener) {
      listener();
      this.listeners.delete(planId);
    }
  }

  unsubscribeAll() {
    this.listeners.forEach((listener) => listener());
    this.listeners.clear();
  }
}

export const cloudSyncService = new CloudSyncService();
```

### 2. メモ機能の専用管理システム

#### A. メモ状態管理フック (`src/hooks/memo/useMemoSync.ts`)

```typescript
import { useState, useEffect, useCallback, useRef } from "react";
import { useSyncStore } from "@/stores/syncStore";
import { usePlanStore } from "@/stores/planStore";
import { useAuthStore } from "@/stores/authStore";
import { operationManager } from "@/services/sync/OperationManager";
import { cloudSyncService } from "@/services/sync/CloudSyncService";
import { useDebounce } from "@/hooks/shared/useDebounce";

export function useMemoSync(placeId: string) {
  const { user } = useAuthStore();
  const { currentPlan, updatePlace } = usePlanStore();
  const { getMemoState, setLocalMemo, setSyncedMemo, setMemoSyncing } =
    useSyncStore();

  // ローカル入力値（即座にUIに反映）
  const [localValue, setLocalValue] = useState("");

  // デバウンス後の値（クラウド同期用）
  const debouncedValue = useDebounce(localValue, 500);

  // 同期中フラグ
  const [isSyncing, setIsSyncing] = useState(false);

  // リモート更新を無視するフラグ
  const ignoringRemoteUpdatesRef = useRef(false);

  // 初期値の設定
  useEffect(() => {
    if (currentPlan) {
      const place = currentPlan.places.find((p) => p.id === placeId);
      if (place) {
        setLocalValue(place.memo);
        setSyncedMemo(placeId, place.memo);
      }
    }
  }, [placeId, currentPlan, setSyncedMemo]);

  // ローカル入力の処理
  const handleLocalChange = useCallback(
    (value: string) => {
      setLocalValue(value);
      setLocalMemo(placeId, value);

      // 即座にUIに反映（ローカルストアを更新）
      if (currentPlan) {
        updatePlace(currentPlan.id, placeId, { memo: value });
      }
    },
    [placeId, currentPlan, setLocalMemo, updatePlace],
  );

  // デバウンス後のクラウド同期
  useEffect(() => {
    const syncToCloud = async () => {
      if (!currentPlan || !user || debouncedValue === "" || isSyncing) {
        return;
      }

      const memoState = getMemoState(placeId);

      // すでに同期済みの場合はスキップ
      if (memoState && memoState.syncedValue === debouncedValue) {
        return;
      }

      setIsSyncing(true);
      setMemoSyncing(placeId, true);

      // リモート更新を一時的に無視
      ignoringRemoteUpdatesRef.current = true;

      try {
        // 操作を作成
        const operation = operationManager.createOperation(
          "memo_update",
          currentPlan.id,
          { placeId, memo: debouncedValue },
        );

        // 操作メタデータをユーザーIDに設定
        operationManager.setCurrentUser(user.id);

        // クラウドに同期
        const updatedPlan = {
          ...currentPlan,
          places: currentPlan.places.map((p) =>
            p.id === placeId
              ? { ...p, memo: debouncedValue, updatedAt: new Date() }
              : p,
          ),
          updatedAt: new Date(),
        };

        await cloudSyncService.syncPlanToCloud(updatedPlan, operation);

        // 同期完了
        setSyncedMemo(placeId, debouncedValue);

        console.log(`Memo synced for place ${placeId}: "${debouncedValue}"`);
      } catch (error) {
        console.error("Memo sync failed:", error);
        // エラー時は前の同期済み値に戻す
        const memoState = getMemoState(placeId);
        if (memoState) {
          setLocalValue(memoState.syncedValue);
          updatePlace(currentPlan.id, placeId, { memo: memoState.syncedValue });
        }
      } finally {
        setIsSyncing(false);
        setMemoSyncing(placeId, false);

        // リモート更新の無視を解除（少し遅延を入れる）
        setTimeout(() => {
          ignoringRemoteUpdatesRef.current = false;
        }, 1000);
      }
    };

    syncToCloud();
  }, [
    debouncedValue,
    placeId,
    currentPlan,
    user,
    isSyncing,
    getMemoState,
    setSyncedMemo,
    setMemoSyncing,
    updatePlace,
  ]);

  // リモート更新の処理
  const handleRemoteUpdate = useCallback(
    (remoteMemo: string) => {
      if (ignoringRemoteUpdatesRef.current) {
        console.log("Ignoring remote update due to recent local sync");
        return;
      }

      const memoState = getMemoState(placeId);

      // ローカルに未同期の変更がある場合は競合解決
      if (memoState && memoState.isLocalDirty) {
        console.log("Conflict detected: local changes exist");
        // 簡単な競合解決：タイムスタンプベース
        if (memoState.lastLocalUpdate > memoState.lastSyncUpdate) {
          console.log("Local changes are newer, keeping local version");
          return;
        }
      }

      // リモート更新を適用
      setLocalValue(remoteMemo);
      setSyncedMemo(placeId, remoteMemo);

      console.log(
        `Remote memo update applied for place ${placeId}: "${remoteMemo}"`,
      );
    },
    [placeId, getMemoState, setSyncedMemo],
  );

  return {
    value: localValue,
    onChange: handleLocalChange,
    onRemoteUpdate: handleRemoteUpdate,
    isSyncing,
    isLocalDirty: getMemoState(placeId)?.isLocalDirty || false,
  };
}
```

#### B. メモエディターコンポーネント (`src/components/memo/MemoEditor.tsx`)

```typescript
import React, { useCallback } from 'react';
import { useMemoSync } from '@/hooks/memo/useMemoSync';
import {
  PencilIcon,
  CloudIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface MemoEditorProps {
  placeId: string;
  placeholder?: string;
  className?: string;
  maxLength?: number;
}

export const MemoEditor: React.FC<MemoEditorProps> = ({
  placeId,
  placeholder = 'メモを入力...',
  className,
  maxLength = 1000,
}) => {
  const {
    value,
    onChange,
    isSyncing,
    isLocalDirty
  } = useMemoSync(placeId);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      onChange(newValue);
    }
  }, [onChange, maxLength]);

  const getSyncStatusIcon = () => {
    if (isSyncing) {
      return (
        <CloudIcon className="w-4 h-4 text-blue-500 animate-spin" />
      );
    }

    if (isLocalDirty) {
      return (
        <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
      );
    }

    return (
      <CloudIcon className="w-4 h-4 text-green-500" />
    );
  };

  const getSyncStatusText = () => {
    if (isSyncing) return '同期中...';
    if (isLocalDirty) return '未同期';
    return '同期済み';
  };

  return (
    <div className={clsx('relative', className)}>
      <div className="relative">
        <textarea
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={clsx(
            'w-full px-3 py-2 border border-gray-300 rounded-lg',
            'focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'resize-none transition-colors',
            'placeholder-gray-400',
            isSyncing && 'bg-blue-50',
            isLocalDirty && 'bg-yellow-50'
          )}
          rows={4}
          maxLength={maxLength}
        />

        {/* ステータスバー */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            {getSyncStatusIcon()}
            <span>{getSyncStatusText()}</span>
          </div>

          <span>
            {value.length}/{maxLength}
          </span>
        </div>
      </div>

      {/* 編集インジケータ */}
      {value && (
        <div className="absolute top-2 right-2">
          <PencilIcon className="w-4 h-4 text-gray-400" />
        </div>
      )}
    </div>
  );
};
```

### 3. リアルタイム更新リスナーの実装

#### A. リアルタイム更新フック (`src/hooks/sync/useRealtimeSync.ts`)

```typescript
import { useEffect, useCallback } from "react";
import { usePlanStore } from "@/stores/planStore";
import { useAuthStore } from "@/stores/authStore";
import { cloudSyncService } from "@/services/sync/CloudSyncService";
import { operationManager } from "@/services/sync/OperationManager";
import type { Plan } from "@/types/core";

export function useRealtimeSync(planId: string | null) {
  const { user } = useAuthStore();
  const { setCurrentPlan, updatePlan } = usePlanStore();

  const handleRealtimeUpdate = useCallback(
    (updatedPlan: Plan, isOwnOperation: boolean) => {
      if (isOwnOperation) {
        console.log("Skipping own operation update");
        return;
      }

      console.log("Applying remote update:", updatedPlan.id);

      // ストアを更新
      setCurrentPlan(updatedPlan);
      updatePlan(updatedPlan.id, updatedPlan);

      // 各場所のメモについてリモート更新通知を送信
      // （useMemoSyncフックが受信して適切に処理）
      updatedPlan.places.forEach((place) => {
        // カスタムイベントを発火してメモエディターに通知
        const event = new CustomEvent("memoRemoteUpdate", {
          detail: { placeId: place.id, memo: place.memo },
        });
        window.dispatchEvent(event);
      });
    },
    [setCurrentPlan, updatePlan],
  );

  useEffect(() => {
    if (!planId || !user) return;

    // ユーザーIDを操作マネージャーに設定
    operationManager.setCurrentUser(user.id);

    // リアルタイム更新を購読
    const unsubscribe = cloudSyncService.subscribeToRealtimeUpdates(
      planId,
      handleRealtimeUpdate,
    );

    return () => {
      unsubscribe();
    };
  }, [planId, user, handleRealtimeUpdate]);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      if (planId) {
        cloudSyncService.unsubscribeFromPlan(planId);
      }
    };
  }, [planId]);
}
```

#### B. メモリモート更新の受信処理

```typescript
// useMemoSyncフックに追加する処理

// リモート更新イベントのリスナー
useEffect(() => {
  const handleRemoteUpdate = (event: CustomEvent) => {
    const { placeId: eventPlaceId, memo } = event.detail;
    if (eventPlaceId === placeId) {
      handleRemoteUpdate(memo);
    }
  };

  window.addEventListener(
    "memoRemoteUpdate",
    handleRemoteUpdate as EventListener,
  );

  return () => {
    window.removeEventListener(
      "memoRemoteUpdate",
      handleRemoteUpdate as EventListener,
    );
  };
}, [placeId, handleRemoteUpdate]);
```

### 4. オフライン対応とエラーハンドリング

#### A. オフライン検知フック (`src/hooks/sync/useOfflineSync.ts`)

```typescript
import { useState, useEffect } from "react";
import { useSyncStore } from "@/stores/syncStore";

export function useOfflineSync() {
  const { setOnlineStatus, pendingOperations, clearPendingOperations } =
    useSyncStore();
  const [isRetrying, setIsRetrying] = useState(false);

  // オンライン状態の監視
  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      retryPendingOperations();
    };

    const handleOffline = () => {
      setOnlineStatus(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 初期状態を設定
    setOnlineStatus(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnlineStatus]);

  // 保留中の操作のリトライ
  const retryPendingOperations = async () => {
    if (pendingOperations.length === 0 || isRetrying) return;

    setIsRetrying(true);

    try {
      // TODO: 保留中の操作を順次実行
      // 現在は単純にクリアするだけ
      clearPendingOperations();
      console.log("Pending operations cleared after coming online");
    } catch (error) {
      console.error("Failed to retry pending operations:", error);
    } finally {
      setIsRetrying(false);
    }
  };

  return {
    isRetrying,
    retryPendingOperations,
  };
}
```

### 5. 統合とテスト用コンポーネント

#### A. 場所詳細パネルの更新 (`src/components/places/PlaceDetailPanel.tsx`)

```typescript
import React from 'react';
import { MemoEditor } from '@/components/memo/MemoEditor';
import { useRealtimeSync } from '@/hooks/sync/useRealtimeSync';
import { usePlanStore } from '@/stores/planStore';
import type { Place } from '@/types/core';

interface PlaceDetailPanelProps {
  place: Place;
  onClose: () => void;
}

export const PlaceDetailPanel: React.FC<PlaceDetailPanelProps> = ({
  place,
  onClose
}) => {
  const { currentPlan } = usePlanStore();

  // リアルタイム同期を有効化
  useRealtimeSync(currentPlan?.id || null);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{place.name}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600">{place.address}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            メモ
          </label>
          {/* 新しいメモエディター（問題解決済み） */}
          <MemoEditor
            placeId={place.id}
            placeholder="この場所についてのメモを入力..."
            maxLength={500}
          />
        </div>

        {place.rating && (
          <div>
            <span className="text-sm text-gray-600">
              評価: ⭐ {place.rating.toFixed(1)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
```

## 完成チェックリスト

### 基本機能

- [ ] メモ入力が即座にUIに反映される
- [ ] メモがデバウンス後にクラウドに同期される
- [ ] 同期状態が視覚的に表示される
- [ ] 無限ループが発生しない

### 同期機能

- [ ] 操作ベースの自己更新判定が動作する
- [ ] リアルタイム更新が正しく受信される
- [ ] 複数ユーザーでの同時編集が可能
- [ ] 競合解決が適切に動作する

### エラーハンドリング

- [ ] オフライン状態の検知と表示
- [ ] 同期エラー時の適切な処理
- [ ] ネットワーク復旧時の自動リトライ

### パフォーマンス

- [ ] メモ入力時のUI応答性が良好
- [ ] デバウンス処理が適切に動作
- [ ] メモリリークが発生しない

## 重要な検証項目

### 無限ループテスト

1. 複数のブラウザタブで同じプランを開く
2. 同じ場所のメモを同時に編集
3. 無限ループやエラーが発生しないことを確認

### 同期精度テスト

1. ユーザーAがメモを編集
2. ユーザーBの画面に正しく反映される
3. 自己更新が適切に除外される

### オフライン対応テスト

1. ネットワークを切断してメモを編集
2. オフライン状態が表示される
3. ネットワーク復旧後に同期される

## 次のフェーズ

同期・メモ機能の実装が完了したら、`REBUILD_04_PLANS_ROUTES.md`に進んで計画・ルート機能の実装を開始してください。

---

**重要**: この実装により、メモ機能の無限ループ問題が根本的に解決されます。状態の完全分離と操作ベースの同期により、安定したリアルタイム共同編集が実現できます。実装時は各コンポーネントを段階的にテストして、問題がないことを確認してから次に進んでください。
