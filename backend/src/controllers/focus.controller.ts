import type { FastifyReply, FastifyRequest } from 'fastify';
import { createFocusBodySchema, focusQuerySchema } from '../schemas/focus.schema';
import * as service from '../services/focus.service';

export async function list(request: FastifyRequest, reply: FastifyReply) {
  const query = focusQuerySchema.parse(request.query);
  return reply.send(await service.listFocus(request.authUser!, query));
}

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const body = createFocusBodySchema.parse(request.body);
  return reply.status(201).send(await service.registerFocus(body, request.authUser!));
}
