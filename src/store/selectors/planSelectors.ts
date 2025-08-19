import { useMemo } from "react";
import { usePlanStore } from "../planStore";
import { usePlacesStore } from "../placesStore";
import { useLabelsStore } from "../labelsStore";
import { TravelPlan, Place, Label } from "../../types";

interface PlanWithData {
  id: string;
  name: string;
  description?: string;
  places: Place[];
  labels: Label[];
  totalCost: number;
  placeCount: number;
  labelCount: number;
  createdAt: Date;
  updatedAt: Date;
  isLoading: boolean;
  error?: string;
}

export function usePlanWithData(planId: string | null): PlanWithData | null {
  const planMeta = usePlanStore((s) => (planId ? s.getCurrentPlan() : null));

  const places = usePlacesStore((s) =>
    planId ? s.getPlacesForPlan(planId) : [],
  );

  const labels = useLabelsStore((s) =>
    planId ? s.getLabelsForPlan(planId) : [],
  );

  const isLoading = usePlanStore((s) => s.isLoading);
  const error = usePlanStore((s) => s.error);

  return useMemo(() => {
    if (!planMeta || !planId) return null;

    return {
      id: planMeta.id,
      name: planMeta.name,
      description: planMeta.description,
      places,
      labels,
      totalCost: places.reduce((sum, p) => sum + (p.estimatedCost || 0), 0),
      placeCount: places.length,
      labelCount: labels.length,
      createdAt: planMeta.createdAt,
      updatedAt: planMeta.updatedAt,
      isLoading,
      error: error || undefined,
    };
  }, [planMeta, places, labels, isLoading, error, planId]);
}

export function useCurrentPlanWithData(): PlanWithData | null {
  const currentPlan = usePlanStore((s) => s.getCurrentPlan());
  return usePlanWithData(currentPlan?.id || null);
}

export function usePlacesForCurrentPlan(): Place[] {
  const currentPlan = usePlanStore((s) => s.getCurrentPlan());
  return usePlacesStore((s) =>
    currentPlan ? s.getPlacesForPlan(currentPlan.id) : [],
  );
}

export function useLabelsForCurrentPlan(): Label[] {
  const currentPlan = usePlanStore((s) => s.getCurrentPlan());
  return useLabelsStore((s) =>
    currentPlan ? s.getLabelsForPlan(currentPlan.id) : [],
  );
}

export function useSelectedPlace(): Place | null {
  const currentPlan = usePlanStore((s) => s.getCurrentPlan());
  const selectedPlaceId = usePlacesStore((s) => s.selectedPlaceId);

  return usePlacesStore((s) => {
    if (!currentPlan || !selectedPlaceId) return null;
    return s.getPlaceById(currentPlan.id, selectedPlaceId) || null;
  });
}

export function useSelectedLabel(): Label | null {
  const currentPlan = usePlanStore((s) => s.getCurrentPlan());
  const selectedLabelId = useLabelsStore((s) => s.selectedLabelId);

  return useLabelsStore((s) => {
    if (!currentPlan || !selectedLabelId) return null;
    return s.getLabelById(currentPlan.id, selectedLabelId) || null;
  });
}

export function usePlanStatistics() {
  const planWithData = useCurrentPlanWithData();

  return useMemo(() => {
    if (!planWithData) {
      return {
        totalPlaces: 0,
        totalLabels: 0,
        totalCost: 0,
        averageCostPerPlace: 0,
        hasData: false,
      };
    }

    return {
      totalPlaces: planWithData.placeCount,
      totalLabels: planWithData.labelCount,
      totalCost: planWithData.totalCost,
      averageCostPerPlace:
        planWithData.placeCount > 0
          ? planWithData.totalCost / planWithData.placeCount
          : 0,
      hasData: planWithData.placeCount > 0 || planWithData.labelCount > 0,
    };
  }, [planWithData]);
}

// 互換性のためのレガシーセレクター
export function useCurrentPlan(): TravelPlan | null {
  const planWithData = useCurrentPlanWithData();

  return useMemo(() => {
    if (!planWithData) return null;

    return {
      id: planWithData.id,
      name: planWithData.name,
      description: planWithData.description || "",
      places: planWithData.places,
      labels: planWithData.labels,
      totalCost: planWithData.totalCost,
      createdAt: planWithData.createdAt,
      updatedAt: planWithData.updatedAt,
      isActive: true,
      endDate: null,
      startDate: null,
      ownerId: "", // 互換性のため
    };
  }, [planWithData]);
}
