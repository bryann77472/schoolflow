import type { FastifyInstance } from 'fastify';
import { health, healthDatabase } from '../controllers/health.controller';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', health);
  app.get('/health/db', healthDatabase);
}
