export type PropertyCreator = (
  instance: Record<string, any>,
  propertyName: PropertyKey,
  descriptor: PropertyDescriptor & { initializer?: () => any },
  decoratorArgs: any[],
) => any;

/**
 * 判断装饰器为哪种类型
 * 如果为 @decorator obj，则直接 decorator 返回 descriptor（decorator.apply(null, arguments as any)）
 * 如果为 @decorator('decoratorArguments') obj2，则返回 decorator（在书写时执行）
 */
export function createPropDecorator(propertyCreator: PropertyCreator) {
  return function decoratorFactory(...args: any[]) {
    let decoratorArgs: any[];

    function decorator(
      target: any,
      prop: string,
      descriptor: PropertyDescriptor,
    ) {
      const _res = propertyCreator(target, prop, descriptor, decoratorArgs);
      return {}; // bind in addObservableProp or addComputedProp
    }

    // @decorator
    if (quacksLikeADecorator(args)) {
      decoratorArgs = [];
      // @ts-ignore
      return decorator(...args);
    }
    // @decorator(args)
    decoratorArgs = args;
    return decorator;
  };
}

/**
 * 判断装饰器为哪种类型
 * 如果为 @decorator obj，则直接 decorator 返回 descriptor（decorator.apply(null, arguments as any)）
 * 如果为 @decorator('decoratorArguments') obj2，则返回 decorator（在书写时执行）
 */
function quacksLikeADecorator(args: any[]): boolean {
  // 类：1；属性：2；方法：3；方法参数：3
  return (
    ((args.length === 2 || args.length === 3) && typeof args[1] === 'string') ||
    (args.length === 4 && args[3] === true)
  );
}
