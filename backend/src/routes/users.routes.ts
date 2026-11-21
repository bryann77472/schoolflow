import type { FastifyInstance } from 'fastify';
import * as controller from '../controllers/users.controller';
import { authenticate, requireRole } from '../middleware/auth';

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  // Leituras: escopo por perfil aplicado no service.
  app.get('/users', { preHandler: authenticate }, controller.list);
  app.get('/users/:id', { preHandler: authenticate }, controller.getById);

  // Escritas: exclusivamente administradores.
  app.post('/users', { preHandler: [authenticate, requireRole('admin')] }, controller.create);
  app.patch('/users/:id', { preHandler: [authenticate, requireRole('admin')] }, controller.update);
  app.delete('/users/:id', { preHandler: [authenticate, requireRole('admin')] }, controller.remove);
}
