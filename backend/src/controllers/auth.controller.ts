import type { FastifyReply, FastifyRequest } from 'fastify';
import { AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE } from '../config/auth';
import { env } from '../config/env';
import { loginBodySchema, registerBodySchema } from '../schemas/auth.schema';
import * as authService from '../services/auth.service';

/** Mesmas opções para emissão e remoção: o navegador precisa comparar nome, path e site. */
function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE
  };
}

async function issueToken(reply: FastifyReply, user: authService.SafeUser): Promise<void> {
  const token = await reply.jwtSign({
    sub: String(user.id),
    email: user.email,
    role: user.role
  });

  reply.setCookie(AUTH_COOKIE_NAME, token, cookieOptions());
}

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const body = registerBodySchema.parse(request.body);
  const user = await authService.register(body);
  await issueToken(reply, user);
  return reply.status(201).send({ user });
}

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const body = loginBodySchema.parse(request.body);
  const user = await authService.login(body);
  await issueToken(reply, user);
  return reply.send({ user });
}

export function logout(_request: FastifyRequest, reply: FastifyReply) {
  reply.clearCookie(AUTH_COOKIE_NAME, cookieOptions());
  return reply.send({ message: 'Sessão encerrada.' });
}

export async function me(request: FastifyRequest, reply: FastifyReply) {
  const user = await authService.findUserById(request.authUser!.id);
  return reply.send({ user });
}
