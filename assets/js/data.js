// SchoolFlow — dados demo, helpers e persistência
// ---------------------------------------------------------------------------

const DATA_KEY = 'schoolflow.data.v4';
const SESSION_KEY = 'schoolflow.session.v1';
const PREFS_KEY = 'schoolflow.prefs.v1';

function sfPad(n) {
  return String(n).padStart(2, '0');
}

function sfToISO(date) {
  return `${date.getFullYear()}-${sfPad(date.getMonth() + 1)}-${sfPad(date.getDate())}`;
}

function sfParseISO(str) {
  if (!str) return new Date();
  const [y, m, d] = String(str).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function sfAddDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function sfIsoOffset(days) {
  return sfToISO(sfAddDays(new Date(), days));
}

function sfSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function sfStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sfUid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const utils = {
  toISO: sfToISO,
  parseISO: sfParseISO,
  addDays: sfAddDays,
  isoOffset: sfIsoOffset,
  sameDay: sfSameDay,
  startOfWeek: sfStartOfWeek,
  uid: sfUid,

  formatDateShort(dateStr) {
    const d = sfParseISO(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  },

  formatDateLong(dateStr) {
    const d = sfParseISO(dateStr);
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  },

  formatDateFull(dateStr) {
    const d = sfParseISO(dateStr);
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  },

  formatDateNumeric(dateStr) {
    return sfParseISO(dateStr).toLocaleDateString('pt-BR');
  },

  formatTime(timeStr) {
    return timeStr || '--:--';
  },

  getDayOfWeekName(dayNum) {
    return ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dayNum] || '';
  },

  getDayShort(dayNum) {
    return ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dayNum] || '';
  },

  daysUntil(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = sfParseISO(dateStr);
    due.setHours(0, 0, 0, 0);
    return Math.round((due - today) / 86400000);
  },

  isDueSoon(dateStr) {
    const diff = this.daysUntil(dateStr);
    return diff >= 0 && diff <= 2;
  },

  dueMeta(dateStr, status) {
    if (status === 'done') return { label: 'Concluído', tone: 'success' };
    const diff = this.daysUntil(dateStr);
    if (diff < 0) return { label: `${Math.abs(diff)}d atrasado`, tone: 'danger' };
    if (diff === 0) return { label: 'Entrega hoje', tone: 'warning' };
    if (diff === 1) return { label: 'Amanhã', tone: 'warning' };
    if (diff <= 3) return { label: `Em ${diff} dias`, tone: 'warning' };
    if (diff <= 7) return { label: `Em ${diff} dias`, tone: 'info' };
    return { label: this.formatDateShort(dateStr), tone: 'neutral' };
  },

  getCurrentWeek() {
    const start = sfStartOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => sfAddDays(start, i));
  },

  getWeekdays() {
    const start = sfStartOfWeek(new Date());
    return Array.from({ length: 5 }, (_, i) => sfAddDays(start, i));
  },

  monthMatrix(year, month) {
    const first = new Date(year, month, 1);
    const start = sfAddDays(first, -first.getDay());
    return Array.from({ length: 42 }, (_, i) => sfAddDays(start, i));
  },

  initials(name) {
    const parts = String(name || '?').trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  },

  escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[ch]));
  },

  plural(n, singular, plural) {
    return `${n} ${n === 1 ? singular : plural}`;
  },

  clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  },

  minutesToLabel(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (!h) return `${m}min`;
    return m ? `${h}h ${m}min` : `${h}h`;
  },

  normalizeSearch(value) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
};

// ---------------------------------------------------------------------------
// Paletas e metadados

const CLASS_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#f97316', '#14b8a6', '#a855f7'];

const EVENT_CATEGORIES = {
  academic: { label: 'Acadêmico', color: '#6366f1', icon: 'graduation-cap' },
  meeting: { label: 'Reunião', color: '#f59e0b', icon: 'users' },
  sports: { label: 'Esporte', color: '#10b981', icon: 'trophy' },
  culture: { label: 'Cultura', color: '#ec4899', icon: 'music' },
  holiday: { label: 'Feriado', color: '#0ea5e9', icon: 'star' }
};

const PRIORITIES = {
  low: { label: 'Baixa', color: '#64748b' },
  medium: { label: 'Média', color: '#f59e0b' },
  high: { label: 'Alta', color: '#ef4444' }
};

const STATUSES = {
  todo: { label: 'A fazer', color: '#64748b' },
  doing: { label: 'Em andamento', color: '#6366f1' },
  review: { label: 'Em revisão', color: '#f59e0b' },
  done: { label: 'Concluído', color: '#10b981' }
};

const ACCENTS = {
  indigo: { label: 'Índigo', color: '#6366f1', color2: '#8b5cf6' },
  emerald: { label: 'Esmeralda', color: '#10b981', color2: '#14b8a6' },
  rose: { label: 'Rosa', color: '#f43f5e', color2: '#ec4899' },
  amber: { label: 'Âmbar', color: '#f59e0b', color2: '#f97316' },
  sky: { label: 'Céu', color: '#0ea5e9', color2: '#6366f1' }
};

const SCHOOL_STAGES = {
  fundamental: {
    label: 'Ensino Fundamental II',
    short: 'Fundamental II',
    grades: ['6º ano', '7º ano', '8º ano', '9º ano']
  },
  medio: {
    label: 'Ensino Médio',
    short: 'Ensino Médio',
    grades: ['1º ano', '2º ano', '3º ano']
  }
};

function getStageMeta(stage) {
  return SCHOOL_STAGES[stage] || null;
}

function getStageLabel(stage) {
  return getStageMeta(stage)?.label || '';
}

function getStageShort(stage) {
  return getStageMeta(stage)?.short || '';
}

function getGradeOptions(stage) {
  return getStageMeta(stage)?.grades || [];
}

const GUEST_USER = {
  id: 'guest',
  name: 'Visitante',
  email: 'convidado@schoolflow.demo',
  password: '',
  role: 'convidado',
  stage: 'medio',
  grade: '2º ano',
  subject: 'Modo convidado',
  avatarTone: 'sky',
  onboardingDone: true,
  isGuest: true
};

function getGuestUser() {
  return { ...GUEST_USER };
}

function isGuestUser(user = state.currentUser) {
  return Boolean(user && user.role === 'convidado');
}

function canEditData(user = state.currentUser) {
  return Boolean(user && user.role !== 'convidado');
}

function canPresent(user = state.currentUser) {
  return Boolean(user && (user.role === 'professor' || user.role === 'admin'));
}

function getRoleLabel(role) {
  return { aluno: 'Aluno', professor: 'Professor', admin: 'Administração', convidado: 'Convidado' }[role] || role || '';
}

function getUserSubtitle(user) {
  if (!user) return '';
  if (user.role === 'aluno') {
    return [user.grade, getStageShort(user.stage)].filter(Boolean).join(' · ') || 'Aluno';
  }
  if (user.role === 'convidado') {
    return [user.grade, getStageShort(user.stage)].filter(Boolean).join(' · ') || 'Demonstração';
  }
  return user.subject || getRoleLabel(user.role);
}

function avatarToneStyle(user) {
  const tone = ACCENTS[user?.avatarTone];
  return tone ? ` style="--avatar-a:${tone.color};--avatar-b:${tone.color2}"` : '';
}

// ---------------------------------------------------------------------------
// Dados demo

const mockUsers = [
  { id: 1, name: 'Ana Professor', email: 'ana@professor.com', password: 'prof123', role: 'professor', subject: 'Matemática' },
  { id: 2, name: 'Carlos Aluno', email: 'carlos@aluno.com', password: 'aluno123', role: 'aluno', stage: 'medio', grade: '2º ano', subject: '2º ano · Ensino Médio', avatarTone: 'indigo' },
  { id: 3, name: 'Admin Escola', email: 'admin@escola.com', password: 'admin123', role: 'admin', subject: 'Coordenação' },
  { id: 4, name: 'Marcos Lima', email: 'marcos@professor.com', password: 'prof456', role: 'professor', subject: 'Ciências Humanas' },
  { id: 5, name: 'Marina Souza', email: 'marina@aluno.com', password: 'aluno456', role: 'aluno', stage: 'fundamental', grade: '8º ano', subject: '8º ano · Fundamental II', avatarTone: 'sky' },
  { id: 6, name: 'João Pedro', email: 'joao@aluno.com', password: 'aluno456', role: 'aluno', stage: 'medio', grade: '3º ano', subject: '3º ano · Ensino Médio', avatarTone: 'emerald' },
  { id: 7, name: 'Beatriz Nunes', email: 'bia@aluno.com', password: 'aluno456', role: 'aluno', stage: 'fundamental', grade: '9º ano', subject: '9º ano · Fundamental II', avatarTone: 'rose' },
  { id: 8, name: 'Lucas Ferreira', email: 'lucas@aluno.com', password: 'aluno456', role: 'aluno', stage: 'medio', grade: '1º ano', subject: '1º ano · Ensino Médio', avatarTone: 'amber' },
  { id: 9, name: 'Patrícia Alves', email: 'patricia@professor.com', password: 'prof789', role: 'professor', subject: 'Linguagens' },
  { id: 10, name: 'Rafael Costa', email: 'rafael@professor.com', password: 'prof789', role: 'professor', subject: 'Ciências da Natureza' },
  { id: 11, name: 'Bianca Rocha', email: 'bianca@professor.com', password: 'prof789', role: 'professor', subject: 'Língua Inglesa' }
];

const mockClasses = [
  { id: 1, name: 'Língua Portuguesa — Fundamental II', description: 'Leitura, produção textual e análise da língua para o 6º ao 9º ano.', stage: 'fundamental', day_of_week: 1, time_start: '08:00', time_end: '09:30', room: 'Sala 8A', teacher_id: 9, color: CLASS_COLORS[0] },
  { id: 2, name: 'Matemática — Fundamental II', description: 'Números, álgebra, geometria e resolução de problemas.', stage: 'fundamental', day_of_week: 1, time_start: '10:00', time_end: '11:30', room: 'Sala 8A', teacher_id: 1, color: CLASS_COLORS[1] },
  { id: 3, name: 'Ciências — Fundamental II', description: 'Vida, matéria, energia e o planeta Terra.', stage: 'fundamental', day_of_week: 2, time_start: '08:00', time_end: '09:30', room: 'Lab 01', teacher_id: 10, color: CLASS_COLORS[2] },
  { id: 4, name: 'História — Fundamental II', description: 'Brasil e mundo: do período colonial aos dias atuais.', stage: 'fundamental', day_of_week: 3, time_start: '09:00', time_end: '10:30', room: 'Sala 8B', teacher_id: 4, color: CLASS_COLORS[3] },
  { id: 5, name: 'Geografia — Fundamental II', description: 'Território, natureza, população e economia brasileira.', stage: 'fundamental', day_of_week: 4, time_start: '08:00', time_end: '09:30', room: 'Sala 8B', teacher_id: 4, color: CLASS_COLORS[4] },
  { id: 6, name: 'Inglês — Fundamental II', description: 'Compreensão, vocabulário e comunicação em situações do dia a dia.', stage: 'fundamental', day_of_week: 5, time_start: '07:30', time_end: '09:00', room: 'Sala 8C', teacher_id: 11, color: CLASS_COLORS[5] },
  { id: 7, name: 'Língua Portuguesa e Literatura — Ensino Médio', description: 'Literatura brasileira, interpretação e produção de textos.', stage: 'medio', day_of_week: 1, time_start: '08:00', time_end: '09:30', room: 'Sala 2A', teacher_id: 9, color: CLASS_COLORS[6] },
  { id: 8, name: 'Matemática — Ensino Médio', description: 'Funções, trigonometria, geometria analítica e estatística.', stage: 'medio', day_of_week: 1, time_start: '10:00', time_end: '11:30', room: 'Sala 2A', teacher_id: 1, color: CLASS_COLORS[7] },
  { id: 9, name: 'Física — Ensino Médio', description: 'Mecânica, eletricidade, ondas e física moderna.', stage: 'medio', day_of_week: 2, time_start: '10:00', time_end: '11:30', room: 'Lab 02', teacher_id: 10, color: CLASS_COLORS[8] },
  { id: 10, name: 'Química — Ensino Médio', description: 'Matéria, reações, funções orgânicas e estequiometria.', stage: 'medio', day_of_week: 3, time_start: '08:00', time_end: '09:30', room: 'Lab 02', teacher_id: 10, color: CLASS_COLORS[9] },
  { id: 11, name: 'Biologia — Ensino Médio', description: 'Células, genética, evolução e ecologia.', stage: 'medio', day_of_week: 4, time_start: '10:00', time_end: '11:30', room: 'Lab 03', teacher_id: 10, color: CLASS_COLORS[0] },
  { id: 12, name: 'Redação — Ensino Médio', description: 'Estrutura dissertativa, repertório e argumentação.', stage: 'medio', day_of_week: 5, time_start: '10:00', time_end: '11:30', room: 'Sala 2B', teacher_id: 9, color: CLASS_COLORS[1] },
  { id: 13, name: 'Filosofia — Ensino Médio', description: 'Pensamento filosófico, ética e cidadania.', stage: 'medio', day_of_week: 2, time_start: '14:00', time_end: '15:30', room: 'Sala 2C', teacher_id: 4, color: CLASS_COLORS[2] }
];

const mockAssignments = [
  { id: 1, title: 'Lista de Exercícios — Frações e Porcentagem', description: 'Resolver os exercícios 1 a 20 do capítulo 3, com resolução comentada.', due_date: sfIsoOffset(1), class_id: 2, teacher_id: 1, created_at: sfIsoOffset(-4), status: 'doing', priority: 'high' },
  { id: 2, title: 'Relatório — Circuitos Elétricos', description: 'Pesquisar o experimento e explicar a relação entre tensão, corrente e resistência.', due_date: sfIsoOffset(3), class_id: 9, teacher_id: 10, created_at: sfIsoOffset(-3), status: 'todo', priority: 'medium' },
  { id: 3, title: 'Projeto — Funções Orgânicas', description: 'Criar uma apresentação de 8 slides sobre aplicações das funções orgânicas.', due_date: sfIsoOffset(5), class_id: 10, teacher_id: 10, created_at: sfIsoOffset(-5), status: 'doing', priority: 'high' },
  { id: 4, title: 'Leitura — Brasil República', description: 'Ler o capítulo 7 e produzir uma linha do tempo com os principais marcos.', due_date: sfIsoOffset(-1), class_id: 4, teacher_id: 4, created_at: sfIsoOffset(-8), status: 'todo', priority: 'medium' },
  { id: 5, title: 'Ensaio — Literatura Brasileira', description: 'Analisar um conto de Machado de Assis e escrever um ensaio de 500 palavras.', due_date: sfIsoOffset(2), class_id: 7, teacher_id: 9, created_at: sfIsoOffset(-6), status: 'review', priority: 'low' },
  { id: 6, title: 'Mapa Mental — Células', description: 'Representar visualmente as organelas e suas funções com palavras-chave.', due_date: sfIsoOffset(7), class_id: 11, teacher_id: 10, created_at: sfIsoOffset(-2), status: 'todo', priority: 'low' },
  { id: 7, title: 'Pesquisa — Biomas Brasileiros', description: 'Escolher um bioma e apresentar clima, vegetação, fauna e impactos ambientais.', due_date: sfIsoOffset(4), class_id: 5, teacher_id: 4, created_at: sfIsoOffset(-1), status: 'doing', priority: 'high' },
  { id: 8, title: 'Resumo — Filosofia', description: 'Comparar as ideias de Sócrates, Platão e Aristóteles em uma página.', due_date: sfIsoOffset(6), class_id: 13, teacher_id: 4, created_at: sfIsoOffset(-7), status: 'done', priority: 'medium' },
  { id: 9, title: 'Apresentação — Redação', description: 'Preparar uma apresentação sobre repertórios socioculturais.', due_date: sfIsoOffset(8), class_id: 12, teacher_id: 9, created_at: sfIsoOffset(-2), status: 'todo', priority: 'medium' },
  { id: 10, title: 'Questionário — Genética', description: 'Responder ao questionário sobre leis de Mendel e heredogramas.', due_date: sfIsoOffset(-3), class_id: 11, teacher_id: 10, created_at: sfIsoOffset(-9), status: 'done', priority: 'high' },
  { id: 11, title: 'Experimento — Ecossistemas', description: 'Registrar observações sobre um ecossistema local e apresentar as conclusões.', due_date: sfIsoOffset(2), class_id: 3, teacher_id: 10, created_at: sfIsoOffset(-3), status: 'todo', priority: 'medium' },
  { id: 12, title: 'Atividade — Reading Comprehension', description: 'Ler o texto e responder às questões de interpretação em inglês.', due_date: sfIsoOffset(5), class_id: 6, teacher_id: 11, created_at: sfIsoOffset(-1), status: 'doing', priority: 'low' }
];

const mockEvents = [
  { id: 1, title: 'Reunião de Pais e Mestres', description: 'Encontro trimestral para conversar sobre o desempenho das turmas e os próximos passos.', date: sfIsoOffset(1), time_start: '19:00', time_end: '21:00', location: 'Auditório', category: 'meeting', class_id: null, is_global: true, attendees: [1, 4, 9, 10] },
  { id: 2, title: 'Feira de Ciências', description: 'Exposição dos projetos científicos do Ensino Fundamental II e do Ensino Médio.', date: sfIsoOffset(6), time_start: '09:00', time_end: '16:00', location: 'Pátio Principal', category: 'academic', class_id: null, is_global: true, attendees: [1, 2, 4, 5, 9, 10] },
  { id: 3, title: 'Simulado Geral', description: 'Simulado interdisciplinar com questões do Fundamental II e do Ensino Médio.', date: sfIsoOffset(10), time_start: '08:00', time_end: '12:00', location: 'Salas 101–305', category: 'academic', class_id: null, is_global: true, attendees: [2, 5, 6, 7, 8] },
  { id: 4, title: 'Festival Cultural', description: 'Apresentações de música, dança e teatro organizadas pelos alunos.', date: sfIsoOffset(14), time_start: '18:00', time_end: '21:30', location: 'Teatro da Escola', category: 'culture', class_id: null, is_global: true, attendees: [2, 5, 6, 7, 8] },
  { id: 5, title: 'Torneio Interclasses', description: 'Competição esportiva entre as turmas. Traga sua torcida!', date: sfIsoOffset(18), time_start: '08:00', time_end: '17:00', location: 'Quadra', category: 'sports', class_id: null, is_global: true, attendees: [2, 6, 8] },
  { id: 6, title: 'Conselho de Classe', description: 'Reunião interna dos professores para avaliação do trimestre.', date: sfIsoOffset(3), time_start: '16:00', time_end: '18:00', location: 'Sala dos Professores', category: 'meeting', class_id: null, is_global: true, attendees: [1, 4, 9, 10, 11] },
  { id: 7, title: 'Feriado — Proclamação da República', description: 'Não haverá aulas. Bom descanso!', date: sfIsoOffset(11), time_start: '00:00', time_end: '23:59', location: '—', category: 'holiday', class_id: null, is_global: true, attendees: [] },
  { id: 8, title: 'Formatura do 9º ano e 3º ano', description: 'Celebração de encerramento do ano letivo com familiares e convidados.', date: sfIsoOffset(25), time_start: '19:00', time_end: '22:00', location: 'Ginásio', category: 'culture', class_id: null, is_global: true, attendees: [1, 2, 4, 5, 9, 10] }
];

const mockEnrollments = [
  { id: 1, student_id: 2, class_id: 7 }, { id: 2, student_id: 2, class_id: 8 },
  { id: 3, student_id: 2, class_id: 9 }, { id: 4, student_id: 2, class_id: 10 },
  { id: 5, student_id: 2, class_id: 11 }, { id: 6, student_id: 2, class_id: 12 },
  { id: 7, student_id: 2, class_id: 13 },
  { id: 8, student_id: 5, class_id: 1 }, { id: 9, student_id: 5, class_id: 2 },
  { id: 10, student_id: 5, class_id: 3 }, { id: 11, student_id: 5, class_id: 4 },
  { id: 12, student_id: 5, class_id: 5 }, { id: 13, student_id: 5, class_id: 6 },
  { id: 14, student_id: 6, class_id: 7 }, { id: 15, student_id: 6, class_id: 8 },
  { id: 16, student_id: 6, class_id: 9 }, { id: 17, student_id: 6, class_id: 10 },
  { id: 18, student_id: 6, class_id: 11 }, { id: 19, student_id: 6, class_id: 12 },
  { id: 20, student_id: 6, class_id: 13 },
  { id: 21, student_id: 7, class_id: 1 }, { id: 22, student_id: 7, class_id: 2 },
  { id: 23, student_id: 7, class_id: 3 }, { id: 24, student_id: 7, class_id: 4 },
  { id: 25, student_id: 7, class_id: 5 }, { id: 26, student_id: 7, class_id: 6 },
  { id: 27, student_id: 8, class_id: 7 }, { id: 28, student_id: 8, class_id: 8 },
  { id: 29, student_id: 8, class_id: 9 }, { id: 30, student_id: 8, class_id: 10 },
  { id: 31, student_id: 8, class_id: 11 }, { id: 32, student_id: 8, class_id: 12 },
  { id: 33, student_id: 8, class_id: 13 }
];

const mockFocusLog = {
  [sfIsoOffset(-1)]: 50,
  [sfIsoOffset(-2)]: 75,
  [sfIsoOffset(-3)]: 25,
  [sfIsoOffset(-4)]: 50,
  [sfIsoOffset(-6)]: 25
};

// ---------------------------------------------------------------------------
// Estado

function loadSavedData() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.users) || !Array.isArray(parsed.classes)) return null;
    return parsed;
  } catch (error) {
    return null;
  }
}

const savedData = loadSavedData();

const state = Object.assign({
  currentUser: null,
  users: mockUsers,
  classes: mockClasses,
  assignments: mockAssignments,
  events: mockEvents,
  enrollments: mockEnrollments,
  focusLog: mockFocusLog,
  focusSessions: {},
  readNotifications: []
}, savedData || {});

state.currentUser = null;

if (!savedData) saveState();

function saveState() {
  const payload = {
    users: state.users,
    classes: state.classes,
    assignments: state.assignments,
    events: state.events,
    enrollments: state.enrollments,
    focusLog: state.focusLog,
    focusSessions: state.focusSessions,
    readNotifications: state.readNotifications
  };
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Não foi possível salvar os dados.', error);
  }
}

function resetDemoData() {
  localStorage.removeItem(DATA_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('loggedUser');
  localStorage.removeItem(PREFS_KEY);
  localStorage.removeItem('theme');
  window.location.href = 'login.html';
}

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || localStorage.getItem('loggedUser');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function setSession(user) {
  const session = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    subject: user.subject || '',
    stage: user.stage || '',
    grade: user.grade || '',
    avatarTone: user.avatarTone || '',
    onboardingDone: Boolean(user.onboardingDone),
    isGuest: Boolean(user.isGuest || user.role === 'convidado')
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem('loggedUser', JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('loggedUser');
}

// ---------------------------------------------------------------------------
// Escopos e consultas

function getUserById(id) {
  return state.users.find((u) => u.id === Number(id));
}

function getClassById(id) {
  return state.classes.find((c) => c.id === Number(id));
}

function getAssignmentById(id) {
  return state.assignments.find((a) => a.id === Number(id));
}

function getEventById(id) {
  return state.events.find((e) => e.id === Number(id));
}

function getScopedClasses(user = state.currentUser) {
  if (!user || user.role === 'admin') return [...state.classes];
  if (user.role === 'convidado') return state.classes.filter((c) => c.stage === user.stage);
  if (user.role === 'professor') return state.classes.filter((c) => c.teacher_id === user.id);
  const classIds = state.enrollments.filter((e) => e.student_id === user.id).map((e) => e.class_id);
  return state.classes.filter((c) => classIds.includes(c.id));
}

function getScopedAssignments(user = state.currentUser) {
  if (!user || user.role === 'admin') return [...state.assignments];
  if (user.role === 'professor') {
    const classIds = getScopedClasses(user).map((c) => c.id);
    return state.assignments.filter((a) => classIds.includes(a.class_id) || a.teacher_id === user.id);
  }
  const classIds = getScopedClasses(user).map((c) => c.id);
  return state.assignments.filter((a) => classIds.includes(a.class_id));
}

function getScopedEvents(user = state.currentUser) {
  if (!user || user.role === 'admin') return [...state.events];
  const classIds = getScopedClasses(user).map((c) => c.id);
  return state.events.filter((e) => e.is_global || e.class_id === null || classIds.includes(e.class_id));
}

function getScopedUsers(user = state.currentUser) {
  if (!user || user.role === 'admin') return [...state.users];
  if (user.role === 'professor') return state.users.filter((u) => u.role !== 'admin' || u.id === user.id);
  return state.users.filter((u) => u.id === user.id || u.role === 'professor');
}

function getClassName(id) {
  return getClassById(id)?.name || 'Sem aula';
}

function getClassTone(id) {
  return getClassById(id)?.color || '#6366f1';
}

function getTodayClasses(user = state.currentUser) {
  const day = new Date().getDay();
  return getScopedClasses(user)
    .filter((c) => c.day_of_week === day)
    .sort((a, b) => a.time_start.localeCompare(b.time_start));
}

function getPendingAssignments(user = state.currentUser) {
  return getScopedAssignments(user)
    .filter((a) => a.status !== 'done')
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
}

function getUpcomingEvents(user = state.currentUser, limit = 4) {
  const today = sfToISO(new Date());
  return getScopedEvents(user)
    .filter((e) => e.date >= today)
    .sort((a, b) => (a.date + a.time_start).localeCompare(b.date + b.time_start))
    .slice(0, limit);
}

function getFocusStreak() {
  let streak = 0;
  let cursor = new Date();
  if (!state.focusLog[sfToISO(cursor)]) cursor = sfAddDays(cursor, -1);
  while (state.focusLog[sfToISO(cursor)]) {
    streak += 1;
    cursor = sfAddDays(cursor, -1);
  }
  return streak;
}

function getWeekFocus() {
  const start = sfStartOfWeek(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const d = sfAddDays(start, i);
    return { date: d, minutes: state.focusLog[sfToISO(d)] || 0 };
  });
}

function getFocusSessionCount(date = new Date()) {
  const key = sfToISO(date);
  if (state.focusSessions && Object.prototype.hasOwnProperty.call(state.focusSessions, key)) {
    return Number(state.focusSessions[key]) || 0;
  }
  return Math.floor((state.focusLog[key] || 0) / 25);
}

function syncStudentEnrollments(user) {
  if (!user || user.role !== 'aluno' || !user.stage) return;
  const stageClassIds = state.classes.filter((c) => c.stage === user.stage).map((c) => c.id);
  state.enrollments = state.enrollments.filter((e) => {
    if (e.student_id !== user.id) return true;
    return !getClassById(e.class_id)?.stage;
  });
  let nextId = Math.max(0, ...state.enrollments.map((e) => Number(e.id) || 0)) + 1;
  stageClassIds.forEach((classId) => {
    if (!state.enrollments.some((e) => e.student_id === user.id && e.class_id === classId)) {
      state.enrollments.push({ id: nextId, student_id: user.id, class_id: classId });
      nextId += 1;
    }
  });
}

function registerStudent(account) {
  const stage = SCHOOL_STAGES[account.stage] ? account.stage : 'medio';
  const grades = getGradeOptions(stage);
  const grade = grades.includes(account.grade) ? account.grade : grades[0];
  const user = {
    id: Math.max(0, ...state.users.map((u) => Number(u.id) || 0)) + 1,
    name: account.name.trim(),
    email: account.email.trim().toLowerCase(),
    password: account.password,
    role: 'aluno',
    stage,
    grade,
    subject: `${grade} · ${getStageShort(stage)}`,
    avatarTone: account.avatarTone || 'indigo',
    onboardingDone: false,
    created_at: new Date().toISOString()
  };
  state.users.push(user);
  syncStudentEnrollments(user);
  saveState();
  return user;
}
