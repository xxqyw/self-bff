import { Params } from 'core/type';
import { Controller, Get, Inject } from '../../core/decorator';
import { obj2Str } from '../util';
import { Test1Service } from '../service/test1';
import { Test2Service } from '../service/test2';
import 'reflect-metadata';

@Controller('test1')
export class Test1Controller {
  @Inject()
  private test1Service: Test1Service;
  @Inject(Test2Service)
  private test2Service: any;

  @Get('get-fn1')
  async getFn1(params: Params) {
    const value = await this.test1Service.test1();
    return 'get1: ' + obj2Str(params) + 'and return: ' + value;
  }
  @Get('get-fn2')
  async getFn2(params: Params) {
    const value = await this.test2Service.test2();
    return 'get2: ' + obj2Str(params) + 'and return: ' + value;
  }
}

export default Test1Controller;
