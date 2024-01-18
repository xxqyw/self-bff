import { Middleware } from '../../core/compose';

export const m2: Middleware = (ctx, next) => {
  console.log('>>>>>>>>>>>>>>>>Middleware Do 2');
  next();
  console.log('>>>>>>>>>>>>>>>>Middleware Do 3');
};
