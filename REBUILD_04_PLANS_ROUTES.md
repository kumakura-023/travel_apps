# Phase 4: 計画・ルート機能 - 詳細実装指示

## 目標

旅行計画の作成・編集・共有機能とルート計算・表示機能を実装し、ユーザビリティに優れた計画管理システムを構築する。

## 実装期間

2-3週間

## 前提条件

- Phase 1-3が完了済み
- 同期システムが正常動作
- Google Maps API（Directions API）が利用可能

## タスクリスト

### 1. 計画管理システムの実装

#### A. 計画CRUD操作サービス (`src/services/api/planService.ts`)

```typescript
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/services/firebase";
import { v4 as uuidv4 } from "uuid";
import type { Plan, PlanMember } from "@/types/core";
import type { FirestorePlan } from "@/types/api";

class PlanService {
  async createPlan(
    title: string,
    description: string,
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Plan> {
    const newPlan: Omit<FirestorePlan, "id"> = {
      title,
      description,
      places: [],
      startDate: startDate ? startDate : null,
      endDate: endDate ? endDate : null,
      isPublic: false,
      members: [
        {
          userId,
          role: "owner",
          joinedAt: new Date(),
        },
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
    };

    const docRef = await addDoc(collection(db, "plans"), newPlan);

    return {
      id: docRef.id,
      title,
      description,
      places: [],
      startDate,
      endDate,
      isPublic: false,
      members: [
        {
          userId,
          role: "owner",
          joinedAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
    };
  }

  async updatePlan(planId: string, updates: Partial<Plan>): Promise<void> {
    const planRef = doc(db, "plans", planId);

    const firestoreUpdates = {
      ...updates,
      updatedAt: serverTimestamp(),
      // 日付の変換
      startDate: updates.startDate || null,
      endDate: updates.endDate || null,
      // 場所データの変換
      places: updates.places?.map((place) => ({
        ...place,
        createdAt: place.createdAt,
        updatedAt: place.updatedAt,
      })),
    };

    await updateDoc(planRef, firestoreUpdates);
  }

  async deletePlan(planId: string): Promise<void> {
    const batch = writeBatch(db);

    // プラン本体の削除
    const planRef = doc(db, "plans", planId);
    batch.delete(planRef);

    // 関連するルートデータの削除
    const routesQuery = query(
      collection(db, "routes"),
      where("planId", "==", planId),
    );
    const routesSnapshot = await getDocs(routesQuery);

    routesSnapshot.docs.forEach((routeDoc) => {
      batch.delete(routeDoc.ref);
    });

    await batch.commit();
  }

  async getUserPlans(userId: string): Promise<Plan[]> {
    const plansQuery = query(
      collection(db, "plans"),
      where("members", "array-contains-any", [
        { userId, role: "owner" },
        { userId, role: "editor" },
        { userId, role: "viewer" },
      ]),
      orderBy("updatedAt", "desc"),
    );

    const snapshot = await getDocs(plansQuery);

    return snapshot.docs.map((doc) => {
      const data = doc.data() as FirestorePlan;
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        startDate: data.startDate?.toDate(),
        endDate: data.endDate?.toDate(),
        places:
          data.places?.map((place) => ({
            ...place,
            createdAt: place.createdAt?.toDate() || new Date(),
            updatedAt: place.updatedAt?.toDate() || new Date(),
          })) || [],
      };
    });
  }

  async getPlan(planId: string): Promise<Plan | null> {
    const planDoc = await getDoc(doc(db, "plans", planId));

    if (!planDoc.exists()) {
      return null;
    }

    const data = planDoc.data() as FirestorePlan;
    return {
      ...data,
      id: planDoc.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      startDate: data.startDate?.toDate(),
      endDate: data.endDate?.toDate(),
      places:
        data.places?.map((place) => ({
          ...place,
          createdAt: place.createdAt?.toDate() || new Date(),
          updatedAt: place.updatedAt?.toDate() || new Date(),
        })) || [],
    };
  }

  async addMemberToPlan(
    planId: string,
    userId: string,
    role: PlanMember["role"],
  ): Promise<void> {
    const planRef = doc(db, "plans", planId);
    const planDoc = await getDoc(planRef);

    if (!planDoc.exists()) {
      throw new Error("Plan not found");
    }

    const currentMembers = planDoc.data().members || [];
    const existingMember = currentMembers.find(
      (m: PlanMember) => m.userId === userId,
    );

    if (existingMember) {
      // 既存メンバーの役割を更新
      const updatedMembers = currentMembers.map((m: PlanMember) =>
        m.userId === userId ? { ...m, role } : m,
      );
      await updateDoc(planRef, { members: updatedMembers });
    } else {
      // 新しいメンバーを追加
      const newMember: PlanMember = {
        userId,
        role,
        joinedAt: new Date(),
      };
      const updatedMembers = [...currentMembers, newMember];
      await updateDoc(planRef, { members: updatedMembers });
    }
  }

  async removeMemberFromPlan(planId: string, userId: string): Promise<void> {
    const planRef = doc(db, "plans", planId);
    const planDoc = await getDoc(planRef);

    if (!planDoc.exists()) {
      throw new Error("Plan not found");
    }

    const currentMembers = planDoc.data().members || [];
    const updatedMembers = currentMembers.filter(
      (m: PlanMember) => m.userId !== userId,
    );

    await updateDoc(planRef, { members: updatedMembers });
  }
}

export const planService = new PlanService();
```

#### B. 計画管理フック (`src/hooks/plans/usePlanActions.ts`)

```typescript
import { useCallback } from "react";
import { usePlanStore } from "@/stores/planStore";
import { useAuthStore } from "@/stores/authStore";
import { planService } from "@/services/api/planService";
import { operationManager } from "@/services/sync/OperationManager";
import { cloudSyncService } from "@/services/sync/CloudSyncService";
import type { Plan, PlanMember } from "@/types/core";

export const usePlanActions = () => {
  const {
    plans,
    currentPlan,
    addPlan,
    updatePlan,
    deletePlan,
    setCurrentPlan,
    setPlans,
    setLoading,
    setError,
  } = usePlanStore();
  const { user } = useAuthStore();

  const createNewPlan = useCallback(
    async (
      title: string,
      description: string,
      startDate?: Date,
      endDate?: Date,
    ): Promise<Plan | null> => {
      if (!user) return null;

      setLoading(true);
      setError(null);

      try {
        const newPlan = await planService.createPlan(
          title,
          description,
          user.id,
          startDate,
          endDate,
        );

        addPlan(newPlan);
        return newPlan;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "計画の作成に失敗しました";
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user, addPlan, setLoading, setError],
  );

  const updatePlanInfo = useCallback(
    async (planId: string, updates: Partial<Plan>): Promise<boolean> => {
      if (!user) return false;

      setLoading(true);
      setError(null);

      try {
        // 操作を作成（同期システム用）
        const operation = operationManager.createOperation(
          "plan_update",
          planId,
          updates,
        );

        operationManager.setCurrentUser(user.id);

        // ローカル状態を即座に更新
        updatePlan(planId, updates);

        // クラウドに同期
        const updatedPlan = plans.find((p) => p.id === planId);
        if (updatedPlan) {
          const planToSync = {
            ...updatedPlan,
            ...updates,
            updatedAt: new Date(),
          };
          await cloudSyncService.syncPlanToCloud(planToSync, operation);
        }

        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "計画の更新に失敗しました";
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user, plans, updatePlan, setLoading, setError],
  );

  const deletePlanById = useCallback(
    async (planId: string): Promise<boolean> => {
      if (!user) return false;

      // 削除確認
      if (
        !confirm(
          "この計画を削除してもよろしいですか？この操作は取り消せません。",
        )
      ) {
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        await planService.deletePlan(planId);
        deletePlan(planId);

        // 現在選択中の計画が削除された場合
        if (currentPlan?.id === planId) {
          setCurrentPlan(null);
        }

        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "計画の削除に失敗しました";
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user, currentPlan, deletePlan, setCurrentPlan, setLoading, setError],
  );

  const loadUserPlans = useCallback(async (): Promise<void> => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const userPlans = await planService.getUserPlans(user.id);
      setPlans(userPlans);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "計画の読み込みに失敗しました";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, setPlans, setLoading, setError]);

  const loadPlan = useCallback(
    async (planId: string): Promise<Plan | null> => {
      setLoading(true);
      setError(null);

      try {
        const plan = await planService.getPlan(planId);
        if (plan) {
          setCurrentPlan(plan);
          return plan;
        } else {
          setError("計画が見つかりません");
          return null;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "計画の読み込みに失敗しました";
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [setCurrentPlan, setLoading, setError],
  );

  const addMember = useCallback(
    async (
      planId: string,
      userId: string,
      role: PlanMember["role"],
    ): Promise<boolean> => {
      if (!user) return false;

      try {
        await planService.addMemberToPlan(planId, userId, role);

        // ローカル状態を更新
        const updatedMembers = currentPlan?.members
          ? [...currentPlan.members]
          : [];
        const existingIndex = updatedMembers.findIndex(
          (m) => m.userId === userId,
        );

        if (existingIndex >= 0) {
          updatedMembers[existingIndex] = {
            ...updatedMembers[existingIndex],
            role,
          };
        } else {
          updatedMembers.push({
            userId,
            role,
            joinedAt: new Date(),
          });
        }

        updatePlan(planId, { members: updatedMembers });
        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "メンバーの追加に失敗しました";
        setError(errorMessage);
        return false;
      }
    },
    [user, currentPlan, updatePlan, setError],
  );

  return {
    createNewPlan,
    updatePlanInfo,
    deletePlanById,
    loadUserPlans,
    loadPlan,
    addMember,
  };
};
```

### 2. ルート計算・表示システムの実装

#### A. ルートサービス (`src/services/api/routeService.ts`)

```typescript
import { mapService } from "./mapService";
import type { Route } from "@/types/core";
import type { Place } from "@/types/core";

class RouteService {
  private directionsService: google.maps.DirectionsService | null = null;
  private directionsRenderer: google.maps.DirectionsRenderer | null = null;

  async initializeDirections(map: google.maps.Map): Promise<void> {
    if (!window.google) {
      throw new Error("Google Maps API is not loaded");
    }

    this.directionsService = new google.maps.DirectionsService();
    this.directionsRenderer = new google.maps.DirectionsRenderer({
      suppressMarkers: true, // 場所マーカーと重複しないように
      polylineOptions: {
        strokeColor: "#3b82f6",
        strokeWeight: 4,
        strokeOpacity: 0.8,
      },
    });

    this.directionsRenderer.setMap(map);
  }

  async calculateRoute(
    fromPlace: Place,
    toPlace: Place,
    travelMode: google.maps.TravelMode = google.maps.TravelMode.DRIVING,
  ): Promise<{
    route: google.maps.DirectionsRoute;
    duration: number;
    distance: number;
  } | null> {
    if (!this.directionsService) {
      throw new Error("Directions service is not initialized");
    }

    const request: google.maps.DirectionsRequest = {
      origin: { lat: fromPlace.lat, lng: fromPlace.lng },
      destination: { lat: toPlace.lat, lng: toPlace.lng },
      travelMode,
      unitSystem: google.maps.UnitSystem.METRIC,
      avoidHighways: false,
      avoidTolls: false,
    };

    return new Promise((resolve, reject) => {
      this.directionsService!.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          const route = result.routes[0];
          const leg = route.legs[0];

          resolve({
            route,
            duration: leg.duration?.value || 0,
            distance: leg.distance?.value || 0,
          });
        } else {
          reject(new Error(`Route calculation failed: ${status}`));
        }
      });
    });
  }

  async calculateMultiWaypointRoute(
    places: Place[],
    travelMode: google.maps.TravelMode = google.maps.TravelMode.DRIVING,
  ): Promise<{
    routes: google.maps.DirectionsRoute[];
    totalDuration: number;
    totalDistance: number;
  } | null> {
    if (places.length < 2) {
      return null;
    }

    if (!this.directionsService) {
      throw new Error("Directions service is not initialized");
    }

    const waypoints = places.slice(1, -1).map((place) => ({
      location: { lat: place.lat, lng: place.lng },
      stopover: true,
    }));

    const request: google.maps.DirectionsRequest = {
      origin: { lat: places[0].lat, lng: places[0].lng },
      destination: {
        lat: places[places.length - 1].lat,
        lng: places[places.length - 1].lng,
      },
      waypoints,
      travelMode,
      unitSystem: google.maps.UnitSystem.METRIC,
      optimizeWaypoints: true, // ルート最適化
    };

    return new Promise((resolve, reject) => {
      this.directionsService!.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          const routes = result.routes;
          let totalDuration = 0;
          let totalDistance = 0;

          routes.forEach((route) => {
            route.legs.forEach((leg) => {
              totalDuration += leg.duration?.value || 0;
              totalDistance += leg.distance?.value || 0;
            });
          });

          resolve({
            routes,
            totalDuration,
            totalDistance,
          });
        } else {
          reject(
            new Error(`Multi-waypoint route calculation failed: ${status}`),
          );
        }
      });
    });
  }

  displayRoute(result: google.maps.DirectionsResult): void {
    if (this.directionsRenderer) {
      this.directionsRenderer.setDirections(result);
    }
  }

  clearRoute(): void {
    if (this.directionsRenderer) {
      this.directionsRenderer.setDirections({
        routes: [],
      } as google.maps.DirectionsResult);
    }
  }

  // 移動時間の文字列フォーマット
  formatDuration(durationInSeconds: number): string {
    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    } else {
      return `${minutes}分`;
    }
  }

  // 距離の文字列フォーマット
  formatDistance(distanceInMeters: number): string {
    if (distanceInMeters >= 1000) {
      return `${(distanceInMeters / 1000).toFixed(1)}km`;
    } else {
      return `${distanceInMeters}m`;
    }
  }
}

export const routeService = new RouteService();
```

#### B. ルートストア (`src/stores/routeStore.ts`)

```typescript
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Route } from "@/types/core";

interface RouteState {
  routes: Route[];
  currentRoute: google.maps.DirectionsResult | null;
  isCalculating: boolean;
  error: string | null;
  travelMode: google.maps.TravelMode;
  totalDuration: number;
  totalDistance: number;
}

interface RouteActions {
  setRoutes: (routes: Route[]) => void;
  setCurrentRoute: (route: google.maps.DirectionsResult | null) => void;
  setCalculating: (calculating: boolean) => void;
  setError: (error: string | null) => void;
  setTravelMode: (mode: google.maps.TravelMode) => void;
  setTravelStats: (duration: number, distance: number) => void;
  clearRoute: () => void;
}

export const useRouteStore = create<RouteState & RouteActions>()(
  immer((set) => ({
    // State
    routes: [],
    currentRoute: null,
    isCalculating: false,
    error: null,
    travelMode: google.maps.TravelMode.DRIVING,
    totalDuration: 0,
    totalDistance: 0,

    // Actions
    setRoutes: (routes) =>
      set((state) => {
        state.routes = routes;
      }),

    setCurrentRoute: (route) =>
      set((state) => {
        state.currentRoute = route;
      }),

    setCalculating: (calculating) =>
      set((state) => {
        state.isCalculating = calculating;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),

    setTravelMode: (mode) =>
      set((state) => {
        state.travelMode = mode;
      }),

    setTravelStats: (duration, distance) =>
      set((state) => {
        state.totalDuration = duration;
        state.totalDistance = distance;
      }),

    clearRoute: () =>
      set((state) => {
        state.currentRoute = null;
        state.totalDuration = 0;
        state.totalDistance = 0;
        state.error = null;
      }),
  })),
);
```

### 3. UI コンポーネントの実装

#### A. 計画作成・編集モーダル (`src/components/plans/PlanEditModal.tsx`)

```typescript
import React, { useState, useEffect } from 'react';
import { XMarkIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { usePlanActions } from '@/hooks/plans/usePlanActions';
import type { Plan } from '@/types/core';

interface PlanEditModalProps {
  plan?: Plan | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (plan: Plan) => void;
}

export const PlanEditModal: React.FC<PlanEditModalProps> = ({
  plan,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { createNewPlan, updatePlanInfo } = usePlanActions();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!plan;

  // 編集モードの場合は既存データを設定
  useEffect(() => {
    if (plan) {
      setTitle(plan.title);
      setDescription(plan.description);
      setStartDate(plan.startDate ? plan.startDate.toISOString().split('T')[0] : '');
      setEndDate(plan.endDate ? plan.endDate.toISOString().split('T')[0] : '');
    } else {
      setTitle('');
      setDescription('');
      setStartDate('');
      setEndDate('');
    }
  }, [plan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    setIsSubmitting(true);

    try {
      const startDateObj = startDate ? new Date(startDate) : undefined;
      const endDateObj = endDate ? new Date(endDate) : undefined;

      if (isEditMode && plan) {
        // 編集モード
        const success = await updatePlanInfo(plan.id, {
          title: title.trim(),
          description: description.trim(),
          startDate: startDateObj,
          endDate: endDateObj,
        });

        if (success) {
          const updatedPlan = {
            ...plan,
            title: title.trim(),
            description: description.trim(),
            startDate: startDateObj,
            endDate: endDateObj,
          };
          onSuccess?.(updatedPlan);
          onClose();
        }
      } else {
        // 新規作成モード
        const newPlan = await createNewPlan(
          title.trim(),
          description.trim(),
          startDateObj,
          endDateObj
        );

        if (newPlan) {
          onSuccess?.(newPlan);
          onClose();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditMode ? '計画を編集' : '新しい計画を作成'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="例：東京観光プラン"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              説明
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="計画の詳細を入力..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CalendarIcon className="w-4 h-4 inline mr-1" />
                開始日
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CalendarIcon className="w-4 h-4 inline mr-1" />
                終了日
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '保存中...' : (isEditMode ? '更新' : '作成')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

#### B. ルート表示パネル (`src/components/routes/RoutePanel.tsx`)

```typescript
import React, { useEffect, useState } from 'react';
import {
  MapIcon,
  ClockIcon,
  ArrowPathIcon,
  TruckIcon,
  UserIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { useRouteStore } from '@/stores/routeStore';
import { usePlanStore } from '@/stores/planStore';
import { useMapStore } from '@/stores/mapStore';
import { routeService } from '@/services/api/routeService';

export const RoutePanel: React.FC = () => {
  const { map } = useMapStore();
  const { currentPlan } = usePlanStore();
  const {
    isCalculating,
    error,
    travelMode,
    totalDuration,
    totalDistance,
    setCalculating,
    setError,
    setTravelMode,
    setTravelStats,
    clearRoute,
  } = useRouteStore();

  const [isInitialized, setIsInitialized] = useState(false);

  // ルートサービスの初期化
  useEffect(() => {
    const initializeRoute = async () => {
      if (map && !isInitialized) {
        try {
          await routeService.initializeDirections(map);
          setIsInitialized(true);
        } catch (error) {
          console.error('Route service initialization failed:', error);
        }
      }
    };

    initializeRoute();
  }, [map, isInitialized]);

  // ルート計算の実行
  const calculateRoute = async () => {
    if (!currentPlan || !currentPlan.places.length || currentPlan.places.length < 2) {
      setError('ルート計算には2つ以上の場所が必要です');
      return;
    }

    setCalculating(true);
    setError(null);

    try {
      const result = await routeService.calculateMultiWaypointRoute(
        currentPlan.places,
        travelMode
      );

      if (result) {
        setTravelStats(result.totalDuration, result.totalDistance);

        // ルートを地図に表示
        const directionsResult = {
          routes: result.routes,
        } as google.maps.DirectionsResult;

        routeService.displayRoute(directionsResult);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ルート計算に失敗しました';
      setError(errorMessage);
    } finally {
      setCalculating(false);
    }
  };

  // 移動手段の変更
  const handleTravelModeChange = (mode: google.maps.TravelMode) => {
    setTravelMode(mode);
    clearRoute(); // 前のルートをクリア
  };

  // ルートクリア
  const handleClearRoute = () => {
    routeService.clearRoute();
    clearRoute();
  };

  const travelModeOptions = [
    { mode: google.maps.TravelMode.DRIVING, icon: TruckIcon, label: '車' },
    { mode: google.maps.TravelMode.WALKING, icon: UserIcon, label: '徒歩' },
    { mode: google.maps.TravelMode.TRANSIT, icon: BoltIcon, label: '電車' },
  ];

  if (!currentPlan || currentPlan.places.length < 2) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="text-center text-gray-500">
          <MapIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">ルート表示には2つ以上の場所が必要です</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <MapIcon className="w-5 h-5 mr-2" />
          ルート情報
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* 移動手段選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            移動手段
          </label>
          <div className="flex space-x-2">
            {travelModeOptions.map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => handleTravelModeChange(mode)}
                className={`
                  flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium border
                  ${travelMode === mode
                    ? 'bg-primary-100 text-primary-700 border-primary-300'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ルート計算ボタン */}
        <div className="flex space-x-2">
          <button
            onClick={calculateRoute}
            disabled={isCalculating}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCalculating ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <MapIcon className="w-4 h-4" />
            )}
            <span>
              {isCalculating ? 'ルート計算中...' : 'ルート表示'}
            </span>
          </button>

          <button
            onClick={handleClearRoute}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            クリア
          </button>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ルート情報表示 */}
        {totalDuration > 0 && totalDistance > 0 && (
          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-center">
              <ClockIcon className="w-5 h-5 mx-auto text-gray-600 mb-1" />
              <p className="text-sm font-medium text-gray-900">
                {routeService.formatDuration(totalDuration)}
              </p>
              <p className="text-xs text-gray-600">所要時間</p>
            </div>
            <div className="text-center">
              <MapIcon className="w-5 h-5 mx-auto text-gray-600 mb-1" />
              <p className="text-sm font-medium text-gray-900">
                {routeService.formatDistance(totalDistance)}
              </p>
              <p className="text-xs text-gray-600">総距離</p>
            </div>
          </div>
        )}

        {/* 場所順序表示 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">訪問順序</h4>
          <div className="space-y-2">
            {currentPlan.places.map((place, index) => (
              <div key={place.id} className="flex items-center space-x-3 text-sm">
                <div className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-medium">
                  {index + 1}
                </div>
                <span className="text-gray-900">{place.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 4. 計画リスト・ダッシュボード

#### A. 計画一覧コンポーネント (`src/components/plans/PlanList.tsx`)

```typescript
import React, { useEffect, useState } from 'react';
import {
  PlusIcon,
  MapPinIcon,
  CalendarIcon,
  UsersIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import { usePlanStore } from '@/stores/planStore';
import { usePlanActions } from '@/hooks/plans/usePlanActions';
import { PlanEditModal } from './PlanEditModal';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Plan } from '@/types/core';

export const PlanList: React.FC = () => {
  const { plans, isLoading, error } = usePlanStore();
  const { loadUserPlans, deletePlanById } = usePlanActions();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);

  useEffect(() => {
    loadUserPlans();
  }, [loadUserPlans]);

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
    setShowMenu(null);
  };

  const handleDeletePlan = async (planId: string) => {
    setShowMenu(null);
    await deletePlanById(planId);
  };

  const handleCreateNew = () => {
    setEditingPlan(null);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              <div className="flex space-x-4">
                <div className="h-3 bg-gray-200 rounded w-20"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">旅行計画</h2>
        <button
          onClick={handleCreateNew}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <PlusIcon className="w-5 h-5" />
          <span>新しい計画</span>
        </button>
      </div>

      {/* 計画一覧 */}
      {plans.length === 0 ? (
        <div className="text-center py-12">
          <MapPinIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            まだ計画がありません
          </h3>
          <p className="text-gray-600 mb-6">
            新しい旅行計画を作成して、素晴らしい旅の準備を始めましょう
          </p>
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <PlusIcon className="w-5 h-5" />
            <span>最初の計画を作成</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {plan.title}
                  </h3>
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(showMenu === plan.id ? null : plan.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <EllipsisVerticalIcon className="w-5 h-5" />
                    </button>

                    {showMenu === plan.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        <button
                          onClick={() => handleEditPlan(plan)}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDeletePlan(plan.id)}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          削除
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {plan.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {plan.description}
                  </p>
                )}

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <MapPinIcon className="w-4 h-4 mr-2" />
                    <span>{plan.places.length} 箇所</span>
                  </div>

                  {plan.startDate && (
                    <div className="flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      <span>
                        {format(plan.startDate, 'M月d日', { locale: ja })}
                        {plan.endDate && ` - ${format(plan.endDate, 'M月d日', { locale: ja })}`}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center">
                    <UsersIcon className="w-4 h-4 mr-2" />
                    <span>{plan.members.length} 人</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <a
                    href={`/plans/${plan.id}`}
                    className="inline-flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    計画を開く →
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 計画作成・編集モーダル */}
      <PlanEditModal
        plan={editingPlan}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPlan(null);
        }}
        onSuccess={() => {
          loadUserPlans(); // 一覧を再読み込み
        }}
      />
    </div>
  );
};
```

## 完成チェックリスト

### 計画管理機能

- [ ] 計画の作成・編集・削除が動作する
- [ ] 計画一覧が適切に表示される
- [ ] 日付設定が正常に動作する
- [ ] メンバー管理機能が動作する

### ルート機能

- [ ] ルート計算が正常に動作する
- [ ] 移動手段の切り替えが動作する
- [ ] ルートが地図上に表示される
- [ ] 所要時間・総距離が正しく計算される

### UI/UX

- [ ] レスポンシブデザインが適用されている
- [ ] ローディング状態が適切に表示される
- [ ] エラーハンドリングが適切に動作する
- [ ] アクセシビリティが考慮されている

## 次のフェーズ

計画・ルート機能の実装が完了したら、`REBUILD_05_ADVANCED.md`に進んで高度な機能（共有機能、コスト管理など）の実装を開始してください。

---

**重要**: この実装により、使いやすい計画管理システムと高精度なルート計算機能が完成します。特にGoogle Maps Directions APIの最適化機能により、効率的な旅行ルートを提案できます。
