import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const serviceAccountPath = process.argv[2] || process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath) {
  console.error(`
Uso:
  node scripts/seed-firebase.mjs caminho/para/service-account.json

Ou defina GOOGLE_APPLICATION_CREDENTIALS no ambiente.
Baixe a chave em: Firebase Console > Configurações do projeto > Contas de serviço.
`);
  process.exit(1);
}

function fakeStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

async function loadDemoData() {
  const source = await readFile(path.join(root, 'assets/js/data.js'), 'utf8');
  const context = {
    window: {},
    localStorage: fakeStorage(),
    sessionStorage: fakeStorage(),
    console
  };
  vm.createContext(context);
  vm.runInContext(`${source}\n;globalThis.__schoolflowDemo = { mockUsers, mockClasses, mockAssignments, mockEvents, mockEnrollments, mockFocusLog };`, context);
  return context.__schoolflowDemo;
}

function withoutPassword(item) {
  const copy = { ...item };
  delete copy.password;
  delete copy._docId;
  return JSON.parse(JSON.stringify(copy));
}

function chunk(array, size) {
  const chunks = [];
  for (let index = 0; index < array.length; index += size) chunks.push(array.slice(index, index + size));
  return chunks;
}

const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8'));
const app = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const auth = getAuth(app);
const db = getFirestore(app);
const demo = await loadDemoData();

console.log(`Projeto: ${serviceAccount.project_id}`);
console.log(`Usuários demo encontrados: ${demo.mockUsers.length}`);

const uidByEmail = new Map();

for (const user of demo.mockUsers) {
  let record;
  try {
    record = await auth.getUserByEmail(user.email);
    await auth.updateUser(record.uid, { displayName: user.name });
    console.log(`Auth já existia: ${user.email}`);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    record = await auth.createUser({
      email: user.email,
      password: user.password || 'schoolflow123',
      displayName: user.name,
      emailVerified: true
    });
    console.log(`Auth criado: ${user.email}`);
  }
  uidByEmail.set(user.email.toLowerCase(), record.uid);
}

const userOperations = demo.mockUsers.map((user) => {
  const uid = uidByEmail.get(user.email.toLowerCase());
  const profile = {
    ...withoutPassword(user),
    uid,
    onboardingDone: user.role !== 'aluno',
    focusLog: user.role === 'admin' ? demo.mockFocusLog : {},
    focusSessions: {},
    readNotifications: [],
    created_at: new Date().toISOString()
  };
  return { type: 'set', collection: 'users', docId: uid, data: profile };
});

const contentOperations = [
  ...demo.mockClasses.map((item) => ({ type: 'set', collection: 'classes', docId: String(item.id), data: withoutPassword(item) })),
  ...demo.mockAssignments.map((item) => ({ type: 'set', collection: 'assignments', docId: String(item.id), data: withoutPassword(item) })),
  ...demo.mockEvents.map((item) => ({ type: 'set', collection: 'events', docId: String(item.id), data: withoutPassword(item) })),
  ...demo.mockEnrollments.map((item) => ({ type: 'set', collection: 'enrollments', docId: String(item.id), data: withoutPassword(item) }))
];

const operations = [...userOperations, ...contentOperations];
for (const group of chunk(operations, 400)) {
  const batch = db.batch();
  group.forEach((operation) => {
    batch.set(db.collection(operation.collection).doc(operation.docId), operation.data);
  });
  await batch.commit();
}

await db.collection('meta').doc('setup').set({
  seededAt: FieldValue.serverTimestamp(),
  seededBy: 'seed-firebase-script',
  source: 'schoolflow',
  demoUsers: demo.mockUsers.length
});

console.log(`Gravados: ${userOperations.length} perfis, ${contentOperations.length} registros de conteúdo.`);
console.log('meta/setup criado. A configuração inicial foi fechada.');
console.log(`
Contas de demonstração:
  carlos@aluno.com / aluno123
  ana@professor.com / prof123
  admin@escola.com / admin123

Importante: troque ou remova essas contas antes de usar o site em produção.
`);
