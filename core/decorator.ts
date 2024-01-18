export const Controller =
  (path: string): ClassDecorator =>
  (target: any) => {
    Reflect.defineMetadata('path', path, target);
  };
const createRequestDecorator =
  (method: string) =>
  (path: string): MethodDecorator =>
  (target: any, key, descriptor) => {
    Reflect.defineMetadata('path', path, target, key);
    Reflect.defineMetadata('method', method, target, key);
  };
export const Get = createRequestDecorator('get');
export const Post = createRequestDecorator('post');

export const InjectableMap = new Map();
export const Injectable = (): ClassDecorator => (target: any) => {
  InjectableMap.set(target.name, new target());
};

type Constructable<T = unknown> = new (...args: any[]) => T;
export type Identifier<T = unknown> = Constructable<T>;
export const Inject =
  (identifier?: Identifier): PropertyDecorator =>
  (target: any, key) => {
    let propertyType = identifier;
    if (!propertyType) {
      propertyType = Reflect.getMetadata('design:type', target, key);
    }
    const propertyTypeList = Reflect.getMetadata('propertyTypeList', target) ?? [];
    Reflect.defineMetadata(
      'propertyTypeList',
      [
        ...propertyTypeList,
        {
          key,
          propertyType,
        },
      ],
      target
    );
  };
