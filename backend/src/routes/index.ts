import type { FastifyInstance } from 'fastify';
import { assignmentsRoutes } from './assignments.routes';
import { authRoutes } from './auth.routes';
import { classesRoutes } from './classes.routes';
import { enrollmentsRoutes } from './enrollments.routes';
import { eventsRoutes } from './events.routes';
import { focusRoutes } from './focus.routes';
import { healthRoutes } from './health.routes';
import { notificationsRoutes } from './notifications.routes';
import { usersRoutes } from './users.routes';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(usersRoutes);
  await app.register(classesRoutes);
  await app.register(enrollmentsRoutes);
  await app.register(assignmentsRoutes);
  await app.register(eventsRoutes);
  await app.register(notificationsRoutes);
  await app.register(focusRoutes);
}
