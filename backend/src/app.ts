import Fastify, { type FastifyInstance } from 'fastify';
import { disconnectDatabase } from './config/database';
import { env } from './config/env';
import { cookiesPlugin } from './plugins/cookies';
import { corsPlugin } from './plugins/cors';
import { errorHandlerPlugin } from './plugins/error-handler';
import { jwtPlugin } from './plugins/jwt';
import { originGuardPlugin } from './plugins/origin-guard';
import { registerRoutes } from './routes';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
    trustProxy: true
  });

  // Ordem importante: erros primeiro, cookies antes do JWT.
  await app.register(errorHandlerPlugin);
  await app.register(cookiesPlugin);
  await app.register(corsPlugin);
  await app.register(originGuardPlugin);
  await app.register(jwtPlugin);
  await app.register(registerRoutes, { prefix: '/api' });

  app.addHook('onClose', async () => {
    await disconnectDatabase();
  });

  return app;
}
