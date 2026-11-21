import type { FastifyInstance } from 'fastify';
import * as controller from '../controllers/enrollments.controller';
import { authenticate, requireRole } from '../middleware/auth';

export async function enrollmentsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/enrollments', { preHandler: authenticate }, controller.list);
  app.post('/enrollments', { preHandler: [authenticate, requireRole('admin')] }, controller.create);
  app.delete(
    '/enrollments/:studentId/:classId',
    { preHandler: [authenticate, requireRole('admin')] },
    controller.remove
  );
}
