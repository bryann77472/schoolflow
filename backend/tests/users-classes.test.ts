import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { buildApp } from '../src/app';
import { prisma } from '../src/config/database';
import type { FastifyInstance } from 'fastify';
import {
  auth,
  cleanup,
  createClassFixture,
  createUserFixture,
  login,
  TEST_PASSWORD,
  tracker,
  type ClassFixture,
  type UserFixture
} from './helpers';

let app: FastifyInstance;
let admin: UserFixture;
let otherAdmin: UserFixture;
let professor: UserFixture;
let studentA: UserFixture;
let studentB: UserFixture;
let convertStudent: UserFixture;
let professorClass: ClassFixture;
let adminClass: ClassFixture;

let adminCookie: string;
let professorCookie: string;
let studentACookie: string;
let studentBCookie: string;

async function apiCreateClass(cookie: string, payload: Record<string, unknown>) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/classes',
    ...auth(cookie),
    payload
  });
  assert.equal(response.statusCode, 201, response.body);
  const created = response.json().class;
  tracker.classIds.push(created.id);
  return created;
}

const newClassPayload = (overrides: Record<string, unknown> = {}) => ({
  name: 'Turma API Teste',
  description: 'Turma criada via API.',
  stage: 'medio',
  dayOfWeek: 2,
  timeStart: '10:00',
  timeEnd: '11:30',
  room: 'Sala API',
  color: '#10b981',
  teacherId: professor.id,
  ...overrides
});

before(async () => {
  app = await buildApp();

  admin = await createUserFixture('admin', { name: 'Admin Teste' });
  otherAdmin = await createUserFixture('admin', { name: 'Admin Secundário' });
  professor = await createUserFixture('professor', {
    name: 'Professor Teste',
    subject: 'Matemática'
  });
  studentA = await createUserFixture('aluno', {
    name: 'Aluno A',
    stage: 'medio',
    grade: '2º ano'
  });
  studentB = await createUserFixture('aluno', {
    name: 'Aluno B',
    stage: 'fundamental',
    grade: '8º ano'
  });
  convertStudent = await createUserFixture('aluno', {
    name: 'Aluno Conversão',
    stage: 'medio',
    grade: '1º ano'
  });

  professorClass = await createClassFixture({
    name: 'Turma do Professor',
    stage: 'medio',
    teacherId: professor.id
  });
  adminClass = await createClassFixture({
    name: 'Turma do Admin',
    stage: 'fundamental',
    teacherId: admin.id
  });

  await prisma.enrollment.createMany({
    data: [
      { studentId: studentA.id, classId: professorClass.id },
      { studentId: convertStudent.id, classId: professorClass.id }
    ]
  });

  adminCookie = (await login(app, admin.email)).cookie;
  professorCookie = (await login(app, professor.email)).cookie;
  studentACookie = (await login(app, studentA.email)).cookie;
  studentBCookie = (await login(app, studentB.email)).cookie;
});

after(async () => {
  await cleanup();
  await app.close();
});

describe('autenticação', () => {
  it('bloqueia rotas privadas sem sessão', async () => {
    for (const url of ['/api/users', '/api/classes']) {
      const response = await app.inject({ method: 'GET', url });
      assert.equal(response.statusCode, 401, `${url}: ${response.body}`);
    }
  });
});

describe('módulo de usuários — escopo', () => {
  it('admin vê todos os usuários e nenhum passwordHash é exposto', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/users', ...auth(adminCookie) });
    assert.equal(response.statusCode, 200, response.body);
    const body = response.json();
    assert.ok(body.total >= 6);
    assert.ok(body.items.every((item: Record<string, unknown>) => !('passwordHash' in item)));
  });

  it('professor não vê administradores', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/users', ...auth(professorCookie) });
    assert.equal(response.statusCode, 200, response.body);
    const items = response.json().items as Array<{ id: number; role: string }>;
    assert.ok(items.some((item) => item.id === professor.id));
    assert.ok(items.some((item) => item.id === studentA.id));
    assert.ok(items.every((item) => item.role !== 'admin'));
    assert.ok(!items.some((item) => item.id === otherAdmin.id));
  });

  it('aluno vê somente a si mesmo e professores', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/users', ...auth(studentACookie) });
    assert.equal(response.statusCode, 200, response.body);
    const items = response.json().items as Array<{ id: number; role: string }>;
    assert.ok(items.some((item) => item.id === studentA.id));
    assert.ok(items.some((item) => item.id === professor.id));
    assert.ok(!items.some((item) => item.id === studentB.id));
    assert.ok(items.every((item) => item.role === 'professor' || item.id === studentA.id));
  });

  it('nega acesso individual a outro aluno (404), inclusive ao professor sobre admins', async () => {
    const asStudent = await app.inject({
      method: 'GET',
      url: `/api/users/${studentB.id}`,
      ...auth(studentACookie)
    });
    assert.equal(asStudent.statusCode, 404);

    const ownProfile = await app.inject({
      method: 'GET',
      url: `/api/users/${studentA.id}`,
      ...auth(studentACookie)
    });
    assert.equal(ownProfile.statusCode, 200);

    const teacherProfile = await app.inject({
      method: 'GET',
      url: `/api/users/${professor.id}`,
      ...auth(studentACookie)
    });
    assert.equal(teacherProfile.statusCode, 200);

    const adminAsProfessor = await app.inject({
      method: 'GET',
      url: `/api/users/${otherAdmin.id}`,
      ...auth(professorCookie)
    });
    assert.equal(adminAsProfessor.statusCode, 404);
  });
});

describe('módulo de usuários — autorização e escrita', () => {
  it('nega escrita a alunos e professores', async () => {
    const studentCreate = await app.inject({
      method: 'POST',
      url: '/api/users',
      ...auth(studentACookie),
      payload: {
        name: 'Invasor',
        email: `invasor-${Date.now()}@schoolflow.test`,
        password: TEST_PASSWORD,
        role: 'admin'
      }
    });
    assert.equal(studentCreate.statusCode, 403);

    const professorEdit = await app.inject({
      method: 'PATCH',
      url: `/api/users/${studentB.id}`,
      ...auth(professorCookie),
      payload: { name: 'Alterado' }
    });
    assert.equal(professorEdit.statusCode, 403);
  });

  it('admin cria usuário e o login funciona sem expor senha', async () => {
    const email = `api-user-${Date.now()}@schoolflow.test`;
    const response = await app.inject({
      method: 'POST',
      url: '/api/users',
      ...auth(adminCookie),
      payload: {
        name: 'Usuário via API',
        email,
        password: TEST_PASSWORD,
        role: 'professor',
        subject: 'Física'
      }
    });
    assert.equal(response.statusCode, 201, response.body);
    const created = response.json().user;
    tracker.userIds.push(created.id);
    assert.equal(created.email, email);
    assert.ok(!('passwordHash' in created));
    assert.equal((await login(app, email)).user.id, created.id);
  });

  it('troca de aluno para professor remove as matrículas na mesma transação', async () => {
    const beforeEnrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_classId: { studentId: convertStudent.id, classId: professorClass.id }
      }
    });
    assert.ok(beforeEnrollment);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/users/${convertStudent.id}`,
      ...auth(adminCookie),
      payload: { role: 'professor', subject: 'Matemática' }
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().user.role, 'professor');

    const afterEnrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_classId: { studentId: convertStudent.id, classId: professorClass.id }
      }
    });
    assert.equal(afterEnrollment, null);
  });

  it('protege a própria conta e permite excluir outro administrador', async () => {
    const selfDelete = await app.inject({
      method: 'DELETE',
      url: `/api/users/${admin.id}`,
      ...auth(adminCookie)
    });
    assert.equal(selfDelete.statusCode, 403);

    const otherDelete = await app.inject({
      method: 'DELETE',
      url: `/api/users/${otherAdmin.id}`,
      ...auth(adminCookie)
    });
    assert.equal(otherDelete.statusCode, 200, otherDelete.body);
  });
});

describe('módulo de turmas — escopo', () => {
  it('aplica getScopedClasses no backend para cada perfil', async () => {
    const asAdmin = await app.inject({ method: 'GET', url: '/api/classes', ...auth(adminCookie) });
    const asProfessor = await app.inject({
      method: 'GET',
      url: '/api/classes',
      ...auth(professorCookie)
    });
    const asStudent = await app.inject({
      method: 'GET',
      url: '/api/classes',
      ...auth(studentACookie)
    });

    assert.equal(asAdmin.statusCode, 200, asAdmin.body);
    assert.equal(asProfessor.statusCode, 200, asProfessor.body);
    assert.equal(asStudent.statusCode, 200, asStudent.body);

    const ids = (response: typeof asAdmin) =>
      (response.json().items as Array<{ id: number }>).map((item) => item.id);

    assert.ok(ids(asAdmin).includes(professorClass.id));
    assert.ok(ids(asAdmin).includes(adminClass.id));
    assert.ok(ids(asProfessor).includes(professorClass.id));
    assert.ok(!ids(asProfessor).includes(adminClass.id));
    assert.ok(ids(asStudent).includes(professorClass.id));
    assert.ok(!ids(asStudent).includes(adminClass.id));
  });

  it('nega turma fora do escopo e escrita a não administradores', async () => {
    const outsider = await app.inject({
      method: 'GET',
      url: `/api/classes/${adminClass.id}`,
      ...auth(studentACookie)
    });
    assert.equal(outsider.statusCode, 404);

    const allowed = await app.inject({
      method: 'GET',
      url: `/api/classes/${professorClass.id}`,
      ...auth(studentACookie)
    });
    assert.equal(allowed.statusCode, 200);

    const studentCreate = await app.inject({
      method: 'POST',
      url: '/api/classes',
      ...auth(studentBCookie),
      payload: newClassPayload()
    });
    assert.equal(studentCreate.statusCode, 403);

    const professorDelete = await app.inject({
      method: 'DELETE',
      url: `/api/classes/${professorClass.id}`,
      ...auth(professorCookie)
    });
    assert.equal(professorDelete.statusCode, 403);
  });
});

describe('módulo de turmas — CRUD administrativo', () => {
  it('valida horário e professor antes de criar', async () => {
    const badTime = await app.inject({
      method: 'POST',
      url: '/api/classes',
      ...auth(adminCookie),
      payload: newClassPayload({ timeStart: '11:00', timeEnd: '10:00' })
    });
    assert.equal(badTime.statusCode, 400);

    const badTeacher = await app.inject({
      method: 'POST',
      url: '/api/classes',
      ...auth(adminCookie),
      payload: newClassPayload({ teacherId: studentA.id })
    });
    assert.equal(badTeacher.statusCode, 400);
  });

  it('cria e edita uma turma', async () => {
    const created = await apiCreateClass(adminCookie, newClassPayload());
    assert.equal(created.stage, 'medio');
    assert.equal(created.teacher.id, professor.id);
    assert.equal(created.dayOfWeek, 2);

    const updated = await app.inject({
      method: 'PATCH',
      url: `/api/classes/${created.id}`,
      ...auth(adminCookie),
      payload: { name: 'Turma Editada', room: 'Sala 42' }
    });
    assert.equal(updated.statusCode, 200, updated.body);
    assert.equal(updated.json().class.name, 'Turma Editada');
    assert.equal(updated.json().class.room, 'Sala 42');
  });

  it('remove matrículas de alunos de outra etapa ao trocar a etapa da turma', async () => {
    const schoolClass = await apiCreateClass(
      adminCookie,
      newClassPayload({ name: 'Turma Mudança de Etapa' })
    );
    await prisma.enrollment.create({
      data: { studentId: studentA.id, classId: schoolClass.id }
    });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/classes/${schoolClass.id}`,
      ...auth(adminCookie),
      payload: { stage: 'fundamental' }
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().class.stage, 'fundamental');

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_classId: { studentId: studentA.id, classId: schoolClass.id }
      }
    });
    assert.equal(enrollment, null);
  });

  it('exclui turma e suas matrículas em cascata', async () => {
    const schoolClass = await apiCreateClass(
      adminCookie,
      newClassPayload({ name: 'Turma para Exclusão' })
    );
    await prisma.enrollment.create({
      data: { studentId: studentA.id, classId: schoolClass.id }
    });

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/classes/${schoolClass.id}`,
      ...auth(adminCookie)
    });
    assert.equal(response.statusCode, 200, response.body);

    assert.equal(
      await prisma.class.findUnique({ where: { id: schoolClass.id } }),
      null
    );
    assert.equal(
      await prisma.enrollment.findUnique({
        where: {
          studentId_classId: { studentId: studentA.id, classId: schoolClass.id }
        }
      }),
      null
    );
  });
});
