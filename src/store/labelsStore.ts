import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { MapLabel } from '../types';
import { syncDebugUtils } from '../utils/syncDebugUtils';

interface LabelsState {
  labels: MapLabel[];
  onLabelAdded?: (label: MapLabel) => void;
  onLabelUpdated?: (updatedLabels: MapLabel[]) => void; // 編集完了時に全ラベルを渡す
  onLabelDeleted?: (updatedLabels: MapLabel[]) => void; // 削除完了時に全ラベルを渡す
  setOnLabelAdded: (callback: (label: MapLabel) => void) => void;
  setOnLabelUpdated: (callback: (updatedLabels: MapLabel[]) => void) => void;
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
        width: 120, // デフォルト幅
        height: 40, // デフォルト高さ
        color: '#000000', // デフォルト文字色
        fontSize: 14, // デフォルトフォントサイズ
        fontFamily: 'sans-serif', // デフォルトフォント
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
  updateLabel: (id, update) => {
    set((s) => {
      const updatedLabels = s.labels.map((l) =>
        l.id === id ? { ...l, ...update, updatedAt: new Date() } : l
      );
      
      // 更新コールバックを実行
      if (s.onLabelUpdated) {
        s.onLabelUpdated(updatedLabels);
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