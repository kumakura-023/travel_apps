import { Place, MapLabel } from "../../types";
import {
  VersionedPlan,
  ConflictInfo,
  ChangeMetadata,
} from "../../types/ConflictResolution";

export class ConflictDetector {
  detectConflicts(local: VersionedPlan, remote: VersionedPlan): ConflictInfo[] {
    // バージョン番号ベースの競合検知
    if (local.version === remote.version) {
      return []; // 競合なし
    }

    return this.analyzeChanges(local, remote);
  }

  private analyzeChanges(
    local: VersionedPlan,
    remote: VersionedPlan,
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];

    // メタデータの競合チェック
    conflicts.push(...this.detectMetadataConflicts(local, remote));

    // Places の競合チェック
    conflicts.push(
      ...this.detectPlaceConflicts(local.places || [], remote.places || []),
    );

    // Labels の競合チェック
    conflicts.push(
      ...this.detectLabelConflicts(local.labels || [], remote.labels || []),
    );

    return conflicts;
  }

  private detectMetadataConflicts(
    local: VersionedPlan,
    remote: VersionedPlan,
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];

    // プラン名の競合
    if (local.name !== remote.name) {
      conflicts.push({
        type: "metadata",
        itemId: local.id,
        field: "name",
        localValue: local.name,
        remoteValue: remote.name,
        localChange: local.lastChange,
        remoteChange: remote.lastChange,
        severity: "medium",
      });
    }

    // 説明の競合
    if (local.description !== remote.description) {
      conflicts.push({
        type: "metadata",
        itemId: local.id,
        field: "description",
        localValue: local.description,
        remoteValue: remote.description,
        localChange: local.lastChange,
        remoteChange: remote.lastChange,
        severity: "low",
      });
    }

    // 日付の競合
    if (local.startDate?.getTime() !== remote.startDate?.getTime()) {
      conflicts.push({
        type: "metadata",
        itemId: local.id,
        field: "startDate",
        localValue: local.startDate,
        remoteValue: remote.startDate,
        localChange: local.lastChange,
        remoteChange: remote.lastChange,
        severity: "high",
      });
    }

    if (local.endDate?.getTime() !== remote.endDate?.getTime()) {
      conflicts.push({
        type: "metadata",
        itemId: local.id,
        field: "endDate",
        localValue: local.endDate,
        remoteValue: remote.endDate,
        localChange: local.lastChange,
        remoteChange: remote.lastChange,
        severity: "high",
      });
    }

    return conflicts;
  }

  private detectPlaceConflicts(
    localPlaces: Place[],
    remotePlaces: Place[],
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];
    const localPlaceMap = new Map(localPlaces.map((p) => [p.id, p]));
    const remotePlaceMap = new Map(remotePlaces.map((p) => [p.id, p]));

    // 共通の場所の競合チェック
    for (const [id, localPlace] of localPlaceMap) {
      const remotePlace = remotePlaceMap.get(id);
      if (remotePlace) {
        conflicts.push(...this.comparePlaces(localPlace, remotePlace));
      }
    }

    // 削除/追加の競合（一方にのみ存在する場所）
    for (const [id, localPlace] of localPlaceMap) {
      if (!remotePlaceMap.has(id)) {
        conflicts.push({
          type: "place",
          itemId: id,
          field: "existence",
          localValue: localPlace,
          remoteValue: null,
          localChange: this.createDummyChange(localPlace.updatedAt, "delete"),
          remoteChange: this.createDummyChange(new Date(), "delete"),
          severity: "high",
        });
      }
    }

    for (const [id, remotePlace] of remotePlaceMap) {
      if (!localPlaceMap.has(id)) {
        conflicts.push({
          type: "place",
          itemId: id,
          field: "existence",
          localValue: null,
          remoteValue: remotePlace,
          localChange: this.createDummyChange(new Date(), "add"),
          remoteChange: this.createDummyChange(remotePlace.updatedAt, "add"),
          severity: "high",
        });
      }
    }

    return conflicts;
  }

  private comparePlaces(local: Place, remote: Place): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];
    const fields = [
      "name",
      "address",
      "category",
      "memo",
      "estimatedCost",
      "scheduledDay",
    ];

    for (const field of fields) {
      const localValue = (local as any)[field];
      const remoteValue = (remote as any)[field];

      if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
        conflicts.push({
          type: "place",
          itemId: local.id,
          field,
          localValue,
          remoteValue,
          localChange: this.createDummyChange(local.updatedAt, "update"),
          remoteChange: this.createDummyChange(remote.updatedAt, "update"),
          severity: this.getFieldSeverity("place", field),
        });
      }
    }

    // 座標の競合チェック（より精密に）
    if (
      Math.abs(local.coordinates.lat - remote.coordinates.lat) > 0.000001 ||
      Math.abs(local.coordinates.lng - remote.coordinates.lng) > 0.000001
    ) {
      conflicts.push({
        type: "place",
        itemId: local.id,
        field: "coordinates",
        localValue: local.coordinates,
        remoteValue: remote.coordinates,
        localChange: this.createDummyChange(local.updatedAt, "update"),
        remoteChange: this.createDummyChange(remote.updatedAt, "update"),
        severity: "high",
      });
    }

    return conflicts;
  }

  private detectLabelConflicts(
    localLabels: MapLabel[],
    remoteLabels: MapLabel[],
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];
    const localLabelMap = new Map(localLabels.map((l) => [l.id, l]));
    const remoteLabelMap = new Map(remoteLabels.map((l) => [l.id, l]));

    // 共通のラベルの競合チェック
    for (const [id, localLabel] of localLabelMap) {
      const remoteLabel = remoteLabelMap.get(id);
      if (remoteLabel) {
        conflicts.push(...this.compareLabels(localLabel, remoteLabel));
      }
    }

    // 削除/追加の競合
    for (const [id, localLabel] of localLabelMap) {
      if (!remoteLabelMap.has(id)) {
        conflicts.push({
          type: "label",
          itemId: id,
          field: "existence",
          localValue: localLabel,
          remoteValue: null,
          localChange: this.createDummyChange(localLabel.updatedAt, "delete"),
          remoteChange: this.createDummyChange(new Date(), "delete"),
          severity: "medium",
        });
      }
    }

    for (const [id, remoteLabel] of remoteLabelMap) {
      if (!localLabelMap.has(id)) {
        conflicts.push({
          type: "label",
          itemId: id,
          field: "existence",
          localValue: null,
          remoteValue: remoteLabel,
          localChange: this.createDummyChange(new Date(), "add"),
          remoteChange: this.createDummyChange(remoteLabel.updatedAt, "add"),
          severity: "medium",
        });
      }
    }

    return conflicts;
  }

  private compareLabels(local: MapLabel, remote: MapLabel): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];
    const fields = [
      "text",
      "fontSize",
      "fontFamily",
      "color",
      "width",
      "height",
      "linkedPlaceId",
    ];

    for (const field of fields) {
      const localValue = (local as any)[field];
      const remoteValue = (remote as any)[field];

      if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
        conflicts.push({
          type: "label",
          itemId: local.id,
          field,
          localValue,
          remoteValue,
          localChange: this.createDummyChange(local.updatedAt, "update"),
          remoteChange: this.createDummyChange(remote.updatedAt, "update"),
          severity: this.getFieldSeverity("label", field),
        });
      }
    }

    // 位置の競合チェック
    if (
      Math.abs(local.position.lat - remote.position.lat) > 0.000001 ||
      Math.abs(local.position.lng - remote.position.lng) > 0.000001
    ) {
      conflicts.push({
        type: "label",
        itemId: local.id,
        field: "position",
        localValue: local.position,
        remoteValue: remote.position,
        localChange: this.createDummyChange(local.updatedAt, "update"),
        remoteChange: this.createDummyChange(remote.updatedAt, "update"),
        severity: "high",
      });
    }

    return conflicts;
  }

  private getFieldSeverity(
    type: "place" | "label",
    field: string,
  ): "low" | "medium" | "high" {
    const highSeverityFields = {
      place: ["coordinates", "category", "scheduledDay"],
      label: ["position", "linkedPlaceId"],
    };

    const mediumSeverityFields = {
      place: ["name", "estimatedCost"],
      label: ["text", "fontSize"],
    };

    if (highSeverityFields[type]?.includes(field)) return "high";
    if (mediumSeverityFields[type]?.includes(field)) return "medium";
    return "low";
  }

  private createDummyChange(
    timestamp: Date,
    operationType: "add" | "update" | "delete",
  ): ChangeMetadata {
    return {
      timestamp: timestamp.getTime(),
      userId: "unknown",
      sessionId: "unknown",
      operationType,
      changeId: `dummy_${timestamp.getTime()}`,
    };
  }

  isSelfChange(change: ChangeMetadata, currentSessionId: string): boolean {
    return change.sessionId === currentSessionId;
  }

  isRecentChange(change: ChangeMetadata, thresholdMs: number = 5000): boolean {
    return Date.now() - change.timestamp < thresholdMs;
  }
}
