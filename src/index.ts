const http = require('http');
import { mapRoutes } from '../core/mapRoutes';
import { getQuery } from './util';
import { m1 } from './middleware/m1';
import { m2 } from './middleware/m2';
import { compose } from '../core/compose';
import { Context } from '../core/type';
import 'reflect-metadata';

const { getFnMap, postFnMap } = mapRoutes();

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
    const context: Context = {
      body: '0',
    };
    const middlewareList = [m1, m2];
    const { url, query } = getQuery(request.url);
    const fn = compose(middlewareList);
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
    }
  })
  //请求监听端口8081
  .listen(8081);

console.log('Server running at http://127.0.0.1:8081/');
