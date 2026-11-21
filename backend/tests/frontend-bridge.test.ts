import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const apiSource = readFileSync(
  path.resolve(__dirname, '../../assets/js/api.js'),
  'utf8'
);

const identity = {
  id: 99,
  name: 'Aluno API',
  email: 'aluno@api.test',
  role: 'aluno',
  stage: 'medio',
  grade: '2º ano',
  subject: '2º ano · Ensino Médio',
  avatarTone: 'sky',
  onboardingDone: true
};

const apiClass = {
  id: 7,
  name: 'Matemática',
  description: 'Álgebra',
  stage: 'medio',
  dayOfWeek: 2,
  timeStart: '10:00',
  timeEnd: '11:30',
  room: 'Sala 2A',
  color: '#6366f1',
  teacherId: 5
};

const apiAssignment = {
  id: 8,
  title: 'Lista',
  description: 'Exercícios',
  dueDate: '2026-12-01T00:00:00.000Z',
  classId: 7,
  teacherId: 5,
  status: 'todo',
  priority: 'high',
  createdAt: '2026-11-20T00:00:00.000Z'
};

const apiEvent = {
  id: 9,
  title: 'Feira',
  description: 'Ciências',
  date: '2026-12-05T00:00:00.000Z',
  timeStart: '09:00',
  timeEnd: '12:00',
  location: 'Pátio',
  category: 'academic',
  classId: null,
  isGlobal: true,
  rsvps: [{ userId: 99, user: { id: 99, name: 'Aluno API' } }]
};

function buildContext() {
  const calls: Array<{ path: string; method: string; body?: unknown }> = [];
  const json = (body: unknown, status = 200) =>
    Promise.resolve({
      ok: status < 400,
      status,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body))
    });

  const fetchStub = (url: string, init: { method?: string; body?: string }) => {
    const requestPath = url.replace('http://localhost:3000/api', '');
    calls.push({
      path: requestPath,
      method: init.method || 'GET',
      body: init.body ? JSON.parse(init.body) : undefined
    });

    if (requestPath === '/health') return json({ status: 'ok' });
    if (requestPath === '/auth/me') return json({ user: identity });
    if (requestPath.startsWith('/users')) return json({ items: [identity], total: 1 });
    if (requestPath.startsWith('/classes')) return json({ items: [apiClass], total: 1 });
    if (requestPath.startsWith('/assignments')) return json({ items: [apiAssignment], total: 1 });
    if (requestPath.startsWith('/events')) return json({ items: [apiEvent], total: 1 });
    if (requestPath.startsWith('/enrollments')) {
      return json({ items: [{ studentId: 99, classId: 7 }], total: 1 });
    }
    if (requestPath.startsWith('/focus')) {
      return json({ records: [{ date: '2026-11-20', minutes: 50, sessions: 2 }], streak: 1, week: [] });
    }
    if (requestPath.startsWith('/notifications')) {
      return json({ items: [{ id: 'event-9-2026-12-05', read: true }], unread: 0 });
    }
    return json({ ok: true });
  };

  const state = {
    users: [{ id: 1, name: 'Demo', role: 'aluno' }],
    classes: [],
    assignments: [],
    events: [],
    enrollments: [],
    focusLog: {},
    focusSessions: {},
    readNotifications: [] as string[],
    currentUser: { id: 1, role: 'aluno' }
  };

  const context = {
    window: {},
    location: { hostname: 'localhost', origin: 'http://localhost:4173' },
    localStorage: { getItem: () => null, setItem: () => undefined },
    fetch: fetchStub,
    state,
    getSession: () => ({ id: 99, role: 'aluno' }),
    setSession: (user: unknown) => { context.sessionSet = user; },
    SchoolFlowLocalSave: () => undefined,
    console: { warn: () => undefined },
    setTimeout: () => 0,
    clearTimeout: () => undefined,
    sessionSet: undefined as unknown
  };

  vm.createContext(context);
  vm.runInContext(apiSource, context);
  return { context, calls, state };
}

describe('ponte frontend ↔ API', () => {
  it('carrega dados da API no formato esperado pelo data.js', async () => {
    const { context, state } = buildContext();
    const api = (context.window as Record<string, { bootstrap: () => Promise<boolean> }>).SchoolFlowAPI;

    const ok = await api.bootstrap();
    assert.equal(ok, true);

    assert.equal(state.currentUser.id, 99);
    assert.equal(state.classes[0].day_of_week, 2);
    assert.equal(state.classes[0].teacher_id, 5);
    assert.equal(state.assignments[0].due_date, '2026-12-01');
    assert.equal(state.assignments[0].class_id, 7);
    assert.equal(state.events[0].time_start, '09:00');
    assert.deepEqual(state.events[0].attendees, [99]);
    assert.equal(state.enrollments[0].student_id, 99);
    assert.equal(state.focusLog['2026-11-20'], 50);
    assert.equal(state.focusSessions['2026-11-20'], 2);
    assert.deepEqual(state.readNotifications, ['event-9-2026-12-05']);
    assert.equal((context.sessionSet as { id: number }).id, 99);
  });

  it('permanece em modo local quando não há sessão', async () => {
    const { context } = buildContext();
    (context as unknown as { getSession: () => unknown }).getSession = () => null;
    const api = (context.window as Record<string, { bootstrap: () => Promise<boolean> }>).SchoolFlowAPI;

    assert.equal(await api.bootstrap(), false);
  });
});
