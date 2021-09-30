import { IObservable, propagateChanged, reportObserved } from './observable';
import { IDerivation } from './derivation';
import { startBatch, endBatch } from './globalstate';

interface IAtom extends IObservable {
  reportObserved(): boolean;
  reportChanged(): void;
}

/**
 * 任何能用于存储应用状态的值在 Mobx 中称为 Atom(原子)，它会在「被观察时」和「自身发生变化时」发送通知。
 */
export class Atom implements IAtom {
  // 观察者数组
  observers = new Set<IDerivation>();
  // 用于比较 Derivation 的新旧依赖
  diffValue = 0;
  // 上一次被使用时，Derivation 的 runId
  lastAccessedBy = 0;

  /**
   *  被使用时触发
   * observableValue.get
   */
  reportObserved() {
    debugger
    return reportObserved(this);
  }

  /**
   * 发生变化（更新属性值）时触发
   */ 
  reportChanged() {
    startBatch();
    // 传播改变
    propagateChanged(this);
    endBatch();
  }
}
