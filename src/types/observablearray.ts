import { observable } from '../api/observable';
import { Atom } from './../core/atom';
import {
  addHiddenProp,
  $mobx,
  isOriginArrayFnName,
  isNumberLike,
} from '../utils';

export interface IObservableArray<T = any> extends Array<T> {
  spliceWithArray(index: number, deleteCount?: number, newItems?: T[]): T[];
  toJSON(): T[];
}


/**
 * 改写了数组原型上的一些方法，
 * 不同于 observableArrayAdministration 实例中变更数据的子属性由 observableValue 实例构成；
 * observableArrayAdministration 实例中变更的数组项直接通过 enhancer 处理成 observable 实例。
 * 因为对于数组，观察者只订阅单个数组项变更的情况较少，不像对象需要监控每个属性的变更，两者监控的颗粒度不一样，前者就使用 enhancer 构造 observable 实例，后者通过 ObservableValue 构造 observable 实例。
 */
class ObservableArrayAdministration {
  values: any[] = [];
  atom = new Atom();
  isObservableArray = true;

  getArrayLength() {
    this.atom.reportObserved();
    return this.values.length;
  }

  setArrayLength(newLength: number) {
    const len = this.values.length;
    if (typeof newLength !== 'number' || newLength < 0 || newLength === len)
      return;
    if (newLength > len) {
      const newItems = Array.from({ length: newLength - len });
      this.spliceWithArray(len, 0, newItems);
    } else this.spliceWithArray(newLength, len - newLength);
  }

  /**
   * 用于一次性变更数组项及数组的长度
   * 数组项都处理成observable
   */
  spliceWithArray(index = 0, deleteCount?: number, newItems?: any[]): any[] {
    const len = this.values.length;
    if (index > len) index = len;
    else if (index < 0) index = Math.max(0, len + index);

    if (arguments.length === 1) deleteCount = len - index;
    else if (deleteCount == null) deleteCount = 0;
    else deleteCount = Math.max(0, Math.min(deleteCount, len - index));

    newItems =
      newItems && newItems.length ? newItems.map(v => observable(v)) : [];
    const res = this.values.splice(index, deleteCount, ...newItems);

    if (deleteCount !== 0 || newItems.length !== 0) this.atom.reportChanged();
    return res;
  }
}

export function createObservableArray<T>(
  initialValues: any[] = [],
): IObservableArray<T> {
  const adm = new ObservableArrayAdministration();
  addHiddenProp(adm.values, $mobx, adm);
  /**
   * Proxy代理整个array，粗颗粒，改写getset
   */
  const proxy = new Proxy(adm.values, {
    get(target: any, name: any) {
      debugger
      // 获取长度
      if (name === 'length') return target[$mobx].getArrayLength();
      // 获取数组项
      if (isNumberLike(name)) return arrayExtensions.get.call(target, +name);
      // 一些数组原生方法去调用arrayExtensions上的
      if (arrayExtensions.hasOwnProperty(name)) return arrayExtensions[name];

      return isOriginArrayFnName(name)
        ? getRestOriginArrayFn(name, target[$mobx])
        : target[name];
    },
    set(target: any, name: any, value: any): boolean {
      debugger
      if (name === 'length') target[$mobx].setArrayLength(value);
      if (isNumberLike(name)) arrayExtensions.set.call(target, +name, value);
      else target[name] = value;

      return true;
    },
  });
  // init value
  adm.spliceWithArray(0, 0, initialValues);
  return proxy;
}

const arrayExtensions = {
  splice(index: number, deleteCount?: number, ...newItems: any[]) {
    const adm: ObservableArrayAdministration = this[$mobx];
    switch (arguments.length) {
      case 0:
        return [];
      case 1:
        return adm.spliceWithArray(index);
      case 2:
        return adm.spliceWithArray(index, deleteCount);
    }
    return adm.spliceWithArray(index, deleteCount, newItems);
  },
  spliceWithArray(
    index: number,
    deleteCount?: number,
    newItems?: any[],
  ): any[] {
    return this[$mobx].spliceWithArray(...arguments);
  },
  push(...items: any[]) {
    const adm: ObservableArrayAdministration = this[$mobx];
    adm.spliceWithArray(adm.values.length, 0, items);
    return adm.values.length;
  },
  pop() {
    return this.splice(Math.max(this[$mobx].values.length - 1, 0), 1)[0];
  },
  sort(compareFn?: (a: any, b: any) => number): any[] {
    const clone = this.slice();
    return clone.sort(compareFn);
  },
  toJSON(): any[] {
    return this.slice();
  },
  get(index: number) {
    const adm: ObservableArrayAdministration = this[$mobx];
    if (index >= adm.values.length) return undefined;
    adm.atom.reportObserved();
    return adm.values[index];
  },
  set(index: number, newValue: any) {
    const adm: ObservableArrayAdministration = this[$mobx];
    const values = adm.values;
    if (index < values.length) {
      const oldValue = values[index];
      newValue = observable(newValue);
      if (newValue !== oldValue) {
        values[index] = newValue;
        adm.atom.reportChanged();
      }
    } else if (index === values.length) {
      adm.spliceWithArray(index, 0, [newValue]);
    } else throw new Error('index error');
  },
};

const fnCache = {};

function getRestOriginArrayFn(
  name: string,
  adm: ObservableArrayAdministration,
) {
  if (fnCache[name] && fnCache[name].adm === adm) return fnCache[name];
  function fn() {
    adm.atom.reportObserved();
    const res = adm.values;
    return res[name].apply(res, arguments);
  }
  fn.adm = adm;
  fnCache[name] = fn;
  return fn;
}
