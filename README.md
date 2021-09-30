## mobx 设计的几种抽象概念：
---
<br/>

1、observable: 响应式数据，最主要的特征是将数据变更信息上报给全局监听器，其变更会导致变更会引起指定的观察者执行其处理逻辑。mobx 使用 IObservable 接口，Atom 类加以抽象。
<br/><br/>
2、derivation: 衍生，响应式数据变更后执行的副作用函数，可以理解为实际消费 observable 的观察者。包含计算属性（ComputedValue类）、反应(Reaction类)。mobx 使用 IDerivation 接口，ComputedValue 类、Reaction 类加以抽象。

>在 mobx 实现中，observable, derivation 相互持有彼此的引用。  bindDependencies

<br/>
3、action: 动作，由其促使响应式数据发生变更。上一篇文章已指出，使用 observableValue 实例的 set 方法，就能促使响应式数据发生变更，action 的意义在于，使用 startBatch, endBatch 事务封装执行动作，将一组响应式数据变更复合为一，等到这组响应式数据变更完结后，才执行 derivation。在 mobx 中，action 比较单薄，因为最要紧的——将响应式数据变更上报到全局环境——这一机制由 observable 完成。在这篇文章中将不作赘述。


![111](https://pic1.zhimg.com/80/v2-14fc70fff7ef13898f1274b50aaa78b8_720w.jpg)

<br/>




## 处理数据
---
<br/>

![222](https://pic2.zhimg.com/80/v2-25e755355cfdbfa6d482e407a6ad3125_720w.jpg)

## how reportChanged work
---
<br>

![333](https://pic3.zhimg.com/80/v2-5faa1eaa791c8a03d38b05b3ec5c73e2_720w.jpg)