import type { FastifyInstance } from 'fastify';
import { login, logout, me, register } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Rotas públicas
  app.post('/auth/register', register);
  app.post('/auth/login', login);
  app.post('/auth/logout', logout);

  // Rotas protegidas
  app.get('/auth/me', { preHandler: authenticate }, me);
}
