import { Prisma, type Stage } from '@prisma/client';
import { prisma } from '../config/database';
import {
  classBodySchema,
  type ClassQuery,
  type CreateClassBody,
  type UpdateClassBody
} from '../schemas/classes.schema';
import type { AuthenticatedUser } from '../types/fastify';
import { badRequest, notFound } from '../utils/http-error';
import { classScopeWhere } from './scope.service';

export const classSelect = {
  id: true,
  name: true,
  description: true,
  stage: true,
  dayOfWeek: true,
  timeStart: true,
  timeEnd: true,
  room: true,
  color: true,
  teacherId: true,
  createdAt: true,
  teacher: { select: { id: true, name: true } },
  _count: { select: { enrollments: true, assignments: true } }
} satisfies Prisma.ClassSelect;

async function assertValidTeacher(tx: Prisma.TransactionClient, teacherId: number): Promise<void> {
  const teacher = await tx.user.findFirst({
    where: { id: teacherId, role: { in: ['professor', 'admin'] } },
    select: { id: true }
  });
  if (!teacher) throw badRequest('O professor informado não existe ou não pode lecionar.');
}

export async function listClasses(viewer: AuthenticatedUser, query: ClassQuery) {
  const and: Prisma.ClassWhereInput[] = [classScopeWhere(viewer)];
  const where: Prisma.ClassWhereInput = { AND: and };

  if (query.q) {
    and.push({
      OR: [
        { name: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { room: { contains: query.q, mode: 'insensitive' } }
      ]
    });
  }
  if (query.stage) and.push({ stage: query.stage });

  const [items, total] = await prisma.$transaction([
    prisma.class.findMany({
      where,
      select: classSelect,
      orderBy: [{ dayOfWeek: 'asc' }, { timeStart: 'asc' }],
      skip: query.offset,
      take: query.limit
    }),
    prisma.class.count({ where })
  ]);

  return { items, total, limit: query.limit, offset: query.offset };
}

export async function getClass(id: number, viewer: AuthenticatedUser) {
  const schoolClass = await prisma.class.findFirst({
    where: { AND: [classScopeWhere(viewer), { id }] },
    select: classSelect
  });
  if (!schoolClass) throw notFound('Turma não encontrada.');
  return schoolClass;
}

export async function createClass(body: CreateClassBody, _viewer: AuthenticatedUser) {
  return prisma.$transaction(async (tx) => {
    await assertValidTeacher(tx, body.teacherId);
    const created = await tx.class.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        stage: body.stage,
        dayOfWeek: body.dayOfWeek,
        timeStart: body.timeStart,
        timeEnd: body.timeEnd,
        room: body.room,
        color: body.color,
        teacher: { connect: { id: body.teacherId } }
      }
    });
    return tx.class.findUniqueOrThrow({ where: { id: created.id }, select: classSelect });
  });
}

export async function updateClass(id: number, body: UpdateClassBody, _viewer: AuthenticatedUser) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.class.findUnique({ where: { id } });
    if (!current) throw notFound('Turma não encontrada.');

    const merged = classBodySchema.parse({
      name: body.name ?? current.name,
      description:
        body.description !== undefined ? body.description : current.description,
      stage: body.stage ?? current.stage,
      dayOfWeek: body.dayOfWeek ?? current.dayOfWeek,
      timeStart: body.timeStart ?? current.timeStart,
      timeEnd: body.timeEnd ?? current.timeEnd,
      room: body.room ?? current.room,
      color: body.color ?? current.color,
      teacherId: body.teacherId ?? current.teacherId
    });

    await assertValidTeacher(tx, merged.teacherId);
    await tx.class.update({
      where: { id },
      data: {
        name: merged.name,
        description: merged.description ?? null,
        stage: merged.stage,
        dayOfWeek: merged.dayOfWeek,
        timeStart: merged.timeStart,
        timeEnd: merged.timeEnd,
        room: merged.room,
        color: merged.color,
        teacher: { connect: { id: merged.teacherId } }
      }
    });

    // Se a etapa mudou, alunos de outras etapas perdem o vínculo na mesma transação.
    if (merged.stage !== current.stage) {
      await tx.enrollment.deleteMany({
        where: {
          classId: id,
          student: { OR: [{ stage: null }, { stage: { not: merged.stage as Stage } }] }
        }
      });
    }

    return tx.class.findUniqueOrThrow({ where: { id }, select: classSelect });
  });
}

export async function deleteClass(id: number, _viewer: AuthenticatedUser) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.class.findUnique({ where: { id }, select: { id: true } });
    if (!current) throw notFound('Turma não encontrada.');

    // Equivale ao frontend: eventos da turma continuam existindo como globais.
    await tx.event.updateMany({
      where: { classId: id },
      data: { classId: null, isGlobal: true }
    });
    // Matrículas e trabalhos são removidos por CASCADE do schema.
    await tx.class.delete({ where: { id } });
    return { id };
  });
}
