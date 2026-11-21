import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  createEventBodySchema,
  eventIdParamSchema,
  eventQuerySchema,
  updateEventBodySchema
} from '../schemas/events.schema';
import * as service from '../services/events.service';

export async function list(request: FastifyRequest, reply: FastifyReply) {
  const query = eventQuerySchema.parse(request.query);
  return reply.send(await service.listEvents(request.authUser!, query));
}

export async function getById(request: FastifyRequest, reply: FastifyReply) {
  const { id } = eventIdParamSchema.parse(request.params);
  return reply.send(await service.getEvent(id, request.authUser!));
}

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const body = createEventBodySchema.parse(request.body);
  const event = await service.createEvent(body, request.authUser!);
  return reply.status(201).send({ event });
}

export async function update(request: FastifyRequest, reply: FastifyReply) {
  const { id } = eventIdParamSchema.parse(request.params);
  const body = updateEventBodySchema.parse(request.body);
  const event = await service.updateEvent(id, body, request.authUser!);
  return reply.send({ event });
}

export async function remove(request: FastifyRequest, reply: FastifyReply) {
  const { id } = eventIdParamSchema.parse(request.params);
  return reply.send(await service.deleteEvent(id, request.authUser!));
}

export async function confirm(request: FastifyRequest, reply: FastifyReply) {
  const { id } = eventIdParamSchema.parse(request.params);
  return reply.send(await service.setRsvp(id, request.authUser!, true));
}

export async function cancel(request: FastifyRequest, reply: FastifyReply) {
  const { id } = eventIdParamSchema.parse(request.params);
  return reply.send(await service.setRsvp(id, request.authUser!, false));
}
