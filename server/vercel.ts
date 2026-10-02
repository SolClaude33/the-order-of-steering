import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildServer } from './app.ts';
import { readServerConfig } from './config.ts';

export function createVercelHandler(create = () => buildServer(readServerConfig())) {
  let ready: ReturnType<typeof buildServer> | undefined;
  return async (request: IncomingMessage, response: ServerResponse) => {
    try {
      ready ||= create().then(async (built) => {
        await built.app.ready();
        return built;
      });
      const { app } = await ready;
      const url = new URL(request.url || '/', 'https://internal.invalid');
      if (url.pathname === '/api' && url.searchParams.has('__order_route')) {
        const path = url.searchParams.get('__order_route')!;
        url.searchParams.delete('__order_route');
        request.url =
          '/api/' + path + (url.searchParams.size ? '?' + url.searchParams.toString() : '');
      }
      // Pass the raw stream to Fastify; do not access Vercel's lazy body getter.
      await new Promise<void>((resolve) => {
        response.once('finish', resolve);
        response.once('close', resolve);
        app.server.emit('request', request, response);
      });
    } catch {
      ready = undefined;
      response.statusCode = 503;
      response.setHeader('Content-Type', 'application/json');
      response.setHeader('Cache-Control', 'no-store');
      response.end(
        JSON.stringify({ error: 'The service is temporarily unavailable. Please try again.' }),
      );
      console.error(
        'Order API initialization failed. Check the server environment and database connection.',
      );
    }
  };
}
