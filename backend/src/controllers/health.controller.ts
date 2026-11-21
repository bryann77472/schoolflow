import type { FastifyReply, FastifyRequest } from 'fastify';
import { checkDatabase } from '../services/health.service';

export function health(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send({
    status: 'ok',
    service: 'schoolflow-api',
    timestamp: new Date().toISOString()
  });
}

export async function healthDatabase(request: FastifyRequest, reply: FastifyReply) {
  try {
    await checkDatabase();
    return reply.send({ status: 'ok', database: 'connected' });
  } catch (error) {
    request.log.error({ err: error }, 'Falha ao verificar conexão com o banco');
    return reply.status(503).send({
      status: 'error',
      database: 'unavailable',
      message: 'Não foi possível conectar ao PostgreSQL.'
    });
  }
}
