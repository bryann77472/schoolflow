import type { FastifyInstance } from 'fastify';
import * as controller from '../controllers/focus.controller';
import { authenticate } from '../middleware/auth';

export async function focusRoutes(app: FastifyInstance): Promise<void> {
  app.get('/focus', { preHandler: authenticate }, controller.list);
  app.post('/focus', { preHandler: authenticate }, controller.create);
}
