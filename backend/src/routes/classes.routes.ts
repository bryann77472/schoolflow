import type { FastifyInstance } from 'fastify';
import * as controller from '../controllers/classes.controller';
import { authenticate, requireRole } from '../middleware/auth';

export async function classesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/classes', { preHandler: authenticate }, controller.list);
  app.get('/classes/:id', { preHandler: authenticate }, controller.getById);

  app.post('/classes', { preHandler: [authenticate, requireRole('admin')] }, controller.create);
  app.patch('/classes/:id', { preHandler: [authenticate, requireRole('admin')] }, controller.update);
  app.delete('/classes/:id', { preHandler: [authenticate, requireRole('admin')] }, controller.remove);
}
