# SchoolFlow - Sistema de Gestão Escolar

![SchoolFlow Logo](assets/img/logo.svg)

Uma plataforma minimalista e moderna para gestão de aulas, trabalhos e eventos escolares.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Modelos de Dados](#modelos-de-dados)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Telas e Componentes](#telas-e-componentes)
- [API Endpoints](#api-endpoints)
- [Instalação](#instalação)
- [Uso](#uso)
- [Contas Demo](#contas-demo)
- [Tecnologias](#tecnologias)
- [Roadmap](#roadmap)

## 🎯 Visão Geral

O **SchoolFlow** é uma solução web para gestão acadêmica de escolas, permitindo:

- **Revisão de aulas** fixas de segunda a sexta
- **Trabalhos futuros** adicionados por professores
- **Eventos escolares** globais e específicos
- **Controle de acesso** com login para professor, aluno e admin

## ✨ Funcionalidades

### Principais
- ✅ Calendário semanal (segunda a sexta)
- ✅ Cards de aulas fixas com detalhes
- ✅ Adição de trabalhos com data de entrega
- ✅ Eventos futuros com data, horário e local
- ✅ Tela de login com três perfis (aluno, professor, admin)
- ✅ Modo claro e escuro
- ✅ Interface responsiva

### Extras
- 🔔 Notificações de trabalhos próximos do vencimento
- 📄 Exportação de trabalhos (planejado)
- 💬 Comentários em trabalhos (planejado)
- ✅ Status de conclusão de trabalhos (planejado)

## 🏗️ Arquitetura

```
Frontend: HTML + CSS (Tailwind-like) + JavaScript (Vanilla)
Backend: Node.js + Express (planejado)
Banco de Dados: PostgreSQL (planejado)
Autenticação: JWT + Refresh Token (planejado)
Deploy: Docker + Docker Compose (planejado)
```

## 📊 Modelos de Dados

### User
```
id: integer (PK)
name: string
email: string (unique)
password_hash: string
role: enum [professor | aluno | admin]
created_at: timestamp
```

### Class (Aula)
```
id: integer (PK)
name: string
description: text
day_of_week: integer (1-5, Segunda a Sexta)
time_start: time
time_end: time
room: string
teacher_id: integer (FK -> User)
```

### Assignment (Trabalho)
```
id: integer (PK)
title: string
description: text
due_date: date
class_id: integer (FK -> Class)
teacher_id: integer (FK -> User)
created_at: timestamp
```

### Event
```
id: integer (PK)
title: string
description: text
date: date
time_start: time
time_end: time
location: string
class_id: integer (FK -> Class, nullable)
is_global: boolean
```

### Enrollment (Matrícula)
```
id: integer (PK)
student_id: integer (FK -> User)
class_id: integer (FK -> Class)
created_at: timestamp
```

## 📁 Estrutura de Pastas

```
schoolflow/
├── index.html                    # Redirect to login
├── README.md
├── pages/
│   ├── login.html               # Tela de login
│   ├── dashboard.html           # Dashboard principal
│   ├── assignments.html         # Lista de trabalhos
│   ├── events.html              # Lista de eventos
│   └── admin.html               # Painel administrativo
├── assets/
│   ├── css/
│   │   └── style.css            # Estilos globais
│   └── js/
│       ├── data.js              # Dados mockados
│       └── app.js               # Lógica da aplicação
└── docker-compose.yml          # (planejado)
```

## 🖥️ Telas e Componentes

### Login
- Email e senha
- Selector de role (aluno, professor, admin)
- Toggle dark/light

### Dashboard (Professor)
- Calendário semanal com aulas fixas
- Cards de aulas com detalhes
- Lista de trabalhos recentes
- Lista de eventos futuros
- Botões para adicionar novos itens

### Dashboard (Aluno)
- Calendário semanal com aulas matriculadas
- Trabalhos com data de entrega
- Eventos relevantes
- Visualização apenas de dados

### Dashboard (Admin)
- Gestão de usuários (CRUD)
- Gestão de turmas (CRUD)
- Matrículas em massa
- Relatórios básicos

### Componentes UI
- `Calendar` - Week view, scroll horizontal
- `ClassCard` - Hover effects, gradient
- `AssignmentForm` - Modal com formulário
- `EventModal` - Detalhes do evento
- `ThemeToggle` - Animação sol/lua
- `UserAvatar` - Dropdown com logout

## 🔌 API Endpoints

### Auth
```
POST /auth/login        - Login com credenciais
POST /auth/refresh      - Renovar token
POST /auth/logout       - Logout
```

### Users
```
GET  /users/profile     - Obter perfil do usuário
PUT  /users/profile     - Atualizar perfil
GET  /users             - Listar usuários (admin)
DELETE /users/:id       - Excluir usuário (admin)
```

### Classes
```
GET    /classes         - Listar aulas
GET    /classes/:id     - Obter aula específica
POST   /classes         - Criar aula (professor/admin)
PUT    /classes/:id     - Atualizar aula (professor/admin)
DELETE /classes/:id     - Excluir aula (professor/admin)
```

### Assignments
```
GET    /assignments     - Listar trabalhos
GET    /assignments/:id - Obter trabalho específico
POST   /assignments     - Criar trabalho (professor)
PUT    /assignments/:id - Atualizar trabalho (professor)
DELETE /assignments/:id - Excluir trabalho (professor)
```

### Events
```
GET    /events          - Listar eventos
GET    /events/:id      - Obter evento específico
POST   /events          - Criar evento (professor/admin)
PUT    /events/:id      - Atualizar evento (professor/admin)
DELETE /events/:id      - Excluir evento (professor/admin)
```

### Enrollments
```
POST   /enrollments     - Criar matrícula (admin)
DELETE /enrollments/:id - Excluir matrícula (admin)
GET    /enrollments/student/:id - Listar matrículas do aluno
```

## 🚀 Instalação

### Servidor Local (atualmente)
```bash
# Clone ou acesse a pasta
cd schoolflow

# Execute o servidor HTTP simples
npx serve

# Acesse em http://localhost:3000
```

### Docker (planejado)
```bash
docker-compose up --build
```

## 🎮 Uso

### Acesso Rápido
1. Acesse http://localhost:3000
2. Use as credenciais demo abaixo
3. Navegue pelo dashboard

### Funcionalidades por Role

#### Professor
- Ver todas as aulas da semana
- Adicionar/editar trabalhos
- Adicionar eventos
- Visualizar matrículas

#### Aluno
- Ver aulas matriculadas
- Ver trabalhos com prazos
- Ver eventos relevantes

#### Admin
- Gerenciar usuários
- Gerenciar turmas
- Criar matrículas
- Acesso a todos os dados

## 🆔 Contas Demo

| Role      | Email               | Senha     |
|-----------|---------------------|-----------|
| Aluno     | carlos@aluno.com    | aluno123  |
| Professor | ana@professor.com   | prof123   |
| Admin     | admin@escola.com    | admin123  |

## 💻 Tecnologias

### Atuais (MVP)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

### Futuras
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-3178C6?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

## 🗺️ Roadmap

- [x] MVP com dados mockados
- [x] Sistema de login
- [x] Dashboard responsivo
- [x] Tema claro/escuro
- [ ] Integração com backend (Node.js)
- [ ] Conexão com PostgreSQL
- [ ] API REST completa
- [ ] Autenticação JWT
- [ ] Docker deployment
- [ ] Notificações push
- [ ] Exportação PDF
- [ ] Comentários em trabalhos
- [ ] Status de conclusão
- [ ] App mobile (PWA)

## 📄 Licença

Este projeto está sob licença MIT.

---

Desenvolvido com ❤️ para escolas modernas.
