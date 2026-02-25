import { XdrError, XdrErrorCode } from './errors.js';

export interface Limits {
  readonly depth: number;
  readonly len: number;
}

export const DEFAULT_LIMITS: Limits = { depth: 512, len: 256 * 1024 * 1024 };

export class LimitTracker {
  private readonly limits: Limits;
  private bytesConsumed: number = 0;
  private currentDepth: number = 0;

  constructor(limits: Limits) {
    this.limits = limits;
  }

  consumeLen(n: number): void {
    this.bytesConsumed += n;
    if (this.bytesConsumed > this.limits.len) {
      throw new XdrError(
        XdrErrorCode.ByteLimitExceeded,
        `Byte limit exceeded: ${this.bytesConsumed} > ${this.limits.len}`,
      );
    }
  }

  withDepth<T>(fn: () => T): T {
    this.currentDepth++;
    if (this.currentDepth > this.limits.depth) {
      throw new XdrError(
        XdrErrorCode.DepthLimitExceeded,
        `Depth limit exceeded: ${this.currentDepth} > ${this.limits.depth}`,
      );
    }
    try {
      return fn();
    } finally {
      this.currentDepth--;
    }
  }
}
