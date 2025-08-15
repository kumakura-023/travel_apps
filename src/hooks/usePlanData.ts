import { useCallback, useRef, useMemo } from 'react';
import { useCurrentPlanWithData, useSelectedPlace, useSelectedLabel } from '../store/selectors/planSelectors';
import { usePlacesStore } from '../store/placesStore';
import { useLabelsStore } from '../store/labelsStore';
import { usePlanStore } from '../store/planStore';
import { useAuthStore } from './useAuth';
import { getPlanCoordinator } from '../services/ServiceContainer';
import { PlanViewModel, PlaceViewModel, LabelViewModel } from '../domain/models/PlanViewModel';
import { Place, Label } from '../types';

export interface PlanDataHook {
  plan: PlanViewModel | null;
  isLoading: boolean;
  error?: string;
  
  // プラン操作
  createPlan: (name: string) => Promise<void>;
  updatePlanName: (name: string) => Promise<void>;
  deletePlan: () => Promise<void>;
  duplicatePlan: () => Promise<void>;
  
  // 場所操作
  addPlace: (place: Partial<Place>) => Promise<void>;
  updatePlace: (id: string, update: Partial<Place>) => Promise<void>;
  deletePlace: (id: string) => Promise<void>;
  selectPlace: (id: string | null) => void;
  
  // ラベル操作
  addLabel: (label: Partial<Label>) => Promise<void>;
  updateLabel: (id: string, update: Partial<Label>) => Promise<void>;
  deleteLabel: (id: string) => Promise<void>;
  selectLabel: (id: string | null) => void;
}

export function usePlanData(): PlanDataHook {
  // 内部でセレクターを使用するが、外部には公開しない
  const planWithData = useCurrentPlanWithData();
  const selectedPlace = useSelectedPlace();
  const selectedLabel = useSelectedLabel();
  const isLoading = usePlanStore((s) => s.isLoading);
  const error = usePlanStore((s) => s.error);
  
  // サービスへの参照
  const planCoordinatorRef = useRef(getPlanCoordinator());
  
  // ビューモデルの構築
  const plan: PlanViewModel | null = useMemo(() => {
    if (!planWithData) return null;
    
    const placesWithSelection: PlaceViewModel[] = planWithData.places.map(p => ({
      id: p.id,
      name: p.name,
      position: p.coordinates,
      category: p.category,
      estimatedCost: p.estimatedCost || 0,
      memo: p.memo || '',
      imageUrls: p.imageUrls || [],
      isSelected: p.id === selectedPlace?.id
    }));
    
    const labelsWithSelection: LabelViewModel[] = planWithData.labels.map(l => ({
      id: l.id,
      text: l.text || '',
      position: l.position,
      color: l.color || '#000000',
      fontSize: l.fontSize || 14,
      isSelected: l.id === selectedLabel?.id
    }));
    
    return {
      id: planWithData.id,
      name: planWithData.name,
      description: planWithData.description,
      places: placesWithSelection,
      labels: labelsWithSelection,
      totalCost: planWithData.totalCost,
      placeCount: planWithData.placeCount,
      labelCount: planWithData.labelCount,
      isLoading,
      error
    };
  }, [planWithData, selectedPlace, selectedLabel, isLoading, error]);
  
  // 操作の実装
  const createPlan = useCallback(async (name: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('User not authenticated');
    
    const unifiedPlanService = planCoordinatorRef.current.getPlanService();
    const result = await unifiedPlanService.createPlan(user.uid, name);
    if (!result.success) {
      throw result.error;
    }
  }, []);
  
  const updatePlanName = useCallback(async (name: string) => {
    if (!plan) return;
    
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('User not authenticated');
    
    const unifiedPlanService = planCoordinatorRef.current.getPlanService();
    const result = await unifiedPlanService.updatePlanName(user.uid, plan.id, name);
    if (!result.success) {
      throw result.error;
    }
  }, [plan]);
  
  const deletePlan = useCallback(async () => {
    if (!plan) return;
    
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('User not authenticated');
    
    const unifiedPlanService = planCoordinatorRef.current.getPlanService();
    const result = await unifiedPlanService.deletePlan(user.uid, plan.id);
    if (!result.success) {
      throw result.error;
    }
  }, [plan]);
  
  const duplicatePlan = useCallback(async () => {
    if (!plan) return;
    
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('User not authenticated');
    
    const unifiedPlanService = planCoordinatorRef.current.getPlanService();
    const result = await unifiedPlanService.duplicatePlan(user.uid, plan.id);
    if (!result.success) {
      throw result.error;
    }
  }, [plan]);
  
  const addPlace = useCallback(async (placeData: Partial<Place>) => {
    if (!plan) return;
    
    const completePlace: Place = {
      id: crypto.randomUUID(),
      name: placeData.name || '',
      coordinates: placeData.coordinates!,
      category: placeData.category || 'other',
      estimatedCost: placeData.estimatedCost || 0,
      memo: placeData.memo || '',
      imageUrls: placeData.imageUrls || [],
      deleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const unifiedPlanService = planCoordinatorRef.current.getPlanService();
    await unifiedPlanService.addPlace(plan.id, completePlace);
  }, [plan]);
  
  const updatePlace = useCallback(async (id: string, update: Partial<Place>) => {
    if (!plan) return;
    
    const unifiedPlanService = planCoordinatorRef.current.getPlanService();
    await unifiedPlanService.updatePlace(plan.id, id, update);
  }, [plan]);
  
  const deletePlace = useCallback(async (id: string) => {
    if (!plan) return;
    
    const unifiedPlanService = planCoordinatorRef.current.getPlanService();
    await unifiedPlanService.deletePlace(plan.id, id);
  }, [plan]);
  
  const selectPlace = useCallback((id: string | null) => {
    usePlacesStore.getState().selectPlace(id);
  }, []);
  
  const addLabel = useCallback(async (labelData: Partial<Label>) => {
    if (!plan) return;
    
    const completeLabel: Label = {
      id: crypto.randomUUID(),
      text: labelData.text || '',
      position: labelData.position!,
      color: labelData.color || '#000000',
      fontSize: labelData.fontSize || 14,
      deleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const unifiedPlanService = planCoordinatorRef.current.getPlanService();
    await unifiedPlanService.addLabel(plan.id, completeLabel);
  }, [plan]);
  
  const updateLabel = useCallback(async (id: string, update: Partial<Label>) => {
    if (!plan) return;
    
    const unifiedPlanService = planCoordinatorRef.current.getPlanService();
    await unifiedPlanService.updateLabel(plan.id, id, update);
  }, [plan]);
  
  const deleteLabel = useCallback(async (id: string) => {
    if (!plan) return;
    
    const unifiedPlanService = planCoordinatorRef.current.getPlanService();
    await unifiedPlanService.deleteLabel(plan.id, id);
  }, [plan]);
  
  const selectLabel = useCallback((id: string | null) => {
    useLabelsStore.getState().selectLabel(id);
  }, []);
  
  return {
    plan,
    isLoading,
    error: error || undefined,
    createPlan,
    updatePlanName,
    deletePlan,
    duplicatePlan,
    addPlace,
    updatePlace,
    deletePlace,
    selectPlace,
    addLabel,
    updateLabel,
    deleteLabel,
    selectLabel
  };
}