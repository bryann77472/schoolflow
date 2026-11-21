import type { Role } from '@prisma/client';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthTokenPayload } from '../types/jwt';
import { forbidden, unauthorized } from '../utils/http-error';

/** Pre-handler para rotas privadas: valida o JWT do cookie ou do header Bearer. */
export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    const payload = await request.jwtVerify<AuthTokenPayload>();
    const id = Number(payload.sub);

    if (!Number.isInteger(id) || id <= 0 || !payload.role) {
      throw unauthorized();
    }

    request.authUser = { id, email: payload.email, role: payload.role };
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error && error.statusCode === 401) {
      throw unauthorized();
    }
    throw error instanceof Error && error.name === 'HttpError'
      ? error
      : unauthorized('Sessão inválida ou expirada.');
  }
}

/** Fábrica de pre-handler para controle de acesso por perfil. */
export function requireRole(...roles: Role[]) {
  return async function checkRole(request: FastifyRequest): Promise<void> {
    if (!request.authUser) throw unauthorized();
    if (!roles.includes(request.authUser.role)) throw forbidden();
  };
}
