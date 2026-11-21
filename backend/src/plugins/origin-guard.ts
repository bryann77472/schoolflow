import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { getAllowedOrigins } from '../config/env';
import { HttpError } from '../utils/http-error';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Defesa em profundidade contra CSRF.
 *
 * Com SameSite=None o cookie acompanha requisições cross-site, portanto o CORS
 * sozinho não impede que uma requisição de um site hostil chegue ao servidor.
 * Esta proteção exige que toda operação que modifica dados tenha um header Origin
 * pertencente à lista explícita de origens permitidas.
 *
 * Clientes que não são navegadores (curl, health checks, scripts server-side)
 * normalmente não enviam Origin e continuam funcionando. Navegadores sempre
 * enviam Origin em POST/PATCH/DELETE cross-origin (e também same-origin).
 */
export const originGuardPlugin = fp(async (app: FastifyInstance) => {
  const allowed = new Set(getAllowedOrigins());

  app.addHook('onRequest', async (request) => {
    if (SAFE_METHODS.has(request.method)) return;

    const origin = request.headers.origin;
    if (!origin) return;

    if (!allowed.has(origin)) {
      throw new HttpError(
        403,
        'origin_not_allowed',
        'Origem não autorizada para esta operação.'
      );
    }
  });
});
