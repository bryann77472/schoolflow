import type { FastifyInstance } from 'fastify';
import * as controller from '../controllers/assignments.controller';
import { authenticate } from '../middleware/auth';

export async function assignmentsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/assignments', { preHandler: authenticate }, controller.list);
  app.get('/assignments/:id', { preHandler: authenticate }, controller.getById);
  app.post('/assignments', { preHandler: authenticate }, controller.create);
  app.patch('/assignments/:id', { preHandler: authenticate }, controller.update);
  app.delete('/assignments/:id', { preHandler: authenticate }, controller.remove);
}
