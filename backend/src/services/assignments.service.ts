import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import {
  resolvedAssignmentSchema,
  type AssignmentQuery,
  type CreateAssignmentBody,
  type UpdateAssignmentBody
} from '../schemas/assignments.schema';
import type { AuthenticatedUser } from '../types/fastify';
import { badRequest, forbidden, notFound } from '../utils/http-error';
import { assignmentScopeWhere, classScopeWhere } from './scope.service';

export const assignmentSelect = {
  id: true,
  title: true,
  description: true,
  dueDate: true,
  classId: true,
  teacherId: true,
  status: true,
  priority: true,
  createdAt: true,
  updatedAt: true,
  class: { select: { id: true, name: true, color: true } },
  teacher: { select: { id: true, name: true } }
} satisfies Prisma.AssignmentSelect;

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

async function assertTeacher(
  tx: Prisma.TransactionClient,
  teacherId: number,
  viewer: AuthenticatedUser,
  requested: boolean
): Promise<void> {
  if (requested && teacherId !== viewer.id && viewer.role !== 'admin') {
    throw forbidden('Somente administradores podem atribuir o trabalho a outro usuário.');
  }
  const teacher = await tx.user.findUnique({ where: { id: teacherId }, select: { id: true } });
  if (!teacher) throw badRequest('Professor responsável não encontrado.');
}

export async function listAssignments(viewer: AuthenticatedUser, query: AssignmentQuery) {
  const and: Prisma.AssignmentWhereInput[] = [assignmentScopeWhere(viewer)];
  if (query.q) {
    and.push({
      OR: [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } }
      ]
    });
  }
  if (query.status) and.push({ status: query.status });
  if (query.priority) and.push({ priority: query.priority });
  if (query.classId) and.push({ classId: query.classId });
  if (query.from || query.to) {
    and.push({
      dueDate: {
        ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
        ...(query.to ? { lte: new Date(`${query.to}T00:00:00.000Z`) } : {})
      }
    });
  }
  const where: Prisma.AssignmentWhereInput = { AND: and };

  const [items, total] = await prisma.$transaction([
    prisma.assignment.findMany({
      where,
      select: assignmentSelect,
      orderBy: { dueDate: 'asc' },
      skip: query.offset,
      take: query.limit
    }),
    prisma.assignment.count({ where })
  ]);

  return { items, total, limit: query.limit, offset: query.offset };
}

export async function getAssignment(id: number, viewer: AuthenticatedUser) {
  const assignment = await prisma.assignment.findFirst({
    where: { AND: [assignmentScopeWhere(viewer), { id }] },
    select: assignmentSelect
  });
  if (!assignment) throw notFound('Trabalho não encontrado.');
  return assignment;
}

export async function createAssignment(body: CreateAssignmentBody, viewer: AuthenticatedUser) {
  return prisma.$transaction(async (tx) => {
    await assertReachableClass(tx, body.classId, viewer);
    const teacherId = body.teacherId ?? viewer.id;
    await assertTeacher(tx, teacherId, viewer, Boolean(body.teacherId));

    const created = await tx.assignment.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        dueDate: new Date(`${body.dueDate}T00:00:00.000Z`),
        classId: body.classId,
        teacherId,
        priority: body.priority,
        status: body.status
      }
    });
    return tx.assignment.findUniqueOrThrow({
      where: { id: created.id },
      select: assignmentSelect
    });
  });
}

export async function updateAssignment(
  id: number,
  body: UpdateAssignmentBody,
  viewer: AuthenticatedUser
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.assignment.findFirst({
      where: { AND: [assignmentScopeWhere(viewer), { id }] }
    });
    if (!current) throw notFound('Trabalho não encontrado.');

    const merged = resolvedAssignmentSchema.parse({
      title: body.title ?? current.title,
      description: body.description !== undefined ? body.description : current.description,
      dueDate: body.dueDate ?? current.dueDate.toISOString().slice(0, 10),
      classId: body.classId ?? current.classId,
      priority: body.priority ?? current.priority,
      status: body.status ?? current.status,
      teacherId: body.teacherId ?? current.teacherId
    });

    const teacherId = merged.teacherId ?? current.teacherId;
    await assertReachableClass(tx, merged.classId, viewer);
    await assertTeacher(tx, teacherId, viewer, Boolean(body.teacherId));

    await tx.assignment.update({
      where: { id },
      data: {
        title: merged.title,
        description: merged.description ?? null,
        dueDate: new Date(`${merged.dueDate}T00:00:00.000Z`),
        classId: merged.classId,
        teacherId,
        priority: merged.priority,
        status: merged.status
      }
    });
    return tx.assignment.findUniqueOrThrow({ where: { id }, select: assignmentSelect });
  });
}

export async function deleteAssignment(id: number, viewer: AuthenticatedUser) {
  const assignment = await prisma.assignment.findFirst({
    where: { AND: [assignmentScopeWhere(viewer), { id }] },
    select: { id: true }
  });
  if (!assignment) throw notFound('Trabalho não encontrado.');
  await prisma.assignment.delete({ where: { id } });
  return { id };
}
