// SchoolFlow — páginas e interações
// ---------------------------------------------------------------------------

const pageState = {
  weekDay: null,
  taskStatus: 'all',
  taskSearch: '',
  taskClass: 'all',
  taskPriority: 'all',
  taskDue: 'all',
  calendarMonth: null,
  calendarSelected: null,
  adminUserQuery: ''
};

function refreshCurrentPage() {
  const page = currentPage();
  if (page === 'dashboard') initDashboard();
  else if (page === 'assignments') initAssignments();
  else if (page === 'events') initEvents();
  else if (page === 'admin') initAdmin();
  updateShellBadges();
}

function classChip(classId) {
  const cls = getClassById(classId);
  const tone = cls?.color || '#6366f1';
  return `<span class="class-chip" style="--tone:${tone}"><span class="dot"></span>${utils.escapeHTML(cls?.name || 'Sem aula')}</span>`;
}

function priorityPill(priority) {
  const meta = PRIORITIES[priority] || PRIORITIES.medium;
  return `<span class="priority-pill" style="--tone:${meta.color}"><span class="dot"></span>${meta.label}</span>`;
}

function dueChip(assignment) {
  const meta = utils.dueMeta(assignment.due_date, assignment.status);
  const iconName = meta.tone === 'danger' ? 'alert-circle' : meta.tone === 'success' ? 'check-circle' : 'clock';
  return `<span class="board-due ${meta.tone}">${icon(iconName, 11)} ${utils.escapeHTML(meta.label)}</span>`;
}

function eventTone(event) {
  return EVENT_CATEGORIES[event.category]?.color || '#6366f1';
}

function eventCategoryBadge(event) {
  const cat = EVENT_CATEGORIES[event.category] || EVENT_CATEGORIES.academic;
  return `<span class="badge" style="background:color-mix(in srgb, ${cat.color} 12%, transparent);color:${cat.color}">${icon(cat.icon, 11)} ${cat.label}</span>`;
}

function avatarHTML(name, className = '', user = null) {
  return `<span class="avatar ${className}"${user ? avatarToneStyle(user) : ''}>${utils.initials(name)}</span>`;
}

function minutesFromTime(time) {
  const [h, m] = String(time || '00:00').split(':').map(Number);
  return h * 60 + m;
}

function isClassNow(cls) {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  return current >= minutesFromTime(cls.time_start) && current <= minutesFromTime(cls.time_end);
}

function isClassNext(cls) {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  return current < minutesFromTime(cls.time_start);
}

// ---------------------------------------------------------------------------
// Dashboard

function initDashboard() {
  const user = state.currentUser;
  if (!user) return;
  const page = document.getElementById('page');
  if (!page) return;

  const classes = getScopedClasses(user);
  const todayClasses = getTodayClasses(user).sort((a, b) => a.time_start.localeCompare(b.time_start));
  const pending = getPendingAssignments(user);
  const assignments = getScopedAssignments(user);
  const doneCount = assignments.filter((a) => a.status === 'done').length;
  const completion = assignments.length ? Math.round((doneCount / assignments.length) * 100) : 0;
  const upcoming = getUpcomingEvents(user, 3);
  const nextEvent = upcoming[0];
  const today = new Date();
  const weekFocus = getWeekFocus();
  const todayMinutes = state.focusLog[utils.toISO(today)] || 0;
  const todaySessions = getFocusSessionCount(today);
  const weekTotal = weekFocus.reduce((sum, day) => sum + day.minutes, 0);
  const urgent = pending.filter((a) => utils.daysUntil(a.due_date) <= 2).length;
  const todayLabel = today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const firstName = getFirstName(user.name);
  const nextClass = todayClasses.find((c) => isClassNext(c));

  if (pageState.weekDay === null) {
    const day = today.getDay();
    pageState.weekDay = day >= 1 && day <= 5 ? day : 1;
  }

  page.innerHTML = `
    <section class="hero anim-up">
      <div class="hero-content">
        <div class="hero-eyebrow"><span class="dot"></span> ${utils.escapeHTML(todayLabel)}</div>
        <h1>${getGreeting()}, ${utils.escapeHTML(firstName)} <span class="wave">👋</span></h1>
        <p>${todayClasses.length ? `Seu dia tem ${utils.plural(todayClasses.length, 'aula', 'aulas')}${nextClass ? ` e a próxima começa às ${nextClass.time_start}` : ''}.` : 'Hoje não há aulas no seu cronograma.'} ${pending.length ? `Você tem ${utils.plural(pending.length, 'trabalho em aberto', 'trabalhos em aberto')}${urgent ? `, ${urgent} com prazo curto` : ''}.` : 'Tudo em dia com os trabalhos.'}</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="assignments.html">${icon('clipboard-list', 17)} Ver trabalhos</a>
          ${canEditData()
            ? `<button class="btn btn-hero-ghost" data-action="new-task">${icon('plus', 17)} Nova tarefa</button>`
            : `<button class="btn btn-hero-ghost" data-action="guest-signup">${icon('user-plus', 17)} Criar conta</button>`}
          <button class="btn btn-hero-ghost" data-action="open-focus">${icon('timer', 17)} Foco</button>
        </div>
      </div>
      <div class="hero-side">
        <div class="hero-mini">
          <div class="hm-icon">${icon('flame', 17)}</div>
          <div><strong>${getFocusStreak()} dias</strong><span>sequência de foco</span></div>
        </div>
        <div class="hero-mini">
          <div class="hm-icon">${icon('target', 17)}</div>
          <div><strong>${completion}%</strong><span>trabalhos concluídos</span></div>
        </div>
      </div>
    </section>

    <section class="stat-grid">
      <article class="stat-card" style="--tone:#4f46e5">
        <div class="stat-top">
          <div class="stat-icon">${icon('book-open', 18)}</div>
          <span class="stat-trend neutral">${todayClasses.length ? 'hoje' : 'livre'}</span>
        </div>
        <div class="stat-value">${todayClasses.length}<small>${todayClasses.length === 1 ? 'aula' : 'aulas'}</small></div>
        <div class="stat-label">Na sua rotina de hoje</div>
        <div class="stat-foot">${icon('clock', 12)} ${nextClass ? `Próxima às ${nextClass.time_start}` : todayClasses.length ? 'Última aula do dia' : 'Sem aulas programadas'}</div>
      </article>

      <article class="stat-card" style="--tone:#f97316">
        <div class="stat-top">
          <div class="stat-icon">${icon('clipboard-list', 18)}</div>
          <span class="stat-trend ${urgent ? 'down' : 'neutral'}">${urgent ? `${urgent} urgente${urgent > 1 ? 's' : ''}` : 'em dia'}</span>
        </div>
        <div class="stat-value">${pending.length}<small>${pending.length === 1 ? 'tarefa' : 'tarefas'}</small></div>
        <div class="stat-label">Trabalhos em aberto</div>
        <div class="stat-foot">${icon('check-circle', 12)} ${doneCount} concluídos de ${assignments.length}</div>
      </article>

      <article class="stat-card" style="--tone:#06b6d4">
        <div class="stat-top">
          <div class="stat-icon">${icon('calendar-days', 18)}</div>
          <span class="stat-trend neutral">${nextEvent ? utils.daysUntil(nextEvent.date) === 0 ? 'hoje' : `em ${utils.daysUntil(nextEvent.date)}d` : 'sem data'}</span>
        </div>
        <div class="stat-value">${nextEvent ? utils.formatDateShort(nextEvent.date) : '—'}</div>
        <div class="stat-label">${nextEvent ? utils.escapeHTML(nextEvent.title) : 'Nenhum evento próximo'}</div>
        <div class="stat-foot">${icon('map-pin', 12)} ${nextEvent ? utils.escapeHTML(nextEvent.location) : 'Aproveite o dia'}</div>
      </article>

      <article class="stat-card" style="--tone:#ec4899">
        <div class="stat-top">
          <div class="stat-icon">${icon('trending-up', 18)}</div>
          <span class="stat-trend">${completion >= 50 ? 'no ritmo' : 'acelerar'}</span>
        </div>
        <div class="stat-value">${completion}<small>%</small></div>
        <div class="stat-label">Progresso nos trabalhos</div>
        <div class="stat-foot">${icon('timer', 12)} ${utils.minutesToLabel(todayMinutes)} de foco hoje</div>
      </article>
    </section>

    <div class="dashboard-grid">
      <div class="dash-col">
        <section class="panel anim-up delay-1" style="--panel-tone:#06b6d4">
          <div class="panel-head">
            <div><h2>${icon('clock', 18)} Sua rotina de hoje</h2><div class="panel-sub">${utils.escapeHTML(todayLabel)}</div></div>
            <a class="panel-link" href="events.html">Calendário ${icon('arrow-right', 13)}</a>
          </div>
          ${todayClasses.length ? `
          <div class="today-list">
            ${todayClasses.map((cls) => `
              <div class="today-item ${isClassNow(cls) ? 'current' : ''}" style="--tone:${cls.color}" data-action="open-class" data-id="${cls.id}">
                <div class="today-time"><strong>${cls.time_start}</strong><span>${cls.time_end}</span></div>
                <div class="today-rail"><span class="today-dot"></span></div>
                <div class="today-card">
                  <div class="today-card-top">
                    <h4>${utils.escapeHTML(cls.name)}</h4>
                    ${isClassNow(cls) ? `<span class="today-now"><span class="dot"></span> agora</span>` : isClassNext(cls) ? `<span class="badge badge-primary">próxima</span>` : ''}
                  </div>
                  <p>${icon('map-pin', 12)} ${utils.escapeHTML(cls.room)} <span>·</span> ${icon('user', 12)} ${utils.escapeHTML(getUserById(cls.teacher_id)?.name || 'Professor')}</p>
                </div>
              </div>`).join('')}
          </div>` : `
          <div class="today-empty">
            <div class="empty-icon">${icon('coffee', 20)}</div>
            <div><strong>Dia sem aulas</strong><span>Que tal adiantar um trabalho ou revisar conteúdos?</span></div>
          </div>`}
        </section>

        <section class="panel anim-up delay-2" style="--panel-tone:#8b5cf6">
          <div class="panel-head">
            <div><h2>${icon('calendar-days', 18)} Sua semana</h2><div class="panel-sub">Toque em um dia para ver a grade</div></div>
            <span class="badge badge-neutral">${utils.plural(classes.length, 'aula', 'aulas')} no total</span>
          </div>
          <div class="week-strip">
            ${utils.getWeekdays().map((date) => {
              const dayNum = date.getDay();
              const count = classes.filter((c) => c.day_of_week === dayNum).length;
              const isToday = utils.sameDay(date, today);
              return `
                <button class="week-day-btn ${pageState.weekDay === dayNum ? 'active' : ''} ${isToday ? 'today' : ''}" data-action="select-week-day" data-day="${dayNum}">
                  <span class="wd-name">${utils.getDayShort(dayNum)}</span>
                  <span class="wd-num">${date.getDate()}</span>
                  <span class="wd-dots">${Array.from({ length: Math.min(count, 3) }, () => '<i></i>').join('')}</span>
                </button>`;
            }).join('')}
          </div>
          <div class="week-day-list">
            ${(() => {
              const dayClasses = classes.filter((c) => c.day_of_week === pageState.weekDay).sort((a, b) => a.time_start.localeCompare(b.time_start));
              if (!dayClasses.length) return `<div class="week-empty">Nenhuma aula neste dia. Bom momento para revisar.</div>`;
              return dayClasses.map((cls) => `
                <div class="week-class-row" style="--tone:${cls.color}" data-action="open-class" data-id="${cls.id}">
                  <span class="week-class-time">${cls.time_start}–${cls.time_end}</span>
                  <h5>${utils.escapeHTML(cls.name)}</h5>
                  <span>${utils.escapeHTML(cls.room)}</span>
                  ${icon('chevron-right', 14)}
                </div>`).join('');
            })()}
          </div>
        </section>

        <section class="panel anim-up delay-3" style="--panel-tone:#f97316">
          <div class="panel-head">
            <div><h2>${icon('clipboard-list', 18)} Trabalhos em foco</h2><div class="panel-sub">Os prazos mais próximos primeiro</div></div>
            <a class="panel-link" href="assignments.html">Ver todos ${icon('arrow-right', 13)}</a>
          </div>
          ${pending.length ? `
          <div class="mini-task-list">
            ${pending.slice(0, 4).map((assignment) => {
              const meta = utils.dueMeta(assignment.due_date, assignment.status);
              return `
                <div class="mini-task" style="--tone:${getClassTone(assignment.class_id)}" data-action="open-task" data-id="${assignment.id}">
                  <button class="mini-check" data-action="complete-task" data-id="${assignment.id}" aria-label="Concluir ${utils.escapeHTML(assignment.title)}">${icon('check', 12)}</button>
                  <div class="mini-task-body">
                    <h5>${utils.escapeHTML(assignment.title)}</h5>
                    <div class="mini-task-meta">
                      ${classChip(assignment.class_id)}
                      <span class="due ${meta.tone}">${icon('clock', 11)} ${meta.label}</span>
                      ${priorityPill(assignment.priority)}
                    </div>
                  </div>
                </div>`;
            }).join('')}
          </div>` : `
          <div class="empty-state">
            <div class="empty-icon">${icon('check-check', 22)}</div>
            <h4>Tudo concluído por aqui</h4>
            <p>Você não tem trabalhos em aberto. Que tal criar uma nova tarefa de estudo?</p>
            <button class="btn btn-soft btn-sm" data-action="new-task">${icon('plus', 15)} Nova tarefa</button>
          </div>`}
        </section>
      </div>

      <aside class="dash-col">
        <section class="panel focus-panel anim-up delay-1" style="--panel-tone:#ec4899">
          <div class="panel-head">
            <div><h2>${icon('timer', 18)} Modo foco</h2><div class="panel-sub">Estude no seu ritmo</div></div>
            <button class="icon-btn" data-action="open-focus" title="Expandir">${icon('external-link', 16)}</button>
          </div>
          <div class="focus-ring-wrap">
            <svg class="focus-ring" viewBox="0 0 200 200" aria-hidden="true">
              <defs>
                <linearGradient id="focusGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="var(--grad-1)"/>
                  <stop offset="100%" stop-color="var(--grad-2)"/>
                </linearGradient>
              </defs>
              <circle class="track" cx="100" cy="100" r="86"/>
              <circle class="progress" data-timer-ring r="86" cx="100" cy="100"/>
            </svg>
            <div class="focus-center">
              <div class="focus-time" data-timer-time>${formatTimer(focusTimer.remaining)}</div>
              <div class="focus-state ${focusTimer.running ? 'running' : ''}" data-timer-state>${focusTimer.running ? 'Em foco' : focusTimer.mode}</div>
            </div>
          </div>
          <div class="focus-presets">
            ${[25, 50, 5].map((min) => `<button class="focus-preset ${focusTimer.total === min * 60 ? 'active' : ''}" data-action="timer-preset" data-minutes="${min}">${min === 5 ? 'Pausa 5' : `${min} min`}</button>`).join('')}
          </div>
          <button class="btn btn-soft btn-sm focus-custom-quick" data-action="open-focus-custom">${icon('sliders-horizontal', 14)} Duração personalizada</button>
          <div class="focus-controls">
            <button class="icon-btn solid" data-action="timer-reset" aria-label="Reiniciar">${icon('rotate-ccw', 16)}</button>
            <button class="btn btn-primary" data-action="timer-toggle">
              <span data-timer-toggle-icon>${icon(focusTimer.running ? 'pause' : 'play', 15)}</span>
              <span data-timer-toggle-label>${focusTimer.running ? 'Pausar' : 'Iniciar'}</span>
            </button>
            <button class="icon-btn solid" data-action="open-focus" aria-label="Expandir">${icon('external-link', 16)}</button>
          </div>
          <div class="focus-task">${icon('target', 13)} <span>Hoje: <strong data-focus-total>${utils.minutesToLabel(todayMinutes)}</strong> de foco · <strong data-focus-session-count>${todaySessions}</strong> <span data-focus-session-label>${todaySessions === 1 ? 'sessão' : 'sessões'}</span></span></div>
        </section>

        <section class="panel anim-up delay-2" style="--panel-tone:#ec4899">
          <div class="panel-head">
            <div><h2>${icon('calendar-days', 18)} Próximos eventos</h2><div class="panel-sub">Não perca nada</div></div>
            <a class="panel-link" href="events.html">Agenda ${icon('arrow-right', 13)}</a>
          </div>
          ${upcoming.length ? upcoming.map((event) => {
            const cat = EVENT_CATEGORIES[event.category] || EVENT_CATEGORIES.academic;
            return `
              <div class="event-row" style="--tone:${cat.color}" data-action="open-event" data-id="${event.id}">
                <div class="event-date-box">
                  <span class="ed-month">${utils.formatDateShort(event.date).split(' ')[1]}</span>
                  <span class="ed-day">${utils.parseISO(event.date).getDate()}</span>
                </div>
                <div class="event-row-copy">
                  <h5>${utils.escapeHTML(event.title)}</h5>
                  <p>${icon('clock', 11)} ${event.time_start}–${event.time_end} · ${icon('map-pin', 11)} ${utils.escapeHTML(event.location)}</p>
                </div>
                ${icon('chevron-right', 15)}
              </div>`;
          }).join('') : `<div class="empty-state" style="padding:22px 10px"><div class="empty-icon">${icon('calendar-plus', 20)}</div><h4>Agenda livre</h4><p>Nenhum evento nos próximos dias.</p></div>`}
        </section>

        <section class="panel anim-up delay-3" style="--panel-tone:#10b981">
          <div class="panel-head">
            <div><h2>${icon('bar-chart', 18)} Ritmo da semana</h2><div class="panel-sub">Minutos de foco por dia</div></div>
            <span class="badge badge-primary">${utils.minutesToLabel(weekTotal)}</span>
          </div>
          <div class="rhythm-chart">
            ${weekFocus.map((day) => {
              const max = Math.max(...weekFocus.map((d) => d.minutes), 25);
              const height = Math.max(6, Math.round((day.minutes / max) * 100));
              const isToday = utils.sameDay(day.date, today);
              return `
                <div class="rhythm-bar ${isToday ? 'today' : ''}" title="${day.date.toLocaleDateString('pt-BR')}: ${utils.minutesToLabel(day.minutes)}">
                  <div class="rhythm-bar-fill" style="height:${height}%"></div>
                  <span class="rhythm-bar-label">${utils.getDayShort(day.date.getDay())}</span>
                </div>`;
            }).join('')}
          </div>
          <div class="rhythm-foot"><span>${icon('flame', 12)} Sequência de <strong>${getFocusStreak()} dias</strong></span><span><strong>${Math.min(100, Math.round((weekTotal / 300) * 100))}%</strong> da meta</span></div>
        </section>

        <section class="panel tip-card anim-up delay-4" style="--panel-tone:#f59e0b">
          <div class="tip-icon">${icon('sparkles', 19)}</div>
          <h4>${pending.length ? 'Comece pelo mais difícil' : 'Hora de respirar'}</h4>
          <p>${pending.length ? `Você tem ${utils.plural(pending.length, 'trabalho em aberto', 'trabalhos em aberto')}. Que tal escolher o de maior prioridade e dedicar 25 minutos só a ele?` : 'Sua lista está limpa. Aproveite para revisar anotações ou descansar com qualidade.'}</p>
          <button class="btn btn-soft btn-sm" data-action="${pending.length ? 'open-focus' : 'new-task'}">${pending.length ? `${icon('timer', 15)} Iniciar foco` : `${icon('plus', 15)} Criar tarefa`}</button>
        </section>
      </aside>
    </div>`;
}

// ---------------------------------------------------------------------------
// Trabalhos

function initAssignments() {
  const user = state.currentUser;
  if (!user) return;
  const page = document.getElementById('page');
  if (!page) return;

  const tasks = getScopedAssignments(user);
  const classes = getScopedClasses(user);
  const pending = tasks.filter((t) => t.status !== 'done').length;
  const doing = tasks.filter((t) => t.status === 'doing').length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const overdue = tasks.filter((t) => t.status !== 'done' && utils.daysUntil(t.due_date) < 0).length;

  if (pageState.taskClass !== 'all' && !classes.some((c) => c.id === Number(pageState.taskClass))) {
    pageState.taskClass = 'all';
  }

  const statusTabs = [
    { id: 'all', label: 'Todas', count: tasks.length },
    { id: 'todo', label: 'A fazer', count: tasks.filter((t) => t.status === 'todo').length },
    { id: 'doing', label: 'Em andamento', count: doing },
    { id: 'review', label: 'Em revisão', count: tasks.filter((t) => t.status === 'review').length },
    { id: 'done', label: 'Concluídas', count: done }
  ];

  page.innerHTML = `
    <div class="page-head anim-up">
      <div>
        <div class="eyebrow">${icon('clipboard-list', 14)} organização</div>
        <h1>Trabalhos</h1>
        <p class="subtitle">${canEditData() ? 'Visualize prazos, mova tarefas entre etapas e mantenha o ritmo. Arraste os cards para atualizar o status.' : 'Explore os trabalhos da demonstração em modo somente leitura.'}</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="open-focus">${icon('timer', 16)} Modo foco</button>
        ${canEditData()
          ? `<button class="btn btn-primary" data-action="new-task">${icon('plus', 17)} Novo trabalho</button>`
          : `<button class="btn btn-primary" data-action="guest-signup">${icon('user-plus', 17)} Criar conta</button>`}
      </div>
    </div>

    <section class="task-stats anim-up delay-1">
      <div class="task-stat" style="--tone:#4f46e5">
        <div class="task-stat-icon">${icon('layers', 17)}</div>
        <div><strong>${tasks.length}</strong><span>total de trabalhos</span></div>
      </div>
      <div class="task-stat" style="--tone:#f97316">
        <div class="task-stat-icon">${icon('clock', 17)}</div>
        <div><strong>${pending}</strong><span>em aberto</span></div>
      </div>
      <div class="task-stat" style="--tone:#ec4899">
        <div class="task-stat-icon">${icon('zap', 17)}</div>
        <div><strong>${doing}</strong><span>em andamento</span></div>
      </div>
      <div class="task-stat" style="--tone:${overdue ? '#ef4444' : '#10b981'}">
        <div class="task-stat-icon">${icon(overdue ? 'alert-triangle' : 'check-circle', 17)}</div>
        <div><strong>${overdue || done}</strong><span>${overdue ? 'atrasadas' : 'concluídas'}</span></div>
      </div>
    </section>

    <section class="task-filter-bar anim-up delay-2" aria-label="Filtros avançados de trabalhos">
      <div class="task-filter-top">
        <div class="input-wrap task-search-wrap">
          ${icon('search', 16)}
          <input class="input" id="task-search" type="search" placeholder="Buscar por título, descrição ou turma…" value="${utils.escapeHTML(pageState.taskSearch)}">
        </div>
        <div class="segmented" aria-label="Modo de visualização">
          <button class="${prefs.taskView === 'board' ? 'active' : ''}" data-action="task-view" data-view="board">${icon('layout-grid', 15)} Board</button>
          <button class="${prefs.taskView === 'list' ? 'active' : ''}" data-action="task-view" data-view="list">${icon('list', 15)} Lista</button>
        </div>
      </div>
      <div class="task-filter-grid">
        <label class="filter-field">
          <span>Turma</span>
          <select class="select" id="task-class-filter">
            <option value="all">Todas as turmas</option>
            ${classes.map((cls) => `<option value="${cls.id}" ${String(pageState.taskClass) === String(cls.id) ? 'selected' : ''}>${utils.escapeHTML(cls.name)}</option>`).join('')}
          </select>
        </label>
        <label class="filter-field">
          <span>Prioridade</span>
          <select class="select" id="task-priority-filter">
            <option value="all">Toda prioridade</option>
            <option value="high" ${pageState.taskPriority === 'high' ? 'selected' : ''}>Alta</option>
            <option value="medium" ${pageState.taskPriority === 'medium' ? 'selected' : ''}>Média</option>
            <option value="low" ${pageState.taskPriority === 'low' ? 'selected' : ''}>Baixa</option>
          </select>
        </label>
        <label class="filter-field">
          <span>Status</span>
          <select class="select" id="task-status-filter">
            ${statusTabs.map((tab) => `<option value="${tab.id}" ${pageState.taskStatus === tab.id ? 'selected' : ''}>${tab.label}</option>`).join('')}
          </select>
        </label>
        <label class="filter-field">
          <span>Prazo</span>
          <select class="select" id="task-due-filter">
            <option value="all" ${pageState.taskDue === 'all' ? 'selected' : ''}>Todos os prazos</option>
            <option value="overdue" ${pageState.taskDue === 'overdue' ? 'selected' : ''}>Atrasados</option>
            <option value="today" ${pageState.taskDue === 'today' ? 'selected' : ''}>Vence hoje</option>
            <option value="week" ${pageState.taskDue === 'week' ? 'selected' : ''}>Próximos 7 dias</option>
            <option value="month" ${pageState.taskDue === 'month' ? 'selected' : ''}>Próximos 30 dias</option>
          </select>
        </label>
      </div>
      <div class="task-filter-actions">
        <span class="task-filter-summary">${getFilteredTasks().length} de ${tasks.length} trabalhos</span>
        <div class="spacer"></div>
        <button class="btn btn-ghost btn-sm" data-action="clear-task-filters">${icon('rotate-ccw', 14)} Limpar filtros</button>
      </div>
    </section>

    <div class="toolbar anim-up delay-2" style="margin-top:-6px">
      <div class="status-tabs">
        ${statusTabs.map((tab) => `
          <button class="status-tab ${pageState.taskStatus === tab.id ? 'active' : ''}" data-action="task-filter" data-status="${tab.id}">
            ${tab.label} <span class="count">${tab.count}</span>
          </button>`).join('')}
      </div>
      <div class="spacer"></div>
      <span class="muted" style="font-size:.68rem">${canEditData() ? `${icon('grip-vertical', 13)} arraste os cards` : `${icon('eye', 13)} modo somente leitura`}</span>
    </div>

    <div id="task-view" class="anim-up delay-3"></div>`;

  renderTaskView();
  bindBoardDnD();
}

function getFilteredTasks() {
  let tasks = getScopedAssignments();
  if (pageState.taskStatus !== 'all') tasks = tasks.filter((t) => t.status === pageState.taskStatus);
  if (pageState.taskClass !== 'all') tasks = tasks.filter((t) => t.class_id === Number(pageState.taskClass));
  if (pageState.taskPriority !== 'all') tasks = tasks.filter((t) => t.priority === pageState.taskPriority);
  if (pageState.taskDue !== 'all') {
    tasks = tasks.filter((t) => {
      const days = utils.daysUntil(t.due_date);
      if (pageState.taskDue === 'overdue') return t.status !== 'done' && days < 0;
      if (pageState.taskDue === 'today') return days === 0;
      if (pageState.taskDue === 'week') return days >= 0 && days <= 7;
      if (pageState.taskDue === 'month') return days >= 0 && days <= 30;
      return true;
    });
  }
  const query = utils.normalizeSearch(pageState.taskSearch);
  if (query) {
    tasks = tasks.filter((t) => utils.normalizeSearch(`${t.title} ${t.description} ${getClassName(t.class_id)}`).includes(query));
  }
  return tasks.sort((a, b) => a.due_date.localeCompare(b.due_date));
}

function renderTaskView() {
  const container = document.getElementById('task-view');
  if (!container) return;
  const tasks = getFilteredTasks();
  if (prefs.taskView === 'list') {
    container.innerHTML = renderTaskList(tasks);
  } else {
    container.innerHTML = renderTaskBoard(tasks);
  }
  bindBoardDnD();
}

function renderTaskBoard(tasks) {
  const editable = canEditData();
  const columns = [
    { id: 'todo', label: 'A fazer', color: '#64748b' },
    { id: 'doing', label: 'Em andamento', color: '#6366f1' },
    { id: 'review', label: 'Em revisão', color: '#f59e0b' },
    { id: 'done', label: 'Concluído', color: '#10b981' }
  ];
  return `<div class="board">${columns.map((column) => {
    const columnTasks = tasks.filter((task) => task.status === column.id);
    return `
      <section class="board-column" data-status="${column.id}" style="--tone:${column.color}">
        <div class="board-col-head">
          <span class="col-dot"></span>
          <h3>${column.label}</h3>
          <span class="count">${columnTasks.length}</span>
        </div>
        <div class="board-cards">
          ${columnTasks.length ? columnTasks.map((task) => {
            const tone = getClassTone(task.class_id);
            return `
              <article class="board-card ${task.status === 'done' ? 'done-card' : ''}" style="--tone:${tone}" draggable="${editable ? 'true' : 'false'}" data-id="${task.id}" data-action="open-task">
                <div class="board-card-top">
                  ${priorityPill(task.priority)}
                  ${editable ? `<button class="mini-check ${task.status === 'done' ? 'checked' : ''}" data-action="complete-task" data-id="${task.id}" aria-label="Alternar conclusão" style="${task.status === 'done' ? 'background:var(--success);border-color:var(--success);color:#fff' : ''}">${icon('check', 11)}</button>` : ''}
                </div>
                <h4>${utils.escapeHTML(task.title)}</h4>
                <div class="board-card-meta">${dueChip(task)}</div>
                <div class="board-card-foot">
                  ${classChip(task.class_id)}
                  <span style="color:var(--muted)">${editable ? icon('grip-vertical', 13) : icon('eye', 13)}</span>
                </div>
              </article>`;
          }).join('') : `<div class="board-empty">Nenhum trabalho aqui.</div>`}
        </div>
        ${column.id === 'todo' && editable ? `<button class="board-add" data-action="new-task">${icon('plus', 14)} Adicionar trabalho</button>` : ''}
      </section>`;
  }).join('')}</div>`;
}

function renderTaskList(tasks) {
  const editable = canEditData();
  if (!tasks.length) {
    return `<div class="panel empty-state">
      <div class="empty-icon">${icon('search', 22)}</div>
      <h4>Nenhum trabalho encontrado</h4>
      <p>Ajuste os filtros ou crie um novo trabalho para começar.</p>
      ${editable
        ? `<button class="btn btn-primary btn-sm" data-action="new-task">${icon('plus', 15)} Novo trabalho</button>`
        : `<button class="btn btn-primary btn-sm" data-action="guest-signup">${icon('user-plus', 15)} Criar conta</button>`}
    </div>`;
  }
  return `
    <div class="task-list-head">
      <span>Trabalho</span><span>Turma</span><span>Prioridade</span><span>Status</span><span>Prazo</span><span></span>
    </div>
    <div class="task-list">
      ${tasks.map((task) => {
        const meta = utils.dueMeta(task.due_date, task.status);
        return `
          <div class="task-row ${task.status === 'done' ? 'done' : ''}" style="--tone:${getClassTone(task.class_id)}">
            <div class="task-row-main">
              ${editable ? `<button class="mini-check ${task.status === 'done' ? 'checked' : ''}" data-action="complete-task" data-id="${task.id}" aria-label="Alternar conclusão" style="${task.status === 'done' ? 'background:var(--success);border-color:var(--success);color:#fff' : ''}">${icon('check', 11)}</button>` : ''}
              <div data-action="open-task" data-id="${task.id}" style="min-width:0;cursor:pointer">
                <h4>${utils.escapeHTML(task.title)}</h4>
                <p>${utils.escapeHTML(task.description || 'Sem descrição')}</p>
              </div>
            </div>
            ${classChip(task.class_id)}
            ${priorityPill(task.priority)}
            ${editable
              ? `<select class="select" data-task-status="${task.id}" aria-label="Status de ${utils.escapeHTML(task.title)}">
                  ${Object.entries(STATUSES).map(([key, status]) => `<option value="${key}" ${task.status === key ? 'selected' : ''}>${status.label}</option>`).join('')}
                </select>`
              : `<span class="badge" style="background:color-mix(in srgb, var(--primary) 12%, transparent);color:var(--primary)">${STATUSES[task.status]?.label || task.status}</span>`}
            <span class="due ${meta.tone}">${icon('clock', 12)} ${meta.label}</span>
            <div class="table-actions">
              <button class="icon-btn" data-action="open-task" data-id="${task.id}" title="${editable ? 'Editar' : 'Visualizar'}">${icon(editable ? 'pencil' : 'eye', 14)}</button>
              ${editable ? `<button class="icon-btn danger" data-action="delete-task" data-id="${task.id}" title="Excluir">${icon('trash-2', 14)}</button>` : ''}
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

function bindBoardDnD() {
  if (!canEditData()) return;
  const board = document.querySelector('.board');
  if (!board || board.dataset.bound === 'true') return;
  board.dataset.bound = 'true';
  let draggedId = null;

  board.addEventListener('dragstart', (event) => {
    const card = event.target.closest('.board-card');
    if (!card) return;
    draggedId = Number(card.dataset.id);
    card.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(draggedId));
  });

  board.addEventListener('dragend', (event) => {
    const card = event.target.closest('.board-card');
    if (card) card.classList.remove('dragging');
    board.querySelectorAll('.board-column').forEach((column) => column.classList.remove('drag-over'));
  });

  board.addEventListener('dragover', (event) => {
    const column = event.target.closest('.board-column');
    if (!column) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    board.querySelectorAll('.board-column').forEach((c) => c.classList.toggle('drag-over', c === column));
  });

  board.addEventListener('dragleave', (event) => {
    const column = event.target.closest('.board-column');
    if (!column) return;
    if (!column.contains(event.relatedTarget)) column.classList.remove('drag-over');
  });

  board.addEventListener('drop', (event) => {
    const column = event.target.closest('.board-column');
    if (!column) return;
    event.preventDefault();
    const id = Number(event.dataTransfer.getData('text/plain')) || draggedId;
    const task = getAssignmentById(id);
    const newStatus = column.dataset.status;
    board.querySelectorAll('.board-column').forEach((c) => c.classList.remove('drag-over'));
    if (!task || !newStatus || task.status === newStatus) return;
    const wasDone = task.status === 'done';
    task.status = newStatus;
    saveState();
    if (newStatus === 'done' && !wasDone) {
      confetti(46);
      toast('Trabalho concluído', `“${task.title}” foi movido para Concluído.`, 'success');
    } else {
      toast('Status atualizado', `“${task.title}” agora está em ${STATUSES[newStatus].label}.`, 'info', 2600);
    }
    refreshCurrentPage();
  });
}

function openTaskModal(id = null) {
  const readonly = !canEditData();
  const task = id ? getAssignmentById(id) : null;
  if (id && !task) return;
  if (!id && readonly) {
    guestBlocked('criar trabalhos');
    return;
  }
  const classes = getScopedClasses();
  if (!classes.length) {
    toast('Nenhuma aula disponível', 'Cadastre uma aula antes de criar um trabalho.', 'warning');
    return;
  }
  const defaultDate = utils.isoOffset(1);
  const selectedClass = task?.class_id || classes[0].id;
  const overlay = openModal({
    title: task ? (readonly ? 'Detalhes do trabalho' : 'Editar trabalho') : 'Novo trabalho',
    subtitle: readonly ? 'Modo convidado · somente leitura.' : task ? 'Atualize os detalhes e o andamento.' : 'Defina o prazo e acompanhe até a conclusão.',
    iconName: task ? (readonly ? 'eye' : 'pencil') : 'clipboard-list',
    size: 'lg',
    body: `
      <form id="task-form" class="form-grid">
        <div class="field span-2">
          <label for="task-title">Título</label>
          <input class="input" id="task-title" type="text" placeholder="Ex.: Lista de exercícios — Álgebra" value="${utils.escapeHTML(task?.title || '')}" ${readonly ? 'disabled' : ''} required>
        </div>
        <div class="field span-2">
          <label for="task-desc">Descrição</label>
          <textarea class="textarea" id="task-desc" placeholder="O que precisa ser feito?" ${readonly ? 'disabled' : ''}>${utils.escapeHTML(task?.description || '')}</textarea>
        </div>
        <div class="field">
          <label for="task-class">Aula</label>
          <select class="select" id="task-class" ${readonly ? 'disabled' : ''}>
            ${classes.map((cls) => `<option value="${cls.id}" ${Number(selectedClass) === cls.id ? 'selected' : ''}>${utils.escapeHTML(cls.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="task-due">Data de entrega</label>
          <input class="input" id="task-due" type="date" value="${task?.due_date || defaultDate}" ${readonly ? 'disabled' : ''} required>
        </div>
        <div class="field">
          <label for="task-priority">Prioridade</label>
          <select class="select" id="task-priority" ${readonly ? 'disabled' : ''}>
            ${Object.entries(PRIORITIES).map(([key, meta]) => `<option value="${key}" ${(task?.priority || 'medium') === key ? 'selected' : ''}>${meta.label}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="task-status">Status</label>
          <select class="select" id="task-status" ${readonly ? 'disabled' : ''}>
            ${Object.entries(STATUSES).map(([key, meta]) => `<option value="${key}" ${(task?.status || 'todo') === key ? 'selected' : ''}>${meta.label}</option>`).join('')}
          </select>
        </div>
      </form>`,
    footer: readonly
      ? `<button class="btn btn-primary" data-modal-close>Fechar</button>`
      : `
      ${task ? `<button class="btn btn-ghost" id="task-delete" style="color:var(--danger);margin-right:auto">${icon('trash-2', 15)} Excluir</button>` : ''}
      <button class="btn btn-secondary" data-modal-close>Cancelar</button>
      <button class="btn btn-primary" id="task-save">${icon('check', 16)} Salvar trabalho</button>`,
    onOpen(modal) {
      if (readonly) return;
      modal.querySelector('#task-save').addEventListener('click', () => {
        const title = modal.querySelector('#task-title').value.trim();
        const description = modal.querySelector('#task-desc').value.trim();
        const dueDate = modal.querySelector('#task-due').value;
        const classId = Number(modal.querySelector('#task-class').value);
        const priority = modal.querySelector('#task-priority').value;
        const status = modal.querySelector('#task-status').value;
        if (!title || !dueDate || !classId) {
          toast('Preencha os campos obrigatórios', 'Título, aula e data de entrega são necessários.', 'warning');
          return;
        }
        if (task) {
          Object.assign(task, { title, description, due_date: dueDate, class_id: classId, priority, status });
        } else {
          state.assignments.push({
            id: Date.now(),
            title,
            description,
            due_date: dueDate,
            class_id: classId,
            teacher_id: state.currentUser.id,
            created_at: utils.toISO(new Date()),
            status,
            priority
          });
        }
        saveState();
        closeModal();
        refreshCurrentPage();
        toast(task ? 'Trabalho atualizado' : 'Trabalho criado', task ? `“${title}” foi atualizado.` : `“${title}” entrou no seu board.`, 'success');
      });
      if (task) {
        modal.querySelector('#task-delete').addEventListener('click', async () => {
          const ok = await confirmDialog({
            title: 'Excluir trabalho?',
            message: `“${utils.escapeHTML(task.title)}” será removido definitivamente.`,
            confirmText: 'Excluir',
            danger: true
          });
          if (!ok) return;
          const index = state.assignments.findIndex((a) => a.id === task.id);
          if (index > -1) state.assignments.splice(index, 1);
          saveState();
          closeModal();
          refreshCurrentPage();
          toast('Trabalho excluído', 'O item foi removido do seu board.', 'success');
        });
      }
    }
  });
  return overlay;
}

function toggleTaskDone(id) {
  if (!canEditData()) {
    guestBlocked('concluir trabalhos');
    return;
  }
  const task = getAssignmentById(id);
  if (!task) return;
  const wasDone = task.status === 'done';
  task.status = wasDone ? 'todo' : 'done';
  saveState();
  if (!wasDone) {
    confetti(44);
    toast('Boa!', `“${task.title}” foi concluído.`, 'success');
  } else {
    toast('Trabalho reaberto', `“${task.title}” voltou para A fazer.`, 'info', 2600);
  }
  refreshCurrentPage();
}

async function deleteTask(id) {
  if (!canEditData()) {
    guestBlocked('excluir trabalhos');
    return;
  }
  const task = getAssignmentById(id);
  if (!task) return;
  const ok = await confirmDialog({
    title: 'Excluir trabalho?',
    message: `“${utils.escapeHTML(task.title)}” será removido definitivamente.`,
    confirmText: 'Excluir',
    danger: true
  });
  if (!ok) return;
  state.assignments = state.assignments.filter((a) => a.id !== Number(id));
  saveState();
  refreshCurrentPage();
  toast('Trabalho excluído', 'O item foi removido do seu board.', 'success');
}

function openClassModal(id) {
  const cls = getClassById(id);
  if (!cls) return;
  const teacher = getUserById(cls.teacher_id);
  const enrolled = state.enrollments.filter((e) => e.class_id === cls.id);
  const students = enrolled.map((e) => getUserById(e.student_id)).filter(Boolean);
  openModal({
    title: cls.name,
    subtitle: `${utils.getDayOfWeekName(cls.day_of_week)} · ${cls.time_start}–${cls.time_end}`,
    iconName: 'book-open',
    size: 'md',
    body: `
      <div class="task-detail-head">
        <div class="task-detail-icon" style="--tone:${cls.color}">${icon('book-open', 20)}</div>
        <div><h3>${utils.escapeHTML(cls.name)}</h3><p>${utils.escapeHTML(cls.room)} · ${utils.escapeHTML(teacher?.name || 'Professor')}</p></div>
      </div>
      <div class="detail-meta-grid">
        <div class="detail-meta"><span>Dia</span><strong>${utils.getDayOfWeekName(cls.day_of_week)}</strong></div>
        <div class="detail-meta"><span>Horário</span><strong>${cls.time_start}–${cls.time_end}</strong></div>
        <div class="detail-meta"><span>Sala</span><strong>${utils.escapeHTML(cls.room)}</strong></div>
        <div class="detail-meta"><span>Alunos</span><strong>${students.length}</strong></div>
      </div>
      <p class="detail-desc">${utils.escapeHTML(cls.description || 'Sem descrição cadastrada.')}</p>
      ${students.length ? `<div class="event-attendees"><div class="avatar-stack">${students.slice(0, 5).map((s) => avatarHTML(s.name)).join('')}${students.length > 5 ? `<span class="avatar more">+${students.length - 5}</span>` : ''}</div><span><strong>${students.length}</strong> alunos matriculados</span></div>` : ''}`,
    footer: `<button class="btn btn-primary" data-modal-close>Fechar</button>`
  });
}

// ---------------------------------------------------------------------------
// Eventos & calendário

function initEvents() {
  const user = state.currentUser;
  if (!user) return;
  const today = new Date();
  if (!pageState.calendarMonth) pageState.calendarMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  if (!pageState.calendarSelected) pageState.calendarSelected = utils.toISO(today);
  renderEventsPage();
}

function renderEventsPage() {
  const page = document.getElementById('page');
  if (!page || !state.currentUser) return;
  const user = state.currentUser;
  const today = new Date();
  const todayISO = utils.toISO(today);
  const events = getScopedEvents(user);
  const upcoming = events.filter((e) => e.date >= todayISO).sort((a, b) => (a.date + a.time_start).localeCompare(b.date + b.time_start));
  const confirmed = events.filter((e) => (e.attendees || []).includes(user.id));
  const month = pageState.calendarMonth;
  const monthLabel = month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const category = prefs.calendarCategory || 'all';
  const filteredEvents = category === 'all' ? events : events.filter((e) => e.category === category);
  const selectedDate = utils.parseISO(pageState.calendarSelected);
  const selectedEvents = filteredEvents.filter((e) => e.date === pageState.calendarSelected).sort((a, b) => a.time_start.localeCompare(b.time_start));
  const nextEvent = upcoming[0];
  const daysToNext = nextEvent ? utils.daysUntil(nextEvent.date) : null;

  page.innerHTML = `
    <div class="page-head anim-up">
      <div>
        <div class="eyebrow">${icon('calendar-days', 14)} agenda escolar</div>
        <h1>Eventos</h1>
        <p class="subtitle">${canEditData() ? 'Acompanhe o calendário da escola, confirme presença e organize sua rotina sem perder nenhum encontro.' : 'Explore o calendário da demonstração em modo somente leitura.'}</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="calendar-today">${icon('target', 16)} Hoje</button>
        ${canEditData()
          ? `<button class="btn btn-primary" data-action="new-event">${icon('plus', 17)} Novo evento</button>`
          : `<button class="btn btn-primary" data-action="guest-signup">${icon('user-plus', 17)} Criar conta</button>`}
      </div>
    </div>

    <section class="task-stats anim-up delay-1">
      <div class="task-stat" style="--tone:#4f46e5">
        <div class="task-stat-icon">${icon('calendar-check', 17)}</div>
        <div><strong>${upcoming.length}</strong><span>eventos futuros</span></div>
      </div>
      <div class="task-stat" style="--tone:#10b981">
        <div class="task-stat-icon">${icon('check-circle', 17)}</div>
        <div><strong>${confirmed.length}</strong><span>presenças confirmadas</span></div>
      </div>
      <div class="task-stat" style="--tone:#f97316">
        <div class="task-stat-icon">${icon('calendar-days', 17)}</div>
        <div><strong>${events.filter((e) => e.date.slice(0, 7) === utils.toISO(today).slice(0, 7)).length}</strong><span>eventos neste mês</span></div>
      </div>
      <div class="task-stat" style="--tone:#ec4899">
        <div class="task-stat-icon">${icon('clock', 17)}</div>
        <div><strong>${daysToNext === null ? '—' : daysToNext === 0 ? 'Hoje' : `${daysToNext}d`}</strong><span>${nextEvent ? utils.escapeHTML(nextEvent.title) : 'sem eventos próximos'}</span></div>
      </div>
    </section>

    <div class="events-layout anim-up delay-2">
      <section class="panel calendar-panel" style="--panel-tone:#6366f1">
        <div class="calendar-head">
          <div class="calendar-title">
            <h2>${monthLabel}</h2>
            <span class="cal-month-badge">${month.getFullYear()}</span>
          </div>
          <div class="calendar-nav">
            <select class="select" id="event-category-filter" aria-label="Filtrar categoria" style="min-width:135px;height:34px;min-height:34px;font-size:.72rem">
              <option value="all">Todas as categorias</option>
              ${Object.entries(EVENT_CATEGORIES).map(([key, cat]) => `<option value="${key}" ${category === key ? 'selected' : ''}>${cat.label}</option>`).join('')}
            </select>
            <button class="icon-btn" data-action="calendar-prev" aria-label="Mês anterior">${icon('chevron-left', 17)}</button>
            <button class="icon-btn" data-action="calendar-today" aria-label="Mês atual">${icon('target', 15)}</button>
            <button class="icon-btn" data-action="calendar-next" aria-label="Próximo mês">${icon('chevron-right', 17)}</button>
          </div>
        </div>

        <div class="calendar-grid">
          ${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => `<div class="calendar-weekday">${day}</div>`).join('')}
          ${utils.monthMatrix(month.getFullYear(), month.getMonth()).map((date) => {
            const iso = utils.toISO(date);
            const isOutside = date.getMonth() !== month.getMonth();
            const isToday = iso === todayISO;
            const isSelected = iso === pageState.calendarSelected;
            const dayEvents = filteredEvents.filter((e) => e.date === iso).sort((a, b) => a.time_start.localeCompare(b.time_start));
            const dayAssignments = getScopedAssignments().filter((a) => a.due_date === iso && a.status !== 'done');
            return `
              <div class="calendar-day ${isOutside ? 'outside' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayEvents.length ? 'has-events' : ''}" data-action="select-calendar-day" data-date="${iso}">
                <div class="cal-day-top">
                  <span class="cal-day-num">${date.getDate()}</span>
                  ${dayEvents.length ? `<span class="cal-day-count">${dayEvents.length}</span>` : ''}
                </div>
                ${dayAssignments.length ? `<span class="cal-assignment-dot" title="${utils.plural(dayAssignments.length, 'trabalho', 'trabalhos')} para entregar"></span>` : ''}
                ${dayEvents.slice(0, 2).map((event) => `
                  <button class="cal-event-chip" style="--tone:${eventTone(event)}" data-action="open-event" data-id="${event.id}" title="${utils.escapeHTML(event.title)}">${utils.escapeHTML(event.title)}</button>`).join('')}
                ${dayEvents.length > 2 ? `<span class="cal-more">+${dayEvents.length - 2} mais</span>` : ''}
              </div>`;
          }).join('')}
        </div>

        <div class="calendar-legend">
          ${Object.entries(EVENT_CATEGORIES).map(([key, cat]) => `<span class="legend-item"><span class="legend-dot" style="--tone:${cat.color};background:${cat.color}"></span>${cat.label}</span>`).join('')}
          <span class="legend-item"><span class="legend-dot" style="background:var(--warning)"></span>Entrega de trabalho</span>
        </div>
      </section>

      <aside class="panel agenda-panel" style="--panel-tone:#ec4899">
        <div class="panel-head" style="margin-bottom:12px">
          <div><h2>${icon('calendar-days', 18)} Agenda</h2><div class="panel-sub">Detalhes do dia selecionado</div></div>
        </div>
        <div class="agenda-date">
          <div class="ad-box"><span>${selectedDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span><strong>${selectedDate.getDate()}</strong></div>
          <div><h3>${utils.escapeHTML(selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))}</h3><p>${selectedEvents.length ? utils.plural(selectedEvents.length, 'evento', 'eventos') : 'Nenhum evento'}</p></div>
        </div>
        <div class="agenda-list">
          ${selectedEvents.length ? selectedEvents.map((event) => renderAgendaEvent(event, user)).join('') : `
            <div class="agenda-empty">${icon('coffee', 20)}<br>Nenhum evento neste dia.${canEditData() ? `<br><button class="btn btn-soft btn-sm" data-action="new-event" style="margin-top:8px">${icon('plus', 14)} Criar evento</button>` : ''}</div>`}
        </div>
        <div class="agenda-next">
          <h4>Próximos eventos</h4>
          <div class="agenda-list">
            ${upcoming.filter((e) => e.date !== pageState.calendarSelected).slice(0, 4).map((event) => renderAgendaEvent(event, user, true)).join('') || `<div class="agenda-empty">Agenda livre nos próximos dias.</div>`}
          </div>
        </div>
      </aside>
    </div>`;
}

function renderAgendaEvent(event, user, compact = false) {
  const cat = EVENT_CATEGORIES[event.category] || EVENT_CATEGORIES.academic;
  const attending = (event.attendees || []).includes(user.id);
  return `
    <div class="agenda-event" style="--tone:${cat.color}" data-action="open-event" data-id="${event.id}">
      <div class="agenda-event-top">
        <h4>${utils.escapeHTML(event.title)}</h4>
        <span class="badge" style="background:color-mix(in srgb, ${cat.color} 12%, transparent);color:${cat.color}">${cat.label}</span>
      </div>
      <p>${icon('clock', 11)} ${event.time_start}–${event.time_end} ${compact ? `· ${utils.formatDateShort(event.date)}` : ''}</p>
      <p>${icon('map-pin', 11)} ${utils.escapeHTML(event.location || 'Escola')}</p>
      <div class="agenda-event-foot">
        <span class="agenda-time">${icon('users', 12)} ${(event.attendees || []).length} confirmados</span>
        ${canEditData()
          ? `<button class="rsvp-btn ${attending ? 'on' : ''}" data-action="toggle-rsvp" data-id="${event.id}" data-rsvp-id="${event.id}">
              ${attending ? `${icon('check', 10)} Confirmado` : `${icon('plus', 10)} Confirmar`}
            </button>`
          : `<span class="badge">${icon('eye', 10)} Somente leitura</span>`}
      </div>
    </div>`;
}

function toggleRsvp(id) {
  if (!canEditData()) {
    guestBlocked('confirmar presença');
    return;
  }
  const event = getEventById(id);
  const user = state.currentUser;
  if (!event || !user) return;
  event.attendees = event.attendees || [];
  const attending = event.attendees.includes(user.id);
  if (attending) event.attendees = event.attendees.filter((uid) => uid !== user.id);
  else event.attendees.push(user.id);
  saveState();
  document.querySelectorAll(`[data-rsvp-id="${event.id}"]`).forEach((btn) => {
    btn.classList.toggle('on', !attending);
    btn.innerHTML = !attending ? `${icon('check', 10)} Confirmado` : `${icon('plus', 10)} Confirmar`;
  });
  const detailBtn = document.getElementById('event-rsvp-detail');
  if (detailBtn) {
    detailBtn.classList.toggle('on', !attending);
    detailBtn.innerHTML = !attending ? `${icon('check', 14)} Presença confirmada` : `${icon('plus', 14)} Confirmar presença`;
  }
  if (currentPage() === 'events') renderEventsPage();
  toast(!attending ? 'Presença confirmada' : 'Presença removida', !attending ? `Você está na lista de “${event.title}”.` : `Você saiu da lista de “${event.title}”.`, !attending ? 'success' : 'info', 2800);
}

function openEventDetail(id) {
  const event = getEventById(id);
  const user = state.currentUser;
  if (!event) return;
  const editable = canEditData();
  const cat = EVENT_CATEGORIES[event.category] || EVENT_CATEGORIES.academic;
  const attending = (event.attendees || []).includes(user.id);
  const attendees = (event.attendees || []).map((uid) => getUserById(uid)).filter(Boolean);
  openModal({
    title: 'Detalhes do evento',
    subtitle: utils.formatDateFull(event.date),
    iconName: 'calendar-days',
    size: 'md',
    body: `
      <div class="event-detail-banner" style="--tone:${cat.color}">
        <span class="badge">${icon(cat.icon, 11)} ${cat.label}</span>
        <h3>${utils.escapeHTML(event.title)}</h3>
        <p>${utils.escapeHTML(event.description || 'Sem descrição.')}</p>
      </div>
      <div class="event-detail-info">
        <div class="detail-meta"><span>Data</span><strong>${icon('calendar-days', 13)} ${utils.formatDateFull(event.date)}</strong></div>
        <div class="detail-meta"><span>Horário</span><strong>${icon('clock', 13)} ${event.time_start}–${event.time_end}</strong></div>
        <div class="detail-meta"><span>Local</span><strong>${icon('map-pin', 13)} ${utils.escapeHTML(event.location || 'Escola')}</strong></div>
        <div class="detail-meta"><span>Público</span><strong>${icon('users', 13)} ${event.class_id ? utils.escapeHTML(getClassName(event.class_id)) : 'Toda a escola'}</strong></div>
      </div>
      <div class="event-attendees">
        <div class="avatar-stack">${attendees.slice(0, 5).map((person) => avatarHTML(person.name)).join('')}${attendees.length > 5 ? `<span class="avatar more">+${attendees.length - 5}</span>` : ''}</div>
        <span><strong>${attendees.length}</strong> ${attendees.length === 1 ? 'pessoa confirmada' : 'pessoas confirmadas'}</span>
        ${editable
          ? `<button class="rsvp-btn ${attending ? 'on' : ''}" id="event-rsvp-detail" data-action="toggle-rsvp" data-id="${event.id}" data-rsvp-id="${event.id}" style="margin-left:auto">
              ${attending ? `${icon('check', 12)} Presença confirmada` : `${icon('plus', 12)} Confirmar presença`}
            </button>`
          : `<span class="badge" style="margin-left:auto">${icon('eye', 12)} Modo convidado</span>`}
      </div>`,
    footer: editable
      ? `
      <button class="btn btn-ghost" id="event-delete" style="color:var(--danger);margin-right:auto">${icon('trash-2', 15)} Excluir</button>
      <button class="btn btn-secondary" id="event-edit">${icon('pencil', 15)} Editar</button>
      <button class="btn btn-primary" data-modal-close>Fechar</button>`
      : `<button class="btn btn-primary" data-modal-close>Fechar</button>`,
    onOpen(modal) {
      if (!editable) return;
      modal.querySelector('#event-edit').addEventListener('click', () => {
        closeModal();
        setTimeout(() => openEventModal(event.id), 180);
      });
      modal.querySelector('#event-delete').addEventListener('click', async () => {
        const ok = await confirmDialog({
          title: 'Excluir evento?',
          message: `“${utils.escapeHTML(event.title)}” será removido do calendário.`,
          confirmText: 'Excluir',
          danger: true
        });
        if (!ok) return;
        state.events = state.events.filter((e) => e.id !== event.id);
        saveState();
        closeModal();
        closeModal();
        renderEventsPage();
        updateShellBadges();
        toast('Evento excluído', 'O evento saiu do calendário.', 'success');
      });
    }
  });
}

function openEventModal(id = null) {
  if (!canEditData()) {
    guestBlocked(id ? 'editar eventos' : 'criar eventos');
    return;
  }
  const event = id ? getEventById(id) : null;
  const classes = getScopedClasses();
  const defaultDate = utils.isoOffset(1);
  openModal({
    title: event ? 'Editar evento' : 'Novo evento',
    subtitle: event ? 'Atualize as informações do encontro.' : 'Adicione um encontro ao calendário da escola.',
    iconName: event ? 'pencil' : 'calendar-plus',
    size: 'lg',
    body: `
      <form id="event-form" class="form-grid">
        <div class="field span-2">
          <label for="event-title">Título</label>
          <input class="input" id="event-title" type="text" placeholder="Ex.: Feira de Ciências" value="${utils.escapeHTML(event?.title || '')}" required>
        </div>
        <div class="field span-2">
          <label for="event-desc">Descrição</label>
          <textarea class="textarea" id="event-desc" placeholder="Detalhes do evento…">${utils.escapeHTML(event?.description || '')}</textarea>
        </div>
        <div class="field">
          <label for="event-date">Data</label>
          <input class="input" id="event-date" type="date" value="${event?.date || defaultDate}" required>
        </div>
        <div class="field">
          <label for="event-category">Categoria</label>
          <select class="select" id="event-category">
            ${Object.entries(EVENT_CATEGORIES).map(([key, cat]) => `<option value="${key}" ${(event?.category || 'academic') === key ? 'selected' : ''}>${cat.label}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="event-start">Início</label>
          <input class="input" id="event-start" type="time" value="${event?.time_start || '08:00'}" required>
        </div>
        <div class="field">
          <label for="event-end">Término</label>
          <input class="input" id="event-end" type="time" value="${event?.time_end || '09:00'}" required>
        </div>
        <div class="field">
          <label for="event-location">Local</label>
          <input class="input" id="event-location" type="text" placeholder="Auditório, quadra…" value="${utils.escapeHTML(event?.location || '')}" required>
        </div>
        <div class="field">
          <label for="event-class">Público</label>
          <select class="select" id="event-class">
            <option value="">Toda a escola</option>
            ${classes.map((cls) => `<option value="${cls.id}" ${event?.class_id === cls.id ? 'selected' : ''}>${utils.escapeHTML(cls.name)}</option>`).join('')}
          </select>
        </div>
      </form>`,
    footer: `
      <button class="btn btn-secondary" data-modal-close>Cancelar</button>
      <button class="btn btn-primary" id="event-save">${icon('check', 16)} Salvar evento</button>`,
    onOpen(modal) {
      modal.querySelector('#event-save').addEventListener('click', () => {
        const title = modal.querySelector('#event-title').value.trim();
        const description = modal.querySelector('#event-desc').value.trim();
        const date = modal.querySelector('#event-date').value;
        const category = modal.querySelector('#event-category').value;
        const timeStart = modal.querySelector('#event-start').value;
        const timeEnd = modal.querySelector('#event-end').value;
        const location = modal.querySelector('#event-location').value.trim();
        const classId = modal.querySelector('#event-class').value ? Number(modal.querySelector('#event-class').value) : null;
        if (!title || !date || !timeStart || !timeEnd || !location) {
          toast('Preencha os campos obrigatórios', 'Título, data, horários e local são necessários.', 'warning');
          return;
        }
        if (timeEnd <= timeStart) {
          toast('Horário inválido', 'O término precisa ser depois do início.', 'warning');
          return;
        }
        if (event) {
          Object.assign(event, { title, description, date, category, time_start: timeStart, time_end: timeEnd, location, class_id: classId, is_global: !classId });
        } else {
          state.events.push({
            id: Date.now(),
            title,
            description,
            date,
            time_start: timeStart,
            time_end: timeEnd,
            location,
            category,
            class_id: classId,
            is_global: !classId,
            attendees: []
          });
        }
        saveState();
        pageState.calendarMonth = new Date(utils.parseISO(date).getFullYear(), utils.parseISO(date).getMonth(), 1);
        pageState.calendarSelected = date;
        closeModal();
        renderEventsPage();
        updateShellBadges();
        toast(event ? 'Evento atualizado' : 'Evento criado', `“${title}” está no calendário.`, 'success');
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Administração

function initAdmin() {
  const user = state.currentUser;
  if (!user) return;
  if (user.role !== 'admin') {
    toast('Acesso restrito', 'Apenas administradores podem abrir este painel.', 'warning');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 900);
    return;
  }
  if (!pageState.adminTab) pageState.adminTab = prefs.adminTab || 'overview';
  renderAdminPage();
}

function renderAdminPage() {
  const page = document.getElementById('page');
  if (!page) return;
  const tab = pageState.adminTab || 'overview';
  const tabs = [
    { id: 'overview', label: 'Visão geral', iconName: 'layout-dashboard' },
    { id: 'users', label: 'Usuários', iconName: 'users', count: state.users.length },
    { id: 'classes', label: 'Turmas', iconName: 'book-open', count: state.classes.length },
    { id: 'enrollments', label: 'Matrículas', iconName: 'graduation-cap', count: state.enrollments.length }
  ];

  page.innerHTML = `
    <div class="page-head anim-up">
      <div>
        <div class="eyebrow">${icon('shield-check', 14)} administração</div>
        <h1>Painel administrativo</h1>
        <p class="subtitle">Gestão de pessoas, turmas e matrículas com uma visão clara da escola.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="new-class">${icon('book-open', 16)} Nova turma</button>
        <button class="btn btn-primary" data-action="new-user">${icon('user-plus', 17)} Novo usuário</button>
      </div>
    </div>

    <div class="admin-tabs anim-up delay-1">
      ${tabs.map((item) => `
        <button class="admin-tab ${tab === item.id ? 'active' : ''}" data-action="admin-tab" data-tab="${item.id}">
          ${icon(item.iconName, 16)} ${item.label}
          ${item.count !== undefined ? `<span class="count">${item.count}</span>` : ''}
        </button>`).join('')}
    </div>

    <div id="admin-content" class="anim-up delay-2"></div>`;

  renderAdminContent();
}

function renderAdminContent() {
  const container = document.getElementById('admin-content');
  if (!container) return;
  if (pageState.adminTab === 'users') container.innerHTML = adminUsersTemplate();
  else if (pageState.adminTab === 'classes') container.innerHTML = adminClassesTemplate();
  else if (pageState.adminTab === 'enrollments') container.innerHTML = adminEnrollmentsTemplate();
  else container.innerHTML = adminOverviewTemplate();
  if (pageState.adminTab === 'users') renderAdminUsersTable();
  if (pageState.adminTab === 'enrollments') bindEnrollmentForm();
}

function adminOverviewTemplate() {
  const totalAssignments = state.assignments.length;
  const doneAssignments = state.assignments.filter((a) => a.status === 'done').length;
  const completion = totalAssignments ? Math.round((doneAssignments / totalAssignments) * 100) : 0;
  const thisMonth = utils.toISO(new Date()).slice(0, 7);
  const monthEvents = state.events.filter((e) => e.date.slice(0, 7) === thisMonth).length;
  const roleCounts = {
    aluno: state.users.filter((u) => u.role === 'aluno').length,
    professor: state.users.filter((u) => u.role === 'professor').length,
    admin: state.users.filter((u) => u.role === 'admin').length
  };
  const totalUsers = state.users.length || 1;
  const alunoPct = Math.round((roleCounts.aluno / totalUsers) * 100);
  const profPct = Math.round((roleCounts.professor / totalUsers) * 100);
  const adminPct = Math.max(0, 100 - alunoPct - profPct);
  const classCounts = state.classes.map((cls) => ({
    cls,
    count: state.assignments.filter((a) => a.class_id === cls.id).length
  })).sort((a, b) => b.count - a.count).slice(0, 6);
  const maxCount = Math.max(...classCounts.map((item) => item.count), 1);
  const recent = [...state.assignments].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);

  return `
    <section class="admin-stats">
      <div class="stat-card" style="--tone:#4f46e5">
        <div class="stat-top"><div class="stat-icon">${icon('users', 18)}</div><span class="stat-trend">${roleCounts.professor} professores</span></div>
        <div class="stat-value">${state.users.length}<small>pessoas</small></div>
        <div class="stat-label">Usuários cadastrados</div>
        <div class="stat-foot">${icon('graduation-cap', 12)} ${roleCounts.aluno} alunos ativos</div>
      </div>
      <div class="stat-card" style="--tone:#10b981">
        <div class="stat-top"><div class="stat-icon">${icon('book-open', 18)}</div><span class="stat-trend neutral">${state.classes.length} turmas</span></div>
        <div class="stat-value">${state.enrollments.length}<small>matrículas</small></div>
        <div class="stat-label">Vínculos aluno–turma</div>
        <div class="stat-foot">${icon('layers', 12)} ${(state.enrollments.length / Math.max(state.classes.length, 1)).toFixed(1)} por turma</div>
      </div>
      <div class="stat-card" style="--tone:#f97316">
        <div class="stat-top"><div class="stat-icon">${icon('clipboard-list', 18)}</div><span class="stat-trend ${completion >= 50 ? '' : 'down'}">${completion}%</span></div>
        <div class="stat-value">${totalAssignments}<small>trabalhos</small></div>
        <div class="stat-label">Trabalhos na plataforma</div>
        <div class="stat-foot">${icon('check-circle', 12)} ${doneAssignments} concluídos</div>
      </div>
      <div class="stat-card" style="--tone:#ec4899">
        <div class="stat-top"><div class="stat-icon">${icon('calendar-days', 18)}</div><span class="stat-trend neutral">${monthEvents} este mês</span></div>
        <div class="stat-value">${state.events.length}<small>eventos</small></div>
        <div class="stat-label">Calendário escolar</div>
        <div class="stat-foot">${icon('users', 12)} ${state.events.reduce((sum, e) => sum + (e.attendees || []).length, 0)} confirmações</div>
      </div>
    </section>

    <div class="admin-grid">
      <section class="panel chart-card" style="--panel-tone:#6366f1">
        <div class="panel-head">
          <div><h2>${icon('bar-chart', 18)} Trabalhos por turma</h2><div class="panel-sub">Onde a demanda está concentrada</div></div>
          <span class="badge badge-neutral">${totalAssignments} no total</span>
        </div>
        <div class="chart-bars">
          ${classCounts.map(({ cls, count }) => `
            <div class="chart-bar-row" style="--tone:${cls.color}">
              <span class="chart-bar-label">${utils.escapeHTML(cls.name)}</span>
              <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${Math.max(4, Math.round((count / maxCount) * 100))}%"></div></div>
              <span class="chart-bar-value">${count}</span>
            </div>`).join('')}
        </div>
      </section>

      <section class="panel chart-card" style="--panel-tone:#ec4899">
        <div class="panel-head">
          <div><h2>${icon('users', 18)} Perfis da escola</h2><div class="panel-sub">Distribuição de usuários</div></div>
        </div>
        <div class="donut-wrap">
          <div class="donut" style="background:conic-gradient(#6366f1 0 ${alunoPct}%, #f59e0b ${alunoPct}% ${alunoPct + profPct}%, #8b5cf6 ${alunoPct + profPct}% 100%)">
            <div class="donut-center"><strong>${state.users.length}</strong><span>usuários</span></div>
          </div>
          <div class="donut-legend">
            <div class="donut-legend-item"><span class="dot" style="background:#6366f1"></span> Alunos <strong>${roleCounts.aluno}</strong></div>
            <div class="donut-legend-item"><span class="dot" style="background:#f59e0b"></span> Professores <strong>${roleCounts.professor}</strong></div>
            <div class="donut-legend-item"><span class="dot" style="background:#8b5cf6"></span> Admins <strong>${roleCounts.admin}</strong></div>
          </div>
        </div>
      </section>
    </div>

    <div class="admin-grid" style="margin-top:18px">
      <section class="panel" style="--panel-tone:#f97316">
        <div class="panel-head">
          <div><h2>${icon('clipboard-list', 18)} Trabalhos recentes</h2><div class="panel-sub">Últimos itens adicionados</div></div>
          <a class="panel-link" href="assignments.html">Ver board ${icon('arrow-right', 13)}</a>
        </div>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead><tr><th>Trabalho</th><th>Turma</th><th>Status</th><th>Prazo</th></tr></thead>
            <tbody>
              ${recent.map((task) => `
                <tr>
                  <td><strong style="font-weight:600">${utils.escapeHTML(task.title)}</strong></td>
                  <td>${classChip(task.class_id)}</td>
                  <td><span class="badge" style="background:${STATUSES[task.status].color}1a;color:${STATUSES[task.status].color}">${STATUSES[task.status].label}</span></td>
                  <td><span class="muted" style="font-size:.7rem">${utils.formatDateShort(task.due_date)}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel" style="--panel-tone:#10b981">
        <div class="panel-head">
          <div><h2>${icon('school', 18)} Ocupação das turmas</h2><div class="panel-sub">Alunos por turma</div></div>
        </div>
        <div class="chart-bars">
          ${state.classes.slice(0, 6).map((cls) => {
            const count = state.enrollments.filter((e) => e.class_id === cls.id).length;
            return `
              <div class="chart-bar-row" style="--tone:${cls.color}">
                <span class="chart-bar-label">${utils.escapeHTML(cls.name)}</span>
                <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${Math.max(6, Math.round((count / Math.max(...state.classes.map((c) => state.enrollments.filter((e) => e.class_id === c.id).length), 1)) * 100))}%"></div></div>
                <span class="chart-bar-value">${count}</span>
              </div>`;
          }).join('')}
        </div>
      </section>
    </div>`;
}

function adminUsersTemplate() {
  return `
    <section class="panel" style="--panel-tone:#06b6d4">
      <div class="admin-toolbar">
        <div class="input-wrap">
          ${icon('search', 16)}
          <input class="input" id="admin-user-search" type="search" placeholder="Buscar por nome, email ou perfil…" value="${utils.escapeHTML(pageState.adminUserQuery)}">
        </div>
        <div class="spacer"></div>
        <button class="btn btn-primary btn-sm" data-action="new-user">${icon('user-plus', 15)} Adicionar usuário</button>
      </div>
      <div class="data-table-wrap" id="admin-users-wrap"></div>
    </section>`;
}

function renderAdminUsersTable() {
  const wrap = document.getElementById('admin-users-wrap');
  if (!wrap) return;
  const query = pageState.adminUserQuery.trim().toLowerCase();
  const users = state.users.filter((user) => {
    if (!query) return true;
    return `${user.name} ${user.email} ${user.role} ${user.subject || ''} ${user.stage || ''} ${user.grade || ''}`.toLowerCase().includes(query);
  });
  if (!users.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">${icon('search', 22)}</div><h4>Nenhum usuário encontrado</h4><p>Tente outro termo ou cadastre uma nova pessoa.</p></div>`;
    return;
  }
  wrap.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Usuário</th><th>Perfil</th><th>Turma / Área</th><th>Vínculos</th><th style="text-align:right">Ações</th></tr></thead>
      <tbody>
        ${users.map((user) => {
          const enrollments = state.enrollments.filter((e) => e.student_id === user.id).length;
          const classes = state.classes.filter((c) => c.teacher_id === user.id).length;
          return `
            <tr>
              <td>
                <div class="table-user">
                  ${avatarHTML(user.name, 'sm', user)}
                  <div><strong>${utils.escapeHTML(user.name)}</strong><span>${utils.escapeHTML(user.email)}</span></div>
                </div>
              </td>
              <td><span class="role-badge ${user.role}">${utils.escapeHTML(getRoleLabel(user.role))}</span></td>
              <td><span class="muted" style="font-size:.72rem">${utils.escapeHTML(user.subject || '—')}</span></td>
              <td><span class="muted" style="font-size:.72rem">${user.role === 'aluno' ? `${enrollments} turmas` : user.role === 'professor' ? `${classes} turmas` : 'acesso total'}</span></td>
              <td>
                <div class="table-actions">
                  <button class="icon-btn" data-action="edit-user" data-id="${user.id}" title="Editar">${icon('pencil', 14)}</button>
                  <button class="icon-btn danger" data-action="delete-user" data-id="${user.id}" title="Excluir" ${user.id === state.currentUser.id ? 'disabled style="opacity:.3;cursor:not-allowed"' : ''}>${icon('trash-2', 14)}</button>
                </div>
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function adminClassesTemplate() {
  return `
    <section class="panel" style="--panel-tone:#8b5cf6">
      <div class="panel-head">
        <div><h2>${icon('book-open', 18)} Turmas da escola</h2><div class="panel-sub">${state.classes.length} turmas · ${state.enrollments.length} matrículas</div></div>
        <button class="btn btn-primary btn-sm" data-action="new-class">${icon('plus', 15)} Nova turma</button>
      </div>
      <div class="class-admin-grid">
        ${state.classes.map((cls) => {
          const count = state.enrollments.filter((e) => e.class_id === cls.id).length;
          const teacher = getUserById(cls.teacher_id);
          return `
            <article class="class-admin-card" style="--tone:${cls.color}">
              <div class="class-admin-top">
                <h4>${utils.escapeHTML(cls.name)}</h4>
                <span class="tone-dot" style="--tone:${cls.color}"></span>
              </div>
              <div class="class-admin-meta">
                <span>${icon('graduation-cap', 12)} ${utils.escapeHTML(getStageShort(cls.stage) || 'Turma livre')}</span>
                <span>${icon('calendar-days', 12)} ${utils.getDayOfWeekName(cls.day_of_week)} · ${cls.time_start}–${cls.time_end}</span>
                <span>${icon('map-pin', 12)} ${utils.escapeHTML(cls.room)} · ${utils.escapeHTML(teacher?.name || 'Sem professor')}</span>
              </div>
              <div class="class-admin-foot">
                <span class="occupancy">${icon('users', 12)} <strong>${count}</strong> alunos</span>
                <div class="table-actions">
                  <button class="icon-btn" data-action="edit-class" data-id="${cls.id}" title="Editar">${icon('pencil', 13)}</button>
                  <button class="icon-btn danger" data-action="delete-class" data-id="${cls.id}" title="Excluir">${icon('trash-2', 13)}</button>
                </div>
              </div>
            </article>`;
        }).join('')}
      </div>
    </section>`;
}

function adminEnrollmentsTemplate() {
  const students = state.users.filter((u) => u.role === 'aluno');
  return `
    <div class="enroll-layout">
      <section class="panel" style="--panel-tone:#f43f5e">
        <div class="panel-head">
          <div><h2>${icon('graduation-cap', 18)} Matrículas por turma</h2><div class="panel-sub">Gerencie quem participa de cada aula</div></div>
          <span class="badge badge-neutral">${state.enrollments.length} vínculos</span>
        </div>
        ${state.classes.map((cls) => {
          const classEnrollments = state.enrollments.filter((e) => e.class_id === cls.id);
          return `
            <div class="enroll-class-group" style="--tone:${cls.color}">
              <div class="enroll-class-head">
                <span class="tone-dot" style="--tone:${cls.color}"></span>
                <h4>${utils.escapeHTML(cls.name)}</h4>
                <span class="badge">${utils.escapeHTML(getStageShort(cls.stage) || 'Livre')}</span>
                <span class="badge">${classEnrollments.length} alunos</span>
              </div>
              <div class="enroll-students">
                ${classEnrollments.length ? classEnrollments.map((enrollment) => {
                  const student = getUserById(enrollment.student_id);
                  if (!student) return '';
                  return `<span class="enroll-student-chip">${avatarHTML(student.name, 'sm')} ${utils.escapeHTML(student.name)} <button data-action="remove-enrollment" data-id="${enrollment.id}" title="Remover matrícula" aria-label="Remover ${utils.escapeHTML(student.name)}">${icon('x', 11)}</button></span>`;
                }).join('') : `<span class="enroll-empty">Nenhum aluno matriculado nesta turma.</span>`}
              </div>
            </div>`;
        }).join('')}
      </section>

      <section class="panel enroll-form-card" style="--panel-tone:#10b981">
        <div class="panel-head">
          <div><h2>${icon('user-plus', 18)} Nova matrícula</h2><div class="panel-sub">Vincule um aluno a uma turma</div></div>
        </div>
        <div class="field" style="margin-bottom:12px">
          <label for="enroll-student">Aluno</label>
          <select class="select" id="enroll-student">
            <option value="">Selecione um aluno</option>
            ${students.map((student) => `<option value="${student.id}">${utils.escapeHTML(student.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field" style="margin-bottom:14px">
          <label for="enroll-class">Turma</label>
          <select class="select" id="enroll-class">
            <option value="">Selecione uma turma</option>
            ${state.classes.map((cls) => `<option value="${cls.id}">${utils.escapeHTML(cls.name)}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-primary btn-block" id="enroll-add">${icon('plus', 16)} Matricular aluno</button>
        <div class="panel-sub" style="margin-top:12px;line-height:1.6">A matrícula dá ao aluno acesso às aulas, trabalhos e eventos específicos da turma.</div>
      </section>
    </div>`;
}

function bindEnrollmentForm() {
  const button = document.getElementById('enroll-add');
  if (!button) return;
  button.addEventListener('click', () => {
    const studentId = Number(document.getElementById('enroll-student').value);
    const classId = Number(document.getElementById('enroll-class').value);
    if (!studentId || !classId) {
      toast('Selecione aluno e turma', 'Os dois campos são obrigatórios para matricular.', 'warning');
      return;
    }
    const exists = state.enrollments.some((e) => e.student_id === studentId && e.class_id === classId);
    if (exists) {
      toast('Matrícula já existe', 'Esse aluno já está nesta turma.', 'warning');
      return;
    }
    state.enrollments.push({ id: Date.now(), student_id: studentId, class_id: classId });
    saveState();
    renderAdminPage();
    toast('Aluno matriculado', 'A turma já aparece no dashboard do aluno.', 'success');
  });
}

function openUserModal(id = null) {
  if (!isAdmin()) return;
  const user = id ? getUserById(id) : null;
  const currentStage = SCHOOL_STAGES[user?.stage] ? user.stage : 'medio';
  const stageGrades = getGradeOptions(currentStage);
  const currentGrade = stageGrades.includes(user?.grade) ? user.grade : stageGrades[0];
  const stageOptions = Object.entries(SCHOOL_STAGES).map(([key, stage]) => `
    <option value="${key}" ${currentStage === key ? 'selected' : ''}>${stage.label}</option>`).join('');
  const gradeOptions = stageGrades.map((grade) => `
    <option value="${grade}" ${currentGrade === grade ? 'selected' : ''}>${grade}</option>`).join('');
  openModal({
    title: user ? 'Editar usuário' : 'Novo usuário',
    subtitle: user ? 'Atualize os dados do perfil.' : 'Cadastre um aluno, professor ou administrador.',
    iconName: user ? 'pencil' : 'user-plus',
    size: 'md',
    body: `
      <form id="user-form" class="form-grid">
        <div class="field span-2">
          <label for="user-name">Nome completo</label>
          <input class="input" id="user-name" type="text" value="${utils.escapeHTML(user?.name || '')}" placeholder="Ex.: Maria Silva" required>
        </div>
        <div class="field span-2">
          <label for="user-email">Email</label>
          <input class="input" id="user-email" type="email" value="${utils.escapeHTML(user?.email || '')}" placeholder="maria@escola.com" required>
        </div>
        <div class="field span-2">
          <label for="user-role">Perfil</label>
          <select class="select" id="user-role">
            <option value="aluno" ${(!user || user.role === 'aluno') ? 'selected' : ''}>Aluno do Fundamental II / Ensino Médio</option>
            <option value="professor" ${user?.role === 'professor' ? 'selected' : ''}>Professor</option>
            <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Administrador</option>
          </select>
        </div>
        <div class="field user-student-fields" data-user-student>
          <label for="user-stage">Etapa de ensino</label>
          <select class="select" id="user-stage">${stageOptions}</select>
        </div>
        <div class="field user-student-fields" data-user-student>
          <label for="user-grade">Ano/série</label>
          <select class="select" id="user-grade">${gradeOptions}</select>
        </div>
        <div class="field span-2 user-staff-fields" data-user-staff>
          <label for="user-subject">Área de atuação</label>
          <input class="input" id="user-subject" type="text" value="${utils.escapeHTML(user?.role === 'aluno' ? '' : (user?.subject || ''))}" placeholder="Ex.: Matemática">
        </div>
        <div class="field span-2">
          <label for="user-password">${user ? 'Nova senha (opcional)' : 'Senha de acesso'}</label>
          <input class="input" id="user-password" type="text" value="" placeholder="${user ? 'Deixe em branco para manter a atual' : 'Mínimo de 6 caracteres'}" ${user ? '' : 'required'}>
        </div>
      </form>`,
    footer: `
      <button class="btn btn-secondary" data-modal-close>Cancelar</button>
      <button class="btn btn-primary" id="user-save">${icon('check', 16)} Salvar usuário</button>`,
    onOpen(modal) {
      const roleSelect = modal.querySelector('#user-role');
      const stageSelect = modal.querySelector('#user-stage');
      const gradeSelect = modal.querySelector('#user-grade');
      const subjectInput = modal.querySelector('#user-subject');
      const syncRoleFields = () => {
        const isStudent = roleSelect.value === 'aluno';
        modal.querySelectorAll('[data-user-student]').forEach((field) => { field.hidden = !isStudent; });
        modal.querySelectorAll('[data-user-staff]').forEach((field) => { field.hidden = isStudent; });
      };
      const fillGrades = (selected) => {
        const options = getGradeOptions(stageSelect.value);
        gradeSelect.innerHTML = options.map((grade) => `<option value="${grade}" ${selected === grade ? 'selected' : ''}>${grade}</option>`).join('');
        if (!options.includes(selected)) gradeSelect.value = options[0] || '';
      };
      roleSelect.addEventListener('change', syncRoleFields);
      stageSelect.addEventListener('change', () => fillGrades(''));
      syncRoleFields();
      modal.querySelector('#user-save').addEventListener('click', () => {
        const name = modal.querySelector('#user-name').value.trim();
        const email = modal.querySelector('#user-email').value.trim().toLowerCase();
        const role = roleSelect.value;
        const password = modal.querySelector('#user-password').value;
        if (!name || !email || (!user && password.length < 6)) {
          toast('Dados incompletos', 'Preencha nome, email e uma senha com pelo menos 6 caracteres.', 'warning');
          return;
        }
        if (password && password.length < 6) {
          toast('Senha muito curta', 'Use pelo menos 6 caracteres.', 'warning');
          return;
        }
        const duplicated = state.users.some((u) => u.email.toLowerCase() === email && u.id !== user?.id);
        if (duplicated) {
          toast('Email em uso', 'Já existe um usuário com esse email.', 'warning');
          return;
        }
        if (user) {
          const previousRole = user.role;
          Object.assign(user, { name, email, role });
          if (role === 'aluno') {
            const stage = SCHOOL_STAGES[stageSelect.value] ? stageSelect.value : (user.stage || 'medio');
            const grade = getGradeOptions(stage).includes(gradeSelect.value) ? gradeSelect.value : getGradeOptions(stage)[0];
            user.stage = stage;
            user.grade = grade;
            user.subject = `${grade} · ${getStageShort(stage)}`;
            user.avatarTone = user.avatarTone || 'indigo';
            if (user.onboardingDone === undefined) user.onboardingDone = true;
            syncStudentEnrollments(user);
          } else {
            user.subject = subjectInput.value.trim();
            user.onboardingDone = true;
            delete user.stage;
            delete user.grade;
            if (previousRole === 'aluno') {
              state.enrollments = state.enrollments.filter((e) => e.student_id !== user.id);
            }
          }
          if (password) user.password = password;
        } else {
          const created = {
            id: Math.max(0, ...state.users.map((u) => Number(u.id) || 0)) + 1,
            name,
            email,
            role,
            password
          };
          if (role === 'aluno') {
            const stage = SCHOOL_STAGES[stageSelect.value] ? stageSelect.value : 'medio';
            const grade = getGradeOptions(stage).includes(gradeSelect.value) ? gradeSelect.value : getGradeOptions(stage)[0];
            Object.assign(created, {
              stage,
              grade,
              subject: `${grade} · ${getStageShort(stage)}`,
              avatarTone: 'indigo',
              onboardingDone: false
            });
          } else {
            created.subject = subjectInput.value.trim();
            created.onboardingDone = true;
          }
          state.users.push(created);
          if (role === 'aluno') syncStudentEnrollments(created);
        }
        saveState();
        closeModal();
        renderAdminPage();
        toast(user ? 'Usuário atualizado' : 'Usuário criado', `“${name}” foi salvo com sucesso.`, 'success');
      });
    }
  });
}

async function deleteUser(id) {
  const user = getUserById(id);
  if (!user) return;
  if (user.id === state.currentUser.id) {
    toast('Ação não permitida', 'Você não pode excluir a própria conta.', 'warning');
    return;
  }
  if (user.role === 'admin' && state.users.filter((u) => u.role === 'admin').length === 1) {
    toast('Ação não permitida', 'É necessário manter pelo menos um administrador.', 'warning');
    return;
  }
  const ok = await confirmDialog({
    title: 'Excluir usuário?',
    message: `“${utils.escapeHTML(user.name)}” perderá o acesso e suas matrículas serão removidas.`,
    confirmText: 'Excluir',
    danger: true
  });
  if (!ok) return;
  state.users = state.users.filter((u) => u.id !== user.id);
  state.enrollments = state.enrollments.filter((e) => e.student_id !== user.id);
  state.events.forEach((event) => {
    event.attendees = (event.attendees || []).filter((uid) => uid !== user.id);
  });
  saveState();
  renderAdminPage();
  toast('Usuário excluído', 'O perfil foi removido da escola.', 'success');
}

function openClassForm(id = null) {
  if (!isAdmin()) return;
  const cls = id ? getClassById(id) : null;
  const professors = state.users.filter((u) => u.role === 'professor' || u.role === 'admin');
  openModal({
    title: cls ? 'Editar turma' : 'Nova turma',
    subtitle: cls ? 'Ajuste horário, sala ou professor.' : 'Crie uma aula fixa na grade semanal.',
    iconName: cls ? 'pencil' : 'book-open',
    size: 'lg',
    body: `
      <form id="class-form" class="form-grid">
        <div class="field span-2">
          <label for="class-name">Nome da turma</label>
          <input class="input" id="class-name" type="text" value="${utils.escapeHTML(cls?.name || '')}" placeholder="Ex.: Matemática — Ensino Médio" required>
        </div>
        <div class="field span-2">
          <label for="class-desc">Descrição</label>
          <textarea class="textarea" id="class-desc" placeholder="Conteúdo e objetivos da turma…">${utils.escapeHTML(cls?.description || '')}</textarea>
        </div>
        <div class="field span-2">
          <label for="class-stage">Etapa de ensino</label>
          <select class="select" id="class-stage">
            ${Object.entries(SCHOOL_STAGES).map(([key, stage]) => `<option value="${key}" ${(cls?.stage || 'medio') === key ? 'selected' : ''}>${stage.label}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="class-day">Dia da semana</label>
          <select class="select" id="class-day">
            ${[1, 2, 3, 4, 5].map((day) => `<option value="${day}" ${(cls?.day_of_week || 1) === day ? 'selected' : ''}>${utils.getDayOfWeekName(day)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="class-room">Sala</label>
          <input class="input" id="class-room" type="text" value="${utils.escapeHTML(cls?.room || '')}" placeholder="Ex.: Sala 101" required>
        </div>
        <div class="field">
          <label for="class-start">Início</label>
          <input class="input" id="class-start" type="time" value="${cls?.time_start || '08:00'}" required>
        </div>
        <div class="field">
          <label for="class-end">Término</label>
          <input class="input" id="class-end" type="time" value="${cls?.time_end || '09:30'}" required>
        </div>
        <div class="field">
          <label for="class-teacher">Professor</label>
          <select class="select" id="class-teacher">
            ${professors.map((prof) => `<option value="${prof.id}" ${(cls?.teacher_id || professors[0]?.id) === prof.id ? 'selected' : ''}>${utils.escapeHTML(prof.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="class-color">Cor da turma</label>
          <input class="input" id="class-color" type="color" value="${cls?.color || CLASS_COLORS[0]}" style="padding:4px;height:44px;cursor:pointer">
        </div>
      </form>`,
    footer: `
      <button class="btn btn-secondary" data-modal-close>Cancelar</button>
      <button class="btn btn-primary" id="class-save">${icon('check', 16)} Salvar turma</button>`,
    onOpen(modal) {
      modal.querySelector('#class-save').addEventListener('click', () => {
        const name = modal.querySelector('#class-name').value.trim();
        const description = modal.querySelector('#class-desc').value.trim();
        const day = Number(modal.querySelector('#class-day').value);
        const stage = modal.querySelector('#class-stage').value;
        const room = modal.querySelector('#class-room').value.trim();
        const start = modal.querySelector('#class-start').value;
        const end = modal.querySelector('#class-end').value;
        const teacherId = Number(modal.querySelector('#class-teacher').value);
        const color = modal.querySelector('#class-color').value;
        if (!name || !room || !start || !end) {
          toast('Dados incompletos', 'Nome, sala e horários são obrigatórios.', 'warning');
          return;
        }
        if (end <= start) {
          toast('Horário inválido', 'O término precisa ser depois do início.', 'warning');
          return;
        }
        if (cls) {
          Object.assign(cls, { name, description, stage, day_of_week: day, room, time_start: start, time_end: end, teacher_id: teacherId, color });
        } else {
          state.classes.push({
            id: Math.max(0, ...state.classes.map((c) => Number(c.id) || 0)) + 1,
            name, description, stage, day_of_week: day, room, time_start: start, time_end: end, teacher_id: teacherId, color
          });
        }
        saveState();
        closeModal();
        renderAdminPage();
        toast(cls ? 'Turma atualizada' : 'Turma criada', `“${name}” está na grade semanal.`, 'success');
      });
    }
  });
}

async function deleteClass(id) {
  const cls = getClassById(id);
  if (!cls) return;
  const ok = await confirmDialog({
    title: 'Excluir turma?',
    message: `“${utils.escapeHTML(cls.name)}” será removida junto com suas matrículas e trabalhos vinculados.`,
    confirmText: 'Excluir turma',
    danger: true
  });
  if (!ok) return;
  state.classes = state.classes.filter((c) => c.id !== cls.id);
  state.enrollments = state.enrollments.filter((e) => e.class_id !== cls.id);
  state.assignments = state.assignments.filter((a) => a.class_id !== cls.id);
  state.events.forEach((event) => {
    if (event.class_id === cls.id) {
      event.class_id = null;
      event.is_global = true;
    }
  });
  saveState();
  renderAdminPage();
  toast('Turma excluída', 'Os vínculos e trabalhos da turma foram removidos.', 'success');
}

async function removeEnrollment(id) {
  const enrollment = state.enrollments.find((e) => e.id === Number(id));
  if (!enrollment) return;
  const student = getUserById(enrollment.student_id);
  const cls = getClassById(enrollment.class_id);
  const ok = await confirmDialog({
    title: 'Remover matrícula?',
    message: `“${utils.escapeHTML(student?.name || 'Aluno')}” deixará de ter acesso a “${utils.escapeHTML(cls?.name || 'turma')}”.`,
    confirmText: 'Remover',
    danger: true
  });
  if (!ok) return;
  state.enrollments = state.enrollments.filter((e) => e.id !== enrollment.id);
  saveState();
  renderAdminPage();
  toast('Matrícula removida', 'O aluno não verá mais essa turma.', 'success');
}

// ---------------------------------------------------------------------------
// Login

function initLogin() {
  const wantsSignup = new URLSearchParams(window.location.search).get('signup') === '1';
  if (state.currentUser) {
    if (wantsSignup && isGuestUser(state.currentUser)) {
      clearSession();
      state.currentUser = null;
    } else {
      window.location.replace('dashboard.html');
      return;
    }
  }

  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const loginView = document.getElementById('login-view');
  const signupView = document.getElementById('signup-view');
  const roleButtons = Array.from(document.querySelectorAll('.role-picker button'));
  const loginError = document.getElementById('login-error');
  const signupError = document.getElementById('signup-error');
  const stageSelect = document.getElementById('signup-stage');
  const gradeSelect = document.getElementById('signup-grade');
  let selectedRole = 'aluno';

  const showError = (box, message) => {
    if (!box) return;
    box.innerHTML = `${icon('alert-circle', 15)} ${utils.escapeHTML(message)}`;
    box.classList.add('show');
  };

  const clearError = (box) => {
    if (box) box.classList.remove('show');
  };

  const showView = (view) => {
    if (loginView) loginView.hidden = view !== 'login';
    if (signupView) signupView.hidden = view !== 'signup';
    clearError(loginError);
    clearError(signupError);
    if (view === 'signup') {
      const nameInput = document.getElementById('signup-name');
      if (nameInput) setTimeout(() => nameInput.focus(), 120);
    } else {
      const emailInput = document.getElementById('email');
      if (emailInput) setTimeout(() => emailInput.focus(), 120);
    }
  };

  roleButtons.forEach((button) => {
    button.addEventListener('click', () => {
      selectedRole = button.dataset.role;
      roleButtons.forEach((item) => {
        item.classList.toggle('active', item === button);
        item.setAttribute('aria-selected', item === button ? 'true' : 'false');
      });
      clearError(loginError);
    });
  });

  document.querySelectorAll('[data-demo-role]').forEach((button) => {
    button.addEventListener('click', () => {
      const demoUser = state.users.find((u) => u.role === button.dataset.demoRole && ['ana@professor.com', 'carlos@aluno.com', 'admin@escola.com'].includes(u.email));
      if (!demoUser) return;
      document.getElementById('email').value = demoUser.email;
      document.getElementById('password').value = demoUser.password;
      selectedRole = demoUser.role;
      roleButtons.forEach((item) => {
        const active = item.dataset.role === demoUser.role;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      clearError(loginError);
      toast('Conta demo preenchida', `Use ${demoUser.email} para entrar como ${getRoleLabel(demoUser.role).toLowerCase()}.`, 'info', 3000);
    });
  });

  const bindPasswordToggle = (toggle, input) => {
    if (!toggle || !input) return;
    toggle.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      toggle.innerHTML = icon(isPassword ? 'eye-off' : 'eye', 17);
      toggle.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
    });
  };
  bindPasswordToggle(document.getElementById('toggle-password'), document.getElementById('password'));
  bindPasswordToggle(document.getElementById('toggle-signup-password'), document.getElementById('signup-password'));

  const fillSignupGrades = (selected = '') => {
    if (!stageSelect || !gradeSelect) return;
    const options = getGradeOptions(stageSelect.value);
    gradeSelect.innerHTML = options.map((grade) => `<option value="${grade}" ${selected === grade ? 'selected' : ''}>${grade}</option>`).join('');
    if (selected && options.includes(selected)) gradeSelect.value = selected;
    else gradeSelect.value = options[0] || '';
  };
  if (stageSelect) {
    stageSelect.innerHTML = Object.entries(SCHOOL_STAGES).map(([key, stage]) => `<option value="${key}" ${key === 'fundamental' ? 'selected' : ''}>${stage.label}</option>`).join('');
    fillSignupGrades('8º ano');
    stageSelect.addEventListener('change', () => fillSignupGrades(''));
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      clearError(loginError);
      const email = document.getElementById('email').value.trim().toLowerCase();
      const password = document.getElementById('password').value;
      const submit = document.getElementById('login-submit');
      const user = state.users.find((u) => u.email.toLowerCase() === email && u.password === password);

      if (!user) {
        showError(loginError, 'Email ou senha incorretos. Confira os dados e tente novamente.');
        return;
      }
      if (user.role !== selectedRole) {
        showError(loginError, `Essa conta pertence ao perfil “${getRoleLabel(user.role)}”. Selecione o perfil correto para entrar.`);
        return;
      }

      state.currentUser = user;
      setSession(user);
      if (submit) {
        submit.disabled = true;
        submit.innerHTML = `${icon('loader', 18)} Entrando…`;
        submit.querySelector('svg')?.classList.add('spin');
      }
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 550);
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', (event) => {
      event.preventDefault();
      clearError(signupError);
      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim().toLowerCase();
      const password = document.getElementById('signup-password').value;
      const confirm = document.getElementById('signup-confirm').value;
      const stage = stageSelect?.value || 'fundamental';
      const grade = gradeSelect?.value || getGradeOptions(stage)[0];
      const submit = document.getElementById('signup-submit');

      if (name.length < 2) {
        showError(signupError, 'Digite seu nome completo para criar a conta.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError(signupError, 'Informe um email válido. Ele será usado para entrar no SchoolFlow.');
        return;
      }
      if (state.users.some((u) => u.email.toLowerCase() === email)) {
        showError(signupError, 'Já existe uma conta com esse email. Tente entrar ou use outro endereço.');
        return;
      }
      if (!stage || !grade) {
        showError(signupError, 'Escolha sua etapa de ensino e o ano/série.');
        return;
      }
      if (password.length < 6) {
        showError(signupError, 'Sua senha precisa ter pelo menos 6 caracteres.');
        return;
      }
      if (password !== confirm) {
        showError(signupError, 'As senhas não conferem. Confira e tente novamente.');
        return;
      }

      const user = registerStudent({ name, email, password, stage, grade, avatarTone: 'indigo' });
      state.currentUser = user;
      setSession(user);
      if (submit) {
        submit.disabled = true;
        submit.innerHTML = `${icon('loader', 18)} Criando conta…`;
        submit.querySelector('svg')?.classList.add('spin');
      }
      toast('Conta criada!', 'Vamos conhecer o SchoolFlow juntos.', 'success', 3000);
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 750);
    });
  }

  document.getElementById('show-signup')?.addEventListener('click', () => showView('signup'));
  document.getElementById('show-login')?.addEventListener('click', () => showView('login'));

  document.getElementById('guest-login')?.addEventListener('click', () => {
    const guest = getGuestUser();
    state.currentUser = guest;
    setSession(guest);
    const button = document.getElementById('guest-login');
    if (button) {
      button.disabled = true;
      button.innerHTML = `${icon('loader', 17)} Abrindo demonstração…`;
    }
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 350);
  });

  if (wantsSignup) {
    showView('signup');
  } else {
    const emailInput = document.getElementById('email');
    if (emailInput) setTimeout(() => emailInput.focus(), 250);
  }
}

// ---------------------------------------------------------------------------
// Eventos de página

let pageEventsBound = false;

function bindPageEvents() {
  if (pageEventsBound) return;
  pageEventsBound = true;

  document.addEventListener('sf:action', (event) => {
    const { action, el } = event.detail;
    switch (action) {
      case 'open-class':
        openClassModal(Number(el.dataset.id));
        break;
      case 'select-week-day':
        pageState.weekDay = Number(el.dataset.day);
        initDashboard();
        break;
      case 'task-view':
        prefs.taskView = el.dataset.view;
        savePrefs();
        initAssignments();
        break;
      case 'task-filter':
        pageState.taskStatus = el.dataset.status;
        initAssignments();
        break;
      case 'clear-task-filters':
        pageState.taskStatus = 'all';
        pageState.taskClass = 'all';
        pageState.taskPriority = 'all';
        pageState.taskDue = 'all';
        pageState.taskSearch = '';
        initAssignments();
        break;
      case 'delete-task':
        deleteTask(Number(el.dataset.id));
        break;
      case 'calendar-prev':
        pageState.calendarMonth = new Date(pageState.calendarMonth.getFullYear(), pageState.calendarMonth.getMonth() - 1, 1);
        renderEventsPage();
        break;
      case 'calendar-next':
        pageState.calendarMonth = new Date(pageState.calendarMonth.getFullYear(), pageState.calendarMonth.getMonth() + 1, 1);
        renderEventsPage();
        break;
      case 'calendar-today': {
        const today = new Date();
        pageState.calendarMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        pageState.calendarSelected = utils.toISO(today);
        renderEventsPage();
        break;
      }
      case 'select-calendar-day': {
        const iso = el.dataset.date;
        pageState.calendarSelected = iso;
        const parsed = utils.parseISO(iso);
        if (parsed.getMonth() !== pageState.calendarMonth.getMonth()) {
          pageState.calendarMonth = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
        }
        renderEventsPage();
        break;
      }
      case 'admin-tab':
        pageState.adminTab = el.dataset.tab;
        prefs.adminTab = el.dataset.tab;
        savePrefs();
        renderAdminPage();
        break;
      case 'new-class':
        openClassForm();
        break;
      case 'edit-class':
        openClassForm(Number(el.dataset.id));
        break;
      case 'delete-class':
        deleteClass(Number(el.dataset.id));
        break;
      case 'edit-user':
        openUserModal(Number(el.dataset.id));
        break;
      case 'delete-user':
        deleteUser(Number(el.dataset.id));
        break;
      case 'remove-enrollment':
        removeEnrollment(Number(el.dataset.id));
        break;
      default:
        break;
    }
  });

  document.addEventListener('input', (event) => {
    if (event.target.id === 'task-search') {
      pageState.taskSearch = event.target.value;
      renderTaskView();
      const summary = document.querySelector('.task-filter-summary');
      if (summary) summary.textContent = `${getFilteredTasks().length} de ${getScopedAssignments().length} trabalhos`;
    } else if (event.target.id === 'admin-user-search') {
      pageState.adminUserQuery = event.target.value;
      renderAdminUsersTable();
    }
  });

  document.addEventListener('change', (event) => {
    const target = event.target;
    if (target.id === 'task-class-filter') {
      pageState.taskClass = target.value;
      initAssignments();
    } else if (target.id === 'task-priority-filter') {
      pageState.taskPriority = target.value;
      initAssignments();
    } else if (target.id === 'task-status-filter') {
      pageState.taskStatus = target.value;
      initAssignments();
    } else if (target.id === 'task-due-filter') {
      pageState.taskDue = target.value;
      initAssignments();
    } else if (target.id === 'event-category-filter') {
      prefs.calendarCategory = target.value;
      savePrefs();
      renderEventsPage();
    } else if (target.matches('[data-task-status]')) {
      if (!canEditData()) {
        guestBlocked('alterar status');
        initAssignments();
        return;
      }
      const task = getAssignmentById(Number(target.dataset.taskStatus));
      if (!task) return;
      const wasDone = task.status === 'done';
      task.status = target.value;
      saveState();
      if (task.status === 'done' && !wasDone) {
        confetti(44);
        toast('Trabalho concluído', `“${task.title}” foi finalizado.`, 'success');
      } else {
        toast('Status atualizado', `“${task.title}” agora está em ${STATUSES[task.status].label}.`, 'info', 2400);
      }
      refreshCurrentPage();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const page = currentPage();
  if (page === 'login') {
    initLogin();
    return;
  }
  if (!state.currentUser) return;
  bindPageEvents();
  if (page === 'dashboard') {
    initDashboard();
    maybeShowOnboarding();
  } else if (page === 'assignments') initAssignments();
  else if (page === 'events') initEvents();
  else if (page === 'admin') initAdmin();
});

