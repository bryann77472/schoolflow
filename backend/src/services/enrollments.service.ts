import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import type { CreateEnrollmentBody, EnrollmentQuery } from '../schemas/enrollments.schema';
import type { AuthenticatedUser } from '../types/fastify';
import { badRequest, conflict, notFound } from '../utils/http-error';
import { enrollmentScopeWhere } from './scope.service';

export async function listEnrollments(viewer: AuthenticatedUser, query: EnrollmentQuery) {
  const and: Prisma.EnrollmentWhereInput[] = [enrollmentScopeWhere(viewer)];
  if (query.studentId) and.push({ studentId: query.studentId });
  if (query.classId) and.push({ classId: query.classId });
  const where: Prisma.EnrollmentWhereInput = { AND: and };

  const [items, total] = await prisma.$transaction([
    prisma.enrollment.findMany({
      where,
      select: {
        studentId: true,
        classId: true,
        createdAt: true,
        student: { select: { id: true, name: true, email: true } },
        class: { select: { id: true, name: true, stage: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: query.offset,
      take: query.limit
    }),
    prisma.enrollment.count({ where })
  ]);

  return { items, total, limit: query.limit, offset: query.offset };
}

export async function createEnrollment(body: CreateEnrollmentBody, _viewer: AuthenticatedUser) {
  return prisma.$transaction(async (tx) => {
    const student = await tx.user.findUnique({ where: { id: body.studentId } });
    if (!student || student.role !== 'aluno') {
      throw badRequest('O usuário informado não é um aluno.');
    }
    const schoolClass = await tx.class.findUnique({ where: { id: body.classId } });
    if (!schoolClass) throw notFound('Turma não encontrada.');

    const existing = await tx.enrollment.findUnique({
      where: { studentId_classId: { studentId: body.studentId, classId: body.classId } }
    });
    if (existing) throw conflict('Este aluno já está matriculado nesta turma.');

    try {
      await tx.enrollment.create({
        data: { studentId: body.studentId, classId: body.classId }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw conflict('Este aluno já está matriculado nesta turma.');
      }
      throw error;
    }
    return { studentId: body.studentId, classId: body.classId };
  });
}

export async function deleteEnrollment(
  studentId: number,
  classId: number,
  _viewer: AuthenticatedUser
) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_classId: { studentId, classId } }
  });
  if (!enrollment) throw notFound('Matrícula não encontrada.');
  await prisma.enrollment.delete({
    where: { studentId_classId: { studentId, classId } }
  });
  return { studentId, classId };
}
