import assert from 'node:assert/strict';
import type { Role, Stage } from '@prisma/client';
import { hash } from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { AUTH_COOKIE_NAME } from '../src/config/auth';
import { buildApp } from '../src/app';
import { prisma } from '../src/config/database';

export const TEST_PASSWORD = 'senha123';
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
let counter = 0;

/** Registros criados pelos testes; a limpeza remove somente estes IDs. */
export const tracker = {
  userIds: [] as number[],
  classIds: [] as number[],
  assignmentIds: [] as number[],
  eventIds: [] as number[]
};

export interface UserFixture {
  id: number;
  email: string;
  name: string;
  role: Role;
  stage: Stage | null;
  grade: string | null;
}

export interface ClassFixture {
  id: number;
  name: string;
  stage: Stage;
  teacherId: number;
}

export async function createUserFixture(
  role: Role,
  options: { name: string; stage?: Stage; grade?: string; subject?: string }
): Promise<UserFixture> {
  const email = `test-${RUN_ID}-${role}-${++counter}@schoolflow.test`;
  const user = await prisma.user.create({
    data: {
      name: options.name,
      email,
      passwordHash: await hash(TEST_PASSWORD, 4),
      role,
      stage: options.stage ?? null,
      grade: options.grade ?? null,
      subject: options.subject ?? null,
      onboardingDone: true
    }
  });
  tracker.userIds.push(user.id);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    stage: user.stage,
    grade: user.grade
  };
}

export async function createClassFixture(options: {
  name: string;
  stage: Stage;
  teacherId: number;
}): Promise<ClassFixture> {
  const schoolClass = await prisma.class.create({
    data: {
      name: options.name,
      description: 'Turma criada para testes automatizados.',
      stage: options.stage,
      dayOfWeek: 1,
      timeStart: '08:00',
      timeEnd: '09:30',
      room: 'Sala Teste',
      color: '#6366f1',
      teacher: { connect: { id: options.teacherId } }
    }
  });
  tracker.classIds.push(schoolClass.id);
  return {
    id: schoolClass.id,
    name: schoolClass.name,
    stage: schoolClass.stage,
    teacherId: schoolClass.teacherId
  };
}

export async function login(app: FastifyInstance, email: string, password = TEST_PASSWORD) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password }
  });
  assert.equal(response.statusCode, 200, `Falha no login de teste: ${response.body}`);

  const raw = response.headers['set-cookie'];
  const header = Array.isArray(raw) ? raw.join('; ') : String(raw ?? '');
  const cookie = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`));

  assert.ok(cookie, 'Cookie de sessão não foi retornado.');
  return { cookie: cookie!, user: response.json().user };
}

export function auth(cookie: string) {
  return { headers: { cookie } };
}

export async function cleanup(): Promise<void> {
  if (tracker.assignmentIds.length) {
    await prisma.assignment.deleteMany({ where: { id: { in: tracker.assignmentIds } } });
  }
  if (tracker.eventIds.length) {
    await prisma.event.deleteMany({ where: { id: { in: tracker.eventIds } } });
  }
  if (tracker.classIds.length) {
    await prisma.class.deleteMany({ where: { id: { in: tracker.classIds } } });
  }
  if (tracker.userIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: tracker.userIds } } });
  }
}
