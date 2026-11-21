import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  assignmentIdParamSchema,
  assignmentQuerySchema,
  createAssignmentBodySchema,
  updateAssignmentBodySchema
} from '../schemas/assignments.schema';
import * as service from '../services/assignments.service';

export async function list(request: FastifyRequest, reply: FastifyReply) {
  const query = assignmentQuerySchema.parse(request.query);
  return reply.send(await service.listAssignments(request.authUser!, query));
}

export async function getById(request: FastifyRequest, reply: FastifyReply) {
  const { id } = assignmentIdParamSchema.parse(request.params);
  return reply.send(await service.getAssignment(id, request.authUser!));
}

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const body = createAssignmentBodySchema.parse(request.body);
  const assignment = await service.createAssignment(body, request.authUser!);
  return reply.status(201).send({ assignment });
}

export async function update(request: FastifyRequest, reply: FastifyReply) {
  const { id } = assignmentIdParamSchema.parse(request.params);
  const body = updateAssignmentBodySchema.parse(request.body);
  const assignment = await service.updateAssignment(id, body, request.authUser!);
  return reply.send({ assignment });
}

export async function remove(request: FastifyRequest, reply: FastifyReply) {
  const { id } = assignmentIdParamSchema.parse(request.params);
  return reply.send(await service.deleteAssignment(id, request.authUser!));
}
