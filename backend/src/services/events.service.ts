import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import {
  resolvedEventSchema,
  type CreateEventBody,
  type EventQuery,
  type UpdateEventBody
} from '../schemas/events.schema';
import type { AuthenticatedUser } from '../types/fastify';
import { badRequest, forbidden, notFound } from '../utils/http-error';
import { classScopeWhere, eventScopeWhere } from './scope.service';

export const eventSelect = {
  id: true,
  title: true,
  description: true,
  date: true,
  timeStart: true,
  timeEnd: true,
  location: true,
  category: true,
  classId: true,
  isGlobal: true,
  createdAt: true,
  class: { select: { id: true, name: true } },
  rsvps: { select: { userId: true, user: { select: { id: true, name: true } } } }
} satisfies Prisma.EventSelect;

async function assertReachableClass(
  tx: Prisma.TransactionClient,
  classId: number,
  viewer: AuthenticatedUser
): Promise<void> {
  const schoolClass = await tx.class.findFirst({
    where: { AND: [classScopeWhere(viewer), { id: classId }] },
    select: { id: true }
  });
  if (!schoolClass) throw badRequest('Turma não disponível para este usuário.');
}

export async function listEvents(viewer: AuthenticatedUser, query: EventQuery) {
  const and: Prisma.EventWhereInput[] = [eventScopeWhere(viewer)];
  if (query.q) {
    and.push({
      OR: [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { location: { contains: query.q, mode: 'insensitive' } }
      ]
    });
  }
  if (query.category) and.push({ category: query.category });
  if (query.classId !== undefined) and.push({ classId: query.classId });
  if (query.from || query.to) {
    and.push({
      date: {
        ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
        ...(query.to ? { lte: new Date(`${query.to}T00:00:00.000Z`) } : {})
      }
    });
  }
  const where: Prisma.EventWhereInput = { AND: and };

  const [items, total] = await prisma.$transaction([
    prisma.event.findMany({
      where,
      select: eventSelect,
      orderBy: [{ date: 'asc' }, { timeStart: 'asc' }],
      skip: query.offset,
      take: query.limit
    }),
    prisma.event.count({ where })
  ]);

  return { items, total, limit: query.limit, offset: query.offset };
}

export async function getEvent(id: number, viewer: AuthenticatedUser) {
  const event = await prisma.event.findFirst({
    where: { AND: [eventScopeWhere(viewer), { id }] },
    select: eventSelect
  });
  if (!event) throw notFound('Evento não encontrado.');
  return event;
}

export async function createEvent(body: CreateEventBody, viewer: AuthenticatedUser) {
  return prisma.$transaction(async (tx) => {
    if (body.classId) await assertReachableClass(tx, body.classId, viewer);

    const created = await tx.event.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        date: new Date(`${body.date}T00:00:00.000Z`),
        timeStart: body.timeStart,
        timeEnd: body.timeEnd,
        location: body.location,
        category: body.category,
        classId: body.classId ?? null,
        isGlobal: !body.classId
      }
    });
    return tx.event.findUniqueOrThrow({ where: { id: created.id }, select: eventSelect });
  });
}

export async function updateEvent(
  id: number,
  body: UpdateEventBody,
  viewer: AuthenticatedUser
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.event.findFirst({
      where: { AND: [eventScopeWhere(viewer), { id }] }
    });
    if (!current) throw notFound('Evento não encontrado.');

    const merged = resolvedEventSchema.parse({
      title: body.title ?? current.title,
      description: body.description !== undefined ? body.description : current.description,
      date: body.date ?? current.date.toISOString().slice(0, 10),
      timeStart: body.timeStart ?? current.timeStart,
      timeEnd: body.timeEnd ?? current.timeEnd,
      location: body.location ?? current.location,
      category: body.category ?? current.category,
      classId: body.classId !== undefined ? body.classId : current.classId
    });

    // Eventos globais só podem ser alterados por administradores; eventos de turma
    // exigem que a turma de origem e a de destino estejam no escopo do usuário.
    if (viewer.role !== 'admin' && current.classId === null && merged.classId === null) {
      throw forbidden('Somente administradores podem editar eventos globais.');
    }
    if (viewer.role !== 'admin' && current.classId !== null && merged.classId === null) {
      throw forbidden('Somente administradores podem tornar um evento global.');
    }
    if (merged.classId) await assertReachableClass(tx, merged.classId, viewer);

    await tx.event.update({
      where: { id },
      data: {
        title: merged.title,
        description: merged.description ?? null,
        date: new Date(`${merged.date}T00:00:00.000Z`),
        timeStart: merged.timeStart,
        timeEnd: merged.timeEnd,
        location: merged.location,
        category: merged.category,
        classId: merged.classId ?? null,
        isGlobal: !merged.classId
      }
    });
    return tx.event.findUniqueOrThrow({ where: { id }, select: eventSelect });
  });
}

export async function deleteEvent(id: number, viewer: AuthenticatedUser) {
  const event = await prisma.event.findFirst({
    where: { AND: [eventScopeWhere(viewer), { id }] },
    select: { id: true, classId: true }
  });
  if (!event) throw notFound('Evento não encontrado.');
  if (viewer.role !== 'admin' && event.classId === null) {
    throw forbidden('Somente administradores podem excluir eventos globais.');
  }
  await prisma.event.delete({ where: { id } });
  return { id };
}

/** Confirma ou remove a presença do próprio usuário (nunca de terceiros). */
export async function setRsvp(id: number, viewer: AuthenticatedUser, confirmed: boolean) {
  const event = await prisma.event.findFirst({
    where: { AND: [eventScopeWhere(viewer), { id }] },
    select: { id: true }
  });
  if (!event) throw notFound('Evento não encontrado.');

  if (confirmed) {
    await prisma.eventRsvp.upsert({
      where: { eventId_userId: { eventId: id, userId: viewer.id } },
      create: { eventId: id, userId: viewer.id },
      update: { confirmedAt: new Date() }
    });
  } else {
    await prisma.eventRsvp.deleteMany({ where: { eventId: id, userId: viewer.id } });
  }
  return { eventId: id, userId: viewer.id, confirmed };
}
