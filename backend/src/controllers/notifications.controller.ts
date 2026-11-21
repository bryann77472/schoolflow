import type { FastifyReply, FastifyRequest } from 'fastify';
import { markNotificationsReadSchema } from '../schemas/notifications.schema';
import * as service from '../services/notifications.service';

export async function list(request: FastifyRequest, reply: FastifyReply) {
  return reply.send(await service.getNotifications(request.authUser!));
}

export async function markRead(request: FastifyRequest, reply: FastifyReply) {
  const body = markNotificationsReadSchema.parse(request.body);
  return reply.send(await service.markNotificationsRead(request.authUser!, body));
}
