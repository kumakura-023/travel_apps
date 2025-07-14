import { TravelPlan } from '../types';

/**
 * 同期処理の詳細なデバッグ情報を収集・分析するユーティリティ
 * 単一責任原則に従い、デバッグ機能を独立したモジュールとして実装
 */
export class SyncDebugUtils {
  private debugLogs: Array<{
    timestamp: number;
    type: 'save' | 'receive' | 'conflict' | 'ignore' | 'delete';
    data: any;
  }> = [];

  /**
   * デバッグログを記録
   */
  log(type: 'save' | 'receive' | 'conflict' | 'ignore' | 'delete', data: any) {
    const logEntry = {
      timestamp: Date.now(),
      type,
      data: {
        ...data,
        time: new Date().toISOString(),
      }
    };
    
    this.debugLogs.push(logEntry);
    console.log(`🔍 [${type.toUpperCase()}]`, logEntry.data);
    
    // ログが多くなりすぎないよう、最新100件のみ保持
    if (this.debugLogs.length > 100) {
      this.debugLogs = this.debugLogs.slice(-100);
    }
  }

  /**
   * 同期状況の分析
   */
  analyzeSyncStatus(): {
    totalSaves: number;
    totalReceives: number;
    totalConflicts: number;
    totalIgnores: number;
    totalDeletes: number;
    immediateSyncs: number;
    batchSyncs: number;
    lastSaveTime?: number;
    lastReceiveTime?: number;
    averageTimeBetweenSaves: number;
    averageTimeBetweenReceives: number;
    syncSuccessRate: number;
    syncEfficiency: number;
  } {
    const saves = this.debugLogs.filter(log => log.type === 'save');
    const receives = this.debugLogs.filter(log => log.type === 'receive');
    const conflicts = this.debugLogs.filter(log => log.type === 'conflict');
    const ignores = this.debugLogs.filter(log => log.type === 'ignore');
    const deletes = this.debugLogs.filter(log => log.type === 'delete');

    // 即座同期とバッチ同期を分類
    const immediateSyncs = saves.filter(log => log.data.type === 'immediate_sync').length;
    const batchSyncs = saves.filter(log => log.data.type === 'batch_sync').length;

    const lastSaveTime = saves.length > 0 ? saves[saves.length - 1].timestamp : undefined;
    const lastReceiveTime = receives.length > 0 ? receives[receives.length - 1].timestamp : undefined;

    // 保存間隔の平均を計算
    const saveIntervals = [];
    for (let i = 1; i < saves.length; i++) {
      saveIntervals.push(saves[i].timestamp - saves[i - 1].timestamp);
    }
    const averageTimeBetweenSaves = saveIntervals.length > 0 
      ? saveIntervals.reduce((sum, interval) => sum + interval, 0) / saveIntervals.length 
      : 0;

    // 受信間隔の平均を計算
    const receiveIntervals = [];
    for (let i = 1; i < receives.length; i++) {
      receiveIntervals.push(receives[i].timestamp - receives[i - 1].timestamp);
    }
    const averageTimeBetweenReceives = receiveIntervals.length > 0 
      ? receiveIntervals.reduce((sum, interval) => sum + interval, 0) / receiveIntervals.length 
      : 0;

    // 同期成功率を計算（競合解決された受信 / 総受信）
    const syncSuccessRate = receives.length > 0 
      ? (conflicts.length / receives.length) * 100 
      : 0;

    // 同期効率を計算（保存回数 / 受信回数）
    const syncEfficiency = receives.length > 0 
      ? (saves.length / receives.length) * 100 
      : 0;

    return {
      totalSaves: saves.length,
      totalReceives: receives.length,
      totalConflicts: conflicts.length,
      totalIgnores: ignores.length,
      totalDeletes: deletes.length,
      immediateSyncs,
      batchSyncs,
      lastSaveTime,
      lastReceiveTime,
      averageTimeBetweenSaves,
      averageTimeBetweenReceives,
      syncSuccessRate,
      syncEfficiency,
    };
  }

  /**
   * 最近の同期ログを取得
   */
  getRecentLogs(count: number = 10): Array<{
    timestamp: number;
    type: string;
    data: any;
  }> {
    return this.debugLogs.slice(-count);
  }

  /**
   * 特定の条件での同期失敗パターンを分析
   */
  analyzeFailurePatterns(): {
    ignoredUpdates: Array<{ reason: string; count: number }>;
    conflictPatterns: Array<{ pattern: string; count: number }>;
    timingIssues: Array<{ issue: string; count: number }>;
  } {
    const ignores = this.debugLogs.filter(log => log.type === 'ignore');
    const conflicts = this.debugLogs.filter(log => log.type === 'conflict');

    // 無視された更新の理由を分析
    const ignoredReasons = ignores.map(log => log.data.reason || 'unknown');
    const ignoredUpdates = this.countOccurrences(ignoredReasons);

    // 競合パターンを分析
    const conflictPatterns = conflicts.map(log => {
      const localPlaces = log.data.originalPlaces || 0;
      const remotePlaces = log.data.remotePlaces || 0;
      const resolvedPlaces = log.data.resolvedPlaces || 0;
      return `L${localPlaces}-R${remotePlaces}-Res${resolvedPlaces}`;
    });
    const conflictPatternCounts = this.countOccurrences(conflictPatterns);

    // タイミング問題を分析
    const timingIssues = [];
    const saves = this.debugLogs.filter(log => log.type === 'save');
    const receives = this.debugLogs.filter(log => log.type === 'receive');

    // 保存直後の受信をチェック
    let rapidReceives = 0;
    for (let i = 0; i < saves.length; i++) {
      const saveTime = saves[i].timestamp;
      const rapidReceive = receives.find(receive => 
        Math.abs(receive.timestamp - saveTime) < 1000
      );
      if (rapidReceive) rapidReceives++;
    }

    if (rapidReceives > 0) {
      timingIssues.push({ issue: '保存直後の受信', count: rapidReceives });
    }

    return {
      ignoredUpdates: ignoredUpdates.map(([reason, count]) => ({ reason, count })),
      conflictPatterns: conflictPatternCounts.map(([pattern, count]) => ({ pattern, count })),
      timingIssues,
    };
  }

  /**
   * 配列の要素出現回数をカウント
   */
  private countOccurrences(array: string[]): Array<[string, number]> {
    const counts = new Map<string, number>();
    array.forEach(item => {
      counts.set(item, (counts.get(item) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }

  /**
   * デバッグログをクリア
   */
  clearLogs() {
    this.debugLogs = [];
    console.log('🔍 デバッグログをクリアしました');
  }

  /**
   * 詳細な同期レポートを出力
   */
  printDetailedReport() {
    console.log('🔍 === 同期デバッグ詳細レポート ===');
    
    const status = this.analyzeSyncStatus();
    console.log('📊 同期統計:', status);
    
    const patterns = this.analyzeFailurePatterns();
    console.log('❌ 無視された更新:', patterns.ignoredUpdates);
    console.log('⚔️ 競合パターン:', patterns.conflictPatterns);
    console.log('⏰ タイミング問題:', patterns.timingIssues);
    
    // 同期の質を評価
    const quality = this.evaluateSyncQuality(status, patterns);
    console.log('🎯 同期品質評価:', quality);
    
    console.log('📝 最近のログ:', this.getRecentLogs(5));
    console.log('🔍 === レポート終了 ===');
  }

  /**
   * 同期品質を評価
   */
  private evaluateSyncQuality(status: any, patterns: any): {
    overall: string;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 同期効率の評価
    if (status.syncEfficiency < 50) {
      issues.push('同期効率が低い（保存頻度が少ない）');
      recommendations.push('自動保存の間隔を短縮することを検討');
    }

    // 自己更新の無視が多い場合
    const selfUpdateIgnores = patterns.ignoredUpdates.find((u: any) => u.reason === '自己更新');
    if (selfUpdateIgnores && selfUpdateIgnores.count > 10) {
      issues.push('自己更新の無視が多すぎる');
      recommendations.push('自己更新判定の閾値を調整することを検討');
    }

    // 保存直後の受信が多い場合
    const rapidReceives = patterns.timingIssues.find((t: any) => t.issue === '保存直後の受信');
    if (rapidReceives && rapidReceives.count > 5) {
      issues.push('保存直後の受信が頻繁に発生');
      recommendations.push('リモート更新中の自動保存停止時間を延長することを検討');
    }

    // 全体的な評価
    let overall = '良好';
    if (issues.length > 2) {
      overall = '要改善';
    } else if (issues.length > 0) {
      overall = '注意';
    }

    return {
      overall,
      issues,
      recommendations
    };
  }
}

/**
 * グローバルなデバッグユーティリティインスタンス
 */
export const syncDebugUtils = new SyncDebugUtils(); 