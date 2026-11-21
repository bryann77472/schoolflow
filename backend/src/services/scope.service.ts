import type { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../types/fastify';

/**
 * Regras de escopo migradas de data.js (getScopedClasses, getScopedAssignments,
 * getScopedEvents, getScopedUsers). Aplicadas no banco, nunca só no frontend.
 */

export function userScopeWhere(viewer: AuthenticatedUser): Prisma.UserWhereInput {
  if (viewer.role === 'admin') return {};
  if (viewer.role === 'professor') {
    // Professores veem a si mesmos, alunos e outros professores; não veem admins.
    return { OR: [{ id: viewer.id }, { role: { not: 'admin' } }] };
  }
  // Alunos veem a si mesmos e professores — nunca outros alunos.
  return { OR: [{ id: viewer.id }, { role: 'professor' }] };
}

export function classScopeWhere(viewer: AuthenticatedUser): Prisma.ClassWhereInput {
  if (viewer.role === 'admin') return {};
  if (viewer.role === 'professor') return { teacherId: viewer.id };
  return { enrollments: { some: { studentId: viewer.id } } };
}

export function enrollmentScopeWhere(viewer: AuthenticatedUser): Prisma.EnrollmentWhereInput {
  if (viewer.role === 'admin') return {};
  if (viewer.role === 'professor') return { class: { teacherId: viewer.id } };
  return { studentId: viewer.id };
}

export function assignmentScopeWhere(viewer: AuthenticatedUser): Prisma.AssignmentWhereInput {
  if (viewer.role === 'admin') return {};
  if (viewer.role === 'professor') {
    return { OR: [{ teacherId: viewer.id }, { class: { teacherId: viewer.id } }] };
  }
  return { class: { enrollments: { some: { studentId: viewer.id } } } };
}

export function eventScopeWhere(viewer: AuthenticatedUser): Prisma.EventWhereInput {
  if (viewer.role === 'admin') return {};
  const classFilter: Prisma.EventWhereInput =
    viewer.role === 'professor'
      ? { class: { teacherId: viewer.id } }
      : { class: { enrollments: { some: { studentId: viewer.id } } } };
  return { OR: [{ isGlobal: true }, { classId: null }, classFilter] };
}
