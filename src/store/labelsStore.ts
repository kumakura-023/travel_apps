import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { MapLabel } from '../types';
import { syncDebugUtils } from '../utils/syncDebugUtils';

interface LabelsState {
  labels: MapLabel[];
  onLabelAdded?: (label: MapLabel) => void;
  onLabelDeleted?: (label: MapLabel) => void;
  setOnLabelAdded: (callback: (label: MapLabel) => void) => void;
  setOnLabelDeleted: (callback: (label: MapLabel) => void) => void;
  addLabel: (partial: Partial<MapLabel>) => void;
  updateLabel: (id: string, update: Partial<MapLabel>) => void;
  deleteLabel: (id: string) => void;
  clearLabels: () => void;
}

export const useLabelsStore = create<LabelsState>((set) => ({
  labels: [],
  onLabelAdded: undefined,
  onLabelDeleted: undefined,
  setOnLabelAdded: (callback) => set({ onLabelAdded: callback }),
  setOnLabelDeleted: (callback) => set({ onLabelDeleted: callback }),
  addLabel: (partial) =>
    set((s) => {
      const newLabel = {
        ...partial,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as MapLabel;

      const newState = {
        labels: [...s.labels, newLabel],
      };

      // 即座同期コールバックを実行
      if (s.onLabelAdded) {
        s.onLabelAdded(newLabel);
      }

      return newState;
    }),
  updateLabel: (id, update) =>
    set((s) => ({
      labels: s.labels.map((l) => (l.id === id ? { ...l, ...update, updatedAt: new Date() } : l)),
    })),
  deleteLabel: (id) => {
    if (import.meta.env.DEV) {
      console.log(`deleteLabel called: ${id}`);
    }
    set((s) => {
      const labelToDelete = s.labels.find(l => l.id === id);
      if (labelToDelete) {
        if (import.meta.env.DEV) {
          console.log(`Deleting label: ${labelToDelete.text} (${id})`);
        }
        // 削除前にタイムスタンプを更新して同期を確実にする
        const updatedLabel = { ...labelToDelete, updatedAt: new Date() };
        if (import.meta.env.DEV) {
          console.log(`Updated timestamp before deletion: ${updatedLabel.updatedAt.toISOString()}`);
        }
        
        // デバッグログを記録
        syncDebugUtils.log('delete', {
          type: 'label',
          id: labelToDelete.id,
          text: labelToDelete.text,
          timestamp: updatedLabel.updatedAt.getTime(),
          totalLabelsBefore: s.labels.length,
          totalLabelsAfter: s.labels.length - 1
        });

        // 削除コールバックを実行
        if (s.onLabelDeleted) {
          s.onLabelDeleted(updatedLabel);
        }
      }
      
      const filteredLabels = s.labels.filter((l) => l.id !== id);
      if (import.meta.env.DEV) {
        console.log(`Labels: ${s.labels.length} -> ${filteredLabels.length}`);
      }
      return { labels: filteredLabels };
    });
  },
  clearLabels: () => set({ labels: [] }),
})); 