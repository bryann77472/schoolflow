import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  classBodySchema,
  classIdParamSchema,
  classQuerySchema,
  updateClassBodySchema
} from '../schemas/classes.schema';
import * as classesService from '../services/classes.service';

export async function list(request: FastifyRequest, reply: FastifyReply) {
  const query = classQuerySchema.parse(request.query);
  return reply.send(await classesService.listClasses(request.authUser!, query));
}

export async function getById(request: FastifyRequest, reply: FastifyReply) {
  const { id } = classIdParamSchema.parse(request.params);
  return reply.send(await classesService.getClass(id, request.authUser!));
}

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const body = classBodySchema.parse(request.body);
  const schoolClass = await classesService.createClass(body, request.authUser!);
  return reply.status(201).send({ class: schoolClass });
}

export async function update(request: FastifyRequest, reply: FastifyReply) {
  const { id } = classIdParamSchema.parse(request.params);
  const body = updateClassBodySchema.parse(request.body);
  const schoolClass = await classesService.updateClass(id, body, request.authUser!);
  return reply.send({ class: schoolClass });
}

export async function remove(request: FastifyRequest, reply: FastifyReply) {
  const { id } = classIdParamSchema.parse(request.params);
  return reply.send(await classesService.deleteClass(id, request.authUser!));
}
