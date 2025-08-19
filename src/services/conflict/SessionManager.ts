import { ChangeMetadata, OperationType } from "../../types/ConflictResolution";

export class SessionManager {
  private sessionId: string;
  private userId: string;
  private sessionStartTime: number;

  constructor(userId: string) {
    this.userId = userId;
    this.sessionStartTime = Date.now();
    this.sessionId = this.generateSessionId();

    console.log(
      `[SessionManager] New session created for user ${userId}: ${this.sessionId}`,
    );
  }

  createChangeMetadata(operationType: OperationType): ChangeMetadata {
    return {
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId,
      operationType,
      changeId: this.generateChangeId(),
    };
  }

  private generateSessionId(): string {
    // ユーザーID + タイムスタンプ + ランダム文字列でユニークなセッションIDを生成
    const timestamp = this.sessionStartTime;
    const random = Math.random().toString(36).substr(2, 9);
    return `${this.userId}_${timestamp}_${random}`;
  }

  private generateChangeId(): string {
    // 変更IDを生成（セッション内でユニーク）
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `change_${timestamp}_${random}`;
  }

  getCurrentSessionId(): string {
    return this.sessionId;
  }

  getUserId(): string {
    return this.userId;
  }

  getSessionAge(): number {
    return Date.now() - this.sessionStartTime;
  }

  isSessionExpired(maxAgeMs: number = 24 * 60 * 60 * 1000): boolean {
    // デフォルト24時間でセッション期限切れ
    return this.getSessionAge() > maxAgeMs;
  }

  refreshSession(): void {
    // セッションを更新（新しいセッションIDを生成）
    this.sessionStartTime = Date.now();
    this.sessionId = this.generateSessionId();
    console.log(`[SessionManager] Session refreshed: ${this.sessionId}`);
  }

  // デバッグ用
  getSessionInfo() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: this.sessionStartTime,
      age: this.getSessionAge(),
      isExpired: this.isSessionExpired(),
    };
  }
}
