import { Prisma } from '@prisma/client';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { HttpError } from '../utils/http-error';

function errorBody(code: string, message: string, details?: unknown) {
  return { error: code, message, ...(details === undefined ? {} : { details }) };
}

interface UnknownErrorLike {
  code?: string;
  statusCode?: number;
  message?: string;
}

function asErrorLike(error: unknown): UnknownErrorLike | null {
  return typeof error === 'object' && error !== null ? (error as UnknownErrorLike) : null;
}

export const errorHandlerPlugin = fp(async (app: FastifyInstance) => {
  app.setErrorHandler((error: unknown, request, reply) => {
    if (error instanceof HttpError) {
      reply
        .status(error.statusCode)
        .send(errorBody(error.code, error.message, error.details));
      return;
    }

    if (error instanceof ZodError) {
      const details = error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }));
      reply.status(400).send(errorBody('validation_error', 'Dados inválidos.', details));
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        reply.status(409).send(errorBody('conflict', 'Já existe um registro com estes dados.'));
        return;
      }
      if (error.code === 'P2025') {
        reply.status(404).send(errorBody('not_found', 'Registro não encontrado.'));
        return;
      }
      if (error.code === 'P2003') {
        reply.status(400).send(errorBody('bad_request', 'Referência inválida (chave estrangeira).'));
        return;
      }
    }

    const known = asErrorLike(error);
    if (known?.code?.startsWith('FST_JWT_') || known?.statusCode === 401) {
      reply.status(401).send(errorBody('unauthorized', 'Sessão inválida ou expirada.'));
      return;
    }

    if (known?.statusCode && known.statusCode >= 400 && known.statusCode < 500) {
      reply
        .status(known.statusCode)
        .send(errorBody('bad_request', known.message ?? 'Requisição inválida.'));
      return;
    }

    request.log.error({ err: error }, 'Erro não tratado');
    reply.status(500).send(
      errorBody(
        'internal_error',
        env.NODE_ENV === 'production'
          ? 'Erro interno do servidor.'
          : known?.message ?? 'Erro interno do servidor.'
      )
    );
  });

  app.setNotFoundHandler((request, reply) => {
    reply
      .status(404)
      .send(errorBody('not_found', `Rota ${request.method} ${request.url} não encontrada.`));
  });
});
