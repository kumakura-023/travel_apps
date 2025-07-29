import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { MapLabel } from '../types';
import { syncDebugUtils } from '../utils/syncDebugUtils';
import { usePlanStore } from './planStore';

interface LabelsState {
  labels: MapLabel[];
  onLabelAdded?: (label: MapLabel) => void;
  onLabelUpdated?: (updatedLabel: MapLabel, allLabels: MapLabel[]) => void; // 変更されたラベルと全ラベルを渡す
  onLabelDeleted?: (updatedLabels: MapLabel[]) => void; // 削除完了時に全ラベルを渡す
  setOnLabelAdded: (callback: (label: MapLabel) => void) => void;
  setOnLabelUpdated: (callback: (updatedLabel: MapLabel, allLabels: MapLabel[]) => void) => void;
  setOnLabelDeleted: (callback: (updatedLabels: MapLabel[]) => void) => void;
  addLabel: (partial: Partial<MapLabel>) => void;
  updateLabel: (id: string, update: Partial<MapLabel>) => void;
  deleteLabel: (id: string) => void;
  clearLabels: () => void;
}

export const useLabelsStore = create<LabelsState>((set, get) => ({
  labels: [],
  onLabelAdded: undefined,
  onLabelUpdated: undefined,
  onLabelDeleted: undefined,
  setOnLabelAdded: (callback) => set({ onLabelAdded: callback }),
  setOnLabelUpdated: (callback) => set({ onLabelUpdated: callback }),
  setOnLabelDeleted: (callback) => set({ onLabelDeleted: callback }),
  addLabel: (partial) =>
    set((s) => {
      const newLabel = {
        width: 120,
        height: 40,
        color: '#000000',
        fontSize: 14,
        fontFamily: 'sans-serif',
        status: 'new', // 新規作成時は'new'ステータス
        ...partial,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as MapLabel;

      const newState = {
        labels: [...s.labels, newLabel],
      };

      if (s.onLabelAdded) {
        s.onLabelAdded(newLabel);
      }
      
      // ローカルストレージへの保存は無効化（プラン共有位置のみを使用）
      if (newLabel.position) {
        // saveLastActionPosition(newLabel.position);
        
        // Firestoreに最後の操作位置を保存（プラン共有）
        usePlanStore.getState().updateLastActionPosition(newLabel.position, 'label').catch(error => {
          console.error('[labelsStore] Failed to update last action position:', error);
        });
      }

      return newState;
    }),
  updateLabel: (id, update) => {
    set((s) => {
      let updatedLabel: MapLabel | null = null;
      const updatedLabels = s.labels.map((l) => {
        if (l.id === id) {
          updatedLabel = { ...l, ...update, updatedAt: new Date() };
          return updatedLabel;
        }
        return l;
      });

      if (s.onLabelUpdated && updatedLabel) {
        s.onLabelUpdated(updatedLabel, updatedLabels);
      }

      return { labels: updatedLabels };
    });
  },
  deleteLabel: (id) => {
    if (import.meta.env.DEV) {
      console.log(`deleteLabel called: ${id}`);
    }
    set((s) => {
      const labelToDelete = s.labels.find((l) => l.id === id);
      if (!labelToDelete) return { labels: s.labels };

      const filteredLabels = s.labels.filter((l) => l.id !== id);
      
      if (import.meta.env.DEV) {
        console.log(`Deleting label: ${labelToDelete.text} (${id})`);
        syncDebugUtils.log('delete', {
          type: 'label',
          id: labelToDelete.id,
          text: labelToDelete.text,
          timestamp: new Date().getTime(),
          totalLabelsBefore: s.labels.length,
          totalLabelsAfter: filteredLabels.length,
        });
      }

      // 削除コールバックを実行（状態更新後）
      if (s.onLabelDeleted) {
        s.onLabelDeleted(filteredLabels);
      }

      if (import.meta.env.DEV) {
        console.log(`Labels: ${s.labels.length} -> ${filteredLabels.length}`);
      }
      return { labels: filteredLabels };
    });
  },
  clearLabels: () => set({ labels: [] }),
})); 