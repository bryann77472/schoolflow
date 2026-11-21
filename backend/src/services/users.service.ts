import { Prisma, type Stage } from '@prisma/client';
import { hash } from 'bcryptjs';
import { prisma } from '../config/database';
import {
  resolvedUserSchema,
  type CreateUserBody,
  type UpdateUserBody,
  type UserQuery
} from '../schemas/users.schema';
import type { AuthenticatedUser } from '../types/fastify';
import { conflict, forbidden, notFound } from '../utils/http-error';
import { userScopeWhere } from './scope.service';

const SALT_ROUNDS = 12;

function stageLabel(stage: Stage): string {
  return stage === 'medio' ? 'Ensino Médio' : 'Fundamental II';
}

export const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  stage: true,
  grade: true,
  subject: true,
  avatarTone: true,
  onboardingDone: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { enrollments: true, taughtClasses: true } }
} satisfies Prisma.UserSelect;

export async function listUsers(viewer: AuthenticatedUser, query: UserQuery) {
  const and: Prisma.UserWhereInput[] = [userScopeWhere(viewer)];
  const where: Prisma.UserWhereInput = { AND: and };

  if (query.q) {
    and.push({
      OR: [
        { name: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
        { subject: { contains: query.q, mode: 'insensitive' } },
        { grade: { contains: query.q, mode: 'insensitive' } }
      ]
    });
  }

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: { id: 'asc' },
      skip: query.offset,
      take: query.limit
    }),
    prisma.user.count({ where })
  ]);

  return { items, total, limit: query.limit, offset: query.offset };
}

export async function getUser(id: number, viewer: AuthenticatedUser) {
  const user = await prisma.user.findFirst({
    where: { AND: [userScopeWhere(viewer), { id }] },
    select: userSelect
  });
  if (!user) throw notFound('Usuário não encontrado.');
  return user;
}

export async function createUser(body: CreateUserBody, _viewer: AuthenticatedUser) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email: body.email } });
    if (existing) throw conflict('Já existe uma conta com este email.');

    const isStudent = body.role === 'aluno';
    const classes = isStudent
      ? await tx.class.findMany({ where: { stage: body.stage as Stage }, select: { id: true } })
      : [];

    const data: Prisma.UserCreateInput = {
      name: body.name,
      email: body.email,
      passwordHash: await hash(body.password, SALT_ROUNDS),
      role: body.role,
      avatarTone: body.avatarTone ?? 'indigo',
      onboardingDone: !isStudent,
      stage: isStudent ? (body.stage as Stage) : null,
      grade: isStudent ? (body.grade ?? null) : null,
      subject: isStudent
        ? `${body.grade} · ${stageLabel(body.stage as Stage)}`
        : body.subject ?? null,
      ...(isStudent
        ? {
            enrollments: {
              create: classes.map((schoolClass) => ({
                class: { connect: { id: schoolClass.id } }
              }))
            }
          }
        : {})
    };

    const user = await tx.user.create({ data });
    return tx.user.findUniqueOrThrow({ where: { id: user.id }, select: userSelect });
  });
}

export async function updateUser(id: number, body: UpdateUserBody, viewer: AuthenticatedUser) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.user.findUnique({ where: { id } });
    if (!current) throw notFound('Usuário não encontrado.');

    if (body.email && body.email !== current.email) {
      const duplicate = await tx.user.findUnique({ where: { email: body.email } });
      if (duplicate) throw conflict('Já existe uma conta com este email.');
    }

    // Um admin não pode remover o próprio privilégio e travar a gestão do sistema.
    if (viewer.id === id && current.role === 'admin' && body.role && body.role !== 'admin') {
      throw forbidden('Você não pode remover o seu próprio perfil administrador.');
    }

    const merged = {
      role: body.role ?? current.role,
      stage: body.stage !== undefined ? body.stage : current.stage,
      grade: body.grade !== undefined ? body.grade : current.grade
    };
    resolvedUserSchema.parse(merged);

    const isStudent = merged.role === 'aluno';
    const data: Prisma.UserUpdateInput = {
      name: body.name ?? current.name,
      email: body.email ?? current.email,
      role: merged.role,
      avatarTone: body.avatarTone ?? current.avatarTone
    };
    if (body.password) data.passwordHash = await hash(body.password, SALT_ROUNDS);

    if (isStudent) {
      const stage = merged.stage as Stage;
      data.stage = stage;
      data.grade = merged.grade;
      data.subject = `${merged.grade} · ${stageLabel(stage)}`;
    } else {
      data.stage = null;
      data.grade = null;
      data.subject = body.subject !== undefined ? body.subject : current.subject;
      data.onboardingDone = true;
    }

    await tx.user.update({ where: { id }, data });

    // Sincronização de matrículas na mesma transação (equivalente a syncStudentEnrollments).
    if (isStudent) {
      const stage = merged.stage as Stage;
      const stageClasses = await tx.class.findMany({ where: { stage }, select: { id: true } });
      await tx.enrollment.deleteMany({
        where: { studentId: id, class: { stage: { not: stage } } }
      });
      await tx.enrollment.createMany({
        data: stageClasses.map((schoolClass) => ({ studentId: id, classId: schoolClass.id })),
        skipDuplicates: true
      });
    } else if (current.role === 'aluno') {
      await tx.enrollment.deleteMany({ where: { studentId: id } });
    }

    return tx.user.findUniqueOrThrow({ where: { id }, select: userSelect });
  });
}

export async function deleteUser(id: number, viewer: AuthenticatedUser) {
  if (viewer.id === id) {
    throw forbidden('Você não pode excluir a própria conta.');
  }

  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id } });
    if (!target) throw notFound('Usuário não encontrado.');

    if (target.role === 'admin') {
      const admins = await tx.user.count({ where: { role: 'admin' } });
      if (admins <= 1) throw conflict('É necessário manter pelo menos um administrador.');
    }

    try {
      await tx.user.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw conflict('Reatribua as turmas e trabalhos deste usuário antes de excluí-lo.');
      }
      throw error;
    }
    return { id };
  });
}

