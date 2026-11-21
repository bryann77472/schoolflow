import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import vm from 'node:vm';

// Simula o ambiente de produção do Render: origens distintas (cross-site).
process.env.NODE_ENV = 'production';
process.env.COOKIE_SECURE = 'false'; // deve ser forçado para true pelo código
process.env.CORS_ORIGIN = 'https://theschoolflow.onrender.com';

// imports dinâmicos: o módulo de config cached o ambiente na primeira carga.
let buildApp: typeof import('../src/app')['buildApp'];
let env: typeof import('../src/config/env')['env'];
let getAllowedOrigins: typeof import('../src/config/env')['getAllowedOrigins'];
let prisma: typeof import('../src/config/database')['prisma'];
let disconnectDatabase: typeof import('../src/config/database')['disconnectDatabase'];
let hash: typeof import('bcryptjs')['hash'];

before(async () => {
  ({ buildApp } = await import('../src/app'));
  ({ env, getAllowedOrigins } = await import('../src/config/env'));
  ({ prisma, disconnectDatabase } = await import('../src/config/database'));
  const bcrypt = await import('bcryptjs');
  hash = bcrypt.hash ?? (bcrypt as any).default.hash;
});

type App = Awaited<ReturnType<typeof buildApp>>;

const ORIGIN = 'https://theschoolflow.onrender.com';
const email = `cookie-${Date.now()}@schoolflow.test`;
const password = 'senha123';
let app: App;

async function createUser(): Promise<number> {
  const user = await prisma.user.create({
    data: {
      name: 'Teste Cookie',
      email,
      passwordHash: await hash(password, 4),
      role: 'aluno',
      onboardingDone: true
    }
  });
  return user.id;
}

function cookieValue(setCookie: string | undefined): string {
  assert.ok(setCookie, 'Set-Cookie não foi retornado.');
  return setCookie!.split(';')[0];
}

after(async () => {
  if (app) await app.close();
  await prisma.user.deleteMany({ where: { email } });
  await disconnectDatabase();
});

describe('configuração de ambiente em produção', () => {
  it('força Secure e usa SameSite=None, com CORS explícito', () => {
    assert.equal(env.NODE_ENV, 'production');
    assert.equal(env.COOKIE_SECURE, true);
    assert.equal(env.COOKIE_SAME_SITE, 'none');
    assert.deepEqual(getAllowedOrigins(), [ORIGIN]);
  });
});

describe('ciclo de vida do cookie cross-site', () => {
  it('emite cookie HttpOnly + Secure + SameSite=None com Path e Max-Age', async () => {
    await createUser();
    app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { origin: ORIGIN },
      payload: { email, password }
    });

    assert.equal(response.statusCode, 200, response.body);
    const setCookie = response.headers['set-cookie'] as string | undefined;
    assert.ok(setCookie);
    assert.match(setCookie!, /schoolflow_token=/);
    assert.match(setCookie!, /HttpOnly/i);
    assert.match(setCookie!, /Secure/i);
    assert.match(setCookie!, /SameSite=None/i);
    assert.match(setCookie!, /Path=\//);
    assert.match(setCookie!, /Max-Age=604800/);
    assert.equal(response.headers['access-control-allow-origin'], ORIGIN);
    assert.equal(response.headers['access-control-allow-credentials'], 'true');
  });

  it('aceita o cookie em GET /api/auth/me e rejeita sem cookie', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { origin: ORIGIN },
      payload: { email, password }
    });
    const cookie = cookieValue(login.headers['set-cookie'] as string | undefined);

    const withCookie = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { origin: ORIGIN, cookie }
    });
    assert.equal(withCookie.statusCode, 200, withCookie.body);
    assert.equal(withCookie.json().user.email, email);

    const withoutCookie = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { origin: ORIGIN }
    });
    assert.equal(withoutCookie.statusCode, 401);
  });

  it('logout limpa o cookie com as mesmas opções de emissão', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { origin: ORIGIN },
      payload: { email, password }
    });
    const cookie = cookieValue(login.headers['set-cookie'] as string | undefined);

    const logout = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { origin: ORIGIN, cookie }
    });
    assert.equal(logout.statusCode, 200, logout.body);
    const setCookie = logout.headers['set-cookie'] as string | undefined;
    assert.ok(setCookie);
    assert.match(setCookie!, /schoolflow_token=/);
    assert.match(setCookie!, /SameSite=None/i);
    assert.match(setCookie!, /Secure/i);
    assert.match(setCookie!, /HttpOnly/i);
    assert.match(setCookie!, /Max-Age=0/);
  });
});

describe('CSRF / CORS', () => {
  it('rejeita origem não autorizada em operação que modifica dados', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { origin: 'https://site-malicioso.example' },
      payload: { email, password }
    });
    assert.equal(response.statusCode, 403, response.body);
    assert.equal(response.json().error, 'origin_not_allowed');
  });

  it('aceita clientes sem Origin e responde preflight apenas para a origem exata', async () => {
    const noOrigin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password }
    });
    assert.equal(noOrigin.statusCode, 200, noOrigin.body);

    const preflight = await app.inject({
      method: 'OPTIONS',
      url: '/api/auth/login',
      headers: {
        origin: ORIGIN,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type'
      }
    });
    assert.equal(preflight.statusCode, 204);
    assert.equal(preflight.headers['access-control-allow-origin'], ORIGIN);
    assert.equal(preflight.headers['access-control-allow-credentials'], 'true');
  });
});

describe('modo convidado (frontend)', () => {
  const core = readFileSync(path.resolve(__dirname, '../../assets/js/core.js'), 'utf8');

  function extract(startMarker: string, endMarker: string): string {
    const start = core.indexOf(startMarker);
    assert.ok(start >= 0, `Trecho não encontrado: ${startMarker}`);
    const end = core.indexOf(endMarker, start);
    assert.ok(end > start, `Fim do trecho não encontrado: ${endMarker}`);
    return core.slice(start, end);
  }

  it('restaura somente sessões explicitamente convidadas', async () => {
    const snippet = extract('async function restoreSession()', '\nfunction isAdmin()');
    const context = {
      window: { SchoolFlowAPI: { restoreIdentity: async () => null } },
      state: {},
      getSession: () => ({ role: 'convidado', isGuest: true }),
      getGuestUser: () => ({ role: 'convidado', isGuest: true, name: 'Visitante' })
    } as any;
    vm.runInNewContext(snippet, context);
    await context.restoreSession();
    assert.equal(context.state.currentUser.role, 'convidado');
  });

  it('não transforma sessão local antiga de usuário real em convidado', async () => {
    const snippet = extract('async function restoreSession()', '\nfunction isAdmin()');
    const context = {
      window: { SchoolFlowAPI: { restoreIdentity: async () => null } },
      state: {},
      getSession: () => ({ role: 'aluno', isGuest: true }),
      getGuestUser: () => ({ role: 'convidado', isGuest: true })
    } as any;
    vm.runInNewContext(snippet, context);
    await context.restoreSession();
    assert.equal(context.state.currentUser, null);
  });

  it('não redireciona convidado para login nas páginas internas', async () => {
    const snippet = extract('async function bootCore()', '\ndocument.addEventListener');
    let redirects = 0;
    let shellRendered = false;
    const context = {
      restoreSession: async () => undefined,
      document: {},
      applyAppearance: () => undefined,
      hydrateIcons: () => undefined,
      currentPage: () => 'dashboard',
      requireAuth: () => true,
      window: {
        SchoolFlowAPI: { bootstrap: async () => false },
        location: { replace: () => { redirects += 1; } }
      },
      state: { currentUser: { role: 'convidado' } },
      renderShell: () => { shellRendered = true; },
      bindGlobalEvents: () => undefined,
      updateTimerUI: () => undefined
    } as any;
    vm.runInNewContext(snippet, context);
    await context.bootCore();
    assert.equal(redirects, 0);
    assert.equal(shellRendered, true);
  });
});
