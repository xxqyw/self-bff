import Test1Controller from '../src/controller/test1';
import Test2Controller from '../src/controller/test2';
import { InjectableMap } from './decorator';

const controllers = [Test1Controller, Test2Controller];

const getFnMap = new Map();
const postFnMap = new Map();
const mapRoute = (controller: any) => {
  const instance = new controller();
  const proto = Object.getPrototypeOf(instance);
  const prefix = Reflect.getMetadata('path', controller);
  const methods = Object.getOwnPropertyNames(proto).filter(
    (item) => item !== 'constructor' && typeof instance[item] === 'function'
  );
  const propertyTypeList = Reflect.getMetadata('propertyTypeList', instance) ?? [];
  propertyTypeList.forEach((item) => {
    instance[item.key] = InjectableMap.get(item.propertyType.name);
  });
  methods.forEach((methodName) => {
    const method = instance[methodName].bind(instance);
    const path = Reflect.getMetadata('path', instance, methodName);
    const methodType = Reflect.getMetadata('method', instance, methodName);
    if (methodType === 'get') {
      getFnMap.set(`/${prefix}/${path}`, method);
    } else if (methodType === 'post') {
      postFnMap.set(`/${prefix}/${path}`, method);
    }
  });
};

export const mapRoutes = () => {
  controllers.forEach((controller) => {
    mapRoute(controller);
  });
  return {
    getFnMap,
    postFnMap,
  };
};
