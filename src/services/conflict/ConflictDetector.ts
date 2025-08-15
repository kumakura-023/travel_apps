import { VersionedPlan, ConflictInfo, ChangeMetadata } from '../../types/ConflictResolution';

export class ConflictDetector {
  detectConflicts(local: VersionedPlan, remote: VersionedPlan): ConflictInfo[] {
    if (local.version === remote.version) {
      return [];
    }

    return this.analyzeChanges(local, remote);
  }

  private analyzeChanges(local: VersionedPlan, remote: VersionedPlan): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];

    conflicts.push(...this.detectPlaceConflicts(local, remote));
    conflicts.push(...this.detectLabelConflicts(local, remote));

    return conflicts;
  }

  private detectPlaceConflicts(local: VersionedPlan, remote: VersionedPlan): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];
    
    local.places.forEach(localPlace => {
      const remotePlace = remote.places.find(p => p.id === localPlace.id);
      if (remotePlace && JSON.stringify(localPlace) !== JSON.stringify(remotePlace)) {
        conflicts.push({
          type: 'place',
          itemId: localPlace.id,
          field: 'content',
          localValue: localPlace,
          remoteValue: remotePlace
        });
      }
    });

    return conflicts;
  }

  private detectLabelConflicts(local: VersionedPlan, remote: VersionedPlan): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];
    
    local.labels.forEach(localLabel => {
      const remoteLabel = remote.labels.find(l => l.id === localLabel.id);
      if (remoteLabel && JSON.stringify(localLabel) !== JSON.stringify(remoteLabel)) {
        conflicts.push({
          type: 'label',
          itemId: localLabel.id,
          field: 'content',
          localValue: localLabel,
          remoteValue: remoteLabel
        });
      }
    });

    return conflicts;
  }

  isSelfChange(change: ChangeMetadata, currentSessionId: string): boolean {
    return change.sessionId === currentSessionId;
  }
}