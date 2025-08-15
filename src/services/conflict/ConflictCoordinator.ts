import { ConflictDetector } from './ConflictDetector';
import { ConflictResolver } from '../sync/ConflictResolver';
import { SessionManager } from './SessionManager';
import { VersionedPlan, ResolutionLog } from '../../types/ConflictResolution';

export class ConflictCoordinator {
  constructor(
    private detector: ConflictDetector,
    private resolver: ConflictResolver,
    private sessionManager: SessionManager
  ) {}

  handleRemoteChange(local: VersionedPlan, remote: VersionedPlan): {
    resolved: VersionedPlan;
    hadConflicts: boolean;
    resolutionLog: ResolutionLog;
  } {
    if (this.detector.isSelfChange(remote.lastChange, this.sessionManager.currentSessionId)) {
      return {
        resolved: local,
        hadConflicts: false,
        resolutionLog: { reason: 'self-change', timestamp: Date.now() }
      };
    }

    const conflicts = this.detector.detectConflicts(local, remote);

    if (conflicts.length === 0) {
      return {
        resolved: remote,
        hadConflicts: false,
        resolutionLog: { reason: 'no-conflicts', timestamp: Date.now() }
      };
    }

    const resolved = this.resolver.resolve(conflicts, local, remote);

    return {
      resolved,
      hadConflicts: true,
      resolutionLog: {
        reason: 'conflicts-resolved',
        conflicts: conflicts.length,
        strategy: 'merge-non-conflicting',
        timestamp: Date.now()
      }
    };
  }
}