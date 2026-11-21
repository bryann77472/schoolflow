import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  createUserBodySchema,
  updateUserBodySchema,
  userIdParamSchema,
  userQuerySchema
} from '../schemas/users.schema';
import * as usersService from '../services/users.service';

export async function list(request: FastifyRequest, reply: FastifyReply) {
  const query = userQuerySchema.parse(request.query);
  return reply.send(await usersService.listUsers(request.authUser!, query));
}

export async function getById(request: FastifyRequest, reply: FastifyReply) {
  const { id } = userIdParamSchema.parse(request.params);
  return reply.send(await usersService.getUser(id, request.authUser!));
}

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const body = createUserBodySchema.parse(request.body);
  const user = await usersService.createUser(body, request.authUser!);
  return reply.status(201).send({ user });
}

export async function update(request: FastifyRequest, reply: FastifyReply) {
  const { id } = userIdParamSchema.parse(request.params);
  const body = updateUserBodySchema.parse(request.body);
  const user = await usersService.updateUser(id, body, request.authUser!);
  return reply.send({ user });
}

export async function remove(request: FastifyRequest, reply: FastifyReply) {
  const { id } = userIdParamSchema.parse(request.params);
  return reply.send(await usersService.deleteUser(id, request.authUser!));
}
