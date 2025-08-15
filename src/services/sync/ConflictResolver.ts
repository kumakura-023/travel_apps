import { VersionedPlan, ConflictInfo, ConflictResolutionStrategy } from '../../types/ConflictResolution';

export class ConflictResolver {
  constructor(private strategy: ConflictResolutionStrategy = 'last-write-wins') {}

  resolve(conflicts: ConflictInfo[], local: VersionedPlan, remote: VersionedPlan): VersionedPlan {
    switch (this.strategy) {
      case 'last-write-wins':
        return this.resolveWithLastWriteWins(conflicts, local, remote);
      case 'merge-non-conflicting':
        return this.resolveWithMerge(conflicts, local, remote);
      case 'user-choice':
        return this.resolveWithUserChoice(conflicts, local, remote);
      default:
        throw new Error(`Unknown strategy: ${this.strategy}`);
    }
  }

  detectConflicts(local: VersionedPlan, remote: VersionedPlan): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];

    if (local.updatedAt.getTime() === remote.updatedAt.getTime()) {
      return conflicts;
    }

    conflicts.push(...this.detectPlaceConflicts(local, remote));
    conflicts.push(...this.detectLabelConflicts(local, remote));

    return conflicts;
  }

  private resolveWithLastWriteWins(conflicts: ConflictInfo[], local: VersionedPlan, remote: VersionedPlan): VersionedPlan {
    return remote.updatedAt.getTime() > local.updatedAt.getTime() ? remote : local;
  }

  private resolveWithMerge(conflicts: ConflictInfo[], local: VersionedPlan, remote: VersionedPlan): VersionedPlan {
    const merged = { ...local };
    
    remote.places.forEach(remotePlace => {
      const localPlace = local.places.find(p => p.id === remotePlace.id);
      if (!localPlace) {
        merged.places.push(remotePlace);
      }
    });

    remote.labels.forEach(remoteLabel => {
      const localLabel = local.labels.find(l => l.id === remoteLabel.id);
      if (!localLabel) {
        merged.labels.push(remoteLabel);
      }
    });

    merged.updatedAt = new Date(Math.max(
      local.updatedAt.getTime(),
      remote.updatedAt.getTime()
    ));

    return merged;
  }

  private resolveWithUserChoice(_conflicts: ConflictInfo[], local: VersionedPlan, _remote: VersionedPlan): VersionedPlan {
    return local;
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
}