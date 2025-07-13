import { create } from 'zustand';
import { MapLabel } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { syncDebugUtils } from '../utils/syncDebugUtils';

interface LabelsState {
  labels: MapLabel[];
  addLabel: (
    text: string,
    position: { lat: number; lng: number },
    fontSize?: number,
  ) => MapLabel;
  updateLabel: (id: string, update: Partial<MapLabel>) => void;
  deleteLabel: (id: string) => void;
}

export const useLabelsStore = create<LabelsState>((set) => ({
  labels: [],
  addLabel: (text, position, fontSize = 14) => {
    const now = new Date();
    const newLabel: MapLabel = {
      id: uuidv4(),
      text,
      position,
      fontSize,
      fontFamily: 'sans-serif',
      color: '#202124',
      width: 120,
      height: 32,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ labels: [...s.labels, newLabel] }));
    return newLabel;
  },
  updateLabel: (id, update) =>
    set((s) => ({ 
      labels: s.labels.map((l) => (l.id === id ? { ...l, ...update, updatedAt: new Date() } : l)) 
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
      }
      
      const filteredLabels = s.labels.filter((l) => l.id !== id);
      if (import.meta.env.DEV) {
        console.log(`Labels: ${s.labels.length} -> ${filteredLabels.length}`);
      }
      return { labels: filteredLabels };
    });
  },
})); 