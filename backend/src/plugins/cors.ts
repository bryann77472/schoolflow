import cors from '@fastify/cors';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { getAllowedOrigins } from '../config/env';
import { HttpError } from '../utils/http-error';

export const corsPlugin = fp(async (app: FastifyInstance) => {
  const allowed = getAllowedOrigins();

  await app.register(cors, {
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    origin: (origin, callback) => {
      // Clientes sem cabeçalho Origin (curl, servidores) não são restringidos.
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new HttpError(403, 'origin_not_allowed', `Origem não permitida: ${origin}`), false);
    }
  });
});
