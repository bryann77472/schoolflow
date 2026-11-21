import type { FastifyInstance } from 'fastify';
import * as controller from '../controllers/events.controller';
import { authenticate } from '../middleware/auth';

export async function eventsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/events', { preHandler: authenticate }, controller.list);
  app.get('/events/:id', { preHandler: authenticate }, controller.getById);
  app.post('/events', { preHandler: authenticate }, controller.create);
  app.patch('/events/:id', { preHandler: authenticate }, controller.update);
  app.delete('/events/:id', { preHandler: authenticate }, controller.remove);

  // Presença é sempre do próprio usuário autenticado.
  app.post('/events/:id/rsvp', { preHandler: authenticate }, controller.confirm);
  app.delete('/events/:id/rsvp', { preHandler: authenticate }, controller.cancel);
}
