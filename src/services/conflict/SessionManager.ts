import { ChangeMetadata, OperationType } from '../../types/ConflictResolution';

export class SessionManager {
  private sessionId: string;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.sessionId = this.generateSessionId();
  }

  get currentSessionId(): string {
    return this.sessionId;
  }

  createChangeMetadata(operationType: OperationType): ChangeMetadata {
    return {
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId,
      operationType,
      changeId: this.generateChangeId()
    };
  }

  private generateSessionId(): string {
    return `${this.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChangeId(): string {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}