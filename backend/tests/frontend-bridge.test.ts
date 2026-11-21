import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const apiSource = readFileSync(path.resolve(__dirname, '../../assets/js/api.js'), 'utf8');
const configSource = readFileSync(path.resolve(__dirname, '../../assets/js/config.js'), 'utf8');

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
  id: 7, name: 'Matemática', description: 'Álgebra', stage: 'medio', dayOfWeek: 2,
  timeStart: '10:00', timeEnd: '11:30', room: 'Sala 2A', color: '#6366f1', teacherId: 5
};
const apiAssignment = {
  id: 8, title: 'Lista', description: 'Exercícios', dueDate: '2026-12-01T00:00:00.000Z',
  classId: 7, teacherId: 5, status: 'todo', priority: 'high', createdAt: '2026-11-20T00:00:00.000Z'
};
const apiEvent = {
  id: 9, title: 'Feira', description: 'Ciências', date: '2026-12-05T00:00:00.000Z',
  timeStart: '09:00', timeEnd: '12:00', location: 'Pátio', category: 'academic',
  classId: null, isGlobal: true,
  rsvps: [{ userId: 99, user: { id: 99, name: 'Aluno API' } }]
};

interface Context {
  window: Record<string, any>;
  location: { hostname: string; origin: string };
  localStorage: { getItem: (key: string) => string | null; setItem: () => void; removeItem: () => void };
  fetch: (url: string, init: any) => Promise<any>;
  state: any;
  console: { warn: () => void };
  setTimeout: () => number;
  clearTimeout: () => void;
  sessionSet?: unknown;
}

function buildContext(hostname = 'localhost', storage: Record<string, string> = {}) {
  const calls: Array<{ path: string; method: string; credentials?: string; body?: unknown }> = [];
  const json = (body: unknown, status = 200) =>
    Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body), text: () => Promise.resolve(JSON.stringify(body)) });

  const fetchStub = (url: string, init: any) => {
    const requestPath = url.replace(/^https?:\/\/[^/]+\/api/, '');
    calls.push({ path: requestPath, method: init.method || 'GET', credentials: init.credentials, body: init.body ? JSON.parse(init.body) : undefined });
    if (requestPath === '/health') return json({ status: 'ok' });
    if (requestPath === '/auth/me') return json({ user: identity });
    if (requestPath === '/auth/login') return json({ user: identity });
    if (requestPath === '/auth/register') return json({ user: identity }, 201);
    if (requestPath === '/auth/logout') return json({ message: 'ok' });
    if (requestPath.startsWith('/users')) return json({ items: [identity], total: 1 });
    if (requestPath.startsWith('/classes')) return json({ items: [apiClass], total: 1 });
    if (requestPath.startsWith('/assignments')) return json({ items: [apiAssignment], total: 1 });
    if (requestPath.startsWith('/events')) return json({ items: [apiEvent], total: 1 });
    if (requestPath.startsWith('/enrollments')) return json({ items: [{ studentId: 99, classId: 7 }], total: 1 });
    if (requestPath.startsWith('/focus')) return json({ records: [{ date: '2026-11-20', minutes: 50, sessions: 2 }], streak: 1, week: [] });
    if (requestPath.startsWith('/notifications')) return json({ items: [{ id: 'event-9-2026-12-05', read: true }], unread: 0 });
    return json({ ok: true });
  };

  const state = {
    users: [], classes: [], assignments: [], events: [], enrollments: [],
    focusLog: {}, focusSessions: {}, readNotifications: [] as string[],
    currentUser: null as unknown
  };

  const context: Context = {
    window: {},
    location: { hostname, origin: 'https://theschoolflow.onrender.com' },
    localStorage: {
      getItem: (key: string) => (key in storage ? storage[key] : null),
      setItem: () => undefined,
      removeItem: () => undefined
    },
    fetch: fetchStub,
    state,
    console: { warn: () => undefined },
    setTimeout: () => 0,
    clearTimeout: () => undefined
  };

  vm.createContext(context);
  vm.runInContext(configSource, context);
  vm.runInContext(apiSource, context);
  return { context, calls, state };
}

function apiOf(ctx: Context) {
  return ctx.window.SchoolFlowAPI as {
    base: string;
    isOnline: () => boolean;
    restoreIdentity: () => Promise<any>;
    login: (email: string, password: string) => Promise<any>;
    register: (data: any) => Promise<any>;
    logout: () => Promise<any>;
    toLocalUser: (user: any) => any;
    bootstrap: () => Promise<boolean>;
  };
}

describe('configuração da URL da API', () => {
  it('usa o Web Service do Render em produção (não o Static Site)', () => {
    const { context } = buildContext('theschoolflow.onrender.com');
    assert.equal(apiOf(context).base, 'https://schoolflow-gkil.onrender.com/api');
  });

  it('usa localhost:3000 em desenvolvimento', () => {
    const { context } = buildContext('localhost');
    assert.equal(apiOf(context).base, 'http://localhost:3000/api');
  });
});

describe('autenticação na ponte frontend', () => {
  it('envia credenciais em todas as requisições e mapeia login/registro', async () => {
    const { context, calls } = buildContext('theschoolflow.onrender.com');
    const api = apiOf(context);

    const logged = await api.login('aluno@api.test', 'senha123');
    assert.equal(logged.user.email, identity.email);
    assert.equal(calls[0].path, '/auth/login');
    assert.equal(calls[0].credentials, 'include');
    assert.deepEqual(calls[0].body, { email: 'aluno@api.test', password: 'senha123' });

    const created = await api.register({ name: 'Novo', email: 'novo@api.test', password: 'senha123', confirm: 'senha123', stage: 'medio', grade: '2º ano' });
    assert.equal(created.user.id, 99);
    const registerCall = calls.find((call) => call.path === '/auth/register');
    assert.equal(registerCall?.credentials, 'include');
    assert.deepEqual((registerCall?.body as any).confirmPassword, 'senha123');

    await api.logout();
    assert.equal(calls.find((call) => call.path === '/auth/logout')?.method, 'POST');
  });

  it('restaura a sessão apenas com GET /auth/me (cookie httpOnly)', async () => {
    const { context, calls, state } = buildContext('theschoolflow.onrender.com');
    const api = apiOf(context);
    state.currentUser = api.toLocalUser(identity);

    const restored = await api.restoreIdentity();
    assert.equal(restored.id, 99);
    assert.equal(restored.password, undefined);
    assert.equal(calls[0].path, '/auth/me');
    assert.equal(api.isOnline(), true);
  });

  it('não expõe senha no objeto local do usuário', () => {
    const { context } = buildContext();
    const local = apiOf(context).toLocalUser({ ...identity, password: 'segredo' });
    assert.ok(!('password' in local));
  });
});

describe('carregamento de dados da API', () => {
  it('converte os dados para o formato esperado pelo data.js', async () => {
    const { context, state } = buildContext();
    const api = apiOf(context);
    state.currentUser = api.toLocalUser(identity);

    assert.equal(await api.bootstrap(), true);
    assert.equal(state.classes[0].day_of_week, 2);
    assert.equal(state.assignments[0].due_date, '2026-12-01');
    assert.equal(state.events[0].time_start, '09:00');
    assert.deepEqual(state.events[0].attendees, [99]);
    assert.equal(state.focusLog['2026-11-20'], 50);
    assert.deepEqual(state.readNotifications, ['event-9-2026-12-05']);
  });
});
