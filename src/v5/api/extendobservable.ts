import {
    CreateObservableOptions,
    asCreateObservableOptions,
    asObservableObject,
    computedDecorator,
    deepDecorator,
    endBatch,
    fail,
    getPlainObjectKeys,
    invariant,
    isComputed,
    isObservable,
    isObservableMap,
    refDecorator,
    startBatch,
    stringifyKey,
    initializeInstance
} from "../internal"
import { IObservableDecorator } from "./observabledecorator"
import { isPlainObject } from "../utils/utils"

export function extendObservable<A extends Object, B extends Object>(
    target: A,
    properties?: B,
    decorators?: { [K in keyof B]?: Function },
    options?: CreateObservableOptions
): A & B {
    if (process.env.NODE_ENV !== "production") {
        invariant(
            arguments.length >= 2 && arguments.length <= 4,
            "'extendObservable' expected 2-4 arguments"
        )
        invariant(
            typeof target === "object",
            "'extendObservable' expects an object as first argument"
        )
        invariant(
            !isObservableMap(target),
            "'extendObservable' should not be used on maps, use map.merge instead"
        )
    }

    options = asCreateObservableOptions(options)
    const defaultDecorator = getDefaultDecoratorFromObjectOptions(options)
    initializeInstance(target) // Fixes #1740
    // 这一步完成之后，target里被构造出adm对象，此时并没有生成可观察属性，values也是空map
    asObservableObject(target, options.name, defaultDecorator.enhancer) // make sure object is observable, even without initial props
    // 这一步根据属性描述符定义可观察属性
    if (properties)
        extendObservableObjectWithProperties(target, properties, decorators, defaultDecorator)
    return target as any
}

export function getDefaultDecoratorFromObjectOptions(
    options: CreateObservableOptions
): IObservableDecorator {
    return options.defaultDecorator || (options.deep === false ? refDecorator : deepDecorator)
}

export function extendObservableObjectWithProperties(
    target,
    properties,
    decorators,
    defaultDecorator
) {
    if (process.env.NODE_ENV !== "production") {
        invariant(
            !isObservable(properties),
            "Extending an object with another observable (object) is not supported. Please construct an explicit propertymap, using `toJS` if need. See issue #540"
        )
        if (decorators) {
            const keys = getPlainObjectKeys(decorators)
            for (const key of keys) {
                if (!(key in properties!))
                    fail(
                        `Trying to declare a decorator for unspecified property '${stringifyKey(
                            key
                        )}'`
                    )
            }
        }
    }
    startBatch()
    try {
        const keys = getPlainObjectKeys(properties)
        for (const key of keys) { // NOTE: 将 object 当前层（要考虑递归）的 key 遍历进行劫持
            const descriptor = Object.getOwnPropertyDescriptor(properties, key)!
            if (process.env.NODE_ENV !== "production") {
                if (!isPlainObject(properties))
                    fail(`'extendObservabe' only accepts plain objects as second argument`)
                if (Object.getOwnPropertyDescriptor(target, key))
                    fail(
                        `'extendObservable' can only be used to introduce new properties. Use 'set' or 'decorate' instead. The property '${stringifyKey(
                            key
                        )}' already exists on '${target}'`
                    )
                if (isComputed(descriptor.value))
                    fail(
                        `Passing a 'computed' as initial property value is no longer supported by extendObservable. Use a getter or decorator instead`
                    )
            }
            const decorator =
                decorators && key in decorators
                    ? decorators[key]
                    : descriptor.get
                    ? computedDecorator // @computed something = ...
                    : defaultDecorator
            if (process.env.NODE_ENV !== "production" && typeof decorator !== "function")
                fail(`Not a valid decorator for '${stringifyKey(key)}', got: ${decorator}`)
/**
 * 获取到准备好的用来处理该对象的 decorator，然后传入属性装饰器需要的三个基本参数：target, key, descriptor
 * 返回的结果就是劫持完该属性后的 resultDescriptor，再通过 Object.defineProperty 写入 target（即被 proxy 代理的 base 空对象）中
 * 由此完成当前层的当前 key 的劫持
 */
            const resultDescriptor = decorator!(target, key, descriptor, true)
            if (
                resultDescriptor // otherwise, assume already applied, due to `applyToInstance`
            )
                // 将 resultDescriptor 赋值给已经初始化后的空对象 target 中
                Object.defineProperty(target, key, resultDescriptor)
        }
    } finally {
        endBatch()
    }
}
