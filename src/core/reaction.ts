import {
  IDerivation,
  trackDerivedFunction,
  clearObserving,
} from './derivation';
import { IObservable } from './observable';
import { globalState, endBatch, startBatch } from './globalstate';


/**
 * TODO
 */
export class Reaction implements IDerivation {
  observing: IObservable[] = [];
  newObserving: IObservable[] = [];
  runId = 0;
  isDisposed = false;

  constructor(private onInvalidate: () => void) {}

  onBecomeStale() {
    debugger
    this.schedule();
  }

  /**
   * 将此衍生上报到全局队列,并计算（执行）衍生
   */
  schedule() {
    globalState.pendingReactions.push(this);
    runReactions();
  }

  runReaction() {
    debugger
    if (this.isDisposed) return;
    startBatch();
    this.onInvalidate();
    endBatch();
  }

  /**
   * 追踪衍生函数内使用到的observablevalue对象
   */
  track(fn: () => void) {
    if (this.isDisposed) return;
    startBatch();
    trackDerivedFunction(this, fn, undefined);
    this.isDisposed && clearObserving(this);

    endBatch();
  }

  dispose() {
    if (!this.isDisposed) {
      this.isDisposed = true;
      startBatch();
      clearObserving(this);
      endBatch();
    }
  }
}

export function runReactions() {
  if (globalState.inBatch > 0) return;
  const allReactions = globalState.pendingReactions;

  while (allReactions.length > 0) {
    const remainingReactions = allReactions.splice(0);
    remainingReactions.forEach(rr => rr.runReaction());
  }
}
