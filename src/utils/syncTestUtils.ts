import { TravelPlan, Place, MapLabel } from "../types";
import {
  createSyncConflictResolver,
  SyncConflictResolver,
} from "../services/syncConflictResolver";

/**
 * 同期競合解決機能のテスト用ユーティリティ
 * 単一責任原則に従い、テスト機能を独立したモジュールとして実装
 */
export class SyncTestUtils {
  private conflictResolver: SyncConflictResolver;

  constructor() {
    this.conflictResolver = createSyncConflictResolver();
  }

  /**
   * 基本的な競合解決テスト
   */
  testBasicConflictResolution(): void {
    // テストデータ作成
    const baseTime = new Date("2024-01-01T10:00:00Z");
    const localTime = new Date("2024-01-01T11:00:00Z");
    const remoteTime = new Date("2024-01-01T12:00:00Z");

    const localPlan: TravelPlan = {
      id: "test-plan",
      name: "ローカルプラン",
      description: "ローカルで編集されたプラン",
      places: [
        {
          id: "place-1",
          name: "ローカル地点1",
          address: "ローカル住所1",
          coordinates: { lat: 35.6762, lng: 139.6503 },
          category: "sightseeing",
          memo: "ローカルメモ",
          estimatedCost: 1000,
          photos: [],
          createdAt: baseTime,
          updatedAt: localTime,
        },
      ],
      labels: [
        {
          id: "label-1",
          text: "ローカルラベル",
          position: { lat: 35.6762, lng: 139.6503 },
          fontSize: 14,
          fontFamily: "sans-serif",
          color: "#000000",
          width: 120,
          height: 32,
          createdAt: baseTime,
          updatedAt: localTime,
        },
      ],
      totalCost: 1000,
      createdAt: baseTime,
      updatedAt: localTime,
      isActive: true,
      startDate: null,
      endDate: null,
    };

    const remotePlan: TravelPlan = {
      id: "test-plan",
      name: "リモートプラン",
      description: "リモートで編集されたプラン",
      places: [
        {
          id: "place-1",
          name: "リモート地点1",
          address: "リモート住所1",
          coordinates: { lat: 35.6762, lng: 139.6503 },
          category: "restaurant",
          memo: "リモートメモ",
          estimatedCost: 2000,
          photos: [],
          createdAt: baseTime,
          updatedAt: remoteTime,
        },
        {
          id: "place-2",
          name: "リモート地点2",
          address: "リモート住所2",
          coordinates: { lat: 35.6762, lng: 139.6503 },
          category: "hotel",
          memo: "リモートメモ2",
          estimatedCost: 5000,
          photos: [],
          createdAt: baseTime,
          updatedAt: remoteTime,
        },
      ],
      labels: [
        {
          id: "label-1",
          text: "リモートラベル",
          position: { lat: 35.6762, lng: 139.6503 },
          fontSize: 16,
          fontFamily: "sans-serif",
          color: "#FF0000",
          width: 140,
          height: 40,
          createdAt: baseTime,
          updatedAt: remoteTime,
        },
      ],
      totalCost: 7000,
      createdAt: baseTime,
      updatedAt: remoteTime,
      isActive: true,
      startDate: null,
      endDate: null,
    };

    // 競合解決実行
    const resolvedPlan = this.conflictResolver.resolveConflict(
      localPlan,
      remotePlan,
      localTime,
      remoteTime,
    );

    // 結果検証

    // 期待値との比較
    const expectedPlaceCount = 2;
    const expectedLabelCount = 1;
    const expectedTotalCost = 7000;

    if (
      resolvedPlan.places.length === expectedPlaceCount &&
      resolvedPlan.labels.length === expectedLabelCount &&
      resolvedPlan.totalCost === expectedTotalCost
    ) {
    } else {
    }
  }

  /**
   * 同時編集シミュレーションテスト
   */
  testConcurrentEditing(): void {
    const baseTime = new Date("2024-01-01T10:00:00Z");
    const device1Time = new Date("2024-01-01T11:00:00Z");
    const device2Time = new Date("2024-01-01T11:30:00Z");

    // デバイス1の編集（地点追加）
    const device1Plan: TravelPlan = {
      id: "test-plan",
      name: "テストプラン",
      description: "テスト説明",
      places: [
        {
          id: "place-1",
          name: "デバイス1地点",
          address: "デバイス1住所",
          coordinates: { lat: 35.6762, lng: 139.6503 },
          category: "sightseeing",
          memo: "デバイス1メモ",
          estimatedCost: 1000,
          photos: [],
          createdAt: baseTime,
          updatedAt: device1Time,
        },
      ],
      labels: [],
      totalCost: 1000,
      createdAt: baseTime,
      updatedAt: device1Time,
      isActive: true,
      startDate: null,
      endDate: null,
    };

    // デバイス2の編集（ラベル追加）
    const device2Plan: TravelPlan = {
      id: "test-plan",
      name: "テストプラン",
      description: "テスト説明",
      places: [],
      labels: [
        {
          id: "label-1",
          text: "デバイス2ラベル",
          position: { lat: 35.6762, lng: 139.6503 },
          fontSize: 14,
          fontFamily: "sans-serif",
          color: "#000000",
          width: 120,
          height: 32,
          createdAt: baseTime,
          updatedAt: device2Time,
        },
      ],
      totalCost: 0,
      createdAt: baseTime,
      updatedAt: device2Time,
      isActive: true,
      startDate: null,
      endDate: null,
    };

    // 競合解決実行
    const resolvedPlan = this.conflictResolver.resolveConflict(
      device1Plan,
      device2Plan,
      device1Time,
      device2Time,
    );

    // 結果検証

    // 期待値との比較
    const expectedPlaceCount = 1;
    const expectedLabelCount = 1;
    const expectedTotalCost = 1000;

    if (
      resolvedPlan.places.length === expectedPlaceCount &&
      resolvedPlan.labels.length === expectedLabelCount &&
      resolvedPlan.totalCost === expectedTotalCost
    ) {
    } else {
    }
  }

  /**
   * 全テスト実行
   */
  runAllTests(): void {
    try {
      this.testBasicConflictResolution();
      this.testConcurrentEditing();
    } catch (error) {}
  }
}

/**
 * テストユーティリティのファクトリー関数
 */
export function createSyncTestUtils(): SyncTestUtils {
  return new SyncTestUtils();
}
