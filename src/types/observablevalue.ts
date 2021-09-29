import { observable } from '../api/observable';
import { Atom } from '../core/atom';
import { globalState } from '../core/globalstate';

interface IObservableValue<T> {
  get(): T;
  set(value: T): void;
}

/**
 * 继承了Atom
 * 基于原始数据构建 observable 实例，在 observable 实例方法变更数据的过程中，将执行 interceptor, listener, reportChanged 等附加操作
 */
export class ObservableValue<T> extends Atom implements IObservableValue<T> {
  isObservableValue = true;

  constructor(private value: T) {
    // 见Atom类
    super();
    // 又去调用observable，递归劫持
    this.value = observable(value);
  }

  get() {
    this.reportObserved();
    return this.value;
  }

  set(newValue: T) {
    newValue = this.prepareNewValue(newValue) as any;
    newValue !== globalState.UNCHANGED && this.setNewValue(newValue);
  }

  // 比较，没变动就不重新生成observableValue
  private prepareNewValue(newValue: T): T | {} {
    newValue = observable(newValue);
    return Object.is(newValue, this.value) ? globalState.UNCHANGED : newValue;
  }

  setNewValue(newValue: T) {
    this.value = newValue;
    // 更新属性值，执行搜集到的依赖函数
    this.reportChanged();
  }
}
