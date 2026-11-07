// SchoolFlow — núcleo da aplicação (shell, tema, overlays, timer)
// ---------------------------------------------------------------------------

const DEFAULT_PREFS = {
  theme: 'system',
  accent: 'indigo',
  vibrancy: 'super',
  density: 'comfortable',
  motion: 'full',
  sidebarCollapsed: false,
  sidebarPosition: 'left',
  topbarPosition: 'top',
  settingsTab: 'appearance',
  taskView: 'board',
  adminTab: 'overview',
  calendarCategory: 'all'
};

function loadPrefs() {
  try {
    return Object.assign({}, DEFAULT_PREFS, JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'));
  } catch (error) {
    return { ...DEFAULT_PREFS };
  }
}

let prefs = loadPrefs();
let focusTimer = { total: 25 * 60, remaining: 25 * 60, running: false, mode: 'Foco', taskId: null, interval: null };
let activeModal = null;
const modalStack = [];
let paletteState = { open: false, index: 0, filtered: [] };
let paletteEl = null;

function savePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    /* ignore */
  }
}

function resolveTheme() {
  if (prefs.theme === 'system') {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return prefs.theme;
}

function applyAppearance() {
  const root = document.documentElement;
  const resolved = resolveTheme();
  root.dataset.theme = resolved;
  root.dataset.accent = prefs.accent;
  const vibrancy = ['super', 'soft', 'normal', 'classic'].includes(prefs.vibrancy) ? prefs.vibrancy : 'super';
  prefs.vibrancy = vibrancy;
  root.dataset.vibrancy = vibrancy;
  root.dataset.density = prefs.density;
  root.dataset.motion = prefs.motion;
  root.dataset.sidebarPosition = prefs.sidebarPosition === 'right' ? 'right' : 'left';
  root.dataset.topbarPosition = prefs.topbarPosition === 'bottom' ? 'bottom' : 'top';
  document.body.classList.toggle('sidebar-collapsed', Boolean(prefs.sidebarCollapsed));
  document.querySelectorAll('[data-theme-icon]').forEach((el) => {
    el.innerHTML = icon(resolved === 'dark' ? 'sun' : 'moon', 18);
  });
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#08090f' : '#f4f5fa');
  updateTimerUI();
}

function cycleTheme() {
  const current = resolveTheme();
  prefs.theme = current === 'dark' ? 'light' : 'dark';
  savePrefs();
  applyAppearance();
  toast('Tema atualizado', `Modo ${prefs.theme === 'dark' ? 'escuro' : 'claro'} ativado.`, 'info', 2400);
}

function restoreSession() {
  const session = getSession();
  if (!session) return;
  const user = state.users.find((u) => u.id === Number(session.id));
  if (user) {
    state.currentUser = user;
    setSession(user);
  }
}

function isAdmin() {
  return state.currentUser?.role === 'admin';
}

function requireAuth() {
  if (!state.currentUser) {
    window.location.replace('login.html');
    return false;
  }
  return true;
}

function logout() {
  clearSession();
  state.currentUser = null;
  window.location.href = 'login.html';
}

function pageLabel(page) {
  return {
    dashboard: 'Visão geral',
    assignments: 'Trabalhos',
    events: 'Eventos',
    admin: 'Administração'
  }[page] || 'SchoolFlow';
}

function currentPage() {
  return document.body.dataset.page || 'dashboard';
}

function getPendingCount() {
  return getPendingAssignments().length;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function getFirstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

function getInitials(name) {
  return utils.initials(name);
}

function isTypingTarget(target) {
  return target && (target.matches('input, textarea, select, [contenteditable="true"]'));
}

// ---------------------------------------------------------------------------
// Shell

function sidebarTemplate(active) {
  const user = state.currentUser;
  const pending = getPendingCount();
  const streak = getFocusStreak();
  const sidebarRight = prefs.sidebarPosition === 'right';
  const collapseIcon = sidebarRight ? 'panel-right-close' : 'panel-left-close';
  const expandIcon = sidebarRight ? 'panel-right-open' : 'panel-left-open';
  const adminLink = isAdmin() ? `
    <a class="nav-item ${active === 'admin' ? 'active' : ''}" href="admin.html" data-nav="admin" title="Administração">
      <span class="icon">${icon('shield-check', 19)}</span>
      <span class="nav-text">Administração</span>
    </a>` : '';
  return `
  <aside class="sidebar" aria-label="Navegação principal">
    <div class="brand">
      <a class="brand-mark" href="dashboard.html" aria-label="SchoolFlow — início">${icon('graduation-cap', 21)}</a>
      <div class="brand-copy">
        <a class="brand-name" href="dashboard.html">School<span>Flow</span></a>
        <div class="brand-tag">study in flow</div>
      </div>
      <button class="icon-btn sidebar-collapse" data-action="collapse-sidebar" title="Recolher menu" aria-label="Recolher menu">
        ${icon(collapseIcon, 17)}
      </button>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-label">Principal</div>
      <a class="nav-item ${active === 'dashboard' ? 'active' : ''}" href="dashboard.html" data-nav="dashboard" title="Início">
        <span class="icon">${icon('layout-dashboard', 19)}</span>
        <span class="nav-text">Início</span>
      </a>
      <a class="nav-item ${active === 'assignments' ? 'active' : ''}" href="assignments.html" data-nav="assignments" title="Trabalhos">
        <span class="icon">${icon('clipboard-list', 19)}</span>
        <span class="nav-text">Trabalhos</span>
        <span class="nav-badge ${pending > 0 ? 'alert' : ''}">${pending}</span>
      </a>
      <a class="nav-item ${active === 'events' ? 'active' : ''}" href="events.html" data-nav="events" title="Eventos">
        <span class="icon">${icon('calendar-days', 19)}</span>
        <span class="nav-text">Eventos</span>
      </a>
      ${adminLink}

      <div class="nav-label">Ferramentas</div>
      <button class="nav-item" data-action="open-focus" title="Modo foco">
        <span class="icon">${icon('timer', 19)}</span>
        <span class="nav-text">Modo foco</span>
      </button>
      <button class="nav-item" data-action="open-settings" title="Opções">
        <span class="icon">${icon('settings', 19)}</span>
        <span class="nav-text">Opções</span>
      </button>
      <button class="nav-item" data-action="open-shortcuts" title="Atalhos">
        <span class="icon">${icon('keyboard', 19)}</span>
        <span class="nav-text">Atalhos</span>
        <span class="nav-badge">?</span>
      </button>
    </nav>

    <div class="sidebar-footer">
      <div class="streak-card" title="${streak} dias de foco">
        <div class="streak-flame">${icon('flame', 18)}</div>
        <div class="streak-copy">
          <div class="streak-title">${streak} ${streak === 1 ? 'dia' : 'dias'} em flow</div>
          <div class="streak-sub">sequência de foco</div>
        </div>
      </div>
      <div class="user-card">
        <div class="avatar"${avatarToneStyle(user)}>${getInitials(user.name)}</div>
        <div class="user-copy">
          <div class="user-name">${utils.escapeHTML(user.name)}</div>
          <div class="user-role">${utils.escapeHTML(getUserSubtitle(user))}</div>
        </div>
        <button class="icon-btn" data-action="logout" title="Sair" aria-label="Sair">${icon('log-out', 16)}</button>
      </div>
    </div>
  </aside>
  <button class="sidebar-expand" data-action="expand-sidebar" title="Expandir menu" aria-label="Expandir menu">${icon(expandIcon, 16)}</button>
  <div class="sidebar-backdrop" data-action="close-sidebar"></div>`;
}

function topbarTemplate(active) {
  const user = state.currentUser;
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const shortcut = isMac ? '⌘K' : 'Ctrl K';
  return `
  <div class="topbar">
    <div class="topbar-left">
      <button class="icon-btn mobile-menu" data-action="toggle-sidebar" aria-label="Abrir menu">${icon('menu', 20)}</button>
      <div class="crumb">
        <span>SchoolFlow</span>
        <span class="sep">/</span>
        <strong>${pageLabel(active)}</strong>
      </div>
    </div>

    <button class="search-trigger" data-action="open-palette" aria-label="Buscar e executar ações">
      ${icon('search', 17)}
      <span>Buscar ou executar…</span>
      <kbd>${shortcut}</kbd>
    </button>

    <div class="topbar-actions">
      <div class="popover-wrap quick-add-wrap">
        <button class="icon-btn" data-action="toggle-quick-add" aria-label="Criar novo" title="Criar novo">
          ${icon('plus', 20)}
        </button>
        <div class="popover quick-add-menu" id="quick-add-menu">
          <div class="popover-head"><span class="popover-title">Criar rapidamente</span><kbd>N</kbd></div>
          <button class="popover-item" data-action="new-task">
            <span class="q-icon">${icon('clipboard-list', 17)}</span>
            <span><strong>Novo trabalho</strong><small>Adicione uma tarefa com prazo</small></span>
          </button>
          <button class="popover-item" data-action="new-event">
            <span class="q-icon green">${icon('calendar-plus', 17)}</span>
            <span><strong>Novo evento</strong><small>Agende algo no calendário</small></span>
          </button>
          <button class="popover-item" data-action="open-focus">
            <span class="q-icon purple">${icon('timer', 17)}</span>
            <span><strong>Sessão de foco</strong><small>Escolha a duração ideal para estudar</small></span>
          </button>
          ${isAdmin() ? `
          <div class="popover-sep"></div>
          <button class="popover-item" data-action="new-user">
            <span class="q-icon amber">${icon('user-plus', 17)}</span>
            <span><strong>Novo usuário</strong><small>Cadastre aluno ou professor</small></span>
          </button>` : ''}
        </div>
      </div>

      <div class="popover-wrap notifications-wrap">
        <button class="icon-btn" data-action="toggle-notifications" aria-label="Notificações" title="Notificações">
          ${icon('bell', 19)}
          <span class="notification-dot" id="notification-dot" style="display:none"></span>
        </button>
        <div class="popover notifications-panel" id="notifications-panel">
          <div class="notifications-head">
            <h4>Notificações</h4>
            <button class="btn btn-ghost btn-sm" data-action="mark-notifications-read">Marcar lidas</button>
          </div>
          <div class="notifications-list" id="notifications-list"></div>
          <div class="notifications-foot">
            <button class="popover-item" data-action="open-focus" style="justify-content:center">
              ${icon('sparkles', 15)} Começar uma sessão de foco
            </button>
          </div>
        </div>
      </div>

      <button class="icon-btn" data-action="toggle-theme" aria-label="Alternar tema" title="Alternar tema">
        <span data-theme-icon>${icon(resolveTheme() === 'dark' ? 'sun' : 'moon', 18)}</span>
      </button>

      <span class="divider"></span>

      <div class="popover-wrap user-wrap">
        <button class="user-menu-btn" data-action="toggle-user-menu" aria-label="Menu do usuário">
          <div class="avatar sm"${avatarToneStyle(user)}>${getInitials(user.name)}</div>
          <div class="user-copy">
            <div class="user-name">${utils.escapeHTML(user.name)}</div>
            <div class="user-role">${utils.escapeHTML(getUserSubtitle(user))}</div>
          </div>
          <span class="chevron">${icon('chevron-down', 15)}</span>
        </button>
        <div class="popover user-menu" id="user-menu">
          <div class="user-menu-head">
            <div class="avatar"${avatarToneStyle(user)}>${getInitials(user.name)}</div>
            <div class="user-copy">
              <div class="user-name">${utils.escapeHTML(user.name)}</div>
              <div class="user-role">${utils.escapeHTML(user.email)}</div>
              <span class="role-pill">${utils.escapeHTML(getRoleLabel(user.role))}</span>
            </div>
          </div>
          <button class="popover-item" data-action="open-settings">${icon('settings', 17)} Opções e preferências</button>
          <button class="popover-item" data-action="open-shortcuts">${icon('keyboard', 17)} Atalhos do teclado <kbd class="shortcut">?</kbd></button>
          <div class="popover-sep"></div>
          <button class="popover-item" data-action="logout" style="color:var(--danger)">${icon('log-out', 17)} Sair da conta</button>
        </div>
      </div>
    </div>
  </div>`;
}

function mobileNavTemplate(active) {
  return `
  <nav class="mobile-nav" aria-label="Navegação rápida">
    <a href="dashboard.html" class="${active === 'dashboard' ? 'active' : ''}">${icon('layout-dashboard', 20)}<span>Início</span></a>
    <a href="assignments.html" class="${active === 'assignments' ? 'active' : ''}">${icon('clipboard-list', 20)}<span>Trabalhos</span></a>
    <a href="events.html" class="${active === 'events' ? 'active' : ''}">${icon('calendar-days', 20)}<span>Eventos</span></a>
    ${isAdmin() ? `<a href="admin.html" class="${active === 'admin' ? 'active' : ''}">${icon('shield-check', 20)}<span>Admin</span></a>` : `<button data-action="open-focus">${icon('timer', 20)}<span>Foco</span></button>`}
    <button data-action="open-settings">${icon('settings', 20)}<span>Opções</span></button>
  </nav>`;
}

function renderShell() {
  const active = currentPage();
  const sidebarRoot = document.getElementById('sidebar-root');
  const topbarRoot = document.getElementById('topbar-root');
  if (sidebarRoot) sidebarRoot.innerHTML = sidebarTemplate(active);
  if (topbarRoot) topbarRoot.innerHTML = topbarTemplate(active);
  const mobileRoot = document.getElementById('mobile-nav-root');
  if (mobileRoot) mobileRoot.innerHTML = mobileNavTemplate(active);
  renderNotifications();
  updateTimerUI();
}

// ---------------------------------------------------------------------------
// Notificações

function getNotifications() {
  const items = [];
  const pending = getPendingAssignments();
  pending.slice(0, 3).forEach((assignment) => {
    const meta = utils.dueMeta(assignment.due_date, assignment.status);
    if (meta.tone === 'danger' || meta.tone === 'warning') {
      items.push({
        id: `due-${assignment.id}-${assignment.due_date}`,
        icon: meta.tone === 'danger' ? 'alert-circle' : 'clock',
        tone: meta.tone,
        title: meta.tone === 'danger' ? 'Entrega atrasada' : 'Prazo se aproximando',
        text: `${assignment.title} — ${meta.label.toLowerCase()}`,
        time: getClassName(assignment.class_id),
        href: 'assignments.html'
      });
    }
  });

  const todayClasses = getTodayClasses();
  if (todayClasses.length) {
    items.push({
      id: `today-classes-${utils.toISO(new Date())}`,
      icon: 'book-open',
      tone: 'info',
      title: 'Sua rotina de hoje',
      text: `${utils.plural(todayClasses.length, 'aula', 'aulas')} no cronograma. A primeira começa às ${todayClasses[0].time_start}.`,
      time: 'Hoje',
      href: 'dashboard.html'
    });
  }

  getUpcomingEvents(state.currentUser, 4).forEach((event) => {
    const diff = utils.daysUntil(event.date);
    if (diff <= 7) {
      items.push({
        id: `event-${event.id}-${event.date}`,
        icon: 'calendar-days',
        tone: diff <= 2 ? 'warning' : 'success',
        title: diff === 0 ? 'Evento hoje' : 'Evento próximo',
        text: `${event.title} — ${diff === 0 ? 'hoje' : `em ${diff} ${diff === 1 ? 'dia' : 'dias'}`}`,
        time: event.location || 'Escola',
        href: 'events.html'
      });
    }
  });

  if (!items.length) {
    items.push({
      id: 'all-clear',
      icon: 'check-circle',
      tone: 'success',
      title: 'Tudo em dia',
      text: 'Nenhum prazo ou evento urgente por aqui. Aproveite para adiantar seus estudos.',
      time: 'Agora',
      href: 'dashboard.html'
    });
  }
  return items;
}

function renderNotifications() {
  const list = document.getElementById('notifications-list');
  const dot = document.getElementById('notification-dot');
  if (!list) return;
  const items = getNotifications();
  const unread = items.filter((item) => !state.readNotifications.includes(item.id));
  list.innerHTML = items.map((item) => {
    const isUnread = !state.readNotifications.includes(item.id);
    return `
      <a class="notif-item ${isUnread ? 'unread' : ''}" href="${item.href}" data-action="read-notification" data-id="${item.id}">
        <div class="notif-icon ${item.tone}">${icon(item.icon, 17)}</div>
        <div class="notif-copy">
          <strong>${utils.escapeHTML(item.title)}</strong>
          <p>${utils.escapeHTML(item.text)}</p>
          <span class="notif-time">${utils.escapeHTML(item.time)}</span>
        </div>
      </a>`;
  }).join('');
  if (dot) dot.style.display = unread.length ? 'block' : 'none';
}

function markNotificationsRead() {
  getNotifications().forEach((item) => {
    if (!state.readNotifications.includes(item.id)) state.readNotifications.push(item.id);
  });
  saveState();
  renderNotifications();
  toast('Notificações lidas', 'Tudo em dia por aqui.', 'success', 2400);
}

// ---------------------------------------------------------------------------
// Popovers

function closePopovers() {
  document.querySelectorAll('.popover.open').forEach((p) => p.classList.remove('open'));
  document.querySelectorAll('[aria-expanded="true"]').forEach((el) => el.setAttribute('aria-expanded', 'false'));
}

function togglePopover(id, trigger) {
  const el = document.getElementById(id);
  if (!el) return;
  const willOpen = !el.classList.contains('open');
  closePopovers();
  if (willOpen) {
    el.classList.add('open');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
  }
}

// ---------------------------------------------------------------------------
// Modais, confirmação e toasts

function openModal(options) {
  const opts = options || {};
  const {
    title = '',
    subtitle = '',
    body = '',
    footer = '',
    size = 'md',
    iconName = 'sparkles',
    tone = '',
    stack = false,
    onOpen = null,
    onClose = null
  } = opts;

  // Janelas comuns substituem as anteriores. Confirmações e diálogos aninhados
  // usam `stack: true` para manter o modal de origem vivo por baixo.
  if (!stack) {
    while (modalStack.length) closeModal(true);
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal modal-${size}" role="dialog" aria-modal="true" aria-label="${utils.escapeHTML(title)}">
      <div class="modal-head">
        <div class="modal-head-icon ${tone}">${icon(iconName, 20)}</div>
        <div class="modal-head-copy">
          <h2>${utils.escapeHTML(title)}</h2>
          ${subtitle ? `<p>${utils.escapeHTML(subtitle)}</p>` : ''}
        </div>
        <button class="modal-close" data-modal-close aria-label="Fechar">${icon('x', 18)}</button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
    </div>`;
  document.body.appendChild(overlay);
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => overlay.classList.add('open'));

  activeModal = { overlay, onClose };
  modalStack.push(activeModal);
  overlay.querySelectorAll('[data-modal-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal());
  });
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeModal();
  });
  if (onOpen) onOpen(overlay);
  setTimeout(() => {
    const focusable = overlay.querySelector('input:not([type="hidden"]), textarea, select, button');
    if (focusable && !focusable.hasAttribute('data-modal-close')) focusable.focus();
  }, 80);
  return overlay;
}

function closeModal(immediate = false) {
  const entry = modalStack[modalStack.length - 1];
  if (!entry) return;
  const { overlay, onClose } = entry;
  modalStack.pop();
  activeModal = modalStack[modalStack.length - 1] || null;
  overlay.classList.remove('open');
  const remove = () => {
    overlay.remove();
    if (!modalStack.length) document.body.classList.remove('modal-open');
  };
  if (immediate) remove();
  else setTimeout(remove, 200);
  if (onClose) onClose();
}

function confirmDialog(options) {
  const {
    title = 'Confirmar ação',
    message = 'Tem certeza?',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    danger = false
  } = options || {};
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    openModal({
      title,
      size: 'sm',
      iconName: danger ? 'alert-triangle' : 'help-circle',
      tone: danger ? 'danger' : '',
      stack: true,
      body: `<p class="modal-text">${message}</p>`,
      footer: `
        <button class="btn btn-secondary" data-confirm-no>${utils.escapeHTML(cancelText)}</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-confirm-yes>${utils.escapeHTML(confirmText)}</button>`,
      onOpen(overlay) {
        overlay.querySelector('[data-confirm-no]').addEventListener('click', () => {
          finish(false);
          closeModal();
        });
        overlay.querySelector('[data-confirm-yes]').addEventListener('click', () => {
          finish(true);
          closeModal();
        });
      },
      onClose() {
        finish(false);
      }
    });
  });
}

function toast(title, message = '', type = 'info', duration = 3800) {
  let root = document.getElementById('toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
    root.className = 'toast-stack';
    root.setAttribute('aria-live', 'polite');
    document.body.appendChild(root);
  }
  const iconName = { success: 'check-circle', warning: 'alert-triangle', danger: 'x-circle', info: 'info' }[type] || 'info';
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `
    <div class="toast-icon">${icon(iconName, 17)}</div>
    <div class="toast-copy">
      <strong>${utils.escapeHTML(title)}</strong>
      ${message ? `<p>${utils.escapeHTML(message)}</p>` : ''}
    </div>
    <button class="toast-close" aria-label="Fechar">${icon('x', 14)}</button>`;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const remove = () => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 260);
  };
  const timerId = setTimeout(remove, duration);
  el.querySelector('.toast-close').addEventListener('click', () => {
    clearTimeout(timerId);
    remove();
  });
}

// ---------------------------------------------------------------------------
// Aparência / configurações

const APPEARANCE_PRESETS = [
  { id: 'aurora', label: 'Aurora', description: 'Claro, luminoso e vibrante', theme: 'light', accent: 'indigo', vibrancy: 'super', themeIcon: 'sun', iconName: 'sparkles', colors: ['#4f46e5', '#8b5cf6', '#ec4899', '#06b6d4'] },
  { id: 'oceano', label: 'Oceano', description: 'Claro, fresco e sereno', theme: 'light', accent: 'sky', vibrancy: 'soft', themeIcon: 'sun', iconName: 'waves', colors: ['#0ea5e9', '#06b6d4', '#14b8a6', '#6366f1'] },
  { id: 'floresta', label: 'Floresta', description: 'Claro, natural e equilibrado', theme: 'light', accent: 'emerald', vibrancy: 'normal', themeIcon: 'sun', iconName: 'leaf', colors: ['#10b981', '#84cc16', '#14b8a6', '#f59e0b'] },
  { id: 'neon', label: 'Neon', description: 'Escuro, elétrico e intenso', theme: 'dark', accent: 'rose', vibrancy: 'super', themeIcon: 'moon', iconName: 'zap', colors: ['#f43f5e', '#d946ef', '#22d3ee', '#a3e635'] },
  { id: 'nebulosa', label: 'Nebulosa', description: 'Escuro, cósmico e vibrante', theme: 'dark', accent: 'sky', vibrancy: 'super', themeIcon: 'moon', iconName: 'star', colors: ['#0ea5e9', '#22d3ee', '#8b5cf6', '#1e1b4b'] },
  { id: 'por-do-sol', label: 'Pôr do sol', description: 'Escuro, quente e acolhedor', theme: 'dark', accent: 'amber', vibrancy: 'soft', themeIcon: 'moon', iconName: 'sunset', colors: ['#f59e0b', '#f97316', '#f43f5e', '#8b5cf6'] },
  { id: 'floresta-noturna', label: 'Floresta noturna', description: 'Escuro, natural e sereno', theme: 'dark', accent: 'emerald', vibrancy: 'soft', themeIcon: 'moon', iconName: 'leaf', colors: ['#34d399', '#2dd4bf', '#a3e635', '#166534'] },
  { id: 'meia-noite', label: 'Meia-noite', description: 'Escuro, profundo e equilibrado', theme: 'dark', accent: 'indigo', vibrancy: 'normal', themeIcon: 'moon', iconName: 'cloud-moon', colors: ['#6366f1', '#8b5cf6', '#3b82f6', '#1e1b4b'] },
  { id: 'classico', label: 'Clássico', description: 'Sistema, neutro e atemporal', theme: 'system', accent: 'indigo', vibrancy: 'classic', themeIcon: 'monitor', iconName: 'palette', colors: ['#5b5bd6', '#8b5cf6', '#e2e8f0', '#94a3b8'] }
];

function openSettings() {
  const user = state.currentUser;
  const themes = [
    { id: 'light', label: 'Claro', iconName: 'sun', preview: 'light' },
    { id: 'dark', label: 'Escuro', iconName: 'moon', preview: 'dark' },
    { id: 'system', label: 'Sistema', iconName: 'monitor', preview: 'system' }
  ];
  const vibrancies = [
    { id: 'super', label: 'Super vibrante', description: 'Cores intensas e gradientes marcantes.', preview: 'super' },
    { id: 'soft', label: 'Menos vibrante', description: 'Bem colorido, com menos saturação.', preview: 'soft' },
    { id: 'normal', label: 'Normal', description: 'Nem muito colorido, nem muito vibrante.', preview: 'normal' },
    { id: 'classic', label: 'Clássico (o antes)', description: 'O visual anterior, mais neutro.', preview: 'classic' }
  ];
  const accents = Object.entries(ACCENTS);
  const presetMatches = (preset) => prefs.theme === preset.theme && prefs.accent === preset.accent && prefs.vibrancy === preset.vibrancy;
  const isStudent = user.role === 'aluno';
  const currentStage = SCHOOL_STAGES[user.stage] ? user.stage : 'medio';
  const stageGrades = getGradeOptions(currentStage);
  const currentGrade = stageGrades.includes(user.grade) ? user.grade : stageGrades[0];
  const currentAvatarTone = ACCENTS[user.avatarTone] ? user.avatarTone : 'indigo';
  const stageOptions = Object.entries(SCHOOL_STAGES).map(([id, stage]) => `
    <option value="${id}" ${currentStage === id ? 'selected' : ''}>${stage.label}</option>`).join('');
  const gradeOptions = stageGrades.map((grade) => `
    <option value="${grade}" ${currentGrade === grade ? 'selected' : ''}>${grade}</option>`).join('');
  const settingsTabs = [
    { id: 'appearance', label: 'Aparência', iconName: 'palette' },
    { id: 'profile', label: 'Perfil', iconName: 'user' },
    { id: 'layout', label: 'Layout', iconName: 'sliders-horizontal' },
    { id: 'data', label: 'Dados', iconName: 'database' }
  ];
  const activeTab = settingsTabs.some((tab) => tab.id === prefs.settingsTab) ? prefs.settingsTab : 'appearance';
  const overlay = openModal({
    title: 'Opções',
    subtitle: 'Perfil, aparência e layout do SchoolFlow.',
    iconName: 'settings',
    size: 'lg',
    body: `
      <div class="settings-tabs" role="tablist" aria-label="Seções de opções">
        ${settingsTabs.map((tab) => `
          <button class="settings-tab ${activeTab === tab.id ? 'active' : ''}" data-settings-tab="${tab.id}" role="tab" aria-selected="${activeTab === tab.id ? 'true' : 'false'}">
            ${icon(tab.iconName, 14)} ${tab.label}
          </button>`).join('')}
      </div>

      <div class="settings-panel" data-settings-panel="appearance">
        <div class="settings-section">
          <div class="settings-label">Temas prontos</div>
          <div class="preset-grid">
            ${APPEARANCE_PRESETS.map((preset) => `
              <button class="preset-card ${presetMatches(preset) ? 'active' : ''}" data-preset-option="${preset.id}">
                <span class="preset-preview" style="--preset-1:${preset.colors[0]};--preset-2:${preset.colors[1]};--preset-3:${preset.colors[2]};--preset-4:${preset.colors[3]}">
                  <i></i><i></i><i></i><i></i>
                  <span class="preset-mode">${icon(preset.themeIcon, 10)}</span>
                </span>
                <span class="preset-copy">
                  <strong>${icon(preset.iconName, 12)} ${preset.label}</strong>
                  <span>${preset.description}</span>
                </span>
              </button>`).join('')}
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-label">Tema</div>
          <div class="theme-options">
            ${themes.map((theme) => `
              <button class="theme-option ${prefs.theme === theme.id ? 'active' : ''}" data-theme-option="${theme.id}">
                <span class="theme-preview ${theme.preview}"></span>
                ${icon(theme.iconName, 15)} ${theme.label}
              </button>`).join('')}
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-label">Intensidade de cor</div>
          <div class="vibrancy-options">
            ${vibrancies.map((level) => `
              <button class="vibrancy-option ${prefs.vibrancy === level.id ? 'active' : ''}" data-vibrancy-option="${level.id}">
                <span class="vibrancy-preview ${level.preview}"><i></i><i></i><i></i><i></i></span>
                <span class="vibrancy-copy"><strong>${level.label}</strong><span>${level.description}</span></span>
              </button>`).join('')}
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-label">Cor de destaque</div>
          <div class="accent-options">
            ${accents.map(([key, accent]) => `
              <button class="accent-swatch ${prefs.accent === key ? 'active' : ''}" data-accent-option="${key}" title="${accent.label}" aria-label="${accent.label}">
                <span style="--swatch:${accent.color}"></span>
              </button>`).join('')}
          </div>
        </div>
      </div>

      <div class="settings-panel" data-settings-panel="profile" hidden>
        <form id="profile-form" class="profile-form" novalidate>
          <div class="profile-preview">
            <div class="avatar profile-avatar" id="profile-avatar"${avatarToneStyle({ avatarTone: currentAvatarTone })}>${getInitials(user.name)}</div>
            <div class="profile-preview-copy">
              <strong id="profile-preview-name">${utils.escapeHTML(user.name)}</strong>
              <span id="profile-preview-role">${utils.escapeHTML(getRoleLabel(user.role))}${isStudent ? ` · ${utils.escapeHTML(getUserSubtitle(user))}` : ''}</span>
            </div>
          </div>
          <div class="form-grid">
            <div class="field span-2">
              <label for="profile-name">Nome completo</label>
              <input class="input" id="profile-name" type="text" value="${utils.escapeHTML(user.name)}" required>
            </div>
            <div class="field span-2">
              <label for="profile-email">Email</label>
              <input class="input" id="profile-email" type="email" value="${utils.escapeHTML(user.email)}" required>
            </div>
            ${isStudent ? `
            <div class="field">
              <label for="profile-stage">Etapa de ensino</label>
              <select class="select" id="profile-stage">${stageOptions}</select>
            </div>
            <div class="field">
              <label for="profile-grade">Ano/série</label>
              <select class="select" id="profile-grade">${gradeOptions}</select>
            </div>` : `
            <div class="field span-2">
              <label for="profile-subject">Área de atuação</label>
              <input class="input" id="profile-subject" type="text" value="${utils.escapeHTML(user.subject || '')}" placeholder="Ex.: Matemática">
            </div>`}
            <div class="field span-2">
              <label>Cor do avatar</label>
              <div class="avatar-swatches">
                ${accents.map(([key, accent]) => `
                  <button type="button" class="accent-swatch ${currentAvatarTone === key ? 'active' : ''}" data-avatar-tone="${key}" title="${accent.label}" aria-label="${accent.label}" aria-pressed="${currentAvatarTone === key ? 'true' : 'false'}">
                    <span style="--swatch:${accent.color}"></span>
                  </button>`).join('')}
              </div>
              <span class="field-hint">A cor aparece no seu avatar e no menu.</span>
            </div>
          </div>
          <div class="settings-actions">
            <button type="submit" class="btn btn-primary btn-sm" id="profile-save">${icon('check', 15)} Salvar perfil</button>
          </div>
        </form>
      </div>

      <div class="settings-panel" data-settings-panel="layout" hidden>
        <div class="settings-section">
          <div class="settings-label">Barra lateral</div>
          <div class="layout-options">
            <button class="layout-option ${prefs.sidebarPosition !== 'right' ? 'active' : ''}" data-layout-sidebar="left">${icon('panel-left-open', 16)}<span>Esquerda</span></button>
            <button class="layout-option ${prefs.sidebarPosition === 'right' ? 'active' : ''}" data-layout-sidebar="right">${icon('panel-right-open', 16)}<span>Direita</span></button>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-label">Barra superior</div>
          <div class="layout-options">
            <button class="layout-option ${prefs.topbarPosition !== 'bottom' ? 'active' : ''}" data-layout-topbar="top">${icon('panel-top', 16)}<span>No topo</span></button>
            <button class="layout-option ${prefs.topbarPosition === 'bottom' ? 'active' : ''}" data-layout-topbar="bottom">${icon('panel-bottom', 16)}<span>Na parte de baixo</span></button>
          </div>
          <p class="settings-hint">${icon('info', 13)} No celular, a barra superior permanece no topo.</p>
        </div>
        <div class="settings-section">
          <div class="settings-label">Preferências</div>
          <div class="settings-row">
            <div class="settings-row-copy"><strong>Menu recolhido</strong><span>Deixe mais espaço para o conteúdo.</span></div>
            <label class="switch"><input type="checkbox" id="pref-sidebar-collapsed" ${prefs.sidebarCollapsed ? 'checked' : ''}><span></span></label>
          </div>
          <div class="settings-row">
            <div class="settings-row-copy"><strong>Modo compacto</strong><span>Menos espaçamento entre os elementos.</span></div>
            <label class="switch"><input type="checkbox" id="pref-density" ${prefs.density === 'compact' ? 'checked' : ''}><span></span></label>
          </div>
          <div class="settings-row">
            <div class="settings-row-copy"><strong>Reduzir animações</strong><span>Desativa transições e movimentos extras.</span></div>
            <label class="switch"><input type="checkbox" id="pref-motion" ${prefs.motion === 'reduced' ? 'checked' : ''}><span></span></label>
          </div>
        </div>
      </div>

      <div class="settings-panel" data-settings-panel="data" hidden>
        <div class="settings-section">
          <div class="settings-label">Apresentação</div>
          <div class="settings-row">
            <div class="settings-row-copy"><strong>Rever tour</strong><span>Veja novamente as dicas de uso do SchoolFlow.</span></div>
            <button class="btn btn-secondary btn-sm" data-action="open-onboarding">Rever</button>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-label">Dados</div>
          <div class="settings-row">
            <div class="settings-row-copy"><strong>Restaurar demonstração</strong><span>Apaga alterações e volta aos dados originais.</span></div>
            <button class="btn btn-secondary btn-sm" id="pref-reset">Restaurar</button>
          </div>
          <p class="settings-hint">${icon('database', 13)} Seus dados ficam apenas neste navegador.</p>
        </div>
      </div>`,
    footer: `<button class="btn btn-primary" data-modal-close>Concluído</button>`,
    onOpen(modal) {
      const tabs = Array.from(modal.querySelectorAll('[data-settings-tab]'));
      const panels = Array.from(modal.querySelectorAll('[data-settings-panel]'));
      const activateTab = (tabId, persist = true) => {
        const nextTab = tabs.some((tab) => tab.dataset.settingsTab === tabId) ? tabId : 'appearance';
        tabs.forEach((tab) => {
          const on = tab.dataset.settingsTab === nextTab;
          tab.classList.toggle('active', on);
          tab.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        panels.forEach((panel) => {
          panel.hidden = panel.dataset.settingsPanel !== nextTab;
        });
        if (persist) {
          prefs.settingsTab = nextTab;
          savePrefs();
        }
      };
      tabs.forEach((tab) => tab.addEventListener('click', () => activateTab(tab.dataset.settingsTab)));

      const syncControls = () => {
        modal.querySelectorAll('[data-theme-option]').forEach((b) => b.classList.toggle('active', b.dataset.themeOption === prefs.theme));
        modal.querySelectorAll('[data-accent-option]').forEach((b) => b.classList.toggle('active', b.dataset.accentOption === prefs.accent));
        modal.querySelectorAll('[data-vibrancy-option]').forEach((b) => b.classList.toggle('active', b.dataset.vibrancyOption === prefs.vibrancy));
        modal.querySelectorAll('[data-preset-option]').forEach((b) => {
          const preset = APPEARANCE_PRESETS.find((item) => item.id === b.dataset.presetOption);
          b.classList.toggle('active', Boolean(preset && presetMatches(preset)));
        });
      };

      const syncLayout = () => {
        modal.querySelectorAll('[data-layout-sidebar]').forEach((b) => b.classList.toggle('active', b.dataset.layoutSidebar === (prefs.sidebarPosition === 'right' ? 'right' : 'left')));
        modal.querySelectorAll('[data-layout-topbar]').forEach((b) => b.classList.toggle('active', b.dataset.layoutTopbar === (prefs.topbarPosition === 'bottom' ? 'bottom' : 'top')));
        const collapsed = modal.querySelector('#pref-sidebar-collapsed');
        if (collapsed) collapsed.checked = Boolean(prefs.sidebarCollapsed);
      };

      modal.querySelectorAll('[data-preset-option]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const preset = APPEARANCE_PRESETS.find((item) => item.id === btn.dataset.presetOption);
          if (!preset) return;
          prefs.theme = preset.theme;
          prefs.accent = preset.accent;
          prefs.vibrancy = preset.vibrancy;
          savePrefs();
          applyAppearance();
          syncControls();
        });
      });
      modal.querySelectorAll('[data-theme-option]').forEach((btn) => {
        btn.addEventListener('click', () => {
          prefs.theme = btn.dataset.themeOption;
          savePrefs();
          applyAppearance();
          syncControls();
        });
      });
      modal.querySelectorAll('[data-accent-option]').forEach((btn) => {
        btn.addEventListener('click', () => {
          prefs.accent = btn.dataset.accentOption;
          savePrefs();
          applyAppearance();
          syncControls();
        });
      });
      modal.querySelectorAll('[data-vibrancy-option]').forEach((btn) => {
        btn.addEventListener('click', () => {
          prefs.vibrancy = btn.dataset.vibrancyOption;
          savePrefs();
          applyAppearance();
          syncControls();
        });
      });

      modal.querySelectorAll('[data-layout-sidebar]').forEach((btn) => {
        btn.addEventListener('click', () => {
          prefs.sidebarPosition = btn.dataset.layoutSidebar === 'right' ? 'right' : 'left';
          savePrefs();
          applyAppearance();
          syncLayout();
          renderShell();
        });
      });
      modal.querySelectorAll('[data-layout-topbar]').forEach((btn) => {
        btn.addEventListener('click', () => {
          prefs.topbarPosition = btn.dataset.layoutTopbar === 'bottom' ? 'bottom' : 'top';
          savePrefs();
          applyAppearance();
          syncLayout();
        });
      });
      modal.querySelector('#pref-sidebar-collapsed').addEventListener('change', (event) => {
        prefs.sidebarCollapsed = event.target.checked;
        savePrefs();
        applyAppearance();
        syncLayout();
      });
      modal.querySelector('#pref-density').addEventListener('change', (event) => {
        prefs.density = event.target.checked ? 'compact' : 'comfortable';
        savePrefs();
        applyAppearance();
      });
      modal.querySelector('#pref-motion').addEventListener('change', (event) => {
        prefs.motion = event.target.checked ? 'reduced' : 'full';
        savePrefs();
        applyAppearance();
      });

      const profileForm = modal.querySelector('#profile-form');
      if (profileForm) {
        let selectedAvatarTone = currentAvatarTone;
        const previewAvatar = modal.querySelector('#profile-avatar');
        const previewName = modal.querySelector('#profile-preview-name');
        const previewRole = modal.querySelector('#profile-preview-role');
        const nameInput = modal.querySelector('#profile-name');
        const stageSelect = modal.querySelector('#profile-stage');
        const gradeSelect = modal.querySelector('#profile-grade');
        const fillGrades = (selected) => {
          if (!stageSelect || !gradeSelect) return;
          const options = getGradeOptions(stageSelect.value);
          gradeSelect.innerHTML = options.map((grade) => `<option value="${grade}" ${selected === grade ? 'selected' : ''}>${grade}</option>`).join('');
          if (!options.includes(selected)) gradeSelect.value = options[0] || '';
        };
        nameInput.addEventListener('input', () => {
          previewName.textContent = nameInput.value.trim() || 'Seu nome';
        });
        if (stageSelect) stageSelect.addEventListener('change', () => fillGrades(''));
        modal.querySelectorAll('[data-avatar-tone]').forEach((btn) => {
          btn.addEventListener('click', () => {
            selectedAvatarTone = btn.dataset.avatarTone;
            modal.querySelectorAll('[data-avatar-tone]').forEach((item) => {
              const on = item === btn;
              item.classList.toggle('active', on);
              item.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
            const accent = ACCENTS[selectedAvatarTone];
            if (accent && previewAvatar) {
              previewAvatar.style.setProperty('--avatar-a', accent.color);
              previewAvatar.style.setProperty('--avatar-b', accent.color2);
            }
          });
        });
        profileForm.addEventListener('submit', (event) => {
          event.preventDefault();
          const name = modal.querySelector('#profile-name').value.trim();
          const email = modal.querySelector('#profile-email').value.trim().toLowerCase();
          if (!name || !email) {
            toast('Dados incompletos', 'Preencha seu nome e email para salvar o perfil.', 'warning');
            return;
          }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast('Email inválido', 'Confira o endereço de email informado.', 'warning');
            return;
          }
          const duplicated = state.users.some((u) => u.id !== user.id && u.email.toLowerCase() === email);
          if (duplicated) {
            toast('Email em uso', 'Já existe uma conta com esse email.', 'warning');
            return;
          }
          const nextStage = stageSelect ? stageSelect.value : user.stage;
          const nextGrade = gradeSelect ? gradeSelect.value : user.grade;
          const stageChanged = isStudent && (nextStage !== user.stage || nextGrade !== user.grade);
          user.name = name;
          user.email = email;
          user.avatarTone = selectedAvatarTone;
          if (isStudent) {
            user.stage = nextStage;
            user.grade = nextGrade;
            user.subject = `${nextGrade} · ${getStageShort(nextStage)}`;
          } else {
            user.subject = modal.querySelector('#profile-subject')?.value.trim() || user.subject || '';
          }
          if (stageChanged) syncStudentEnrollments(user);
          saveState();
          setSession(user);
          renderShell();
          if (typeof refreshCurrentPage === 'function') refreshCurrentPage();
          previewRole.textContent = `${getRoleLabel(user.role)}${isStudent ? ` · ${getUserSubtitle(user)}` : ''}`;
          toast('Perfil atualizado', 'Suas informações foram salvas.', 'success', 2800);
        });
      }

      modal.querySelector('#pref-reset').addEventListener('click', async () => {
        const ok = await confirmDialog({
          title: 'Restaurar demonstração?',
          message: 'Todas as tarefas, eventos e alterações salvas serão apagados. Você voltará para a tela de login.',
          confirmText: 'Restaurar',
          danger: true
        });
        if (ok) resetDemoData();
      });

      syncControls();
      syncLayout();
      activateTab(activeTab, false);
    }
  });
  return overlay;
}

function openOnboarding(force = false) {
  const user = state.currentUser;
  if (!user) return;
  if (!force && user.onboardingDone !== false) return;
  const steps = [
    {
      iconName: 'layout-dashboard',
      title: 'Sua rotina escolar em um só lugar',
      text: 'O Início reúne o que importa para o seu dia, sem precisar procurar em vários lugares.',
      features: [
        { iconName: 'calendar-days', title: 'Aulas de hoje', text: 'Veja os horários e o que vem depois.' },
        { iconName: 'clipboard-list', title: 'Trabalhos e prazos', text: 'Organize tarefas no quadro ou na lista.' },
        { iconName: 'sparkles', title: 'Eventos da escola', text: 'Acompanhe simulados, feiras e reuniões.' }
      ]
    },
    {
      iconName: 'timer',
      title: 'Estude com o modo foco',
      text: 'Escolha 25 ou 50 minutos, uma pausa curta ou uma duração personalizada em minutos e horas.',
      features: [
        { iconName: 'timer', title: 'Do seu jeito', text: 'De 1 minuto a 12 horas de concentração.' },
        { iconName: 'clipboard-list', title: 'Vincule um trabalho', text: 'Foque em uma tarefa específica.' },
        { iconName: 'flame', title: 'Acompanhe sua sequência', text: 'Veja minutos e sessões de foco concluídas.' }
      ]
    },
    {
      iconName: 'search',
      title: 'Encontre tudo em segundos',
      text: 'A busca e os atalhos deixam a rotina mais rápida, principalmente perto das provas.',
      features: [
        { iconName: 'search', title: 'Busca e comandos', text: 'Use Ctrl K para abrir a paleta de ações.' },
        { iconName: 'keyboard', title: 'Atalhos', text: 'N para novo trabalho, E para evento e F para foco.' },
        { iconName: 'bell', title: 'Notificações', text: 'Prazos e eventos importantes aparecem aqui.' }
      ]
    },
    {
      iconName: 'sliders-horizontal',
      title: 'Deixe o SchoolFlow do seu jeito',
      text: 'Em Opções, ajuste seu perfil, a aparência e o layout para estudar com mais conforto.',
      features: [
        { iconName: 'user', title: 'Perfil', text: 'Atualize nome, etapa de ensino e cor do avatar.' },
        { iconName: 'palette', title: 'Aparência', text: 'Escolha temas, cores e intensidade de vibração.' },
        { iconName: 'panel-right-open', title: 'Layout', text: 'Barra lateral à esquerda ou à direita e barra superior no topo ou embaixo.' }
      ]
    }
  ];
  let step = 0;
  openModal({
    title: 'Bem-vindo ao SchoolFlow',
    subtitle: `Olá, ${getFirstName(user.name)}! Vamos conhecer o essencial.`,
    iconName: 'graduation-cap',
    size: 'lg',
    body: '<div id="onboarding-content"></div>',
    footer: `
      <button class="btn btn-ghost" data-onboarding-skip>Pular</button>
      <span class="spacer"></span>
      <button class="btn btn-secondary" data-onboarding-prev>Anterior</button>
      <button class="btn btn-primary" data-onboarding-next>Próximo</button>`,
    onOpen(modal) {
      const body = modal.querySelector('#onboarding-content');
      const prev = modal.querySelector('[data-onboarding-prev]');
      const next = modal.querySelector('[data-onboarding-next]');
      const skip = modal.querySelector('[data-onboarding-skip]');
      const finish = () => {
        user.onboardingDone = true;
        saveState();
        setSession(user);
        closeModal();
        toast('Tudo pronto!', 'Agora é só começar a estudar no seu ritmo.', 'success', 3200);
      };
      const renderStep = () => {
        const current = steps[step];
        body.innerHTML = `
          <div class="onboarding">
            <div class="onboarding-progress" aria-label="Passo ${step + 1} de ${steps.length}">
              ${steps.map((_, index) => `<span class="onboarding-dot ${index === step ? 'active' : ''} ${index < step ? 'done' : ''}"></span>`).join('')}
            </div>
            <div class="onboarding-hero">
              <div class="onboarding-icon">${icon(current.iconName, 26)}</div>
              <div>
                <span class="onboarding-kicker">Passo ${step + 1} de ${steps.length}</span>
                <h3>${current.title}</h3>
                <p>${current.text}</p>
              </div>
            </div>
            <div class="onboarding-features">
              ${current.features.map((feature) => `
                <div class="onboarding-feature">
                  <span class="onboarding-feature-icon">${icon(feature.iconName, 17)}</span>
                  <div><strong>${feature.title}</strong><span>${feature.text}</span></div>
                </div>`).join('')}
            </div>
          </div>`;
        prev.disabled = step === 0;
        next.innerHTML = step === steps.length - 1
          ? `${icon('check', 15)} Começar agora`
          : `Próximo ${icon('arrow-right', 15)}`;
      };
      prev.addEventListener('click', () => {
        if (step > 0) {
          step -= 1;
          renderStep();
        }
      });
      next.addEventListener('click', () => {
        if (step < steps.length - 1) {
          step += 1;
          renderStep();
        } else {
          finish();
        }
      });
      skip.addEventListener('click', finish);
      renderStep();
    },
    onClose() {
      if (user.onboardingDone === false) {
        user.onboardingDone = true;
        saveState();
        setSession(user);
      }
    }
  });
}

function maybeShowOnboarding() {
  const user = state.currentUser;
  if (!user || user.onboardingDone !== false) return;
  if (activeModal) return;
  if (document.getElementById('focus-overlay')?.classList.contains('open')) return;
  openOnboarding();
}

function openShortcuts() {
  const shortcuts = [
    ['Abrir busca / comandos', ['Ctrl', 'K']],
    ['Novo trabalho', ['N']],
    ['Novo evento', ['E']],
    ['Modo foco', ['F']],
    ['Alternar tema', ['T']],
    ['Ajuda e atalhos', ['?']],
    ['Fechar janelas', ['Esc']]
  ];
  openModal({
    title: 'Atalhos do teclado',
    subtitle: 'Navegue sem tirar as mãos do teclado.',
    iconName: 'keyboard',
    size: 'sm',
    body: `<div class="shortcut-grid">${shortcuts.map(([label, keys]) => `
      <div class="shortcut-row">
        <span>${label}</span>
        <div class="shortcut-keys">${keys.map((key) => `<kbd>${key}</kbd>`).join('')}</div>
      </div>`).join('')}</div>`,
    footer: `<button class="btn btn-primary" data-modal-close>Entendi</button>`
  });
}

// ---------------------------------------------------------------------------
// Command palette

function getCommands() {
  const commands = [
    { group: 'Navegação', id: 'go-dashboard', label: 'Ir para Início', hint: 'Visão geral do seu dia', iconName: 'layout-dashboard', keywords: 'inicio home visao dashboard', run: () => { window.location.href = 'dashboard.html'; } },
    { group: 'Navegação', id: 'go-assignments', label: 'Ir para Trabalhos', hint: 'Board e lista de tarefas', iconName: 'clipboard-list', keywords: 'tarefas deveres', run: () => { window.location.href = 'assignments.html'; } },
    { group: 'Navegação', id: 'go-events', label: 'Ir para Eventos', hint: 'Calendário e agenda', iconName: 'calendar-days', keywords: 'calendario agenda', run: () => { window.location.href = 'events.html'; } }
  ];
  if (isAdmin()) {
    commands.push({ group: 'Navegação', id: 'go-admin', label: 'Ir para Administração', hint: 'Usuários, turmas e matrículas', iconName: 'shield-check', keywords: 'admin gestao', run: () => { window.location.href = 'admin.html'; } });
  }
  commands.push(
    { group: 'Ações', id: 'new-task', label: 'Criar novo trabalho', hint: 'Adicionar tarefa com prazo', iconName: 'plus', shortcut: 'N', keywords: 'tarefa trabalho dever', run: () => { if (typeof openTaskModal === 'function') openTaskModal(); } },
    { group: 'Ações', id: 'new-event', label: 'Criar novo evento', hint: 'Agendar no calendário', iconName: 'calendar-plus', shortcut: 'E', keywords: 'evento calendario', run: () => { if (typeof openEventModal === 'function') openEventModal(); } },
    { group: 'Ações', id: 'focus', label: 'Iniciar sessão de foco', hint: '25, 50 min ou duração personalizada', iconName: 'timer', shortcut: 'F', keywords: 'pomodoro estudar concentrar', run: () => openFocusOverlay() },
    { group: 'Ações', id: 'focus-custom', label: 'Personalizar sessão de foco', hint: 'Escolha minutos ou horas', iconName: 'timer', keywords: 'duracao personalizada horas', run: () => openFocusOverlay(true) },
    { group: 'Preferências', id: 'toggle-theme', label: 'Alternar tema', hint: 'Claro ou escuro', iconName: 'moon', shortcut: 'T', keywords: 'dark light escuro claro', run: () => cycleTheme() },
    { group: 'Preferências', id: 'settings', label: 'Abrir opções', hint: 'Perfil, aparência e layout', iconName: 'settings', keywords: 'configuracao cor tema perfil layout', run: () => openSettings() },
    { group: 'Preferências', id: 'shortcuts', label: 'Ver atalhos', hint: 'Tudo que o teclado pode fazer', iconName: 'keyboard', shortcut: '?', keywords: 'ajuda teclado', run: () => openShortcuts() },
    { group: 'Conta', id: 'logout', label: 'Sair da conta', hint: 'Encerrar sessão', iconName: 'log-out', keywords: 'sair logout', run: () => logout() }
  );
  return commands;
}

function openPalette() {
  if (!paletteEl) {
    paletteEl = document.createElement('div');
    paletteEl.className = 'palette-overlay';
    paletteEl.innerHTML = `
      <div class="palette" role="dialog" aria-modal="true" aria-label="Busca e comandos">
        <div class="palette-search">
          ${icon('search', 19)}
          <input type="text" id="palette-input" placeholder="Buscar páginas, ações, trabalhos…" autocomplete="off" spellcheck="false">
          <kbd>Esc</kbd>
        </div>
        <div class="palette-list" id="palette-list"></div>
        <div class="palette-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
          <span><kbd>↵</kbd> selecionar</span>
          <span>${icon('sparkles', 12)} SchoolFlow</span>
        </div>
      </div>`;
    document.body.appendChild(paletteEl);
    paletteEl.addEventListener('click', (event) => {
      if (event.target === paletteEl) closePalette();
    });
    const input = paletteEl.querySelector('#palette-input');
    input.addEventListener('input', () => {
      paletteState.index = 0;
      renderPalette(input.value);
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        paletteState.index = Math.min(paletteState.index + 1, paletteState.filtered.length - 1);
        updatePaletteSelection();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        paletteState.index = Math.max(paletteState.index - 1, 0);
        updatePaletteSelection();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        runPaletteCommand();
      }
    });
  }
  paletteEl.classList.add('open');
  paletteState.open = true;
  paletteState.index = 0;
  const input = paletteEl.querySelector('#palette-input');
  input.value = '';
  renderPalette('');
  setTimeout(() => input.focus(), 60);
}

function closePalette() {
  if (!paletteEl) return;
  paletteEl.classList.remove('open');
  paletteState.open = false;
}

function renderPalette(query) {
  const list = paletteEl?.querySelector('#palette-list');
  if (!list) return;
  const q = query.trim().toLowerCase();
  const commands = getCommands().filter((cmd) => {
    if (!q) return true;
    return `${cmd.label} ${cmd.hint} ${cmd.keywords}`.toLowerCase().includes(q);
  });
  paletteState.filtered = commands;
  paletteState.index = utils.clamp(paletteState.index, 0, Math.max(commands.length - 1, 0));
  if (!commands.length) {
    list.innerHTML = `<div class="palette-empty">Nenhum comando encontrado para “${utils.escapeHTML(query)}”.</div>`;
    return;
  }
  let html = '';
  let lastGroup = '';
  commands.forEach((cmd, index) => {
    if (cmd.group !== lastGroup) {
      html += `<div class="palette-group-label">${cmd.group}</div>`;
      lastGroup = cmd.group;
    }
    html += `
      <button class="palette-item ${index === paletteState.index ? 'active' : ''}" data-palette-index="${index}">
        <span class="p-icon">${icon(cmd.iconName, 16)}</span>
        <span><strong>${utils.escapeHTML(cmd.label)}</strong><small>${utils.escapeHTML(cmd.hint)}</small></span>
        ${cmd.shortcut ? `<kbd class="p-shortcut">${cmd.shortcut}</kbd>` : ''}
      </button>`;
  });
  list.innerHTML = html;
  list.querySelectorAll('[data-palette-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      paletteState.index = Number(btn.dataset.paletteIndex);
      runPaletteCommand();
    });
  });
}

function updatePaletteSelection() {
  const list = paletteEl?.querySelector('#palette-list');
  if (!list) return;
  list.querySelectorAll('.palette-item').forEach((item, index) => {
    item.classList.toggle('active', index === paletteState.index);
    if (index === paletteState.index) item.scrollIntoView({ block: 'nearest' });
  });
}

function runPaletteCommand() {
  const cmd = paletteState.filtered[paletteState.index];
  if (!cmd) return;
  closePalette();
  setTimeout(() => cmd.run(), 80);
}

// ---------------------------------------------------------------------------
// Timer de foco

function formatTimer(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateFocusCustomConstraints() {
  const input = document.getElementById('focus-custom-value');
  const unit = document.getElementById('focus-custom-unit');
  if (!input || !unit) return;
  if (unit.value === 'hours') {
    input.min = '0.5';
    input.max = '12';
    input.step = '0.5';
  } else {
    input.min = '1';
    input.max = '720';
    input.step = '1';
  }
}

function syncFocusDurationControls() {
  const input = document.getElementById('focus-custom-value');
  const unit = document.getElementById('focus-custom-unit');
  if (!input || !unit) return;
  const totalMinutes = Math.max(1, Math.round(focusTimer.total / 60));
  if (totalMinutes >= 60 && totalMinutes % 60 === 0) {
    unit.value = 'hours';
    input.value = String(totalMinutes / 60);
  } else {
    unit.value = 'minutes';
    input.value = String(totalMinutes);
  }
  unit.dataset.unit = unit.value;
  updateFocusCustomConstraints();
  document.querySelectorAll('[data-focus-custom-current]').forEach((el) => {
    el.textContent = utils.minutesToLabel(totalMinutes);
  });
}

function applyCustomTimer() {
  const input = document.getElementById('focus-custom-value');
  const unit = document.getElementById('focus-custom-unit');
  if (!input || !unit) return;
  const raw = Number(input.value);
  if (!Number.isFinite(raw) || raw <= 0) {
    toast('Duração inválida', 'Informe um valor maior que zero.', 'warning');
    return;
  }
  let minutes = unit.value === 'hours' ? raw * 60 : raw;
  minutes = Math.round(minutes);
  if (minutes < 1 || minutes > 720) {
    toast('Duração fora do limite', 'Escolha entre 1 minuto e 12 horas.', 'warning');
    return;
  }
  pauseTimer();
  focusTimer.total = minutes * 60;
  focusTimer.remaining = focusTimer.total;
  focusTimer.mode = minutes <= 5 ? 'Pausa' : 'Foco';
  syncFocusDurationControls();
  updateTimerUI();
  toast('Duração personalizada', `Sessão de ${utils.minutesToLabel(minutes)} preparada.`, 'success', 2600);
}

function updateTimerUI() {
  document.querySelectorAll('[data-timer-time]').forEach((el) => {
    const text = formatTimer(focusTimer.remaining);
    el.textContent = text;
    el.classList.toggle('is-long', text.length > 5);
  });
  document.querySelectorAll('[data-timer-state]').forEach((el) => {
    el.textContent = focusTimer.running ? (focusTimer.mode === 'Pausa' ? 'Em pausa' : 'Em foco') : focusTimer.mode;
    el.classList.toggle('running', focusTimer.running);
  });
  document.querySelectorAll('[data-timer-ring]').forEach((ring) => {
    const radius = Number(ring.getAttribute('r')) || 54;
    const circumference = 2 * Math.PI * radius;
    const elapsed = 1 - focusTimer.remaining / focusTimer.total;
    ring.style.strokeDasharray = String(circumference);
    ring.style.strokeDashoffset = String(circumference * elapsed);
  });
  document.querySelectorAll('[data-timer-toggle-label]').forEach((el) => {
    el.textContent = focusTimer.running ? 'Pausar' : 'Iniciar';
  });
  document.querySelectorAll('[data-timer-toggle-icon]').forEach((el) => {
    el.innerHTML = icon(focusTimer.running ? 'pause' : 'play', 15);
  });
  document.querySelectorAll('[data-timer-preset]').forEach((el) => {
    el.classList.toggle('active', Number(el.dataset.minutes) * 60 === focusTimer.total);
  });
  const todayMinutes = state.focusLog[utils.toISO(new Date())] || 0;
  const sessionCount = getFocusSessionCount();
  document.querySelectorAll('[data-focus-session-count]').forEach((el) => {
    el.textContent = String(sessionCount);
  });
  document.querySelectorAll('[data-focus-session-label]').forEach((el) => {
    el.textContent = sessionCount === 1 ? 'sessão' : 'sessões';
  });
  document.querySelectorAll('[data-focus-total]').forEach((el) => {
    el.textContent = utils.minutesToLabel(todayMinutes);
  });
  document.querySelectorAll('[data-focus-custom-current]').forEach((el) => {
    el.textContent = utils.minutesToLabel(Math.max(1, Math.round(focusTimer.total / 60)));
  });
}

function startTimer() {
  if (focusTimer.running) return;
  focusTimer.running = true;
  focusTimer.interval = setInterval(() => {
    focusTimer.remaining = Math.max(0, focusTimer.remaining - 1);
    updateTimerUI();
    if (focusTimer.remaining <= 0) completeTimer();
  }, 1000);
  updateTimerUI();
}

function pauseTimer() {
  focusTimer.running = false;
  clearInterval(focusTimer.interval);
  focusTimer.interval = null;
  updateTimerUI();
}

function toggleTimer() {
  if (focusTimer.running) pauseTimer();
  else startTimer();
}

function resetTimer() {
  pauseTimer();
  focusTimer.remaining = focusTimer.total;
  updateTimerUI();
}

function setTimerPreset(minutes) {
  pauseTimer();
  focusTimer.total = minutes * 60;
  focusTimer.remaining = focusTimer.total;
  focusTimer.mode = minutes <= 5 ? 'Pausa' : 'Foco';
  syncFocusDurationControls();
  updateTimerUI();
}

function completeTimer() {
  pauseTimer();
  const minutes = Math.max(1, Math.round(focusTimer.total / 60));
  const today = utils.toISO(new Date());
  const previousSessions = getFocusSessionCount(new Date());
  state.focusLog[today] = (state.focusLog[today] || 0) + minutes;
  if (!state.focusSessions) state.focusSessions = {};
  state.focusSessions[today] = previousSessions + 1;
  saveState();
  const task = focusTimer.taskId ? getAssignmentById(focusTimer.taskId) : null;
  const duration = utils.minutesToLabel(minutes);
  toast('Sessão concluída!', task ? `Você avançou em “${task.title}”. +${duration} de foco.` : `+${duration} de foco registrados.`, 'success', 5200);
  confetti();
  playChime();
  focusTimer.remaining = focusTimer.total;
  focusTimer.running = false;
  updateTimerUI();
}

function playChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [523.25, 659.25, 783.99].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.03 + index * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55 + index * 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + index * 0.12);
      osc.stop(ctx.currentTime + 0.8 + index * 0.12);
    });
    setTimeout(() => ctx.close(), 1600);
  } catch (error) {
    /* áudio é opcional */
  }
}

function focusTaskOptions() {
  const tasks = getPendingAssignments().slice(0, 12);
  if (!tasks.length) return '<option value="">Nenhuma tarefa pendente</option>';
  return `<option value="">Sem tarefa específica</option>` + tasks.map((task) => `
    <option value="${task.id}" ${focusTimer.taskId === task.id ? 'selected' : ''}>${utils.escapeHTML(task.title)}</option>`).join('');
}

function openFocusOverlay(showCustom = false) {
  closePopovers();
  const focusCustomInput = (target) => {
    const input = target.querySelector('#focus-custom-value');
    if (!input) return;
    input.focus();
    input.select();
    target.querySelector('.focus-custom')?.scrollIntoView({ block: 'nearest' });
  };
  let overlay = document.getElementById('focus-overlay');
  if (overlay) {
    overlay.classList.add('open');
    document.body.classList.add('modal-open');
    syncFocusDurationControls();
    updateTimerUI();
    if (showCustom) setTimeout(() => focusCustomInput(overlay), 120);
    return;
  }
  overlay = document.createElement('div');
  overlay.className = 'focus-overlay';
  overlay.id = 'focus-overlay';
  overlay.innerHTML = `
    <div class="focus-overlay-card">
      <button class="icon-btn focus-overlay-close" data-action="focus-close" aria-label="Fechar modo foco">${icon('x', 20)}</button>
      <div class="focus-overlay-eyebrow">${icon('sparkles', 14)} modo foco</div>
      <div class="focus-big-ring">
        <svg viewBox="0 0 240 240" aria-hidden="true">
          <defs>
            <linearGradient id="focusOverlayGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="var(--grad-1)"/>
              <stop offset="100%" stop-color="var(--grad-2)"/>
            </linearGradient>
          </defs>
          <circle class="track" cx="120" cy="120" r="108"/>
          <circle class="progress" data-timer-ring r="108" cx="120" cy="120" stroke="url(#focusOverlayGradient)"/>
        </svg>
        <div class="focus-big-center">
          <div class="focus-big-time" data-timer-time>${formatTimer(focusTimer.remaining)}</div>
          <div class="focus-big-state" data-timer-state>${focusTimer.mode}</div>
        </div>
      </div>
      <div class="focus-overlay-task">
        <select class="select" id="focus-task-select" aria-label="Tarefa da sessão">${focusTaskOptions()}</select>
      </div>
      <div class="focus-overlay-controls">
        <button class="btn btn-ghost" data-action="timer-reset" aria-label="Reiniciar">${icon('rotate-ccw', 17)}</button>
        <button class="btn btn-primary btn-lg" data-action="timer-toggle">
          <span data-timer-toggle-icon>${icon(focusTimer.running ? 'pause' : 'play', 15)}</span>
          <span data-timer-toggle-label>${focusTimer.running ? 'Pausar' : 'Iniciar'}</span>
        </button>
        <button class="btn btn-ghost" data-action="focus-close" aria-label="Sair do modo foco">${icon('x', 17)}</button>
      </div>
      <div class="focus-overlay-hint focus-presets-hint">Presets: ${[25, 50, 5].map((min) => `<button class="focus-preset ${focusTimer.total === min * 60 ? 'active' : ''}" data-action="timer-preset" data-minutes="${min}">${min === 5 ? '5 min pausa' : `${min} min`}</button>`).join(' ')}</div>
      <div class="focus-custom">
        <div class="focus-custom-head">
          <strong>Duração personalizada</strong>
          <small><span data-focus-custom-current>25 min</span> na sessão</small>
        </div>
        <div class="focus-custom-row">
          <input class="input focus-custom-value" id="focus-custom-value" type="number" inputmode="decimal" min="1" max="720" step="1" value="25" aria-label="Duração personalizada">
          <select class="select focus-custom-unit" id="focus-custom-unit" aria-label="Unidade de duração">
            <option value="minutes">minutos</option>
            <option value="hours">horas</option>
          </select>
          <button class="btn btn-secondary btn-sm" data-action="timer-custom">Aplicar</button>
        </div>
        <p class="focus-custom-hint">De 1 minuto a 12 horas. Estude em blocos longos ou faça pausas curtas.</p>
      </div>
      <div class="focus-overlay-hint">${icon('flame', 12)} <span data-focus-session-count>0</span> sessões hoje · <span data-focus-total>0min</span> de foco</div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => overlay.classList.add('open'));
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeFocusOverlay();
  });
  overlay.querySelector('#focus-task-select').addEventListener('change', (event) => {
    focusTimer.taskId = event.target.value ? Number(event.target.value) : null;
  });
  const unitSelect = overlay.querySelector('#focus-custom-unit');
  const valueInput = overlay.querySelector('#focus-custom-value');
  unitSelect.dataset.unit = unitSelect.value;
  unitSelect.addEventListener('change', () => {
    const oldUnit = unitSelect.dataset.unit || 'minutes';
    const raw = Number(valueInput.value);
    if (Number.isFinite(raw) && raw > 0) {
      const minutes = oldUnit === 'hours' ? raw * 60 : raw;
      if (unitSelect.value === 'hours') {
        valueInput.value = String(Math.round((minutes / 60) * 100) / 100);
      } else {
        valueInput.value = String(Math.max(1, Math.round(minutes)));
      }
    }
    unitSelect.dataset.unit = unitSelect.value;
    updateFocusCustomConstraints();
  });
  syncFocusDurationControls();
  updateTimerUI();
  if (showCustom) setTimeout(() => focusCustomInput(overlay), 120);
}

function closeFocusOverlay() {
  const overlay = document.getElementById('focus-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  setTimeout(() => overlay.remove(), 260);
  if (!activeModal) document.body.classList.remove('modal-open');
}

// ---------------------------------------------------------------------------
// Confetti

function confetti(count = 64) {
  if (prefs.motion === 'reduced') return;
  let root = document.getElementById('confetti-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'confetti-root';
    root.className = 'confetti-layer';
    document.body.appendChild(root);
  }
  const colors = ['#6366f1', '#8b5cf6', '#22d3ee', '#34d399', '#fbbf24', '#fb7185'];
  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement('i');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.setProperty('--c', colors[i % colors.length]);
    piece.style.setProperty('--x', `${(Math.random() - 0.5) * 260}px`);
    piece.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
    piece.style.setProperty('--d', `${1.6 + Math.random() * 1.4}s`);
    piece.style.setProperty('--delay', `${Math.random() * 0.35}s`);
    piece.style.width = `${5 + Math.random() * 6}px`;
    piece.style.height = `${8 + Math.random() * 10}px`;
    root.appendChild(piece);
    setTimeout(() => piece.remove(), 3400);
  }
}

// ---------------------------------------------------------------------------
// Ações globais

function updateShellBadges() {
  const pending = getPendingCount();
  const badge = document.querySelector('[data-nav="assignments"] .nav-badge');
  if (badge) {
    badge.textContent = String(pending);
    badge.classList.toggle('alert', pending > 0);
  }
  const streak = getFocusStreak();
  const streakTitle = document.querySelector('.streak-title');
  if (streakTitle) streakTitle.textContent = `${streak} ${streak === 1 ? 'dia' : 'dias'} em flow`;
  const streakCard = document.querySelector('.streak-card');
  if (streakCard) streakCard.title = `${streak} dias de foco`;
  renderNotifications();
}

function handleCoreAction(action, el) {
  switch (action) {
    case 'toggle-sidebar':
      document.body.classList.toggle('sidebar-open');
      return true;
    case 'close-sidebar':
      document.body.classList.remove('sidebar-open');
      return true;
    case 'collapse-sidebar':
      prefs.sidebarCollapsed = !prefs.sidebarCollapsed;
      savePrefs();
      applyAppearance();
      return true;
    case 'expand-sidebar':
      prefs.sidebarCollapsed = false;
      savePrefs();
      applyAppearance();
      return true;
    case 'toggle-theme':
      cycleTheme();
      return true;
    case 'open-palette':
      openPalette();
      return true;
    case 'toggle-quick-add':
      togglePopover('quick-add-menu', el);
      return true;
    case 'toggle-notifications':
      renderNotifications();
      togglePopover('notifications-panel', el);
      return true;
    case 'toggle-user-menu':
      togglePopover('user-menu', el);
      return true;
    case 'mark-notifications-read':
      markNotificationsRead();
      return true;
    case 'read-notification': {
      const id = el.dataset.id;
      if (id && !state.readNotifications.includes(id)) {
        state.readNotifications.push(id);
        saveState();
        renderNotifications();
      }
      return true;
    }
    case 'open-settings':
      closePopovers();
      openSettings();
      return true;
    case 'open-onboarding':
      closePopovers();
      openOnboarding(true);
      return true;
    case 'open-shortcuts':
      closePopovers();
      openShortcuts();
      return true;
    case 'open-focus':
      openFocusOverlay();
      return true;
    case 'open-focus-custom':
      openFocusOverlay(true);
      return true;
    case 'timer-custom':
      applyCustomTimer();
      return true;
    case 'focus-close':
      closeFocusOverlay();
      return true;
    case 'timer-toggle':
      toggleTimer();
      return true;
    case 'timer-reset':
      resetTimer();
      return true;
    case 'timer-preset':
      setTimerPreset(Number(el.dataset.minutes) || 25);
      return true;
    case 'logout':
      logout();
      return true;
    case 'new-task':
      closePopovers();
      if (typeof openTaskModal === 'function') openTaskModal();
      return true;
    case 'new-event':
      closePopovers();
      if (typeof openEventModal === 'function') openEventModal();
      return true;
    case 'new-user':
      closePopovers();
      if (typeof openUserModal === 'function') openUserModal();
      return true;
    case 'open-task':
      if (typeof openTaskModal === 'function') openTaskModal(Number(el.dataset.id));
      return true;
    case 'open-event':
      if (typeof openEventDetail === 'function') openEventDetail(Number(el.dataset.id));
      return true;
    case 'toggle-rsvp':
      if (typeof toggleRsvp === 'function') toggleRsvp(Number(el.dataset.id));
      return true;
    case 'complete-task':
      if (typeof toggleTaskDone === 'function') toggleTaskDone(Number(el.dataset.id));
      return true;
    default:
      return false;
  }
}

function bindGlobalEvents() {
  document.addEventListener('click', (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (actionEl) {
      const handled = handleCoreAction(actionEl.dataset.action, actionEl);
      if (!handled) {
        document.dispatchEvent(new CustomEvent('sf:action', {
          detail: { action: actionEl.dataset.action, el: actionEl, event }
        }));
      }
    }
    if (!event.target.closest('.popover-wrap')) closePopovers();
  });

  document.addEventListener('keydown', (event) => {
    if (currentPage() === 'login') return;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (paletteState.open) closePalette();
      else openPalette();
      return;
    }

    if (event.key === 'Escape') {
      if (paletteState.open) {
        closePalette();
        return;
      }
      if (document.getElementById('focus-overlay')?.classList.contains('open')) {
        closeFocusOverlay();
        return;
      }
      if (activeModal) {
        closeModal();
        return;
      }
      closePopovers();
      document.body.classList.remove('sidebar-open');
      return;
    }

    if (activeModal) {
      if (event.key === 'Tab') {
        const focusables = Array.from(activeModal.overlay.querySelectorAll('button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'))
          .filter((node) => !node.disabled && node.offsetParent !== null);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
      return;
    }

    if (paletteState.open) return;

    const focusOverlay = document.getElementById('focus-overlay');
    if (focusOverlay?.classList.contains('open')) {
      if (event.code === 'Space' && !isTypingTarget(event.target)) {
        event.preventDefault();
        toggleTimer();
      }
      return;
    }

    if (isTypingTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === '?') {
      event.preventDefault();
      openShortcuts();
    } else if (event.key.toLowerCase() === 'n') {
      event.preventDefault();
      if (typeof openTaskModal === 'function') openTaskModal();
    } else if (event.key.toLowerCase() === 'e') {
      event.preventDefault();
      if (typeof openEventModal === 'function') openEventModal();
    } else if (event.key.toLowerCase() === 'f') {
      event.preventDefault();
      openFocusOverlay();
    } else if (event.key.toLowerCase() === 't') {
      event.preventDefault();
      cycleTheme();
    }
  });

  if (window.matchMedia) {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (prefs.theme === 'system') applyAppearance();
    };
    if (media.addEventListener) media.addEventListener('change', onChange);
    else if (media.addListener) media.addListener(onChange);
  }
}

function bootCore() {
  restoreSession();
  applyAppearance();
  hydrateIcons(document);
  if (currentPage() !== 'login') {
    if (!requireAuth()) return;
    renderShell();
  }
  bindGlobalEvents();
  updateTimerUI();
}

document.addEventListener('DOMContentLoaded', bootCore);

