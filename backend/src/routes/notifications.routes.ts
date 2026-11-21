import type { FastifyInstance } from 'fastify';
import * as controller from '../controllers/notifications.controller';
import { authenticate } from '../middleware/auth';

export async function notificationsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/notifications', { preHandler: authenticate }, controller.list);
  app.patch('/notifications/read', { preHandler: authenticate }, controller.markRead);
}
