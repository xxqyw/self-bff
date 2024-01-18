import { Middleware } from '../../core/compose';

export const m1: Middleware = (ctx, next) => {
  console.log('>>>>>>>>>>>>>>>>Middleware Do 1');
  next();
  console.log('>>>>>>>>>>>>>>>>Middleware Do 4');
};
