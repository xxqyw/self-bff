# 实现一个非常简单的 node bff 框架

目的是学习一些 node 框架中用到的概念：类装饰器、依赖注入、洋葱圈模型、reflec-metadata 等。不会包含：插件能力、文件扫描能力、其他能力。

在我们将要实现的框架中，我们需要写的代码主要在 controller 层和 service 层。service 层的方法可以认为是比较原子、底层的方法，在这里我们可以调用下游请求或者其他操作。而 controller 层的方法对应 url 的响应，一个 controller 方法处理一个 url 的请求，这里可以使用多个 service 的能力来处理返回。而对于一些公共的能力（如日志），我们可以编写一个中间件来在 controller 执行前后做一些处理。

## 目标

实现一个拥有中间件、controller、service 层的 node 服务。其中代码编写方式如下：

### 中间件

可以在 controller 执行前后做处理

```javascript
export const m1: Middleware = (ctx, next) => {
  console.log(">>>>>>>>>>>>>>>>Middleware Do 1");
  next();
  console.log(">>>>>>>>>>>>>>>>Middleware Do 4");
};
```

### controller

使用修饰器定义请求的方法和 url，使用修饰器做 Ioc（依赖注入方式实现），注入依赖的 service

```javascript
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
```

### service

使用修饰器使 class 可以被注入

```javascript
@Injectable()
export class Test1Service {
  async test1() {
    return "test1";
  }
}
```

## 实现步骤

### 仓库创建

1. npm init 初始化一个新的 package

2. 创建 index.ts 文件，增加 dev 命令

```json
{
  "name": "self-gulux",
  "version": "1.0.0",
  "description": "尝试编写简易的 gulux",
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
```

3. 增加 tsconfig.json 文件

```json
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
```

### 启动服务

启动一个监听 8081 端口的请求的服务器，并处理参数和返回，这里会依赖 http 这个依赖

```javascript
const http = require("http");

http
  .createServer(async (request, response) => {
    const urlNotFoundError = () => {
      response.writeHead(404, { "Content-Type": "text/plain;charset=utf8" });
      //设置回传信息
      response.write("url not found");
      //告诉用户端请求结束
      response.end();
    };
    const { url, query } = getQuery(request.url);
    if (request.method === "GET") {
      response.writeHead(200, { "Content-Type": "text/plain;charset=utf8" });
      response.write(context.body);
      response.end();
    } else if (request.method === "POST") {
      const chunks = [];
      let size = 0;
      let params;
      request.on("data", (chunk) => {
        chunks.push(chunk);
        size += chunk.length;
      });
      request.on("end", async () => {
        var buf = Buffer.concat(chunks, size);
        params = JSON.parse(buf.toString());
        response.writeHead(200, { "Content-Type": "text/plain;charset=utf8" });
        response.write(context.body);
        response.end();
      });
    }
  })
  //请求监听端口 8081
  .listen(8081);

console.log("Server running at http://127.0.0.1:8081/");
```

### 实现 controller 层

这里要实现@controller、@Get、@Post 这三个装饰器，使得我们使用这几个装饰器后，就可以做到请求 url、请求方法和具体要执行的方法的映射。

#### 前置知识

1. 类装饰器
   使用装饰器可以扩展原来的 class 的能力，你只要定义一个方法，然后在 class 的声明上一行使用@方法即可

```javascript
const testDecorator = (target) => {
  target.prototype.test = () => console.log("do test");
  return target;
};

@testDecorator
class Test {
  str: string;
  constructor() {
    this.str = "test";
  }
}

const t: any = new Test();
t.test(); // do test
```

装饰器同样也可以修饰类的属性。

2. reflect-metadata

这里需要使用 reflect-metadata，这玩意是 es7 的一个能力，让我们能够在声明的时候就给对象或者对象的属性定义和获取元属性，用这个也可以做到后面的依赖注入。
参考：https://github.com/rbuckton/reflect-metadata#api、https://jkchao.github.io/typescript-book-chinese/tips/metadata.html#%E5%9F%BA%E7%A1%80

```javascript
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
  method() {}
}
```

#### @controller

```javascript
// 传入这个 cotroller 的 url 前缀，返回一个装饰器，在这个装饰器中使用 Reflect.defineMetadata 将传入的 path 写在 class 的元数据中
export const Controller =
  (path: string): ClassDecorator =>
  (target: any) => {
    Reflect.defineMetadata("path", path, target);
  };
```

#### @Get、@Post

```javascript
// 这里就是给 class 的方法加上 path 和 method 元数据
const createRequestDecorator =
  (method: string) =>
  (path: string): MethodDecorator =>
  (target: any, key, descriptor) => {
    Reflect.defineMetadata("path", path, target, key);
    Reflect.defineMetadata("method", method, target, key);
  };
export const Get = createRequestDecorator("get");
export const Post = createRequestDecorator("post");
```

### 获取 url、请求方法和 controller 的映射

这里因为没有实现文件扫描能力，所以需要手动处理一下这个映射。遍历所有 controller，从 controller 中获取到 class 的 path、方法的 path 和 method，创建对应实例，将方法映射出去。

```javascript
import Test1Controller from "../src/controller/test1";
import Test2Controller from "../src/controller/test2";

const controllers = [Test1Controller, Test2Controller];

const getFnMap = new Map();
const postFnMap = new Map();
const mapRoute = (controller: any) => {
  const instance = new controller();
  const proto = Object.getPrototypeOf(instance);
  const prefix = Reflect.getMetadata("path", controller);
  const methods = Object.getOwnPropertyNames(proto).filter(
    (item) => item !== "constructor" && typeof instance[item] === "function"
  );
  methods.forEach((methodName) => {
    const method = instance[methodName].bind(instance);
    const path = Reflect.getMetadata("path", instance, methodName);
    const methodType = Reflect.getMetadata("method", instance, methodName);
    if (methodType === "get") {
      getFnMap.set(`/${prefix}/${path}`, method);
    } else if (methodType === "post") {
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
```

接下来只要在请求的时候，用 url 和请求方法从对应的 map 中取出方法执行即可

```javascript
if (request.method === "GET") {
  const get = getFnMap.get(url);
  if (get) {
    await fn(context, () => get(query));
    response.writeHead(200, { "Content-Type": "text/plain;charset=utf8" });
    response.write(context.body);
    response.end();
  } else {
    urlNotFoundError();
  }
} else if (request.method === "POST") {
  const chunks = [];
  let size = 0;
  let params;
  request.on("data", (chunk) => {
    chunks.push(chunk);
    size += chunk.length;
  });
  request.on("end", async () => {
    var buf = Buffer.concat(chunks, size);
    params = JSON.parse(buf.toString());
    const post = postFnMap.get(url);
    if (post) {
      await fn(context, () => post(params));
      response.writeHead(200, { "Content-Type": "text/plain;charset=utf8" });
      response.write(context.body);
      response.end();
    } else {
      urlNotFoundError();
    }
  });
}
```

### 实现 service 的依赖注入

这里我们需要实现@Inject 和@Injectable 来实现 Ioc 和 DI。我们使用一个 map 作为 Ioc 容器，使用装饰器和 reflect-metadata 实现依赖注入。

#### 前置知识

1. 依赖注入
   参考https://www.jianshu.com/p/07af9dbbbc4b
   依赖注入就是将实例变量传入到一个对象中去(Dependency injection means giving an object its instance variables)。
   假如我们要做游戏，有以下 class：

```javascript
class Weapon {
  weaponName: string;
  constructor(name: string) {
    this.weaponName = name;
  }
  attack() {
    console.log("You attack with a " + this.weaponName);
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
```

这样如果我们有 10 个人，那么就会 new 10 把武器，如果这 10 把武器都是同一把武器，那不就浪费空间了吗。
那我们直接先把武器创建好然后传给 Role 不就好了吗。

```javascript
class Role {
  roleName: string;
  weapon: Weapon;
  constructor(roleName: string, weapon: Weapon) {
    this.roleName = roleName;
    this.weapon = weapon;
  }
}
```

#### @Injectable

// 以 map 作为 Ioc 容器，存放 service 实例

```javascript
export const InjectableMap = new Map();
export const Injectable = (): ClassDecorator => (target: any) => {
  InjectableMap.set(target.name, new target());
};
```

#### @Inject

```javascript
// 给 controller 定义属性名和属性类型（service）的 kv 映射
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

```

### 使用 service 实例

在获取 url、方法和 controller 的映射的过程中，可以取出 controller 的属性和属性类型（service）的 kv 映射。然后设置属性。

```javascript
const propertyTypeList =
  Reflect.getMetadata("propertyTypeList", instance) ?? [];
propertyTypeList.forEach((item) => {
  instance[item.key] = InjectableMap.get(item.propertyType.name);
});
```

### 实现中间件能力

中间件的执行逻辑实际上是一个洋葱圈模型：https://juejin.cn/post/7012031464237694983

```javascript
export const m1: Middleware = (ctx, next) => {
  console.log(">>>>>>>>>>>>>>>>Middleware Do 1");
  next();
  console.log(">>>>>>>>>>>>>>>>Middleware Do 4");
};

export const m2: Middleware = (ctx, next) => {
  console.log(">>>>>>>>>>>>>>>>Middleware Do 2");
  next();
  console.log(">>>>>>>>>>>>>>>>Middleware Do 3");
};

// 使用这两个中间件[m1, m2]后，结果是
// >>>>>>>>>>>>>>>>Middleware Do 1
// >>>>>>>>>>>>>>>>Middleware Do 2
// >>>>>>>>>>>>>>>>Middleware Do 3
// >>>>>>>>>>>>>>>>Middleware Do 4
```

要这样做，我们就得让这个 next 方法执行的是下一个中间件

```javascript
import { Context } from "./type";

export type Middleware = (context: Context, next: Function) => void;
export const compose = (middlewareList: Middleware[]) => {
  return async function (ctx: Context, next: Function) {
    let i = -1;
    const dispatch = async (i: number) => {
      const middleware = middlewareList[i];
      // 当执行完成中间件的 next 之前的操作后，发起真正的请求。
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
```

### 应用中间件

```javascript
const context: Context = {
  body: "0",
};
const middlewareList = [m1, m2];
const fn = compose(middlewareList);
await fn(context, () => get(query));
```

## 结论

这样我们就实现了一个非常简陋的 gulux，这个过程中，使用到了这些知识：装饰器、reflect-metadata、依赖注入、洋葱圈模型。
代码：https://code.byted.org/xigua-fe/blaze/tree/test/self-gulux/packages/self-gulux
