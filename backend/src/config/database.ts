import { PrismaClient } from '@prisma/client';
import { env } from './env';

/**
 * Cliente Prisma único para toda a aplicação.
 * A conexão é lazily established: /api/health continua disponível mesmo se o
 * banco estiver temporariamente indisponível.
 */
export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  datasources: { db: { url: env.DATABASE_URL } }
});

let connection: Promise<void> | null = null;

export function connectDatabase(): Promise<void> {
  if (!connection) {
    connection = prisma.$connect().catch((error) => {
      connection = null;
      throw error;
    });
  }
  return connection;
}

export async function disconnectDatabase(): Promise<void> {
  connection = null;
  await prisma.$disconnect();
}

/** Usado pelo health check: executa uma consulta real no PostgreSQL. */
export async function checkDatabaseConnection(): Promise<void> {
  await connectDatabase();
  await prisma.$queryRaw`SELECT 1`;
}
