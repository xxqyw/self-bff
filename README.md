仅对gulux做拙劣的模仿，目的是学习一些node框架中用到的概念：类装饰器、依赖注入、洋葱圈模型、reflec-metadata等。不会包含：插件能力、文件扫描能力、其他能力。
gulux介绍
https://gulux.bytedance.net/guide/getting-started.html
使用gulux，我们需要写的代码主要在controller层和service层。service层的方法可以认为是比较原子、底层的方法，在这里我们可以调用下游请求或者其他操作。而controller层的方法对应url的响应，一个controller方法处理一个url的请求，这里可以使用多个service的能力来处理返回。而对于一些公共的能力（如日志），我们可以编写一个中间件来在controller执行前后做一些处理。
目标
实现一个拥有中间件、controller、service层的node服务。其中代码编写方式如下：
中间件
可以在controller执行前后做处理
export const m1: Middleware = (ctx, next) => {
  console.log('>>>>>>>>>>>>>>>>Middleware Do 1');
  next();
  console.log('>>>>>>>>>>>>>>>>Middleware Do 4');
};

controller
使用修饰器定义请求的方法和url，使用修饰器做Ioc（依赖注入方式实现），注入依赖的service
@Controller('test1')
export class Test1Controller {
  @Inject()
  private test1Service: Test1Service;
  @Inject(Test2Service)
  private test2Service: any;

  @Get('get-fn1')
  async getFn1(params: Params) {
    return await this.test1Service.test1();
  }
  @Post('post-fn2')
  async postFn2(params: Params) {
    return await this.test2Service.test2();
  }
}

export default Test1Controller;

service
使用修饰器使class可以被注入
@Injectable()
export class Test1Service {
  async test1() {
    return 'test1';
  }
}

实现步骤
仓库创建
1. npm init 初始化一个新的package
2. 创建index.ts文件，增加dev命令
{
  "name": "self-gulux",
  "version": "1.0.0",
  "description": "尝试编写简易的gulux",
  "main": "index.js",
  "scripts": {
    "dev": "ts-node ./src/index.ts",
    "test": "test"
  },
  "license": "ISC",
  "dependencies": {
    "http": "^0.0.1-security",
    "querystring": "^0.2.1",
    "reflect-metadata": "^0.2.1",
    "ts-node": "^10.9.2"
  },
  "devDependencies": {
    "@types/node": "^20.10.8"
  }
}

3. 增加tsconfig.json文件
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "src": ["./src/"]
    },
    "target": "es2017",
    "types": ["reflect-metadata", "node"],
    "esModuleInterop": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  }
}

启动服务
启动一个监听8081端口的请求的服务器，并处理参数和返回，这里会依赖http这个依赖
const http = require('http');

http
  .createServer(async (request, response) => {
    /**
     * 设置请求头信息
     * code（statusCode）： 200
     * headers信息: Content-Type
     */
    const urlNotFoundError = () => {
      response.writeHead(404, { 'Content-Type': 'text/plain;charset=utf8' });
      //设置回传信息
      response.write('url not found');
      //告诉用户端请求结束
      response.end();
    };
    const { url, query } = getQuery(request.url);
    if (request.method === 'GET') {
        response.writeHead(200, { 'Content-Type': 'text/plain;charset=utf8' });
        response.write(context.body);
        response.end();
    } else if (request.method === 'POST') {
      const chunks = [];
      let size = 0;
      let params;
      request.on('data', (chunk) => {
        chunks.push(chunk);
        size += chunk.length;
      });
      request.on('end', async () => {
        var buf = Buffer.concat(chunks, size);
        params = JSON.parse(buf.toString());
          response.writeHead(200, { 'Content-Type': 'text/plain;charset=utf8' });
          response.write(context.body);
          response.end();
      });
    }
  })
  //请求监听端口8081
  .listen(8081);

console.log('Server running at http://127.0.0.1:8081/');

实现controller层
这里要实现@controller、@Get、@Post这三个装饰器，使得我们使用这几个装饰器后，就可以做到请求url、请求方法和具体要执行的方法的映射。
前置知识
类装饰器
使用装饰器可以扩展原来的class的能力，你只要定义一个方法，然后在class的声明上一行使用@方法即可
const testDecorator = (target) => {
  target.prototype.test = () => console.log('do test');
  return target;
};

@testDecorator
class Test {
  str: string;
  constructor() {
    this.str = 'test';
  }
}

const t: any = new Test();
t.test(); // do test

装饰器同样也可以修饰类的属性。
reflect-metadata
这里需要使用reflect-metadata，这玩意是es7的一个能力，让我们能够在声明的时候就给对象或者对象的属性定义和获取元属性，用这个也可以做到后面的依赖注入。
参考：https://github.com/rbuckton/reflect-metadata#api、https://jkchao.github.io/typescript-book-chinese/tips/metadata.html#%E5%9F%BA%E7%A1%80
// define metadata on an object or property
Reflect.defineMetadata(metadataKey, metadataValue, target);
Reflect.defineMetadata(metadataKey, metadataValue, target, propertyKey);

// get metadata value of a metadata key on the prototype chain of an object or property
let result = Reflect.getMetadata(metadataKey, target);
let result = Reflect.getMetadata(metadataKey, target, propertyKey);

// apply metadata via a decorator to a constructor
@Reflect.metadata(metadataKey, metadataValue)
class C {
  // apply metadata via a decorator to a method (property)
  @Reflect.metadata(metadataKey, metadataValue)
  method() {
  }
}
@controller
// 传入这个cotroller的url前缀，返回一个装饰器，在这个装饰器中使用Reflect.defineMetadata将传入的path写在class的元数据中
export const Controller =
  (path: string): ClassDecorator =>
  (target: any) => {
    Reflect.defineMetadata('path', path, target);
  };
@Get、@Post
// 这里就是给class的方法加上path和method元数据
const createRequestDecorator =
  (method: string) =>
  (path: string): MethodDecorator =>
  (target: any, key, descriptor) => {
    Reflect.defineMetadata('path', path, target, key);
    Reflect.defineMetadata('method', method, target, key);
  };
export const Get = createRequestDecorator('get');
export const Post = createRequestDecorator('post');
获取url、请求方法和controller的映射
这里因为没有实现文件扫描能力，所以需要手动处理一下这个映射。遍历所有controller，从controller中获取到class的path、方法的path和method，创建对应实例，将方法映射出去。
import Test1Controller from '../src/controller/test1';
import Test2Controller from '../src/controller/test2';

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

接下来只要在请求的时候，用url和请求方法从对应的map中取出方法执行即可
if (request.method === 'GET') {
      const get = getFnMap.get(url);
      if (get) {
        await fn(context, () => get(query));
        response.writeHead(200, { 'Content-Type': 'text/plain;charset=utf8' });
        response.write(context.body);
        response.end();
      } else {
        urlNotFoundError();
      }
    } else if (request.method === 'POST') {
      const chunks = [];
      let size = 0;
      let params;
      request.on('data', (chunk) => {
        chunks.push(chunk);
        size += chunk.length;
      });
      request.on('end', async () => {
        var buf = Buffer.concat(chunks, size);
        params = JSON.parse(buf.toString());
        const post = postFnMap.get(url);
        if (post) {
          await fn(context, () => post(params));
          response.writeHead(200, { 'Content-Type': 'text/plain;charset=utf8' });
          response.write(context.body);
          response.end();
        } else {
          urlNotFoundError();
        }
      });
实现service的依赖注入
这里我们需要实现@Inject和@Injectable来实现Ioc和DI。我们使用一个map作为Ioc容器，使用装饰器和reflect-metadata实现依赖注入。
前置知识
依赖注入
参考https://www.jianshu.com/p/07af9dbbbc4b
依赖注入就是将实例变量传入到一个对象中去(Dependency injection means giving an object its instance variables)。
假如我们要做游戏，有以下class：
class Weapon {
  weaponName: string;
  constructor(name: string) {
    this.weaponName = name;
  }
  attack() {
    console.log('You attack with a ' + this.weaponName);
  }
}

class Role {
  roleName: string;
  weapon: Weapon;
  constructor(roleName: string, weaponName) {
    this.roleName = roleName;
    this.weapon = new Weapon(weaponName);
  }
}

这样如果我们有10个人，那么就会 new 10把武器，如果这10把武器都是同一把武器，那不就浪费空间了吗。
那我们直接先把武器创建好然后传给Role不就好了吗。
class Role {
  roleName: string;
  weapon: Weapon;
  constructor(roleName: string, weapon: Weapon) {
    this.roleName = roleName;
    this.weapon = weapon;
  }
}
@Injectable
// 以map作为Ioc容器，存放service实例
export const InjectableMap = new Map();
export const Injectable = (): ClassDecorator => (target: any) => {
  InjectableMap.set(target.name, new target());
};
@Inject
// 给controller定义属性名和属性类型（service）的kv映射
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

使用service实例
在获取url、方法和controller的映射的过程中，可以取出controller的属性和属性类型（service）的kv映射。然后设置属性。
const propertyTypeList = Reflect.getMetadata('propertyTypeList', instance) ?? [];
  propertyTypeList.forEach((item) => {
    instance[item.key] = InjectableMap.get(item.propertyType.name);
  });
实现中间件能力
中间件的执行逻辑实际上是一个洋葱圈模型：https://juejin.cn/post/7012031464237694983
export const m1: Middleware = (ctx, next) => {
  console.log('>>>>>>>>>>>>>>>>Middleware Do 1');
  next();
  console.log('>>>>>>>>>>>>>>>>Middleware Do 4');
};

export const m2: Middleware = (ctx, next) => {
  console.log('>>>>>>>>>>>>>>>>Middleware Do 2');
  next();
  console.log('>>>>>>>>>>>>>>>>Middleware Do 3');
};

// 使用这两个中间件[m1, m2]后，结果是
// >>>>>>>>>>>>>>>>Middleware Do 1
// >>>>>>>>>>>>>>>>Middleware Do 2
// >>>>>>>>>>>>>>>>Middleware Do 3
// >>>>>>>>>>>>>>>>Middleware Do 4
要这样做，我们就得让这个next方法执行的是下一个中间件
import { Context } from './type';

export type Middleware = (context: Context, next: Function) => void;
export const compose = (middlewareList: Middleware[]) => {
  return async function (ctx: Context, next: Function) {
    let i = -1;
    const dispatch = async (i: number) => {
      const middleware = middlewareList[i];
      // 当执行完成中间件的next之前的操作后，发起真正的请求。
      if (i === middlewareList.length) {
        const res = await next();
        ctx.body = res;
        return;
      }
      return middleware(ctx, dispatch.bind(null, i + 1));
    };
    return await dispatch(0);
  };
};
应用中间件
    const context: Context = {
      body: '0',
    };
    const middlewareList = [m1, m2];
    const fn = compose(middlewareList);
    await fn(context, () => get(query));
结论
这样我们就实现了一个非常简陋的gulux，这个过程中，使用到了这些知识：装饰器、reflect-metadata、依赖注入、洋葱圈模型。
代码：https://code.byted.org/xigua-fe/blaze/tree/test/self-gulux/packages/self-gulux
