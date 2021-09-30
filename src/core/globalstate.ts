import { IDerivation } from './derivation';
import { Reaction, runReactions } from './reaction';

/**
 * 全局对象
 */
export const globalState = {
  /**
   * 事务层级
   */
  inBatch: 0,
  UNCHANGED: {},
  /**
   * Currently running derivation
   * 当前正在跟踪的 Derivation
   */
  trackingDerivation: (null as unknown) as IDerivation,
   /**
    * List of scheduled, not yet executed, reactions.
    * 待重新计算数组
    */
  pendingReactions: [] as Reaction[],
  runId: 0,
  isRunningReactions: false,
};

export function startBatch() {
  globalState.inBatch++;
}

export function endBatch() {
  if (--globalState.inBatch === 0) {
    runReactions();
  }
}


/**
 * 事务可以嵌套，直到最外层事务结束之后，才会重新执行 Reaction。
 */