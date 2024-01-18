import { Context } from './type';

export type Middleware = (context: Context, next: Function) => void;
export const compose = (middlewareList: Middleware[]) => {
  return async function (ctx: Context, next: Function) {
    let i = -1;
    const dispatch = async (i: number) => {
      const middleware = middlewareList[i];
      if (!middleware || i === middlewareList.length) {
        const res = await next();
        ctx.body = res;
        return;
      }
      return middleware(ctx, dispatch.bind(null, i + 1));
    };
    return await dispatch(0);
  };
};
