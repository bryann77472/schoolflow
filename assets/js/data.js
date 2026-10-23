// Dados mockados iniciais

const mockUsers = [
  { id: 1, name: "Ana Professor", email: "ana@professor.com", password: "prof123", role: "professor" },
  { id: 2, name: "Carlos Aluno", email: "carlos@aluno.com", password: "aluno123", role: "aluno" },
  { id: 3, name: "Admin Escola", email: "admin@escola.com", password: "admin123", role: "admin" }
];

const mockClasses = [
  { id: 1, name: "Matemática Avançada", description: "Álgebra, geometria analítica", day_of_week: 1, time_start: "08:00", time_end: "09:30", room: "Sala 101", teacher_id: 1 },
  { id: 2, name: "Física Quântica", description: "Introdução à física moderna", day_of_week: 1, time_start: "10:00", time_end: "11:30", room: "Sala 203", teacher_id: 1 },
  { id: 3, name: "Química Orgânica", description: "Reações orgânicas básicas", day_of_week: 2, time_start: "08:00", time_end: "09:30", room: "Sala 102", teacher_id: 1 },
  { id: 4, name: "História do Brasil", description: "Período colonial ao imperador", day_of_week: 3, time_start: "09:00", time_end: "10:30", room: "Sala 301", teacher_id: 1 },
  { id: 5, name: "Literatura Inglesa", description: "Shakespeare e romantismo", day_of_week: 4, time_start: "08:00", time_end: "09:30", room: "Sala 201", teacher_id: 1 },
  { id: 6, name: "Biologia Celular", description: "Mitose, meiose e DNA", day_of_week: 5, time_start: "07:30", time_end: "09:00", room: "Sala 103", teacher_id: 1 }
];

const mockAssignments = [
  { id: 1, title: "Lista de Exercícios - Álgebra", description: "Resolver os exercícios 1-20 do capítulo 3", due_date: "2026-10-27", class_id: 1, teacher_id: 1, created_at: "2026-10-20" },
  { id: 2, title: "Relatório - Física Quântica", description: "Pesquisar sobre o efeito fóton-eletrão", due_date: "2026-10-28", class_id: 2, teacher_id: 1, created_at: "2026-10-21" },
  { id: 3, title: "Projeto - Química", description: "Criar uma apresentação sobre hidrocarbonetos", due_date: "2026-10-30", class_id: 3, teacher_id: 1, created_at: "2026-10-22" },
  { id: 4, title: "Leitura - História", description: "Ler sobre a Independência do Brasil", due_date: "2026-10-25", class_id: 4, teacher_id: 1, created_at: "2026-10-18" }
];

const mockEvents = [
  { id: 1, title: "Cerimônia de Formatura", description: "Cerimônia de formatura do ensino médio", date: "2026-11-15", time_start: "14:00", time_end: "17:00", location: "Gymnasium", class_id: null, is_global: true },
  { id: 2, title: "Feira de Ciências", description: "Eventão de ciências com exposições", date: "2026-11-20", time_start: "09:00", time_end: "16:00", location: "Pátio Principal", class_id: null, is_global: true },
  { id: 3, title: "Reunião PAPA", description: "Reunião de pais e professores", date: "2026-11-05", time_start: "19:00", time_end: "21:00", location: "Sala de Eventos", class_id: null, is_global: true }
];

const mockEnrollments = [
  { id: 1, student_id: 2, class_id: 1 },
  { id: 2, student_id: 2, class_id: 2 },
  { id: 3, student_id: 2, class_id: 3 },
  { id: 4, student_id: 2, class_id: 4 },
  { id: 5, student_id: 2, class_id: 5 },
  { id: 6, student_id: 2, class_id: 6 }
];

// Estado da aplicação
const state = {
  currentUser: null,
  theme: 'light',
  classes: [...mockClasses],
  assignments: [...mockAssignments],
  events: [...mockEvents],
  enrollments: [...mockEnrollments]
};

// Utility functions
const utils = {
  formatDate(dateStr) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('pt-BR', options);
  },
  
  formatDateShort(dateStr) {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  },
  
  formatTime(timeStr) {
    return timeStr;
  },
  
  isDueSoon(dueDate) {
    const today = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 2;
  },
  
  getDayOfWeekName(dayNum) {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return days[dayNum];
  },
  
  getCurrentWeek() {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  }
};
