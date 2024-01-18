import { Injectable } from '../../core/decorator';
import 'reflect-metadata';

@Injectable()
export class Test1Service {
  async test1() {
    return 'test1';
  }
}
