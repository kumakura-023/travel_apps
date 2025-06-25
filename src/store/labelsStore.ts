import { create } from 'zustand';
import { MapLabel } from '../types';
import { v4 as uuidv4 } from 'uuid';

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
    const newLabel: MapLabel = {
      id: uuidv4(),
      text,
      position,
      fontSize,
      fontFamily: 'sans-serif',
      color: '#202124',
      width: 120,
      height: 32,
    };
    set((s) => ({ labels: [...s.labels, newLabel] }));
    return newLabel;
  },
  updateLabel: (id, update) =>
    set((s) => ({ labels: s.labels.map((l) => (l.id === id ? { ...l, ...update } : l)) })),
  deleteLabel: (id) => set((s) => ({ labels: s.labels.filter((l) => l.id !== id) })),
})); 