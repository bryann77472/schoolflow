# SchoolFlow

<p>
  <img src="assets/favicon.svg" width="56" height="56" alt="Logo do SchoolFlow" align="left" style="margin-right:14px">
  <strong>Sua escola em flow.</strong><br>
  Uma interface moderna para organizar aulas, trabalhos e eventos — feita com HTML, CSS e JavaScript puro, sem build e sem backend.
</p>

<br clear="left">

## Índice

- [Visão geral](#visão-geral)
- [Destaques da interface](#destaques-da-interface)
- [Mecânicas interativas](#mecânicas-interativas)
- [Conta e onboarding](#conta-e-onboarding)
- [Perfis e permissões](#perfis-e-permissões)
- [Atalhos de teclado](#atalhos-de-teclado)
- [Arquitetura](#arquitetura)
- [Modelo de dados](#modelo-de-dados)
- [Persistência](#persistência)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Como executar](#como-executar)
- [Contas demo](#contas-demo)
- [Design system](#design-system)
- [Limitações e próximos passos](#limitações-e-próximos-passos)
- [Licença](#licença)

## Visão geral

O **SchoolFlow** é um organizador escolar para estudantes do **Ensino Fundamental II** (6º ao 9º ano) e do **Ensino Médio** (1º ao 3º ano), além de professores e administradores. A aplicação reúne, em uma única experiência:

- criação de conta de aluno e um onboarding guiado pelos recursos;
- a grade semanal de aulas adaptada à etapa e ao ano do estudante;
- o acompanhamento de trabalhos por status, prioridade e prazo;
- o calendário mensal de eventos com confirmação de presença;
- ferramentas de produtividade, como modo foco com duração personalizada e paleta de comandos;
- um painel administrativo com gestão de usuários, turmas e matrículas;
- uma área **Opções** para personalizar perfil, aparência e layout.

Tudo funciona no navegador com dados de demonstração persistidos em `localStorage`. O projeto não exige instalação de dependências, framework ou etapa de compilação.

## Destaques da interface

- **Shell de aplicação** com sidebar retrátil, alça visível para expandir quando recolhida, topbar, breadcrumb, menu mobile e atalhos rápidos.
- **Layout configurável**: sidebar à esquerda ou à direita e topbar no topo ou na parte de baixo; no celular, a topbar permanece no topo e a sidebar vira drawer.
- **Conta de aluno** com escolha de etapa/ano, matrícula automática nas turmas da etapa e onboarding em quatro passos.
- **Tema claro, escuro ou automático** (segue o sistema), com cinco cores de destaque: índigo, esmeralda, rosa, âmbar e céu.
- **Quatro níveis de intensidade de cor** e **nove temas prontos** que combinam tema, acento e vibração em um clique.
- **Densidade confortável ou compacta** e opção de reduzir animações.
- **Tipografia editorial** com Inter para leitura e Space Grotesk para títulos.
- **Componentes ricos**: cards com métricas, gráficos de barras, donut chart, chips de turma, pills de prioridade, avatares, splash de entrada e toasts.
- **Layout responsivo** para desktop, tablet e celular, incluindo drawer de navegação e calendário adaptado.
- **Estados vazios, confirmações e feedback visual** em todas as ações destrutivas.

## Mecânicas interativas

### Paleta de comandos

Abra com `Ctrl+K` (Windows/Linux) ou `⌘K` (macOS). A paleta pesquisa páginas, ações e preferências, com navegação por setas e execução por `Enter`.

### Central de notificações

O sino da topbar reúne prazos próximos, trabalhos atrasados e eventos futuros. É possível marcar tudo como lido; o estado é persistido entre sessões.

### Quick add

O botão `+` da topbar abre um menu para criar trabalho, evento, usuário (admin) ou iniciar uma sessão de foco sem sair da página atual.

### Modo foco (Pomodoro)

Timer com presets de **25, 50 e 5 minutos** e **duração personalizada de 1 minuto a 12 horas**, em minutos ou horas. O mostrador passa a usar `H:MM:SS` quando necessário. Há play/pause, reinício e vínculo opcional com um trabalho. Ao concluir, a sessão é registrada no histórico de foco e contada em `focusSessions`, alimentando a sequência de dias e o gráfico semanal do dashboard.

### Board Kanban

Os trabalhos podem ser organizados em **A fazer**, **Em andamento**, **Em revisão** e **Concluído**. Arraste os cards entre colunas; ao concluir, há confete e atualização imediata dos contadores. A visualização em lista oferece filtros por status, turma, prioridade e busca textual.

### Calendário e RSVP

Calendário mensal navegável com eventos por categoria. Selecione um dia para ver a agenda, abra os detalhes e confirme ou cancele presença. A lista de confirmados aparece no modal e no dashboard.

### Administração

Painel com abas de visão geral, usuários, turmas e matrículas. Inclui indicadores, gráficos, busca de usuários, CRUD completo e matrícula/desmatrícula de alunos. Ações sensíveis pedem confirmação em um modal empilhado sobre o conteúdo atual.

### Opções, aparência e temas prontos

A área **Opções** é organizada em quatro abas:

- **Aparência**: tema, cor de destaque, intensidade de cor, densidade e redução de movimento.
- **Perfil**: nome, etapa de ensino, ano/série e cor do avatar. Alterar a etapa sincroniza automaticamente as matrículas do aluno com as turmas da nova etapa.
- **Layout**: sidebar à esquerda ou à direita, topbar no topo ou na parte de baixo, menu recolhido, modo compacto e redução de animações.
- **Dados**: rever o onboarding e restaurar a demonstração.

Quando o menu é recolhido, uma alça flutuante aparece na borda da sidebar para expandi-la novamente. No celular, a topbar continua no topo e a sidebar abre como drawer com os rótulos visíveis.

A intensidade de cor possui quatro níveis:

- **Super vibrante**: cores intensas, gradientes marcantes e navegação multicolorida.
- **Menos vibrante**: a mesma paleta, com menos saturação e contraste.
- **Normal**: cor na medida, sem gradientes dominantes.
- **Clássico (o antes)**: o visual original, mais neutro.

Os **temas prontos** aplicam uma combinação de tema, acento e intensidade:

| Tema | Aparência |
|---|---|
| **Aurora** | Claro, índigo, super vibrante. |
| **Oceano** | Claro, céu, menos vibrante. |
| **Floresta** | Claro, esmeralda, normal. |
| **Neon** | Escuro, rosa, super vibrante. |
| **Nebulosa** | Escuro, céu, super vibrante. |
| **Pôr do sol** | Escuro, âmbar, menos vibrante. |
| **Floresta noturna** | Escuro, esmeralda, menos vibrante. |
| **Meia-noite** | Escuro, índigo, normal. |
| **Clássico** | Segue o sistema, índigo, clássico. |

O cartão do preset fica ativo apenas enquanto a combinação atual corresponder a ele; alterações manuais de tema, acento ou intensidade atualizam o estado na hora. A tela de login mantém o visual original, enquanto a camada colorida é aplicada apenas às páginas internas. A criação de conta reaproveita o painel de autenticação, com formulário próprio para nome, email, etapa, ano/série e senha.

### Feedback e segurança de interface

- Toasts para sucesso, aviso, erro e informação.
- Modais com foco preso ao diálogo e empilhamento correto para confirmações aninhadas.
- `Esc` fecha a camada ativa (paleta, foco, modal ou popover).
- Atalhos desativados na tela de login para evitar ações sem sessão.
- Preferência de tema aplicada antes do primeiro paint, evitando flash de tema incorreto.

## Conta e onboarding

A tela de login oferece **criação de conta apenas para alunos**. O formulário pede nome, email, etapa de ensino, ano/série, senha e confirmação. A etapa padrão é **Ensino Fundamental II**, com **8º ano** selecionado; o aluno pode escolher qualquer ano do Fundamental II ou do Ensino Médio.

Ao criar a conta:

- o aluno é matriculado automaticamente em **todas as turmas da etapa escolhida** (6 turmas no Fundamental II ou 7 no Ensino Médio);
- a sessão é iniciada e o dashboard é aberto;
- um onboarding de quatro passos apresenta visão geral, trabalhos, eventos e modo foco;
- a conclusão (ou o fechamento) do onboarding é persistida em `onboardingDone`, e a apresentação não volta a abrir sozinha.

O onboarding pode ser revisto em **Opções → Dados → Rever onboarding**. Contas de professor e administrador continuam sendo criadas pelo painel administrativo ou pelos dados demo.

## Perfis e permissões

| Perfil | O que enxerga e pode fazer |
|---|---|
| **Aluno** | Aulas das turmas da sua etapa em que está matriculado, trabalhos dessas aulas, eventos globais e RSVP. |
| **Professor** | Aulas que leciona, trabalhos dessas aulas ou criados por ele, eventos e RSVP. |
| **Administrador** | Todos os dados, painel administrativo, CRUD de usuários/turmas e matrículas. |

Alunos têm `stage` (`fundamental` ou `medio`) e `grade` (6º–9º ano ou 1º–3º ano). As turmas também pertencem a uma etapa, e o dashboard, os chips e os textos usam essa informação. As consultas com escopo por perfil ficam em `assets/js/data.js` (`getScopedClasses`, `getScopedAssignments`, `getScopedEvents`).

## Atalhos de teclado

| Atalho | Ação |
|---|---|
| `Ctrl+K` / `⌘K` | Abrir busca e comandos |
| `N` | Novo trabalho |
| `E` | Novo evento |
| `F` | Modo foco |
| `T` | Alternar tema claro/escuro |
| `?` | Ver todos os atalhos |
| `Esc` | Fechar a camada ativa |
| `Espaço` | Play/pause no modo foco |

Os atalhos de letra são ignorados enquanto o usuário digita em campos de formulário.

## Arquitetura

Aplicação **multi-página em HTML estático**, com JavaScript vanilla organizado em quatro camadas:

```
data.js   → dados demo por etapa, estado, persistência, cadastro, matrículas e utilitários
icons.js  → biblioteca de ícones SVG inline e hydrateIcons()
core.js   → shell, opções, onboarding, layout, tema, modais, paleta, foco e atalhos
pages.js  → login/cadastro, renderização e eventos específicos de cada página
```

Cada página de aplicação é um shell mínimo com `data-page`, containers de sidebar/topbar e a âncora `#page`. O `core.js` monta o shell no `DOMContentLoaded`; o `pages.js` renderiza o conteúdo da página. O `index.html` apenas aplica o tema salvo e redireciona para o dashboard ou login.

Não há dependências de runtime além das fontes do Google. Os ícones são SVGs inline, sem biblioteca externa.

## Modelo de dados

O estado principal é um objeto com as coleções:

| Coleção | Conteúdo |
|---|---|
| `users` | id, nome, email, senha demo, perfil (`aluno`, `professor`, `admin`), etapa/ano, área, cor do avatar e estado do onboarding. |
| `classes` | nome, descrição, etapa (`fundamental`/`medio`), dia da semana, horário, sala, professor e cor. |
| `assignments` | título, descrição, prazo, turma, professor, status e prioridade. |
| `events` | título, descrição, data, horário, local, categoria, turma e lista de confirmados. |
| `enrollments` | vínculo aluno ↔ turma, sincronizado por etapa ao criar ou editar um aluno. |
| `focusLog` | minutos de foco por data (ISO). |
| `focusSessions` | quantidade de sessões de foco concluídas por data (ISO), inclusive sessões personalizadas. |
| `readNotifications` | ids de notificações já lidas. |

As datas de demonstração são geradas em relação ao dia atual, então prazos e eventos permanecem coerentes ao abrir o projeto em qualquer data.

## Persistência

| Chave | Uso |
|---|---|
| `schoolflow.data.v4` | Usuários, turmas, trabalhos, eventos, matrículas, foco, sessões e notificações lidas. |
| `schoolflow.session.v1` | Sessão ativa (id, nome, email, perfil, etapa/ano e área). |
| `schoolflow.prefs.v1` | Tema, cor de destaque, intensidade de cor, densidade, animações, sidebar recolhida, posição da sidebar/topbar, aba de opções, visão de tarefas, aba admin e filtro do calendário. |
| `loggedUser` | Espelho legado da sessão, mantido para compatibilidade. |

Na primeira execução sem dados salvos, o estado demo é gravado em `schoolflow.data.v4`. Dados antigos de `schoolflow.data.v3` são ignorados; não há migração automática. Para voltar ao estado original, use **Opções → Dados → Restaurar demonstração**. Isso remove os dados salvos e encerra a sessão.

## Estrutura de pastas

```
schoolflow/
├── index.html                  # Splash + redirecionamento por sessão
├── README.md
├── pages/
│   ├── login.html              # Autenticação, criação de conta e escolha de perfil demo
│   ├── dashboard.html          # Visão geral, semana, foco e próximos itens
│   ├── assignments.html        # Board Kanban / lista de trabalhos
│   ├── events.html             # Calendário mensal + agenda
│   └── admin.html              # Painel administrativo
└── assets/
    ├── favicon.svg
    ├── css/
    │   └── style.css           # Design system, componentes e responsividade
    └── js/
        ├── data.js             # Estado, dados demo, persistência e utilitários
        ├── icons.js            # Ícones SVG inline
        ├── core.js             # Shell, tema, modais, paleta, foco e atalhos
        └── pages.js            # Renderização e interações das páginas
```

## Como executar

Por ser um projeto estático, basta servir a pasta raiz com qualquer servidor HTTP:

```bash
# Opção 1 — Python
python -m http.server 4173

# Opção 2 — Node
npx serve .
```

Depois acesse **http://localhost:4173**. O `index.html` redireciona automaticamente para o dashboard (com sessão) ou para o login.

> Abrir os arquivos diretamente via `file://` pode bloquear recursos e o `localStorage` em alguns navegadores. Prefira um servidor local.

As fontes são carregadas do Google Fonts; sem internet, o navegador usa as fontes de fallback do sistema.

## Contas demo

| Perfil | Etapa | Email | Senha |
|---|---|---|---|
| Aluno | Ensino Médio — 2º ano | `carlos@aluno.com` | `aluno123` |
| Professor | — | `ana@professor.com` | `prof123` |
| Administrador | — | `admin@escola.com` | `admin123` |

A tela de login permite preencher as credenciais com um clique. Também existem contas adicionais em `assets/js/data.js` para testes de matrícula e gestão, incluindo alunos do Fundamental II e professores das três áreas.

## Design system

- **Cores**: variáveis CSS para superfícies, texto, bordas, estados e cinco acentos. O tema escuro redefine a paleta sem duplicar componentes. A camada vibrante é ativada por `data-vibrancy` e usa tokens próprios para as cores de apoio.
- **Aparência**: `data-vibrancy` controla a intensidade (`super`, `soft`, `normal` ou `classic`); os temas prontos apenas combinam preferências existentes, sem CSS específico por preset.
- **Layout**: `data-sidebar-position` e `data-topbar-position` no `<html>` alternam sidebar esquerda/direita e topbar topo/baixo. No mobile, as regras de breakpoint mantêm a topbar no topo e transformam a sidebar em drawer.
- **Etapas**: `SCHOOL_STAGES` centraliza rótulos e anos do Fundamental II e do Ensino Médio; turmas e alunos compartilham o mesmo identificador de etapa.
- **Tipografia**: Inter (corpo) e Space Grotesk (títulos e números de destaque).
- **Espaçamento**: escala consistente, com modo compacto controlado por `data-density`.
- **Movimento**: animações de entrada, hover, drag, confete e transições; `data-motion="reduced"` reduz o movimento e respeita `prefers-reduced-motion`.
- **Acessibilidade**: foco visível, rótulos ARIA nos controles, navegação por teclado, contraste nos dois temas e diálogos com foco contido.
- **Responsividade**: breakpoints para sidebar fixa, drawer mobile, grids fluidos, formulários de cadastro/opções e calendário compacto.

## Limitações e próximos passos

Este projeto é um **front-end demonstrativo**. Não há servidor, autenticação real, criptografia de senhas ou sincronização entre dispositivos. A criação de conta, a sessão e o onboarding ficam apenas no `localStorage` do navegador atual; contas de professor e administrador são criadas pelo painel demo.

Roadmap sugerido:

- [x] Interface multi-página com shell unificado
- [x] Temas claro/escuro/sistema e cinco acentos
- [x] Paleta de comandos, modo foco, notificações e toasts
- [x] Board Kanban com drag and drop
- [x] Calendário mensal com RSVP
- [x] Painel administrativo com CRUD e matrículas
- [x] Criação de conta de aluno e onboarding guiado
- [x] Adaptação para Ensino Fundamental II e Ensino Médio
- [x] Modo foco com duração personalizada de 1 minuto a 12 horas
- [x] Opções com perfil, aparência, layout e dados
- [ ] Backend e API REST
- [ ] Autenticação real (JWT/sessão segura)
- [ ] Banco de dados relacional
- [ ] Sincronização em tempo real
- [ ] Exportação de trabalhos/calendário
- [ ] Comentários e anexos em trabalhos
- [ ] PWA com notificações push
- [ ] Testes automatizados de interface

## Licença

Distribuído sob a licença MIT.

---

Feito para escolas que querem menos correria e mais aprendizado.
