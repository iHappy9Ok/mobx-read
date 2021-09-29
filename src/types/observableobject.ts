import { ObservableValue } from './observablevalue';
import { globalState } from '../core/globalstate';
import { Atom } from '../core/atom';
import { addHiddenProp, $mobx, isPropertyKey } from '../utils';
import { set } from '../api/object-api';
import { ComputedValue, IComputedValueOptions } from './computedvalue';
import { extendObservable } from '../api/extendobservable';

/**
 * adm管理了属性
 * read, write 方法用于针对属性的读写操作，addObservableProp 用于添加可观察属性，addComputedProp 用于添加计算属性。
 */
export class ObservableObjectAdministration {
  atom = new Atom();
  isObservableObject = true;

  constructor(
    // target保存了观察目标的引用
    public target: any, 
    // adm围绕values展开。
    public values = new Map<
      PropertyKey,
      ObservableValue<any> | ComputedValue<any>
    >(),
  ) {}

  read(key: PropertyKey) {
    return this.values.get(key)!.get();
  }

  write(key: PropertyKey, newValue: any) {
    const observable = this.values.get(key);
    if (observable instanceof ComputedValue) return;

    newValue = (observable as any).prepareNewValue(newValue);
    if (newValue !== globalState.UNCHANGED) {
      observable!.setNewValue(newValue);
    }
  }


  /**
   * 用于添加可观察属性
   */
  addObservableProp(propName: PropertyKey, newValue: any) {
    const observable = new ObservableValue(newValue);
    // 劫持value，变成可观察的，add进values里
    this.values.set(propName, observable);
    newValue = (observable as any).value;
    // 此处代理的目标的读写属性
    Object.defineProperty(this.target, propName, getObservableConfig(propName));
    // 发布
    this.atom.reportChanged();
  }

  addComputedProp(propName: PropertyKey, options: IComputedValueOptions<any>) {
    this.values.set(propName, new ComputedValue(options));
    this.target === options.context &&
      Object.defineProperty(this.target, propName, getComputedConfig(propName));
  }

  has(key: PropertyKey) {
    return this.values.has(key);
  }
}

export function asObservableObject(
  target: any,
): ObservableObjectAdministration {
  if (Object.prototype.hasOwnProperty.call(target, $mobx)) return target[$mobx];
  const adm = new ObservableObjectAdministration(target, new Map());
  addHiddenProp(target, $mobx, adm);
  return adm;
}

function getObservableConfig(propName: PropertyKey) {
  return {
    configurable: true,
    enumerable: true,
    get() {
      return this[$mobx].read(propName);
    },
    set(v: any) {
      this[$mobx].write(propName, v);
    },
  };
}

function getComputedConfig(propName: PropertyKey) {
  return {
    configurable: false,
    enumerable: false,
    get() {
      return this[$mobx].read(propName);
    },
    // set(v: any) {},
  };
}

export function createObservableObject<T>(props: T): T {
  const proxy = new Proxy(
    {},
    {
      get(target: any, name: PropertyKey) {
        debugger
        const o = target[$mobx].values.get(name);
        if (o instanceof Atom) return (o as any).get();
        return target[name];
      },
      set(target: any, name: PropertyKey, value: any) {
        if (!isPropertyKey(name)) return false;
        set(target, name, value);
        return true;
      },
      ownKeys(target) {
        target[$mobx].atom.reportObserved();
        return Reflect.ownKeys(target);
      },
    },
  );

  return extendObservable(proxy, props);
}
