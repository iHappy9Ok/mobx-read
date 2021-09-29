import { IObservable } from './observable';
import { globalState } from './globalstate';


/**
 * Derivation 即能够从当前状态「衍生」出来的对象，包括计算值和 Reaction。Mobx 中通过 Derivation 注册响应函数，
 * 响应函数中所使用到的 Observable 称为它的依赖，依赖过期时 Derivation 会重新执行，更新依赖。
 */
export interface IDerivation {
  observing: IObservable[];
  newObserving: IObservable[];
  onBecomeStale(): void;
  runId: number;
  isStale?: boolean;
}

export function trackDerivedFunction<T>(
  derivation: IDerivation,
  f: () => T,
  context: any,
) {
  derivation.runId = ++globalState.runId;
  const prevTracking = globalState.trackingDerivation;
  globalState.trackingDerivation = derivation; // 切分支
  const result = f.call(context); // computed 为计算完后的值
  globalState.trackingDerivation = prevTracking;
  bindDependencies(derivation);
  return result;
}

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
