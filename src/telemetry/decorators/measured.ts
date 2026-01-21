/**
 * Phase 3: @measured デコレータ
 * サービスメソッドのパフォーマンス計測用デコレータ
 */

import { getPerformanceMonitor } from "../PerformanceMonitor";
import { OPERATION_THRESHOLDS, OperationName } from "../thresholds";

export interface MeasuredOptions {
  operation?: string;
  threshold?: number;
  logSlow?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * メソッドの実行時間を計測するデコレータ
 *
 * @example
 * class MyService {
 *   @measured({ operation: 'myOperation', threshold: 500 })
 *   async doSomething() {
 *     // ...
 *   }
 * }
 */
export function measured(options: MeasuredOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const operationName =
      options.operation || `${target.constructor.name}.${propertyKey}`;
    const threshold =
      options.threshold ??
      OPERATION_THRESHOLDS[operationName as OperationName] ??
      1000;
    const logSlow = options.logSlow ?? true;

    // 非同期メソッド用
    if (
      originalMethod.constructor.name === "AsyncFunction" ||
      originalMethod.toString().includes("async")
    ) {
      descriptor.value = async function (...args: any[]) {
        const monitor = getPerformanceMonitor();
        const endMeasure = monitor.startMeasure(operationName, {
          ...options.metadata,
          args: args.length,
        });

        const startTime = performance.now();
        try {
          const result = await originalMethod.apply(this, args);
          return result;
        } finally {
          endMeasure();
          const duration = performance.now() - startTime;

          if (logSlow && duration > threshold) {
            console.warn(`[measured] ${operationName} exceeded threshold`, {
              duration: `${duration.toFixed(2)}ms`,
              threshold: `${threshold}ms`,
            });
          }
        }
      };
    } else {
      // 同期メソッド用
      descriptor.value = function (...args: any[]) {
        const monitor = getPerformanceMonitor();
        const endMeasure = monitor.startMeasure(operationName, {
          ...options.metadata,
          args: args.length,
        });

        const startTime = performance.now();
        try {
          const result = originalMethod.apply(this, args);

          // Promiseを返す場合
          if (result && typeof result.then === "function") {
            return result.finally(() => {
              endMeasure();
              const duration = performance.now() - startTime;

              if (logSlow && duration > threshold) {
                console.warn(`[measured] ${operationName} exceeded threshold`, {
                  duration: `${duration.toFixed(2)}ms`,
                  threshold: `${threshold}ms`,
                });
              }
            });
          }

          return result;
        } finally {
          endMeasure();
          const duration = performance.now() - startTime;

          if (logSlow && duration > threshold) {
            console.warn(`[measured] ${operationName} exceeded threshold`, {
              duration: `${duration.toFixed(2)}ms`,
              threshold: `${threshold}ms`,
            });
          }
        }
      };
    }

    return descriptor;
  };
}

/**
 * クラス全体のメソッドを計測するクラスデコレータ
 *
 * @example
 * @measuredClass({ prefix: 'MyService' })
 * class MyService {
 *   async doSomething() { ... }
 *   doAnother() { ... }
 * }
 */
export function measuredClass(
  options: { prefix?: string; threshold?: number } = {},
) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const prototype = constructor.prototype;
    const propertyNames = Object.getOwnPropertyNames(prototype);

    for (const propertyName of propertyNames) {
      if (propertyName === "constructor") continue;

      const descriptor = Object.getOwnPropertyDescriptor(
        prototype,
        propertyName,
      );
      if (!descriptor || typeof descriptor.value !== "function") continue;

      const operation = options.prefix
        ? `${options.prefix}.${propertyName}`
        : `${constructor.name}.${propertyName}`;

      const measuredDecorator = measured({
        operation,
        threshold: options.threshold,
      });

      const newDescriptor = measuredDecorator(
        prototype,
        propertyName,
        descriptor,
      );
      Object.defineProperty(prototype, propertyName, newDescriptor);
    }

    return constructor;
  };
}

/**
 * 手動で計測を行うためのユーティリティ
 */
export function measureOperation<T>(
  operation: string,
  fn: () => T,
  options: MeasuredOptions = {},
): T {
  const monitor = getPerformanceMonitor();
  const threshold = options.threshold ?? 1000;
  const endMeasure = monitor.startMeasure(operation, options.metadata);
  const startTime = performance.now();

  try {
    const result = fn();

    // Promiseの場合
    if (result && typeof (result as any).then === "function") {
      return (result as any).finally(() => {
        endMeasure();
        const duration = performance.now() - startTime;
        if (options.logSlow !== false && duration > threshold) {
          console.warn(`[measureOperation] ${operation} exceeded threshold`, {
            duration: `${duration.toFixed(2)}ms`,
            threshold: `${threshold}ms`,
          });
        }
      });
    }

    return result;
  } finally {
    endMeasure();
    const duration = performance.now() - startTime;
    if (options.logSlow !== false && duration > threshold) {
      console.warn(`[measureOperation] ${operation} exceeded threshold`, {
        duration: `${duration.toFixed(2)}ms`,
        threshold: `${threshold}ms`,
      });
    }
  }
}

/**
 * 非同期操作の計測ユーティリティ
 */
export async function measureAsync<T>(
  operation: string,
  fn: () => Promise<T>,
  options: MeasuredOptions = {},
): Promise<T> {
  const monitor = getPerformanceMonitor();
  const threshold = options.threshold ?? 1000;
  const endMeasure = monitor.startMeasure(operation, options.metadata);
  const startTime = performance.now();

  try {
    const result = await fn();
    return result;
  } finally {
    endMeasure();
    const duration = performance.now() - startTime;
    if (options.logSlow !== false && duration > threshold) {
      console.warn(`[measureAsync] ${operation} exceeded threshold`, {
        duration: `${duration.toFixed(2)}ms`,
        threshold: `${threshold}ms`,
      });
    }
  }
}
