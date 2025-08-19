# Phase 5: 高度な機能 - 詳細実装指示

## 目標

共有機能、コスト管理、高度なUI機能を実装し、VoyageSketchを完全な旅行計画アプリケーションとして完成させる。

## 実装期間

2-3週間

## 前提条件

- Phase 1-4が完了済み
- 基本的な計画・メモ・ルート機能が動作中
- Firebase Authentication・Firestoreが設定済み

## タスクリスト

### 1. 計画共有・招待システム

#### A. 招待リンク生成・管理サービス (`src/services/api/shareService.ts`)

```typescript
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/services/firebase";
import { v4 as uuidv4 } from "uuid";
import { planService } from "./planService";
import type { Plan, PlanMember } from "@/types/core";

export interface ShareLink {
  id: string;
  planId: string;
  createdBy: string;
  role: PlanMember["role"];
  expiresAt: Date | null;
  maxUses: number | null;
  currentUses: number;
  isActive: boolean;
  createdAt: Date;
}

export interface InviteAcceptance {
  linkId: string;
  userId: string;
  acceptedAt: Date;
  userEmail: string;
}

class ShareService {
  async createShareLink(
    planId: string,
    createdBy: string,
    role: PlanMember["role"] = "viewer",
    options: {
      expiresIn?: number; // 時間（ミリ秒）
      maxUses?: number;
    } = {},
  ): Promise<ShareLink> {
    const linkId = uuidv4();
    const now = new Date();

    const shareLink: ShareLink = {
      id: linkId,
      planId,
      createdBy,
      role,
      expiresAt: options.expiresIn
        ? new Date(now.getTime() + options.expiresIn)
        : null,
      maxUses: options.maxUses || null,
      currentUses: 0,
      isActive: true,
      createdAt: now,
    };

    const linkRef = doc(db, "shareLinks", linkId);
    await setDoc(linkRef, {
      ...shareLink,
      createdAt: serverTimestamp(),
      expiresAt: shareLink.expiresAt ? shareLink.expiresAt : null,
    });

    return shareLink;
  }

  async getShareLink(linkId: string): Promise<ShareLink | null> {
    const linkDoc = await getDoc(doc(db, "shareLinks", linkId));

    if (!linkDoc.exists()) {
      return null;
    }

    const data = linkDoc.data();
    return {
      ...data,
      id: linkDoc.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      expiresAt: data.expiresAt?.toDate() || null,
    } as ShareLink;
  }

  async validateAndUseShareLink(
    linkId: string,
    userId: string,
    userEmail: string,
  ): Promise<{
    isValid: boolean;
    plan?: Plan;
    error?: string;
  }> {
    const shareLink = await this.getShareLink(linkId);

    if (!shareLink) {
      return { isValid: false, error: "招待リンクが見つかりません" };
    }

    if (!shareLink.isActive) {
      return { isValid: false, error: "招待リンクが無効です" };
    }

    // 有効期限チェック
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      return { isValid: false, error: "招待リンクの有効期限が切れています" };
    }

    // 使用回数チェック
    if (shareLink.maxUses && shareLink.currentUses >= shareLink.maxUses) {
      return {
        isValid: false,
        error: "招待リンクの使用回数上限に達しています",
      };
    }

    // プランを取得
    const plan = await planService.getPlan(shareLink.planId);
    if (!plan) {
      return { isValid: false, error: "計画が見つかりません" };
    }

    // 既にメンバーかチェック
    const isAlreadyMember = plan.members.some(
      (member) => member.userId === userId,
    );
    if (isAlreadyMember) {
      return { isValid: true, plan }; // 既にメンバーでもOK
    }

    try {
      // メンバーに追加
      await planService.addMemberToPlan(
        shareLink.planId,
        userId,
        shareLink.role,
      );

      // 招待受諾記録を保存
      await addDoc(collection(db, "inviteAcceptances"), {
        linkId,
        userId,
        userEmail,
        acceptedAt: serverTimestamp(),
      });

      // 使用回数を増加
      await updateDoc(doc(db, "shareLinks", linkId), {
        currentUses: shareLink.currentUses + 1,
      });

      return { isValid: true, plan };
    } catch (error) {
      console.error("Failed to process share link:", error);
      return {
        isValid: false,
        error: "メンバー追加処理に失敗しました",
      };
    }
  }

  async deactivateShareLink(linkId: string): Promise<void> {
    await updateDoc(doc(db, "shareLinks", linkId), {
      isActive: false,
    });
  }

  async getPlanShareLinks(planId: string): Promise<ShareLink[]> {
    const linksQuery = query(
      collection(db, "shareLinks"),
      where("planId", "==", planId),
      where("isActive", "==", true),
    );

    const snapshot = await getDocs(linksQuery);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        expiresAt: data.expiresAt?.toDate() || null,
      } as ShareLink;
    });
  }

  generateShareUrl(linkId: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/invite/${linkId}`;
  }
}

export const shareService = new ShareService();
```

#### B. 共有モーダルコンポーネント (`src/components/plans/ShareModal.tsx`)

```typescript
import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  LinkIcon,
  ClipboardIcon,
  UsersIcon,
  CalendarIcon,
  HashtagIcon,
} from '@heroicons/react/24/outline';
import { shareService, type ShareLink } from '@/services/api/shareService';
import { useAuthStore } from '@/stores/authStore';
import type { Plan, PlanMember } from '@/types/core';

interface ShareModalProps {
  plan: Plan;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  plan,
  isOpen,
  onClose,
}) => {
  const { user } = useAuthStore();
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // 共有設定
  const [newLinkRole, setNewLinkRole] = useState<PlanMember['role']>('viewer');
  const [expiresIn, setExpiresIn] = useState<string>('never');
  const [maxUses, setMaxUses] = useState<string>('unlimited');

  useEffect(() => {
    if (isOpen) {
      loadShareLinks();
    }
  }, [isOpen]);

  const loadShareLinks = async () => {
    try {
      const links = await shareService.getPlanShareLinks(plan.id);
      setShareLinks(links);
    } catch (error) {
      console.error('Failed to load share links:', error);
    }
  };

  const createShareLink = async () => {
    if (!user) return;

    setIsCreating(true);
    try {
      const options: { expiresIn?: number; maxUses?: number } = {};

      // 有効期限の設定
      if (expiresIn !== 'never') {
        const hours = parseInt(expiresIn);
        options.expiresIn = hours * 60 * 60 * 1000; // ミリ秒に変換
      }

      // 使用回数制限の設定
      if (maxUses !== 'unlimited') {
        options.maxUses = parseInt(maxUses);
      }

      await shareService.createShareLink(
        plan.id,
        user.id,
        newLinkRole,
        options
      );

      await loadShareLinks();
    } catch (error) {
      console.error('Failed to create share link:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = async (linkId: string) => {
    const url = shareService.generateShareUrl(linkId);

    try {
      await navigator.clipboard.writeText(url);
      setCopiedLinkId(linkId);
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const deactivateLink = async (linkId: string) => {
    try {
      await shareService.deactivateShareLink(linkId);
      await loadShareLinks();
    } catch (error) {
      console.error('Failed to deactivate link:', error);
    }
  };

  const formatExpiresAt = (date: Date | null) => {
    if (!date) return '無期限';
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getRoleLabel = (role: PlanMember['role']) => {
    const labels = {
      owner: 'オーナー',
      editor: '編集者',
      viewer: '閲覧者',
    };
    return labels[role];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <UsersIcon className="w-5 h-5 mr-2" />
            計画を共有
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 計画情報 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">{plan.title}</h4>
            <p className="text-sm text-gray-600">{plan.description || '説明なし'}</p>
          </div>

          {/* 新しい招待リンク作成 */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-4">新しい招待リンクを作成</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  権限
                </label>
                <select
                  value={newLinkRole}
                  onChange={(e) => setNewLinkRole(e.target.value as PlanMember['role'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="viewer">閲覧者</option>
                  <option value="editor">編集者</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  有効期限
                </label>
                <select
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="never">無期限</option>
                  <option value="24">24時間</option>
                  <option value="168">1週間</option>
                  <option value="720">1ヶ月</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  使用回数制限
                </label>
                <select
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="unlimited">無制限</option>
                  <option value="1">1回</option>
                  <option value="5">5回</option>
                  <option value="10">10回</option>
                </select>
              </div>
            </div>

            <button
              onClick={createShareLink}
              disabled={isCreating}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <LinkIcon className="w-4 h-4" />
              <span>{isCreating ? '作成中...' : '招待リンクを作成'}</span>
            </button>
          </div>

          {/* 既存の招待リンク */}
          <div>
            <h4 className="font-medium text-gray-900 mb-4">既存の招待リンク</h4>

            {shareLinks.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                まだ招待リンクがありません
              </p>
            ) : (
              <div className="space-y-3">
                {shareLinks.map((link) => (
                  <div
                    key={link.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                            {getRoleLabel(link.role)}
                          </span>

                          <div className="flex items-center text-xs text-gray-500">
                            <CalendarIcon className="w-3 h-3 mr-1" />
                            {formatExpiresAt(link.expiresAt)}
                          </div>

                          <div className="flex items-center text-xs text-gray-500">
                            <HashtagIcon className="w-3 h-3 mr-1" />
                            {link.currentUses}
                            {link.maxUses ? `/${link.maxUses}` : ''} 回使用
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded p-2 font-mono text-xs break-all">
                          {shareService.generateShareUrl(link.id)}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => copyToClipboard(link.id)}
                        className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                      >
                        <ClipboardIcon className="w-4 h-4" />
                        <span>
                          {copiedLinkId === link.id ? 'コピー済み!' : 'コピー'}
                        </span>
                      </button>

                      <button
                        onClick={() => deactivateLink(link.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                      >
                        無効化
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 現在のメンバー */}
          <div>
            <h4 className="font-medium text-gray-900 mb-4">現在のメンバー</h4>
            <div className="space-y-2">
              {plan.members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                >
                  <div className="text-sm text-gray-900">
                    {member.userId}
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {getRoleLabel(member.role)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 2. コスト管理システム

#### A. コスト管理ストア (`src/stores/costStore.ts`)

```typescript
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export interface CostItem {
  id: string;
  placeId: string;
  category:
    | "accommodation"
    | "food"
    | "transport"
    | "activity"
    | "shopping"
    | "other";
  name: string;
  amount: number;
  currency: string;
  date?: Date;
  notes?: string;
  createdAt: Date;
  createdBy: string;
}

export interface CostSummary {
  totalAmount: number;
  byCategory: Record<CostItem["category"], number>;
  byPlace: Record<string, number>;
  currency: string;
}

interface CostState {
  costs: CostItem[];
  isLoading: boolean;
  error: string | null;
}

interface CostActions {
  setCosts: (costs: CostItem[]) => void;
  addCost: (cost: CostItem) => void;
  updateCost: (costId: string, updates: Partial<CostItem>) => void;
  deleteCost: (costId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getCostsByPlace: (placeId: string) => CostItem[];
  getCostSummary: () => CostSummary;
}

export const useCostStore = create<CostState & CostActions>()(
  immer((set, get) => ({
    // State
    costs: [],
    isLoading: false,
    error: null,

    // Actions
    setCosts: (costs) =>
      set((state) => {
        state.costs = costs;
      }),

    addCost: (cost) =>
      set((state) => {
        state.costs.push(cost);
      }),

    updateCost: (costId, updates) =>
      set((state) => {
        const index = state.costs.findIndex((c) => c.id === costId);
        if (index !== -1) {
          Object.assign(state.costs[index], updates);
        }
      }),

    deleteCost: (costId) =>
      set((state) => {
        state.costs = state.costs.filter((c) => c.id !== costId);
      }),

    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),

    getCostsByPlace: (placeId) => {
      return get().costs.filter((cost) => cost.placeId === placeId);
    },

    getCostSummary: () => {
      const costs = get().costs;
      const summary: CostSummary = {
        totalAmount: 0,
        byCategory: {
          accommodation: 0,
          food: 0,
          transport: 0,
          activity: 0,
          shopping: 0,
          other: 0,
        },
        byPlace: {},
        currency: "JPY", // デフォルト通貨
      };

      costs.forEach((cost) => {
        summary.totalAmount += cost.amount;
        summary.byCategory[cost.category] += cost.amount;

        if (!summary.byPlace[cost.placeId]) {
          summary.byPlace[cost.placeId] = 0;
        }
        summary.byPlace[cost.placeId] += cost.amount;
      });

      return summary;
    },
  })),
);
```

#### B. コスト追加モーダル (`src/components/costs/CostModal.tsx`)

```typescript
import React, { useState, useEffect } from 'react';
import { XMarkIcon, CurrencyYenIcon } from '@heroicons/react/24/outline';
import { v4 as uuidv4 } from 'uuid';
import { useCostStore, type CostItem } from '@/stores/costStore';
import { useAuthStore } from '@/stores/authStore';
import type { Place } from '@/types/core';

interface CostModalProps {
  place: Place;
  cost?: CostItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (cost: CostItem) => void;
}

const categoryOptions = [
  { value: 'accommodation', label: '宿泊費', icon: '🏨' },
  { value: 'food', label: '飲食費', icon: '🍽️' },
  { value: 'transport', label: '交通費', icon: '🚌' },
  { value: 'activity', label: 'アクティビティ', icon: '🎯' },
  { value: 'shopping', label: 'ショッピング', icon: '🛍️' },
  { value: 'other', label: 'その他', icon: '💰' },
];

export const CostModal: React.FC<CostModalProps> = ({
  place,
  cost,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuthStore();
  const { addCost, updateCost } = useCostStore();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<CostItem['category']>('other');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!cost;

  useEffect(() => {
    if (cost) {
      setName(cost.name);
      setAmount(cost.amount.toString());
      setCategory(cost.category);
      setDate(cost.date ? cost.date.toISOString().split('T')[0] : '');
      setNotes(cost.notes || '');
    } else {
      setName('');
      setAmount('');
      setCategory('other');
      setDate('');
      setNotes('');
    }
  }, [cost]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !amount || !user) return;

    setIsSubmitting(true);

    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum < 0) {
        throw new Error('有効な金額を入力してください');
      }

      if (isEditMode && cost) {
        // 編集モード
        const updatedCost: CostItem = {
          ...cost,
          name: name.trim(),
          amount: amountNum,
          category,
          date: date ? new Date(date) : undefined,
          notes: notes.trim() || undefined,
        };

        updateCost(cost.id, updatedCost);
        onSuccess?.(updatedCost);
      } else {
        // 新規作成モード
        const newCost: CostItem = {
          id: uuidv4(),
          placeId: place.id,
          name: name.trim(),
          amount: amountNum,
          category,
          currency: 'JPY',
          date: date ? new Date(date) : undefined,
          notes: notes.trim() || undefined,
          createdAt: new Date(),
          createdBy: user.id,
        };

        addCost(newCost);
        onSuccess?.(newCost);
      }

      onClose();
    } catch (error) {
      console.error('Failed to save cost:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <CurrencyYenIcon className="w-5 h-5 mr-2" />
            {isEditMode ? 'コストを編集' : 'コストを追加'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-900">{place.name}</p>
            <p className="text-xs text-gray-600">{place.address}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              項目名 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="例：ランチ代"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              金額 (円) *
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="1000"
              min="0"
              step="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              カテゴリ
            </label>
            <div className="grid grid-cols-2 gap-2">
              {categoryOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCategory(option.value as CostItem['category'])}
                  className={`
                    flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors
                    ${category === option.value
                      ? 'bg-primary-100 text-primary-700 border-primary-300'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }
                  `}
                >
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              日付
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メモ
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="詳細や備考があれば..."
            />
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
              disabled={!name.trim() || !amount || isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting ? '保存中...' : (isEditMode ? '更新' : '追加')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

#### C. コスト円グラフ (`src/components/costs/CostPieChart.tsx`)

```typescript
import React, { useMemo } from 'react';
import { useCostStore } from '@/stores/costStore';

export const CostPieChart: React.FC = () => {
  const { getCostSummary } = useCostStore();
  const summary = getCostSummary();

  const chartData = useMemo(() => {
    const categories = [
      { key: 'accommodation', label: '宿泊費', color: '#3b82f6' },
      { key: 'food', label: '飲食費', color: '#ef4444' },
      { key: 'transport', label: '交通費', color: '#f59e0b' },
      { key: 'activity', label: 'アクティビティ', color: '#10b981' },
      { key: 'shopping', label: 'ショッピング', color: '#8b5cf6' },
      { key: 'other', label: 'その他', color: '#6b7280' },
    ];

    let total = summary.totalAmount;
    let cumulativePercentage = 0;

    return categories
      .filter(cat => summary.byCategory[cat.key as keyof typeof summary.byCategory] > 0)
      .map(cat => {
        const amount = summary.byCategory[cat.key as keyof typeof summary.byCategory];
        const percentage = total > 0 ? (amount / total) * 100 : 0;
        const startAngle = cumulativePercentage * 3.6; // 360度 / 100%
        const endAngle = (cumulativePercentage + percentage) * 3.6;

        cumulativePercentage += percentage;

        return {
          ...cat,
          amount,
          percentage,
          startAngle,
          endAngle,
        };
      });
  }, [summary]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  if (summary.totalAmount === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">コスト内訳</h3>
        <div className="text-center text-gray-500 py-8">
          <p>まだコストが追加されていません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">コスト内訳</h3>

      <div className="flex flex-col lg:flex-row items-center space-y-6 lg:space-y-0 lg:space-x-8">
        {/* 円グラフ */}
        <div className="relative">
          <svg width="200" height="200" className="transform -rotate-90">
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="20"
            />
            {chartData.map((segment, index) => {
              const radius = 80;
              const circumference = 2 * Math.PI * radius;
              const strokeDasharray = `${(segment.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((segment.startAngle / 360) * circumference);

              return (
                <circle
                  key={segment.key}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="20"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>

          {/* 中央の総額表示 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-sm text-gray-600">総額</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(summary.totalAmount)}
            </p>
          </div>
        </div>

        {/* 凡例 */}
        <div className="flex-1 space-y-3">
          {chartData.map(segment => (
            <div key={segment.key} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-sm font-medium text-gray-900">
                  {segment.label}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {formatCurrency(segment.amount)}
                </p>
                <p className="text-xs text-gray-600">
                  {segment.percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

### 3. 高度なUI機能

#### A. チュートリアルシステム (`src/components/tutorial/TutorialOverlay.tsx`)

```typescript
import React, { useState, useEffect } from 'react';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface TutorialStep {
  id: string;
  target: string; // CSS selector
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface TutorialOverlayProps {
  steps: TutorialStep[];
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  steps,
  isActive,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isActive || steps.length === 0) return;

    const step = steps[currentStep];
    const element = document.querySelector(step.target) as HTMLElement;

    if (element) {
      setTargetElement(element);

      // 要素の位置を計算
      const rect = element.getBoundingClientRect();
      const scrollX = window.pageXOffset;
      const scrollY = window.pageYOffset;

      let x = 0;
      let y = 0;

      switch (step.position) {
        case 'top':
          x = rect.left + scrollX + rect.width / 2;
          y = rect.top + scrollY - 10;
          break;
        case 'bottom':
          x = rect.left + scrollX + rect.width / 2;
          y = rect.bottom + scrollY + 10;
          break;
        case 'left':
          x = rect.left + scrollX - 10;
          y = rect.top + scrollY + rect.height / 2;
          break;
        case 'right':
          x = rect.right + scrollX + 10;
          y = rect.top + scrollY + rect.height / 2;
          break;
      }

      setTooltipPosition({ x, y });

      // 要素をハイライト
      element.style.position = 'relative';
      element.style.zIndex = '1001';
      element.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5)';
      element.style.borderRadius = '8px';

      // 要素までスクロール
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return () => {
      if (element) {
        element.style.position = '';
        element.style.zIndex = '';
        element.style.boxShadow = '';
        element.style.borderRadius = '';
      }
    };
  }, [currentStep, steps, isActive]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isActive || steps.length === 0) return null;

  const step = steps[currentStep];

  return (
    <>
      {/* オーバーレイ */}
      <div className="fixed inset-0 bg-black bg-opacity-60 z-1000" />

      {/* ツールチップ */}
      <div
        className="fixed z-1001 bg-white rounded-lg shadow-xl max-w-sm w-80 p-6"
        style={{
          left: tooltipPosition.x,
          top: tooltipPosition.y,
          transform: (() => {
            switch (step.position) {
              case 'top':
                return 'translate(-50%, -100%)';
              case 'bottom':
                return 'translate(-50%, 0%)';
              case 'left':
                return 'translate(-100%, -50%)';
              case 'right':
                return 'translate(0%, -50%)';
              default:
                return 'translate(-50%, -50%)';
            }
          })(),
        }}
      >
        {/* 矢印 */}
        <div
          className={`absolute w-0 h-0 border-solid ${
            step.position === 'top'
              ? 'border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white top-full left-1/2 transform -translate-x-1/2'
              : step.position === 'bottom'
              ? 'border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white bottom-full left-1/2 transform -translate-x-1/2'
              : step.position === 'left'
              ? 'border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-white left-full top-1/2 transform -translate-y-1/2'
              : 'border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-white right-full top-1/2 transform -translate-y-1/2'
          }`}
        />

        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 pr-4">
            {step.title}
          </h3>
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-700 mb-6">
          {step.content}
        </p>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {currentStep + 1} / {steps.length}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="w-4 h-4 mr-1" />
              戻る
            </button>

            <button
              onClick={handleNext}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
            >
              {currentStep === steps.length - 1 ? '完了' : '次へ'}
              {currentStep < steps.length - 1 && (
                <ChevronRightIcon className="w-4 h-4 ml-1" />
              )}
            </button>
          </div>
        </div>

        {/* 進捗バー */}
        <div className="mt-4 bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((currentStep + 1) / steps.length) * 100}%`,
            }}
          />
        </div>
      </div>
    </>
  );
};
```

#### B. アプリ設定画面 (`src/components/settings/SettingsPage.tsx`)

```typescript
import React, { useState } from 'react';
import {
  UserIcon,
  MapIcon,
  BellIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/stores/authStore';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';

export const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [showTutorial, setShowTutorial] = useState(false);

  // チュートリアルステップ
  const tutorialSteps = [
    {
      id: 'search',
      target: '[data-tutorial="search-bar"]',
      title: '場所を検索',
      content: 'この検索バーで訪問したい場所を検索できます。場所名や住所を入力してみてください。',
      position: 'bottom' as const,
    },
    {
      id: 'map',
      target: '[data-tutorial="map"]',
      title: '地図で確認',
      content: '検索した場所が地図上に表示されます。マーカーをクリックすると詳細情報を確認できます。',
      position: 'top' as const,
    },
    {
      id: 'memo',
      target: '[data-tutorial="memo-editor"]',
      title: 'メモを追加',
      content: '各場所にメモを追加できます。思い出や注意事項を記録しておきましょう。',
      position: 'left' as const,
    },
    {
      id: 'route',
      target: '[data-tutorial="route-panel"]',
      title: 'ルートを計算',
      content: '複数の場所を追加したら、ルート計算でおすすめの移動順序と所要時間を確認できます。',
      position: 'right' as const,
    },
  ];

  const settingSections = [
    {
      title: 'アカウント',
      icon: UserIcon,
      items: [
        { label: 'プロフィール編集', action: () => {} },
        { label: 'パスワード変更', action: () => {} },
        { label: 'アカウント削除', action: () => {}, danger: true },
      ],
    },
    {
      title: '地図設定',
      icon: MapIcon,
      items: [
        { label: 'デフォルトズームレベル', action: () => {} },
        { label: '地図スタイル', action: () => {} },
        { label: '現在地の使用', action: () => {} },
      ],
    },
    {
      title: '通知',
      icon: BellIcon,
      items: [
        { label: 'プッシュ通知', action: () => {} },
        { label: 'メール通知', action: () => {} },
        { label: '共有時の通知', action: () => {} },
      ],
    },
    {
      title: '言語・地域',
      icon: GlobeAltIcon,
      items: [
        { label: '表示言語', action: () => {} },
        { label: 'タイムゾーン', action: () => {} },
        { label: '通貨設定', action: () => {} },
      ],
    },
    {
      title: 'プライバシー・セキュリティ',
      icon: ShieldCheckIcon,
      items: [
        { label: 'プライバシー設定', action: () => {} },
        { label: 'データのエクスポート', action: () => {} },
        { label: 'データの削除', action: () => {}, danger: true },
      ],
    },
    {
      title: 'ヘルプ・サポート',
      icon: QuestionMarkCircleIcon,
      items: [
        {
          label: 'チュートリアルを再生',
          action: () => setShowTutorial(true)
        },
        { label: 'よくある質問', action: () => {} },
        { label: 'お問い合わせ', action: () => {} },
        { label: 'アプリについて', action: () => {} },
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">設定</h1>
        <p className="text-gray-600">
          アプリの設定をカスタマイズしてより良い体験を。
        </p>
      </div>

      {/* ユーザー情報 */}
      {user && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <UserIcon className="w-8 h-8 text-primary-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user.displayName || 'ユーザー'}
              </h2>
              <p className="text-gray-600">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* 設定セクション */}
      <div className="space-y-8">
        {settingSections.map((section, sectionIndex) => {
          const Icon = section.icon;
          return (
            <div key={sectionIndex} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Icon className="w-5 h-5 mr-2" />
                  {section.title}
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {section.items.map((item, itemIndex) => (
                  <button
                    key={itemIndex}
                    onClick={item.action}
                    className={`
                      w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors
                      ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-900'}
                    `}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* バージョン情報 */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>VoyageSketch v2.0.0</p>
        <p>© 2024 VoyageSketch. All rights reserved.</p>
      </div>

      {/* チュートリアル */}
      <TutorialOverlay
        steps={tutorialSteps}
        isActive={showTutorial}
        onComplete={() => setShowTutorial(false)}
        onSkip={() => setShowTutorial(false)}
      />
    </div>
  );
};
```

## 完成チェックリスト

### 共有機能

- [ ] 招待リンクの生成・管理が動作する
- [ ] 権限設定（閲覧者・編集者）が機能する
- [ ] 有効期限・使用回数制限が動作する
- [ ] 招待リンクからの参加が正常に動作する

### コスト管理

- [ ] コストの追加・編集・削除が動作する
- [ ] カテゴリ別の集計が正しく表示される
- [ ] 円グラフが適切に描画される
- [ ] 通貨フォーマットが正しく表示される

### 高度なUI機能

- [ ] チュートリアルが適切に動作する
- [ ] 設定画面が正常に表示される
- [ ] レスポンシブデザインが適用されている
- [ ] アクセシビリティが考慮されている

### 全体統合

- [ ] 全ての機能が連携して動作する
- [ ] パフォーマンスが良好
- [ ] エラーハンドリングが適切
- [ ] データの整合性が保たれている

## 次のフェーズ

高度な機能の実装が完了したら、`REBUILD_06_OPTIMIZATION.md`に進んで最適化・仕上げ作業を開始してください。

---

**重要**: この実装により、VoyageSketchは完全な機能を持つ旅行計画アプリケーションになります。共有機能により複数人での計画作成が可能になり、コスト管理で予算管理も行えます。チュートリアル機能により新規ユーザーの体験も向上します。
