import {
    IDerivationState,
    IObservable,
    IDerivation,
    createInstanceofPredicate,
    endBatch,
    getNextId,
    noop,
    onBecomeObserved,
    onBecomeUnobserved,
    propagateChanged,
    reportObserved,
    startBatch
} from "../internal"
import { Lambda } from "../utils/utils"

export const $mobx = Symbol("mobx administration")

export interface IAtom extends IObservable {
    reportObserved()
    reportChanged()
}


/**
 * 任何能用于存储应用状态的值在 Mobx 中称为 Atom，它会在「被观察时」和「自身发生变化时」发送通知。
 */
export class Atom implements IAtom {
    // 标志属性，不再被观察时为 true
    isPendingUnobservation = false // for effective unobserving. BaseAtom has true, for extra optimization, so its onBecomeUnobserved never gets called, because it's not needed
    isBeingObserved = false
    // 观察者数组
    observers = new Set<IDerivation>()
    // 用于比较 Derivation 的新旧依赖
    diffValue = 0
    // 上一次被使用时，Derivation 的 runId
    lastAccessedBy = 0
    // 状态最新的观察者所处的状态
    lowestObserverState = IDerivationState.NOT_TRACKING
    /**
     * Create a new atom. For debugging purposes it is recommended to give it a name.
     * The onBecomeObserved and onBecomeUnobserved callbacks can be used for resource management.
     */
    constructor(public name = "Atom@" + getNextId()) { }

    public onBecomeObservedListeners: Set<Lambda> | undefined
    public onBecomeUnobservedListeners: Set<Lambda> | undefined

    public onBecomeObserved() {
        if (this.onBecomeObservedListeners) {
            this.onBecomeObservedListeners.forEach(listener => listener())
        }
    }

    public onBecomeUnobserved() {
        if (this.onBecomeUnobservedListeners) {
            this.onBecomeUnobservedListeners.forEach(listener => listener())
        }
    }

    /**
     * Invoke this method to notify mobx that your atom has been used somehow.
     * Returns true if there is currently a reactive context.
     * 被使用时触发
     */
    public reportObserved(): boolean {
        return reportObserved(this)
    }

    /**
     * Invoke this method _after_ this method has changed to signal mobx that all its observers should invalidate.
     * 发生变化时触发
     */
    public reportChanged() {
        // 无 inBatch 下，值的改变引起的会先加锁，调用 onBecomeStale 会在 runReactions 会拦截住
        // 在 endBatch 中会再调 runReactions 来处理 reaction
        startBatch()
        propagateChanged(this)
        endBatch()
    }

    toString() {
        return this.name
    }
}

export const isAtom = createInstanceofPredicate("Atom", Atom)

export function createAtom(
    name: string,
    onBecomeObservedHandler: () => void = noop,
    onBecomeUnobservedHandler: () => void = noop
): IAtom {
    const atom = new Atom(name)
    // default `noop` listener will not initialize the hook Set
    if (onBecomeObservedHandler !== noop) {
        onBecomeObserved(atom, onBecomeObservedHandler)
    }

    if (onBecomeUnobservedHandler !== noop) {
        onBecomeUnobserved(atom, onBecomeUnobservedHandler)
    }
    return atom
}
