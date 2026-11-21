import '@fastify/jwt';
import type { Role } from '@prisma/client';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: Role;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthTokenPayload;
    user: AuthTokenPayload;
  }
}
