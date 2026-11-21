import cookie from '@fastify/cookie';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

export const cookiesPlugin = fp(async (app: FastifyInstance) => {
  await app.register(cookie);
});
