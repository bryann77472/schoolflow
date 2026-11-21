import jwt from '@fastify/jwt';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { AUTH_COOKIE_NAME } from '../config/auth';
import { env } from '../config/env';

export const jwtPlugin = fp(async (app: FastifyInstance) => {
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: { cookieName: AUTH_COOKIE_NAME, signed: false },
    sign: { expiresIn: env.JWT_EXPIRES_IN }
  });
});
