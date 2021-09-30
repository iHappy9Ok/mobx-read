import { ObservableValue } from './../types/observablevalue';
import {
  createObservableArray,
  IObservableArray,
} from '../types/observablearray';
import {
  createObservableObject,
  asObservableObject,
} from '../types/observableobject';
import { isPlainObject, isObservable, createPropDecorator } from '../utils';

/**
 * observable: 响应式数据，最主要的特征是将数据变更信息上报给全局监听器。mobx 使用 IObservable 接口，Atom 类加以抽象。
 */
export interface IObservableFactory {
  (value: number | string | null | undefined | boolean): never; // use box
  (target: Object, key: string | symbol, descriptor?: PropertyDescriptor): any; // decorator
  <T = any>(value: T[]): IObservableArray<T>;
  <T extends Object>(value: T): T;
}

const observableFactories = {
  box<T = any>(value: T) {
    return new ObservableValue<T>(value);
  },
  array<T = any>(initialValues?: T[]) {
    return createObservableArray<T>(initialValues);
  },
  object<T = any>(props: T): T {
    return createObservableObject<T>(props);
  },
};

function createObservable(v: any, arg2?: any) {
  // debugger
  // @observable someProp;
  if (typeof arg2 === 'string')
    /**
     * 劫持了变量的getset
     */
    // @ts-ignore
    return observableDecorator.apply(null, arguments);

  if (isObservable(v)) return v;
  if (Array.isArray(v)) return observable.array(v);   //Proxy as well
  if (isPlainObject(v)) return observable.object(v);  //Proxy
  return v;
}

export const observable: IObservableFactory &
  typeof observableFactories = createObservable as any;

Object.keys(observableFactories).forEach(
  name => (observable[name] = observableFactories[name]),
);

/**
 * 劫持目标target，生成adm实例
 */
export const observableDecorator = createPropDecorator(
  // 初始化时，target指向原型
  (target, prop: PropertyKey, descriptor, _args) => {
    // debugger
    const initialValue = descriptor
      ? descriptor.initializer
        ? descriptor.initializer.call(target)
        : descriptor.value
      : undefined;
    return asObservableObject(target).addObservableProp(prop, initialValue);
  },
);
