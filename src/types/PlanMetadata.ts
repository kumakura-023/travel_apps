export interface PlanMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  endDate: Date | null;
  startDate: Date | null;
  ownerId?: string;
  members?: Record<string, { role: string; joinedAt: Date }>;
  lastActionPosition?: {
    position: {
      lat: number;
      lng: number;
    };
    timestamp: Date;
    userId: string;
    actionType: "place" | "label";
  };
}

export interface PlanSettings {
  autoSave: boolean;
  conflictResolution: "manual" | "auto-merge" | "last-write-wins";
  shareSettings: {
    isPublic: boolean;
    allowComments: boolean;
    allowEdits: boolean;
  };
}
