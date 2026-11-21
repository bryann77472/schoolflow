import 'fastify';
import type { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: Role;
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthenticatedUser;
  }
}
