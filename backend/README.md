# SchoolFlow API

Backend REST do SchoolFlow em **Node.js + TypeScript + Fastify + Prisma + PostgreSQL + Zod**.
Esta pasta é independente: o frontend estático (HTML/CSS/JS vanilla, `localStorage`, Render Static Site) permanece intacto.

## Estrutura

```
backend/
├── prisma/
│   ├── schema.prisma                         # modelagem relacional
│   └── migrations/
│       ├── migration_lock.toml
│       └── 20261120000000_init/migration.sql # criada, NÃO aplicada
├── render.yaml                               # blueprint do Web Service
├── src/
│   ├── app.ts                                # composição do Fastify
│   ├── server.ts                             # listen() + shutdown graceful
│   ├── config/{env,database,auth}.ts         # configurações, Prisma, constantes
│   ├── controllers/{health,auth}.controller.ts
│   ├── services/{health,auth}.service.ts     # regras de negócio
│   ├── routes/{index,health,auth}.routes.ts
│   ├── schemas/auth.schema.ts                # validação Zod
│   ├── middleware/auth.ts                    # autenticação + RBAC
│   ├── plugins/{cors,cookies,jwt,error-handler}.ts
│   ├── types/{fastify,jwt}.d.ts
│   └── utils/http-error.ts
├── .env.example
├── package.json
└── tsconfig.json
```

## Requisitos

- Node.js **>= 20**
- PostgreSQL (local ou Render)
- npm

## Executar localmente

```bash
cd backend
npm install
cp .env.example .env      # Windows: copy .env.example .env
# Edite .env com a sua DATABASE_URL real e um JWT_SECRET aleatório
npm run db:generate       # gera o Prisma Client
npm run build
npm run dev               # http://localhost:3000 (tsx watch)
```

Para rodar o build compilado: `npm start`.

> `npm audit` termina com **0 vulnerabilidades** nas versões fixadas. Em npm 12+, o campo
> `allowScripts` do `package.json` autoriza os scripts de instalação do Prisma/engines.

### Variáveis de ambiente

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `DATABASE_URL` | sim | — | URL PostgreSQL (`postgresql://...`). Nunca versionar. |
| `JWT_SECRET` | sim | — | Chave de assinatura do JWT (mín. 32 caracteres). |
| `NODE_ENV` | não | `development` | `development`, `test` ou `production`. |
| `PORT` | não | `3000` | Porta HTTP; no Render é injetada automaticamente. |
| `HOST` | não | `0.0.0.0` | Bind da aplicação. |
| `JWT_EXPIRES_IN` | não | `7d` | Validade do token. |
| `CORS_ORIGIN` | não | `http://localhost:4173` | Origens permitidas, separadas por vírgula. |
| `COOKIE_SECURE` | não | `false` | Em produção é forçado para `true`. |
| `LOG_LEVEL` | não | `info` | Nível do logger Pino. |

A aplicação **falha na inicialização** se `DATABASE_URL` ou `JWT_SECRET` estiverem ausentes/inválidos.

## Banco de dados e migrations

O schema cobre: `users`, `classes`, `enrollments`, `assignments`, `events`, `event_rsvps`,
`notification_reads` e `focus_records`. Os enums usam as mesmas strings do frontend
(`aluno/professor/admin`, `fundamental/medo`, `todo/doing/review/done`, etc.).

A migration inicial `20261120000000_init` está **criada, mas não foi aplicada**. Não foram
executados `migrate dev`, `migrate deploy`, `db push` ou `migrate reset`, e nenhum dado do
PostgreSQL foi alterado.

Quando você autorizar:

```bash
npm run db:migrate:deploy   # aplica apenas migrations pendentes (não destrutivo)
npm run db:generate
```

> Nunca use `prisma migrate reset` ou `prisma db push` em produção: eles podem descartar dados.

Mapeamento com o `localStorage` atual (para a futura integração):

| localStorage / frontend | Tabela |
|---|---|
| `users` (senha em texto) | `users` (`password_hash` com bcrypt) |
| `classes` | `classes` |
| `enrollments` | `enrollments` |
| `assignments` | `assignments` |
| `events` + `attendees` | `events` + `event_rsvps` |
| `readNotifications` | `notification_reads` |
| `focusLog` + `focusSessions` | `focus_records` |
| `schoolflow.prefs.v1` | `users.preferences` (JSON) |

## Endpoints

Base: `/api`

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| GET | `/api/health` | não | Status do processo (não consulta o banco). |
| GET | `/api/health/db` | não | Executa `SELECT 1`; `503` se o PostgreSQL falhar. |
| POST | `/api/auth/register` | não | Cadastro de aluno + matrícula nas turmas da etapa. |
| POST | `/api/auth/login` | não | Login; devolve usuário sem `passwordHash`. |
| POST | `/api/auth/logout` | não | Limpa o cookie de sessão. |
| GET | `/api/auth/me` | sim | Usuário autenticado. |

Exemplos:

```bash
curl -i http://localhost:3000/api/health
curl -i http://localhost:3000/api/health/db

curl -i -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Carlos Aluno","email":"carlos@escola.com","password":"aluno123","confirmPassword":"aluno123","stage":"medio","grade":"2º ano"}'

curl -i -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"carlos@escola.com","password":"aluno123"}'

# Com o cookie de sessão:
curl -i http://localhost:3000/api/auth/me -H 'Cookie: schoolflow_token=<JWT>'
```

Respostas de erro seguem o formato `{ "error": "código", "message": "...", "details": [...] }`.

## Segurança

- Senhas com **bcrypt** (12 rounds); `passwordHash` nunca é serializado.
- JWT assinado em cookie **httpOnly**, `SameSite=Strict`, `Secure` em produção (aceita também `Authorization: Bearer`).
- **CORS** com lista explícita de origens e `credentials: true` (não usa `*`).
- **RBAC** no backend via `requireRole(...)`; o frontend nunca é fonte de autoridade.
- Validação de entrada com **Zod** e tratamento centralizado de erros (sem stack em produção).
- Conexão com banco **lazy**: `/api/health` continua disponível se o PostgreSQL estiver fora.

## Integração com o frontend

`assets/js/api.js` é a ponte entre o frontend vanilla e a API:

- `fetch()` com `credentials: 'include'` envia/recebe o cookie httpOnly.
- No boot, a aplicação chama `/api/auth/me` e carrega usuários, turmas, matrículas,
  trabalhos, eventos, foco e notificações para dentro do `state` do `data.js`
  (convertendo `camelCase` → `snake_case`, mantendo renderização e regras intactas).
- `saveState()` continua gravando no `localStorage` (cache) e dispara uma sincronização
  com a API: diferenças entre o estado atual e o último snapshot geram POST/PATCH/DELETE
  nos respectivos endpoints, com debounce de 350 ms.
- Se o backend estiver fora ou não houver cookie, a aplicação permanece em **modo local**
  com `localStorage`, exatamente como antes. Contas demo e modo convidado continuam locais.

Configuração no navegador (opcional):

```js
localStorage.setItem('schoolflow.api.base', 'https://seu-api.onrender.com/api'); // padrão: http://localhost:3000/api
localStorage.setItem('schoolflow.api.enabled', 'false'); // desliga a ponte
```

### Endpoints disponíveis

| Módulo | Rotas |
|---|---|
| Saúde | `GET /api/health`, `GET /api/health/db` |
| Autenticação | `POST /api/auth/{register,login,logout}`, `GET /api/auth/me` |
| Usuários | `GET /api/users`, `GET /api/users/:id`, `POST`, `PATCH /:id`, `DELETE /:id` (**admin**) |
| Turmas | `GET /api/classes`, `GET /:id`, `POST`, `PATCH /:id`, `DELETE /:id` (**admin**) |
| Matrículas | `GET /api/enrollments`, `POST` (**admin**), `DELETE /:studentId/:classId` (**admin**) |
| Trabalhos | `GET /api/assignments`, `GET /:id`, `POST`, `PATCH /:id`, `DELETE /:id` |
| Eventos | `GET /api/events`, `GET /:id`, `POST`, `PATCH /:id`, `DELETE /:id`, `POST/DELETE /:id/rsvp` |
| Notificações | `GET /api/notifications`, `PATCH /api/notifications/read` |
| Foco | `GET /api/focus`, `POST /api/focus` |

Escopo por perfil, RBAC e validação estão no servidor; esconder botões no frontend nunca é
usado como controle de segurança. Próximos passos possíveis: seed opcional de dados demo,
preferências no servidor, PWA e sincronização em tempo real.

## Render (Web Service independente)

Use `render.yaml` ou configure manualmente:

- **Build Command:** `npm install && npm run build && npm run db:generate`
- **Start Command:** `npm start`
- **Health Check Path:** `/api/health`
- **Environment:** `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` (com a URL do Static Site), `LOG_LEVEL=info`
- `PORT` é injetado pelo Render; `HOST=0.0.0.0` já é o padrão.
- Após revisar a migration, execute `npm run db:migrate:deploy` no Shell do Render uma vez.

## Verificação realizada

- `npx prisma validate` e `prisma migrate diff`: schema válido e migration idêntica ao schema.
- Migration `20261120000000_init` aplicada com `npm run db:migrate:deploy`;
  `prisma migrate status` → `Database schema is up to date!`.
- Conexão real com PostgreSQL testada (`SELECT 1`) e `/api/health/db` → 200.
- `npm run build` (TypeScript): sem erros. `npm audit`: 0 vulnerabilidades.
- `npm test`: **30 testes aprovados** — CRUD, autenticação, RBAC, isolamento entre usuários,
  transações e a ponte frontend ↔ API.
- Limpeza dos testes remove somente os registros criados por eles.

Nenhuma credencial real foi usada ou versionada; `.env` permanece ignorado pelo Git.
