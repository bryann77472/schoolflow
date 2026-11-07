// SchoolFlow — dados demo, helpers e persistência
// ---------------------------------------------------------------------------

const DATA_KEY = 'schoolflow.data.v4';
const SESSION_KEY = 'schoolflow.session.v1';
const PREFS_KEY = 'schoolflow.prefs.v1';
const FIREBASE_COLLECTIONS = ['users', 'classes', 'assignments', 'events', 'enrollments'];

const DEMO_ACCOUNTS = [
  { role: 'aluno', name: 'Carlos Aluno', email: 'carlos@aluno.com', password: 'aluno123' },
  { role: 'professor', name: 'Ana Professor', email: 'ana@professor.com', password: 'prof123' },
  { role: 'admin', name: 'Admin Escola', email: 'admin@escola.com', password: 'admin123' }
];

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

state.currentUser = null;

// ---------------------------------------------------------------------------
// Firebase / Firestore
// ---------------------------------------------------------------------------

let sfFirebaseUser = null;
let sfFirestoreReady = false;
let sfSetupExists = false;
let sfPersistQueue = Promise.resolve();
let sfLastPersisted = null;
let sfPersistErrorShown = false;

function sfClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sfDefineDocId(item, docId) {
  if (!item || typeof item !== 'object') return item;
  Object.defineProperty(item, '_docId', {
    value: String(docId),
    enumerable: false,
    writable: true,
    configurable: true
  });
  return item;
}

function sfUserDocId(user) {
  return String(user.uid || user._docId || `pending_${user.id}`);
}

function sfDocId(collection, item) {
  return collection === 'users' ? sfUserDocId(item) : String(item.id);
}

function sfStripForStore(collection, item) {
  const copy = { ...item };
  delete copy.password;
  delete copy._docId;
  return JSON.parse(JSON.stringify(copy));
}

async function sfCommitOperations(operations) {
  const fb = window.SF_FIREBASE;
  if (!fb?.available || !operations.length) return;
  for (let index = 0; index < operations.length; index += 400) {
    const batch = fb.db.batch();
    operations.slice(index, index + 400).forEach((operation) => {
      const ref = fb.db.collection(operation.collection).doc(operation.docId);
      if (operation.type === 'delete') batch.delete(ref);
      else batch.set(ref, operation.data);
    });
    await batch.commit();
  }
}

function sfSyncCurrentUserFields() {
  if (!state.currentUser || isGuestUser(state.currentUser) || !state.currentUser.uid) return;
  state.currentUser.focusLog = state.focusLog || {};
  state.currentUser.focusSessions = state.focusSessions || {};
  state.currentUser.readNotifications = state.readNotifications || [];
}

function sfMakeSnapshot() {
  const snapshot = {};
  FIREBASE_COLLECTIONS.forEach((collection) => {
    snapshot[collection] = state[collection].map((item) => ({
      docId: sfDocId(collection, item),
      json: JSON.stringify(sfStripForStore(collection, item))
    }));
  });
  return snapshot;
}

function sfWriteLocalCache() {
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
    console.warn('Não foi possível salvar o cache local.', error);
  }
}

async function sfPersistState() {
  sfSyncCurrentUserFields();
  const next = sfMakeSnapshot();

  if (!sfLastPersisted) {
    sfLastPersisted = next;
    sfWriteLocalCache();
    return;
  }

  const canWrite = Boolean(
    window.SF_FIREBASE?.available &&
    sfFirestoreReady &&
    sfFirebaseUser &&
    state.currentUser &&
    !isGuestUser(state.currentUser)
  );

  if (!canWrite) {
    sfLastPersisted = next;
    sfWriteLocalCache();
    return;
  }

  const operations = [];

  FIREBASE_COLLECTIONS.forEach((collection) => {
    const previous = new Map(sfLastPersisted[collection].map((entry) => [entry.docId, entry.json]));
    const current = new Map(next[collection].map((entry) => [entry.docId, entry.json]));

    current.forEach((json, docId) => {
      if (previous.get(docId) !== json) {
        operations.push({ type: 'set', collection, docId, data: JSON.parse(json) });
      }
    });

    previous.forEach((_json, docId) => {
      if (!current.has(docId)) {
        operations.push({ type: 'delete', collection, docId });
      }
    });
  });

  if (!operations.length) {
    sfLastPersisted = next;
    sfWriteLocalCache();
    return;
  }

  try {
    await sfCommitOperations(operations);
    sfLastPersisted = next;
    sfWriteLocalCache();
    sfPersistErrorShown = false;
  } catch (error) {
    console.error('Falha ao salvar no Firestore.', error);
    if (!sfPersistErrorShown && typeof toast === 'function') {
      sfPersistErrorShown = true;
      toast('Não foi possível salvar', sfFirebaseErrorMessage(error), 'error', 5200);
    }
    throw error;
  }
}

function saveState() {
  sfPersistQueue = sfPersistQueue.then(
    () => sfPersistState(),
    () => sfPersistState()
  );
  return sfPersistQueue;
}

function sfLoadCollection(collection) {
  return window.SF_FIREBASE.db.collection(collection).get().then((snapshot) => snapshot.docs.map((doc) => {
    const data = doc.data();
    delete data.password;
    if (collection === 'users' && !data.uid && !String(doc.id).startsWith('pending_')) {
      data.uid = doc.id;
    }
    return sfDefineDocId(data, doc.id);
  }));
}

async function sfLoadFirestoreState() {
  const [users, classes, assignments, events, enrollments, setup] = await Promise.all([
    sfLoadCollection('users'),
    sfLoadCollection('classes'),
    sfLoadCollection('assignments'),
    sfLoadCollection('events'),
    sfLoadCollection('enrollments'),
    window.SF_FIREBASE.db.collection('meta').doc('setup').get()
  ]);

  state.users = users;
  state.classes = classes;
  state.assignments = assignments;
  state.events = events;
  state.enrollments = enrollments;
  state.focusLog = {};
  state.focusSessions = {};
  state.readNotifications = [];
  sfSetupExists = setup.exists;
  sfLastPersisted = sfMakeSnapshot();
}

function sfFindProfileForAuthUser(firebaseUser) {
  if (!firebaseUser) return null;
  const email = String(firebaseUser.email || '').toLowerCase();
  return state.users.find((user) => user.uid === firebaseUser.uid)
    || state.users.find((user) => String(user.email || '').toLowerCase() === email && !user.uid)
    || null;
}

function sfNextUserId() {
  return Math.max(0, ...state.users.map((user) => Number(user.id) || 0)) + 1;
}

function sfCreateProfileForAuthUser(firebaseUser) {
  const stage = 'medio';
  const grade = getGradeOptions(stage)[0] || '1º ano';
  const profile = {
    id: sfNextUserId(),
    uid: firebaseUser.uid,
    name: firebaseUser.displayName || String(firebaseUser.email || 'Estudante').split('@')[0],
    email: String(firebaseUser.email || '').toLowerCase(),
    role: 'aluno',
    stage,
    grade,
    subject: `${grade} · ${getStageShort(stage)}`,
    avatarTone: 'indigo',
    onboardingDone: false,
    created_at: new Date().toISOString(),
    focusLog: {},
    focusSessions: {},
    readNotifications: []
  };
  sfDefineDocId(profile, firebaseUser.uid);
  state.users.push(profile);
  return profile;
}

function sfApplyCurrentUserProfile(profile) {
  state.currentUser = profile;
  state.focusLog = profile.focusLog && typeof profile.focusLog === 'object' ? { ...profile.focusLog } : {};
  state.focusSessions = profile.focusSessions && typeof profile.focusSessions === 'object' ? { ...profile.focusSessions } : {};
  state.readNotifications = Array.isArray(profile.readNotifications) ? [...profile.readNotifications] : [];
  setSession(profile);
}

function sfLinkPendingProfile(profile, firebaseUser) {
  if (!profile || !firebaseUser) return false;
  const needsLink = !profile.uid;
  profile.uid = firebaseUser.uid;
  profile.email = String(firebaseUser.email || profile.email || '').toLowerCase();
  if (needsLink || String(profile._docId || '') !== String(firebaseUser.uid)) {
    sfDefineDocId(profile, firebaseUser.uid);
    return true;
  }
  return false;
}

function sfUseMockContentForGuest() {
  state.users = sfClone(mockUsers).map((user) => {
    delete user.password;
    return sfDefineDocId(user, `pending_${user.id}`);
  });
  state.classes = sfClone(mockClasses).map((item) => sfDefineDocId(item, item.id));
  state.assignments = sfClone(mockAssignments).map((item) => sfDefineDocId(item, item.id));
  state.events = sfClone(mockEvents).map((item) => sfDefineDocId(item, item.id));
  state.enrollments = sfClone(mockEnrollments).map((item) => sfDefineDocId(item, item.id));
  state.focusLog = { ...mockFocusLog };
  state.focusSessions = {};
  state.readNotifications = [];
  sfLastPersisted = sfMakeSnapshot();
}

async function sfEnsureContentSeed() {
  const fb = window.SF_FIREBASE;
  if (!fb?.available || !sfFirestoreReady || !sfFirebaseUser || sfFirebaseUser.isAnonymous || !state.currentUser) return false;

  const setupRef = fb.db.collection('meta').doc('setup');

  if (state.classes.length) {
    if (!sfSetupExists && (state.currentUser.role === 'admin' || state.currentUser.role === 'professor')) {
      await setupRef.set({
        seededAt: fb.FieldValue.serverTimestamp(),
        seededBy: sfFirebaseUser.uid,
        source: 'schoolflow'
      });
      sfSetupExists = true;
    }
    return false;
  }

  if (sfSetupExists) return false;

  const previousState = {
    classes: state.classes,
    assignments: state.assignments,
    events: state.events,
    enrollments: state.enrollments
  };

  state.classes = sfClone(mockClasses).map((item) => sfDefineDocId(item, item.id));
  state.assignments = sfClone(mockAssignments).map((item) => sfDefineDocId(item, item.id));
  state.events = sfClone(mockEvents).map((item) => sfDefineDocId(item, item.id));
  state.enrollments = [];
  if (state.currentUser.role === 'aluno') syncStudentEnrollments(state.currentUser);

  const operations = [];
  state.classes.forEach((item) => operations.push({ type: 'set', collection: 'classes', docId: String(item.id), data: sfStripForStore('classes', item) }));
  state.assignments.forEach((item) => operations.push({ type: 'set', collection: 'assignments', docId: String(item.id), data: sfStripForStore('assignments', item) }));
  state.events.forEach((item) => operations.push({ type: 'set', collection: 'events', docId: String(item.id), data: sfStripForStore('events', item) }));
  state.enrollments.forEach((item) => operations.push({ type: 'set', collection: 'enrollments', docId: String(item.id), data: sfStripForStore('enrollments', item) }));

  try {
    await sfCommitOperations(operations);
    await setupRef.set({
      seededAt: fb.FieldValue.serverTimestamp(),
      seededBy: sfFirebaseUser.uid,
      source: 'schoolflow'
    });
  } catch (error) {
    state.classes = previousState.classes;
    state.assignments = previousState.assignments;
    state.events = previousState.events;
    state.enrollments = previousState.enrollments;
    sfLastPersisted = sfMakeSnapshot();
    throw error;
  }

  sfSetupExists = true;
  sfLastPersisted = sfMakeSnapshot();
  sfWriteLocalCache();
  return true;
}

function sfUseLocalFallback(error) {
  if (error) console.warn('Firestore indisponível; usando dados locais de demonstração.', error);
  window.SF_DATA_SOURCE = 'local';
  sfFirestoreReady = false;
  state.users = sfClone(mockUsers).map((user) => {
    delete user.password;
    return sfDefineDocId(user, `pending_${user.id}`);
  });
  state.classes = sfClone(mockClasses).map((item) => sfDefineDocId(item, item.id));
  state.assignments = sfClone(mockAssignments).map((item) => sfDefineDocId(item, item.id));
  state.events = sfClone(mockEvents).map((item) => sfDefineDocId(item, item.id));
  state.enrollments = sfClone(mockEnrollments).map((item) => sfDefineDocId(item, item.id));
  state.focusLog = { ...mockFocusLog };
  state.focusSessions = {};
  state.readNotifications = [];
  sfLastPersisted = sfMakeSnapshot();
}

async function sfInitializeData() {
  const fb = window.SF_FIREBASE;
  if (!fb?.available) {
    window.SF_DATA_SOURCE = 'local';
    sfUseLocalFallback();
    return;
  }

  try {
    sfFirebaseUser = await fb.waitForAuthUser();
    if (!sfFirebaseUser) {
      state.users = [];
      state.classes = [];
      state.assignments = [];
      state.events = [];
      state.enrollments = [];
      state.focusLog = {};
      state.focusSessions = {};
      state.readNotifications = [];
      sfLastPersisted = sfMakeSnapshot();
      clearSession();
      window.SF_DATA_SOURCE = 'firestore';
      return;
    }

    await sfLoadFirestoreState();
    sfFirestoreReady = true;
    window.SF_DATA_SOURCE = 'firestore';

    if (sfFirebaseUser.isAnonymous) {
      state.currentUser = getGuestUser();
      setSession(state.currentUser);
      if (!state.classes.length) sfUseMockContentForGuest();
      return;
    }

    let profile = sfFindProfileForAuthUser(sfFirebaseUser);
    if (!profile) {
      profile = sfCreateProfileForAuthUser(sfFirebaseUser);
      sfApplyCurrentUserProfile(profile);
      await saveState();
    } else {
      const linked = sfLinkPendingProfile(profile, sfFirebaseUser);
      sfApplyCurrentUserProfile(profile);
      if (linked) await saveState();
    }

    await sfEnsureContentSeed().catch((error) => {
      console.error('Não foi possível preparar os dados iniciais.', error);
    });
  } catch (error) {
    console.error('Falha ao inicializar os dados do Firebase.', error);
    if (sfFirebaseUser?.isAnonymous) {
      state.currentUser = getGuestUser();
      setSession(state.currentUser);
      sfUseLocalFallback(error);
    } else {
      sessionStorage.setItem('sf.authError', sfFirebaseErrorMessage(error));
      state.currentUser = null;
      clearSession();
    }
  }
}

async function sfAuthLogin(email, password) {
  const fb = window.SF_FIREBASE;
  if (!fb?.available) throw new Error('Firebase não carregado. Verifique a conexão e recarregue a página.');

  let credential;
  try {
    credential = await fb.auth.signInWithEmailAndPassword(email, password);
    sfFirebaseUser = credential.user;
    await sfLoadFirestoreState();
    sfFirestoreReady = true;
    window.SF_DATA_SOURCE = 'firestore';

    let profile = sfFindProfileForAuthUser(credential.user);
    if (!profile) {
      profile = sfCreateProfileForAuthUser(credential.user);
      sfApplyCurrentUserProfile(profile);
      await saveState();
    } else {
      const linked = sfLinkPendingProfile(profile, credential.user);
      sfApplyCurrentUserProfile(profile);
      if (linked) await saveState();
    }

    await sfEnsureContentSeed().catch((error) => {
      console.error('Não foi possível preparar os dados iniciais.', error);
    });
    return profile;
  } catch (error) {
    if (credential?.user) {
      await fb.auth.signOut().catch(() => {});
      sfFirebaseUser = null;
      sfFirestoreReady = false;
    }
    throw error;
  }
}

async function sfAuthSignup(account) {
  const fb = window.SF_FIREBASE;
  if (!fb?.available) throw new Error('Firebase não carregado. Verifique a conexão e recarregue a página.');

  let credential;
  let profileSaved = false;
  try {
    credential = await fb.auth.createUserWithEmailAndPassword(account.email, account.password);
    sfFirebaseUser = credential.user;
    await sfLoadFirestoreState();
    sfFirestoreReady = true;
    window.SF_DATA_SOURCE = 'firestore';

    const pending = state.users.find((user) => String(user.email || '').toLowerCase() === account.email && !user.uid);
    if (pending && pending.role !== 'aluno') {
      throw new Error('Esta conta é institucional. Peça ao administrador para liberar o acesso.');
    }

    const user = registerStudent({ ...account, uid: credential.user.uid, existing: pending });
    state.currentUser = user;
    sfApplyCurrentUserProfile(user);
    await saveState();
    profileSaved = true;

    if (!state.classes.length) {
      await sfEnsureContentSeed().catch((error) => {
        console.error('Não foi possível preparar os dados iniciais.', error);
      });
    } else {
      syncStudentEnrollments(user);
      await saveState();
    }
    return user;
  } catch (error) {
    if (credential?.user) {
      if (!profileSaved) {
        try {
          await credential.user.delete();
        } catch (deleteError) {
          await fb.auth.signOut().catch(() => {});
        }
      } else {
        await fb.auth.signOut().catch(() => {});
      }
    }
    sfFirebaseUser = null;
    sfFirestoreReady = false;
    throw error;
  }
}

async function sfAuthGuest() {
  const fb = window.SF_FIREBASE;
  if (fb?.available) {
    try {
      const credential = await fb.auth.signInAnonymously();
      sfFirebaseUser = credential.user;
      await sfLoadFirestoreState();
      sfFirestoreReady = true;
      window.SF_DATA_SOURCE = 'firestore';
      state.currentUser = getGuestUser();
      setSession(state.currentUser);
      if (!state.classes.length) sfUseMockContentForGuest();
      return state.currentUser;
    } catch (error) {
      console.warn('Login anônimo indisponível; abrindo demonstração local.', error);
      state.currentUser = getGuestUser();
      setSession(state.currentUser);
      sfUseLocalFallback();
      return state.currentUser;
    }
  }

  state.currentUser = getGuestUser();
  setSession(state.currentUser);
  sfUseLocalFallback();
  return state.currentUser;
}

async function sfLogout() {
  try {
    if (window.SF_FIREBASE?.available) await window.SF_FIREBASE.auth.signOut();
  } catch (error) {
    console.warn('Não foi possível encerrar a sessão do Firebase.', error);
  }
  sfFirebaseUser = null;
  sfFirestoreReady = false;
  clearSession();
  state.currentUser = null;
}

async function sfCreateAuthAccountForAdmin(email, password) {
  const fb = window.SF_FIREBASE;
  if (!fb?.available) throw new Error('Firebase não carregado.');
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(fb.config.apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = String(data?.error?.message || '');
    if (code.includes('EMAIL_EXISTS')) throw new Error('Já existe uma conta de acesso com esse email.');
    if (code.includes('WEAK_PASSWORD')) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
    if (code.includes('OPERATION_NOT_ALLOWED')) throw new Error('Cadastro por email/senha não está habilitado no Firebase.');
    throw new Error('Não foi possível criar a conta de acesso.');
  }
  return data.localId;
}

async function sfSendPasswordReset(email) {
  const fb = window.SF_FIREBASE;
  if (!fb?.available) throw new Error('Firebase não carregado.');
  await fb.auth.sendPasswordResetEmail(email);
}

window.SF_DATA_READY = sfInitializeData();

async function resetDemoData() {
  localStorage.removeItem(DATA_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('loggedUser');
  localStorage.removeItem(PREFS_KEY);
  localStorage.removeItem('theme');
  await sfLogout();
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
  const email = account.email.trim().toLowerCase();
  const existing = account.existing || state.users.find((user) => String(user.email || '').toLowerCase() === email && !user.uid);
  if (existing && existing.role !== 'aluno') {
    throw new Error('Esta conta é institucional. Peça ao administrador para liberar o acesso.');
  }

  const user = existing || {
    id: Math.max(0, ...state.users.map((u) => Number(u.id) || 0)) + 1,
    role: 'aluno',
    avatarTone: account.avatarTone || 'indigo',
    created_at: new Date().toISOString()
  };

  Object.assign(user, {
    name: account.name.trim(),
    email,
    role: 'aluno',
    stage,
    grade,
    subject: `${grade} · ${getStageShort(stage)}`,
    onboardingDone: false
  });
  delete user.password;
  if (account.uid) {
    user.uid = account.uid;
    sfDefineDocId(user, account.uid);
  }

  if (!existing) state.users.push(user);
  syncStudentEnrollments(user);
  return user;
}
