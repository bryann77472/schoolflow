import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  createEnrollmentBodySchema,
  enrollmentParamsSchema,
  enrollmentQuerySchema
} from '../schemas/enrollments.schema';
import * as service from '../services/enrollments.service';

export async function list(request: FastifyRequest, reply: FastifyReply) {
  const query = enrollmentQuerySchema.parse(request.query);
  return reply.send(await service.listEnrollments(request.authUser!, query));
}

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const body = createEnrollmentBodySchema.parse(request.body);
  return reply.status(201).send(await service.createEnrollment(body, request.authUser!));
}

export async function remove(request: FastifyRequest, reply: FastifyReply) {
  const { studentId, classId } = enrollmentParamsSchema.parse(request.params);
  return reply.send(await service.deleteEnrollment(studentId, classId, request.authUser!));
}
