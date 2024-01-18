import { Params } from 'core/type';
import { Controller, Post } from '../../core/decorator';
import 'reflect-metadata';
import { obj2Str } from '../util';

@Controller('test2')
export class Test2Controller {
  @Post('post-fn')
  async postFn(params: Params) {
    return 'post: ' + obj2Str(params);
  }
}

export default Test2Controller;
