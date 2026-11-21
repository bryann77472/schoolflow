import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { after, before, describe, it } from 'node:test';
import { buildApp } from '../src/app';
import { prisma } from '../src/config/database';
import {
  auth,
  cleanup,
  createClassFixture,
  createUserFixture,
  login,
  tracker,
  type ClassFixture,
  type UserFixture
} from './helpers';

let app: FastifyInstance;
let admin: UserFixture;
let professor: UserFixture;
let professor2: UserFixture;
let studentA: UserFixture;
let studentB: UserFixture;
let classM: ClassFixture;
let classF: ClassFixture;
let classP2: ClassFixture;

let adminCookie: string;
let professorCookie: string;
let studentACookie: string;
let studentBCookie: string;

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

async function createAssignment(cookie: string, payload: Record<string, unknown>) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/assignments',
    ...auth(cookie),
    payload
  });
  assert.equal(response.statusCode, 201, response.body);
  const created = response.json().assignment;
  tracker.assignmentIds.push(created.id);
  return created;
}

async function createEvent(cookie: string, payload: Record<string, unknown>) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/events',
    ...auth(cookie),
    payload
  });
  assert.equal(response.statusCode, 201, response.body);
  const created = response.json().event;
  tracker.eventIds.push(created.id);
  return created;
}

let assignmentP: { id: number };
let assignmentF: { id: number };
let assignmentS: { id: number };
let eventGlobal: { id: number; title: string };
let eventClassM: { id: number; title: string };
let eventClassF: { id: number; title: string };

before(async () => {
  app = await buildApp();

  admin = await createUserFixture('admin', { name: 'Admin M3' });
  professor = await createUserFixture('professor', { name: 'Professor M3', subject: 'Matemática' });
  professor2 = await createUserFixture('professor', { name: 'Professor 2 M3', subject: 'Física' });
  studentA = await createUserFixture('aluno', { name: 'Aluno A M3', stage: 'medio', grade: '2º ano' });
  studentB = await createUserFixture('aluno', {
    name: 'Aluno B M3',
    stage: 'fundamental',
    grade: '8º ano'
  });

  classM = await createClassFixture({ name: 'Turma M3 Médio', stage: 'medio', teacherId: professor.id });
  classF = await createClassFixture({
    name: 'Turma M3 Fundamental',
    stage: 'fundamental',
    teacherId: admin.id
  });
  classP2 = await createClassFixture({
    name: 'Turma M3 Professor 2',
    stage: 'medio',
    teacherId: professor2.id
  });

  await prisma.enrollment.createMany({
    data: [
      { studentId: studentA.id, classId: classM.id },
      { studentId: studentB.id, classId: classF.id }
    ]
  });

  adminCookie = (await login(app, admin.email)).cookie;
  professorCookie = (await login(app, professor.email)).cookie;
  studentACookie = (await login(app, studentA.email)).cookie;
  studentBCookie = (await login(app, studentB.email)).cookie;

  assignmentP = await createAssignment(professorCookie, {
    title: 'Trabalho do Professor',
    dueDate: inDays(2),
    classId: classM.id,
    priority: 'high',
    status: 'todo'
  });
  assignmentF = await createAssignment(adminCookie, {
    title: 'Trabalho do Fundamental',
    dueDate: inDays(3),
    classId: classF.id
  });
  assignmentS = await createAssignment(studentACookie, {
    title: 'Trabalho do Aluno',
    dueDate: inDays(4),
    classId: classM.id
  });

  eventGlobal = await createEvent(adminCookie, {
    title: 'Evento Global M3',
    date: inDays(2),
    timeStart: '09:00',
    timeEnd: '10:00',
    location: 'Auditório',
    category: 'meeting'
  });
  eventClassM = await createEvent(professorCookie, {
    title: 'Evento da Turma M3',
    date: inDays(3),
    timeStart: '10:00',
    timeEnd: '11:00',
    location: 'Sala 1',
    category: 'academic',
    classId: classM.id
  });
  eventClassF = await createEvent(adminCookie, {
    title: 'Evento Fundamental M3',
    date: inDays(4),
    timeStart: '11:00',
    timeEnd: '12:00',
    location: 'Sala 2',
    category: 'culture',
    classId: classF.id
  });
});

after(async () => {
  await cleanup();
  await app.close();
});

describe('autenticação nos novos módulos', () => {
  it('exige sessão em todas as rotas', async () => {
    const urls = [
      '/api/enrollments',
      '/api/assignments',
      '/api/events',
      '/api/notifications',
      '/api/focus'
    ];
    for (const url of urls) {
      const response = await app.inject({ method: 'GET', url });
      assert.equal(response.statusCode, 401, `${url}: ${response.body}`);
    }
  });
});

describe('módulo de matrículas', () => {
  it('aplica escopo por perfil', async () => {
    const asAdmin = await app.inject({ method: 'GET', url: '/api/enrollments', ...auth(adminCookie) });
    const asProfessor = await app.inject({
      method: 'GET',
      url: '/api/enrollments',
      ...auth(professorCookie)
    });
    const asStudent = await app.inject({
      method: 'GET',
      url: '/api/enrollments',
      ...auth(studentACookie)
    });

    assert.equal(asAdmin.statusCode, 200, asAdmin.body);
    assert.equal(asProfessor.statusCode, 200, asProfessor.body);
    assert.equal(asStudent.statusCode, 200, asStudent.body);

    const items = (response: typeof asAdmin) => response.json().items as Array<{ classId: number }>;
    assert.ok(items(asAdmin).some((item) => item.classId === classF.id));
    assert.ok(items(asProfessor).some((item) => item.classId === classM.id));
    assert.ok(!items(asProfessor).some((item) => item.classId === classF.id));
    assert.deepEqual(
      items(asStudent).map((item) => item.classId),
      [classM.id]
    );
  });

  it('nega escrita a não administradores e valida duplicatas', async () => {
    const denied = await app.inject({
      method: 'POST',
      url: '/api/enrollments',
      ...auth(studentACookie),
      payload: { studentId: studentB.id, classId: classM.id }
    });
    assert.equal(denied.statusCode, 403);

    const created = await app.inject({
      method: 'POST',
      url: '/api/enrollments',
      ...auth(adminCookie),
      payload: { studentId: studentB.id, classId: classM.id }
    });
    assert.equal(created.statusCode, 201, created.body);

    const duplicate = await app.inject({
      method: 'POST',
      url: '/api/enrollments',
      ...auth(adminCookie),
      payload: { studentId: studentB.id, classId: classM.id }
    });
    assert.equal(duplicate.statusCode, 409);

    const removed = await app.inject({
      method: 'DELETE',
      url: `/api/enrollments/${studentB.id}/${classM.id}`,
      ...auth(adminCookie)
    });
    assert.equal(removed.statusCode, 200, removed.body);
  });
});

describe('módulo de trabalhos', () => {
  it('migra getScopedAssignments para o backend', async () => {
    const asAdmin = await app.inject({ method: 'GET', url: '/api/assignments', ...auth(adminCookie) });
    const asProfessor = await app.inject({
      method: 'GET',
      url: '/api/assignments',
      ...auth(professorCookie)
    });
    const asStudentA = await app.inject({
      method: 'GET',
      url: '/api/assignments',
      ...auth(studentACookie)
    });
    const asStudentB = await app.inject({
      method: 'GET',
      url: '/api/assignments',
      ...auth(studentBCookie)
    });

    const idsOf = (response: typeof asAdmin) =>
      (response.json().items as Array<{ id: number }>).map((item) => item.id);

    assert.ok(idsOf(asAdmin).includes(assignmentF.id));
    assert.ok(idsOf(asProfessor).includes(assignmentP.id));
    assert.ok(!idsOf(asProfessor).includes(assignmentF.id));
    assert.ok(idsOf(asStudentA).includes(assignmentP.id));
    assert.ok(idsOf(asStudentA).includes(assignmentS.id));
    assert.ok(!idsOf(asStudentA).includes(assignmentF.id));
    assert.ok(idsOf(asStudentB).includes(assignmentF.id));
    assert.ok(!idsOf(asStudentB).includes(assignmentP.id));
  });

  it('nega leitura e escrita fora do escopo', async () => {
    const read = await app.inject({
      method: 'GET',
      url: `/api/assignments/${assignmentF.id}`,
      ...auth(studentACookie)
    });
    assert.equal(read.statusCode, 404);

    const wrongClass = await app.inject({
      method: 'POST',
      url: '/api/assignments',
      ...auth(studentACookie),
      payload: { title: 'Fora de escopo', dueDate: inDays(1), classId: classF.id }
    });
    assert.equal(wrongClass.statusCode, 400);

    const badDate = await app.inject({
      method: 'POST',
      url: '/api/assignments',
      ...auth(professorCookie),
      payload: { title: 'Data ruim', dueDate: '31/12/2026', classId: classM.id }
    });
    assert.equal(badDate.statusCode, 400);

    const fakeTeacher = await app.inject({
      method: 'POST',
      url: '/api/assignments',
      ...auth(studentACookie),
      payload: {
        title: 'Professor falso',
        dueDate: inDays(1),
        classId: classM.id,
        teacherId: professor.id
      }
    });
    assert.equal(fakeTeacher.statusCode, 403);

    const deleteOther = await app.inject({
      method: 'DELETE',
      url: `/api/assignments/${assignmentF.id}`,
      ...auth(studentACookie)
    });
    assert.equal(deleteOther.statusCode, 404);
  });

  it('atualiza status e exclui trabalho do próprio escopo', async () => {
    const updated = await app.inject({
      method: 'PATCH',
      url: `/api/assignments/${assignmentP.id}`,
      ...auth(professorCookie),
      payload: { status: 'done' }
    });
    assert.equal(updated.statusCode, 200, updated.body);
    assert.equal(updated.json().assignment.status, 'done');

    const removed = await app.inject({
      method: 'DELETE',
      url: `/api/assignments/${assignmentS.id}`,
      ...auth(studentACookie)
    });
    assert.equal(removed.statusCode, 200, removed.body);
  });
});

describe('módulo de eventos', () => {
  it('migra getScopedEvents para o backend', async () => {
    const ids = async (cookie: string) => {
      const response = await app.inject({ method: 'GET', url: '/api/events', ...auth(cookie) });
      assert.equal(response.statusCode, 200, response.body);
      return (response.json().items as Array<{ id: number }>).map((item) => item.id);
    };

    const adminIds = await ids(adminCookie);
    const professorIds = await ids(professorCookie);
    const studentAIds = await ids(studentACookie);
    const studentBIds = await ids(studentBCookie);

    for (const list of [adminIds, professorIds, studentAIds, studentBIds]) {
      assert.ok(list.includes(eventGlobal.id));
    }
    assert.ok(professorIds.includes(eventClassM.id));
    assert.ok(studentAIds.includes(eventClassM.id));
    assert.ok(!studentBIds.includes(eventClassM.id));
    assert.ok(studentBIds.includes(eventClassF.id));
    assert.ok(!studentAIds.includes(eventClassF.id));
  });

  it('protege eventos globais e valida criação', async () => {
    const read = await app.inject({
      method: 'GET',
      url: `/api/events/${eventClassM.id}`,
      ...auth(studentBCookie)
    });
    assert.equal(read.statusCode, 404);

    const studentEditGlobal = await app.inject({
      method: 'PATCH',
      url: `/api/events/${eventGlobal.id}`,
      ...auth(studentACookie),
      payload: { title: 'Hackeado' }
    });
    assert.equal(studentEditGlobal.statusCode, 403);

    const badTime = await app.inject({
      method: 'POST',
      url: '/api/events',
      ...auth(professorCookie),
      payload: {
        title: 'Horário inválido',
        date: inDays(1),
        timeStart: '12:00',
        timeEnd: '11:00',
        location: 'Sala'
      }
    });
    assert.equal(badTime.statusCode, 400);

    const outOfScope = await app.inject({
      method: 'POST',
      url: '/api/events',
      ...auth(studentACookie),
      payload: {
        title: 'Turma proibida',
        date: inDays(1),
        timeStart: '08:00',
        timeEnd: '09:00',
        location: 'Sala',
        classId: classF.id
      }
    });
    assert.equal(outOfScope.statusCode, 400);

    const adminEditGlobal = await app.inject({
      method: 'PATCH',
      url: `/api/events/${eventGlobal.id}`,
      ...auth(adminCookie),
      payload: { title: 'Evento Global M3 Editado' }
    });
    assert.equal(adminEditGlobal.statusCode, 200, adminEditGlobal.body);
  });

  it('gerencia presença somente do próprio usuário e dentro do escopo', async () => {
    const confirm = await app.inject({
      method: 'POST',
      url: `/api/events/${eventGlobal.id}/rsvp`,
      ...auth(studentACookie)
    });
    assert.equal(confirm.statusCode, 200, confirm.body);
    assert.equal(confirm.json().userId, studentA.id);

    const detail = await app.inject({
      method: 'GET',
      url: `/api/events/${eventGlobal.id}`,
      ...auth(studentACookie)
    });
    assert.ok(
      (detail.json().rsvps as Array<{ userId: number }>).some((rsvp) => rsvp.userId === studentA.id)
    );

    const outside = await app.inject({
      method: 'POST',
      url: `/api/events/${eventClassF.id}/rsvp`,
      ...auth(studentACookie)
    });
    assert.equal(outside.statusCode, 404);

    const cancel = await app.inject({
      method: 'DELETE',
      url: `/api/events/${eventGlobal.id}/rsvp`,
      ...auth(studentACookie)
    });
    assert.equal(cancel.statusCode, 200, cancel.body);
    assert.equal(cancel.json().confirmed, false);
  });
});

describe('módulo de notificações', () => {
  it('deriva notificações do escopo e controla leitura por usuário', async () => {
    const list = await app.inject({ method: 'GET', url: '/api/notifications', ...auth(studentACookie) });
    assert.equal(list.statusCode, 200, list.body);
    const body = list.json();
    assert.ok(Array.isArray(body.items));
    assert.equal(typeof body.unread, 'number');
    assert.ok(!JSON.stringify(body.items).includes('Evento Fundamental M3'));

    const candidate = body.items.find((item: { id: string }) => item.id.startsWith('event-'))?.id;
    assert.ok(candidate, 'Deveria haver ao menos uma notificação de evento.');

    const marked = await app.inject({
      method: 'PATCH',
      url: '/api/notifications/read',
      ...auth(studentACookie),
      payload: { keys: [candidate, 'chave-inexistente'] }
    });
    assert.equal(marked.statusCode, 200, marked.body);
    assert.equal(marked.json().marked, 1);

    const again = await app.inject({
      method: 'PATCH',
      url: '/api/notifications/read',
      ...auth(studentACookie),
      payload: { keys: [candidate] }
    });
    assert.equal(again.json().marked, 0);

    const afterList = await app.inject({
      method: 'GET',
      url: '/api/notifications',
      ...auth(studentACookie)
    });
    const item = afterList
      .json()
      .items.find((entry: { id: string }) => entry.id === candidate);
    assert.equal(item.read, true);

    const otherUser = await app.inject({
      method: 'GET',
      url: '/api/notifications',
      ...auth(studentBCookie)
    });
    const otherItem = otherUser
      .json()
      .items.find((entry: { id: string }) => entry.id === candidate);
    assert.equal(otherItem?.read ?? false, false);
  });

  it('valida o corpo de leitura', async () => {
    const invalid = await app.inject({
      method: 'PATCH',
      url: '/api/notifications/read',
      ...auth(studentACookie),
      payload: { keys: [] }
    });
    assert.equal(invalid.statusCode, 400);
  });
});

describe('módulo de foco', () => {
  it('registra sessões e consulta o próprio histórico', async () => {
    const date = '2020-01-02';
    const first = await app.inject({
      method: 'POST',
      url: '/api/focus',
      ...auth(studentACookie),
      payload: { date, minutes: 25 }
    });
    assert.equal(first.statusCode, 201, first.body);
    assert.equal(first.json().minutes, 25);
    assert.equal(first.json().sessions, 1);

    const second = await app.inject({
      method: 'POST',
      url: '/api/focus',
      ...auth(studentACookie),
      payload: { date, minutes: 50, sessions: 2 }
    });
    assert.equal(second.json().minutes, 75);
    assert.equal(second.json().sessions, 3);

    const list = await app.inject({
      method: 'GET',
      url: `/api/focus?from=${date}&to=${date}`,
      ...auth(studentACookie)
    });
    assert.equal(list.statusCode, 200, list.body);
    const record = list.json().records.find((entry: { date: string }) => entry.date === date);
    assert.equal(record.minutes, 75);
    assert.equal(record.sessions, 3);
    assert.ok(Array.isArray(list.json().week));
  });

  it('mantém registros privados por usuário e valida os dados', async () => {
    const other = await app.inject({
      method: 'GET',
      url: '/api/focus?from=2020-01-01&to=2020-01-31',
      ...auth(studentBCookie)
    });
    assert.ok(
      !(other.json().records as Array<{ date: string }>).some((entry) => entry.date === '2020-01-02')
    );

    const tooLong = await app.inject({
      method: 'POST',
      url: '/api/focus',
      ...auth(studentACookie),
      payload: { minutes: 721 }
    });
    assert.equal(tooLong.statusCode, 400);

    const badDate = await app.inject({
      method: 'POST',
      url: '/api/focus',
      ...auth(studentACookie),
      payload: { date: '02/01/2020', minutes: 25 }
    });
    assert.equal(badDate.statusCode, 400);
  });
});
