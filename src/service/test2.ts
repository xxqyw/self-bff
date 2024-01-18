import { Injectable } from '../../core/decorator';
import 'reflect-metadata';

@Injectable()
export class Test2Service {
  async test2() {
    return 'test2';
  }
}
