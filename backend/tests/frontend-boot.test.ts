import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const root = path.resolve(__dirname, '../../assets/js');
const dataSrc = readFileSync(path.join(root, 'data.js'), 'utf8');
const coreSrc = readFileSync(path.join(root, 'core.js'), 'utf8');
const pagesSrc = readFileSync(path.join(root, 'pages.js'), 'utf8');

const AUTH_USER = {
  id: 12,
  name: 'Usuário Real',
  email: 'real@schoolflow.test',
  role: 'aluno',
  stage: 'medio',
  grade: '2º ano',
  subject: '',
  avatarTone: 'indigo',
  onboardingDone: true
};

function boot(page: 'dashboard' | 'assignments' | 'events' | 'admin' | 'login', storage: Record<string, string> = {}) {
  const domListeners: Array<() => unknown> = [];
  const redirects: string[] = [];

  const documentStub = {
    body: { dataset: { page } },
    documentElement: { dataset: {} },
    addEventListener: (_type: string, cb: () => unknown) => domListeners.push(cb),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {} })
  };

  let identityCalls = 0;
  const windowStub = {
    SchoolFlowReady: undefined as Promise<void> | undefined,
    SchoolFlowAPI: {
      restoreIdentity: async () => {
        identityCalls += 1;
        return AUTH_USER;
      },
      bootstrap: async () => true,
      isOnline: () => true,
      logout: async () => null
    },
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    location: {
      hostname: 'theschoolflow.onrender.com',
      origin: 'https://theschoolflow.onrender.com',
      replace: (url: string) => redirects.push(url),
      href: ''
    },
    addEventListener() {}
  };

  const localStorageStub = {
    getItem: (key: string) => (key in storage ? storage[key] : null),
    setItem: () => undefined,
    removeItem: () => undefined
  };

  const context = {
    window: windowStub,
    document: documentStub,
    localStorage: localStorageStub,
    location: windowStub.location,
    console: { error() {}, warn() {}, log() {}, info() {}, debug() {} },
    setTimeout: (fn: () => void) => { fn(); return 0; },
    clearTimeout: () => undefined,
    fetch: () => Promise.reject(new Error('rede indisponível no teste')),
    navigator: { userAgent: 'test' }
  } as any;

  vm.createContext(context);
  vm.runInContext(dataSrc, context);
  vm.runInContext('globalThis.__state = state;', context);
  vm.runInContext(coreSrc, context);
  vm.runInContext(pagesSrc, context);

  // Substitui apenas efeitos de DOM/renderização; a lógica de boot permanece a original.
  context.renderShell = () => { context.__shell = true; };
  context.hydrateIcons = () => undefined;
  context.applyAppearance = () => undefined;
  context.bindGlobalEvents = () => undefined;
  context.updateTimerUI = () => undefined;
  context.bindPageEvents = () => { context.__pageEvents = true; };
  context.initDashboard = () => { context.__rendered = 'dashboard'; };
  context.initAssignments = () => { context.__rendered = 'assignments'; };
  context.initEvents = () => { context.__rendered = 'events'; };
  context.initAdmin = () => { context.__rendered = 'admin'; };
  context.initLogin = () => { context.__rendered = 'login'; };
  context.maybeShowOnboarding = () => undefined;
  context.toast = () => undefined;
  context.icon = () => '';

  return { context, windowStub, domListeners, redirects, getIdentityCalls: () => identityCalls };
}

describe('inicialização coordenada core.js → pages.js', () => {
  it('renderiza o dashboard de usuário autenticado após a restauração da sessão', async () => {
    const { context, windowStub, domListeners, redirects } = boot('dashboard');
    await Promise.all(domListeners.map((listener) => listener()));
    await windowStub.SchoolFlowReady;

    assert.equal(context.__shell, true);
    assert.equal(context.__pageEvents, true);
    assert.equal(context.__rendered, 'dashboard');
    assert.deepEqual(redirects, []);
  });

  it('renderiza Trabalhos e Eventos com a mesma coordenação', async () => {
    for (const page of ['assignments', 'events'] as const) {
      const { context, windowStub, domListeners } = boot(page);
      await Promise.all(domListeners.map((listener) => listener()));
      await windowStub.SchoolFlowReady;
      assert.equal(context.__rendered, page);
    }
  });

  it('renderiza o dashboard no modo convidado sem chamar /auth/me', async () => {
    const storage = {
      'schoolflow.session.v1': JSON.stringify({ role: 'convidado', isGuest: true })
    };
    const { context, windowStub, domListeners, getIdentityCalls } = boot('dashboard', storage);
    windowStub.SchoolFlowAPI.restoreIdentity = async () => {
      throw new Error('convidado não deve consultar /auth/me');
    };

    await Promise.all(domListeners.map((listener) => listener()));
    await windowStub.SchoolFlowReady;

    assert.equal(getIdentityCalls(), 0);
    assert.equal(context.__state.currentUser.role, 'convidado');
    assert.equal(context.__rendered, 'dashboard');
  });

  it('redireciona para login quando não há sessão, sem renderizar página', async () => {
    const { context, windowStub, domListeners, redirects } = boot('dashboard');
    windowStub.SchoolFlowAPI.restoreIdentity = async () => null;

    await Promise.all(domListeners.map((listener) => listener()));
    await windowStub.SchoolFlowReady;

    assert.deepEqual(redirects, ['login.html']);
    assert.equal(context.__rendered, undefined);
  });
});
