import { IObservable } from './observable';
import { globalState } from './globalstate';


/**
 * Derivation 即能够从当前状态「衍生」出来的对象，包括计算值和 Reaction。Mobx 中通过 Derivation 注册响应函数，
 * 响应函数中所使用到的 Observable 称为它的依赖，依赖过期时 Derivation 会重新执行，更新依赖。
 */
export interface IDerivation {
  /**
   * 本次衍生在哪些响应式数据变更时执行
   */
  observing: IObservable[];
  /**
   * 用于变更 observable, derivation 的依赖关系（在于观察者可改变观察的数据）。
   */
  newObserving: IObservable[];
  /**
   * 当观察数据变更时，运行的处理逻辑
   * Reaction 和 ComputedValue各自有不同的实现
   */
  onBecomeStale(): void;
  /**
   * 由它构成 observable.lastAcessedBy 的值
   */
  runId: number;
  isStale?: boolean;
}

/**
 * 更新 derivation 的状态和依赖关系，同时执行传参 fn 用户端执行逻辑
 */
export function trackDerivedFunction<T>(
  derivation: IDerivation,
  f: () => T,
  context: any,
) {
  debugger
  derivation.runId = ++globalState.runId;
  const prevTracking = globalState.trackingDerivation;
  globalState.trackingDerivation = derivation; // 切分支
  const result = f.call(context); // computed 为计算完后的值
  globalState.trackingDerivation = prevTracking;
  bindDependencies(derivation);
  return result;
}

/**
 * 依赖更新
 */
function bindDependencies(derivation: IDerivation) {
  const prevObserving = derivation.observing;
  const observing = (derivation.observing = derivation.newObserving);

  // 新依赖置为 1
  observing.forEach(dep => dep.diffValue === 0 && (dep.diffValue = 1));
  derivation.newObserving = [];

  // 旧依赖 remove
  prevObserving.forEach(
    dep => dep.diffValue === 0 && dep.observers.delete(derivation),
  );

  // 新依赖未监听 add
  observing.forEach(dep => {
    if (dep.diffValue === 1) {
      dep.diffValue = 0;
      dep.observers.add(derivation);
    }
  });
}

export function clearObserving(derivation: IDerivation) {
  const obs = derivation.observing;
  derivation.observing = [];
  obs.forEach(dep => dep.observers.delete(derivation));
}
