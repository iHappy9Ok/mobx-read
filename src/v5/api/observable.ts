import {
    IEnhancer,
    IEqualsComparer,
    IObservableArray,
    IObservableDecorator,
    IObservableMapInitialValues,
    IObservableSetInitialValues,
    IObservableObject,
    IObservableValue,
    ObservableMap,
    ObservableSet,
    ObservableValue,
    createDecoratorForEnhancer,
    createDynamicObservableObject,
    createObservableArray,
    deepEnhancer,
    extendObservable,
    fail,
    isES6Map,
    isES6Set,
    isObservable,
    isPlainObject,
    refStructEnhancer,
    referenceEnhancer,
    shallowEnhancer,
    getDefaultDecoratorFromObjectOptions,
    extendObservableObjectWithProperties
} from "../internal"

export type CreateObservableOptions = {
    name?: string
    equals?: IEqualsComparer<any>
    deep?: boolean
    defaultDecorator?: IObservableDecorator
    proxy?: boolean
}

// Predefined bags of create observable options, to avoid allocating temporarily option objects
// in the majority of cases
export const defaultCreateObservableOptions: CreateObservableOptions = {
    deep: true,
    name: undefined,
    defaultDecorator: undefined,
    proxy: true
}
Object.freeze(defaultCreateObservableOptions)

function assertValidOption(key: string) {
    if (!/^(deep|name|equals|defaultDecorator|proxy)$/.test(key))
        fail(`invalid option for (extend)observable: ${key}`)
}

/**
 * 如果不传 options 返回默认的 defaultCreateObservableOptions，如果传了 options 就按照用户写的来
 */
export function asCreateObservableOptions(thing: any): CreateObservableOptions {
    if (thing === null || thing === undefined) return defaultCreateObservableOptions
    if (typeof thing === "string") return { name: thing, deep: true, proxy: true }
    if (process.env.NODE_ENV !== "production") {
        if (typeof thing !== "object") return fail("expected options object")
        Object.keys(thing).forEach(assertValidOption)
    }
    return thing as CreateObservableOptions
}

/**
 * enhancer 其实就是一个劫持器，里面提供了劫持各种类型的方法（相当于 observable）
 */
export const deepDecorator = createDecoratorForEnhancer(deepEnhancer)
const shallowDecorator = createDecoratorForEnhancer(shallowEnhancer)
export const refDecorator = createDecoratorForEnhancer(referenceEnhancer)
const refStructDecorator = createDecoratorForEnhancer(refStructEnhancer)

function getEnhancerFromOptions(options: CreateObservableOptions): IEnhancer<any> {
    return options.defaultDecorator
        ? options.defaultDecorator.enhancer
        : options.deep === false
            ? referenceEnhancer
            : deepEnhancer
}

/**
 * Turns an object, array or function into a reactive structure.
 * NOTE: entry 即 @observable something = ... 函数内部会做判断那种类型如何 observe
 * @param v the value which should become observable.
 */
function createObservable(v: any, arg2?: any, arg3?: any) {
    debugger
    
    // @observable someProp;
    if (typeof arguments[1] === "string") {
        return deepDecorator.apply(null, arguments as any)
    }

    // it is an observable already, done
    if (isObservable(v)) return v

    // observable 即为 createObservable（通过 observableFactories 给挂上 .object, .array 等方法)
    // something that can be converted and mutated?
    const res = isPlainObject(v)
        ? observable.object(v, arg2, arg3)
        : Array.isArray(v)
            ? observable.array(v, arg2)
            : isES6Map(v)
                ? observable.map(v, arg2)
                : isES6Set(v)
                    ? observable.set(v, arg2)
                    : v

    // this value could be converted to a new observable data structure, return it
    if (res !== v) return res

    // otherwise, just box it
    fail(
        process.env.NODE_ENV !== "production" &&
            `The provided value could not be converted into an observable. If you want just create an observable reference to the object use 'observable.box(value)'`
    )
}

export interface IObservableFactory {
    // observable overloads
    (value: number | string | null | undefined | boolean): never // Nope, not supported, use box
    (target: Object, key: string | symbol, baseDescriptor?: PropertyDescriptor): any // decorator
    <T = any>(value: T[], options?: CreateObservableOptions): IObservableArray<T>
    <T = any>(value: Set<T>, options?: CreateObservableOptions): ObservableSet<T>
    <K = any, V = any>(value: Map<K, V>, options?: CreateObservableOptions): ObservableMap<K, V>
    <T extends Object>(
        value: T,
        decorators?: { [K in keyof T]?: Function },
        options?: CreateObservableOptions
    ): T & IObservableObject
}

export interface IObservableFactories {
    box<T = any>(value?: T, options?: CreateObservableOptions): IObservableValue<T>
    array<T = any>(initialValues?: T[], options?: CreateObservableOptions): IObservableArray<T>
    set<T = any>(
        initialValues?: IObservableSetInitialValues<T>,
        options?: CreateObservableOptions
    ): ObservableSet<T>
    map<K = any, V = any>(
        initialValues?: IObservableMapInitialValues<K, V>,
        options?: CreateObservableOptions
    ): ObservableMap<K, V>
    object<T = any>(
        props: T,
        decorators?: { [K in keyof T]?: Function },
        options?: CreateObservableOptions
    ): T & IObservableObject

    /**
     * Decorator that creates an observable that only observes the references, but doesn't try to turn the assigned value into an observable.ts.
     */
    ref: IObservableDecorator
    /**
     * Decorator that creates an observable converts its value (objects, maps or arrays) into a shallow observable structure
     */
    shallow: IObservableDecorator
    deep: IObservableDecorator
    struct: IObservableDecorator
}

const observableFactories: IObservableFactories = {
    box<T = any>(value?: T, options?: CreateObservableOptions): IObservableValue<T> {
        if (arguments.length > 2) incorrectlyUsedAsDecorator("box")
        const o = asCreateObservableOptions(options)
        return new ObservableValue(value, getEnhancerFromOptions(o), o.name, true, o.equals)
    },
    array<T = any>(initialValues?: T[], options?: CreateObservableOptions): IObservableArray<T> {
        
        if (arguments.length > 2) incorrectlyUsedAsDecorator("array")
        const o = asCreateObservableOptions(options)
        return createObservableArray(initialValues, getEnhancerFromOptions(o), o.name) as any
    },
    map<K = any, V = any>(
        initialValues?: IObservableMapInitialValues<K, V>,
        options?: CreateObservableOptions
    ): ObservableMap<K, V> {
        if (arguments.length > 2) incorrectlyUsedAsDecorator("map")
        const o = asCreateObservableOptions(options)
        return new ObservableMap<K, V>(initialValues, getEnhancerFromOptions(o), o.name)
    },
    set<T = any>(
        initialValues?: IObservableSetInitialValues<T>,
        options?: CreateObservableOptions
    ): ObservableSet<T> {
        if (arguments.length > 2) incorrectlyUsedAsDecorator("set")
        const o = asCreateObservableOptions(options)
        return new ObservableSet<T>(initialValues, getEnhancerFromOptions(o), o.name)
    },
    object<T = any>(
        props: T, // 当前劫持的对象或该对象的 key 对应的值（递归劫持）
        decorators?: { [K in keyof T]: Function },
        options?: CreateObservableOptions
    ): T & IObservableObject {
        
        if (typeof arguments[1] === "string") incorrectlyUsedAsDecorator("object")
        const o = asCreateObservableOptions(options)
        if (o.proxy === false) { // 不传多余参数 proxy 默认为 true
            return extendObservable({}, props, decorators, o) as any
        } else {
            // 劫持对象默认使用 deepEnhancer，所以不像劫持其他类型需要调用 getEnhancerFromOptions 确认下
            // 获取 deepDecorator，由 createDecoratorForEnhancer 生成（deepDecorator 下面挂了 deepEnhancer 属性）
            const defaultDecorator = getDefaultDecoratorFromObjectOptions(o)
            // proxy 劫持也需初始化 base，给空对象添加 adm，mobxDidRunLazyInitializersSymbol 等属性
            // extendObservable 传新对象 {} 来进行后续的操作，不影响原值
            const base = extendObservable({}, undefined, undefined, o) as any
            const proxy = createDynamicObservableObject(base) // 如果可以用 proxy，走 proxy 劫持
            extendObservableObjectWithProperties(proxy, props, decorators, defaultDecorator) // 劫持 props
            return proxy
        }
    },
    ref: refDecorator,
    shallow: shallowDecorator,
    deep: deepDecorator,
    struct: refStructDecorator
} as any

export const observable: IObservableFactory &
    IObservableFactories & {
        enhancer: IEnhancer<any>
    } = createObservable as any

// weird trick to keep our typings nicely with our funcs, and still extend the observable function
Object.keys(observableFactories).forEach(name => (observable[name] = observableFactories[name]))

function incorrectlyUsedAsDecorator(methodName) {
    fail(
        // process.env.NODE_ENV !== "production" &&
        `Expected one or two arguments to observable.${methodName}. Did you accidentally try to use observable.${methodName} as decorator?`
    )
}
