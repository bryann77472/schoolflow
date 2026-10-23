// Aplicação principal

document.addEventListener('DOMContentLoaded', () => {
  // Verificar tema salvo
  const savedTheme = localStorage.getItem('theme') || 'light';
  state.theme = savedTheme;
  applyTheme(savedTheme);
  
  // Verifica se há usuário logado
  const loggedUser = localStorage.getItem('loggedUser');
  if (loggedUser) {
    state.currentUser = JSON.parse(loggedUser);
  }
  
  initApp();
});

function initApp() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  
  switch(currentPath) {
    case 'index.html':
    case '':
      renderDashboard();
      break;
    case 'login.html':
      initLogin();
      break;
    case 'assignments.html':
      renderAssignments();
      break;
    case 'events.html':
      renderEvents();
      break;
    case 'admin.html':
      renderAdmin();
      break;
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  state.theme = theme;
  updateThemeToggle();
}

function toggleTheme() {
  const newTheme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
}

function updateThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    if (state.theme === 'light') {
      toggle.innerHTML = '🌙 <span style="color: var(--text-primary);">Dark</span>';
    } else {
      toggle.innerHTML = '☀️ <span style="color: white;">Light</span>';
    }
  }
}

// Login functionality
function initLogin() {
  const form = document.getElementById('login-form');
  const roleBtns = document.querySelectorAll('.role-btn');
  
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const role = document.querySelector('.role-btn.active').dataset.role;
      
      const user = mockUsers.find(u => u.email === email && u.password === password && u.role === role);
      
      if (user) {
        state.currentUser = user;
        localStorage.setItem('loggedUser', JSON.stringify(user));
        window.location.href = 'dashboard.html';
      } else {
        alert('Credenciais inválidas!');
      }
    });
  }
  
  if (roleBtns.length > 0) {
    roleBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        roleBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
      });
    });
    
    // Set default active role
    roleBtns[0].classList.add('active');
  }
}

function logout() {
  localStorage.removeItem('loggedUser');
  state.currentUser = null;
  window.location.href = 'login.html';
}

// Guard
function requireAuth() {
  if (!state.currentUser) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function requireRole(role) {
  if (!requireAuth() || state.currentUser.role !== role) {
    return false;
  }
  return true;
}

// Render functions
function renderDashboard() {
  if (!requireAuth()) return;
  
  renderHeader();
  renderWeekCalendar();
  renderAssignmentsList();
  renderEventsList();
}

function renderHeader() {
  const header = document.querySelector('header nav ul') || document.createElement('nav');
  const user = state.currentUser;
  
  document.querySelector('.user-info .name').textContent = user.name;
  document.querySelector('.user-info .role').textContent = user.role;
  document.querySelector('.user-info .avatar').textContent = user.name.charAt(0).toUpperCase();
}

function renderWeekCalendar() {
  const container = document.getElementById('calendar-days');
  if (!container) return;
  
  const weekDates = utils.getCurrentWeek();
  const startIdx = 1; // Monday
  const endIdx = 5;   // Friday
  
  container.innerHTML = '';
  
  for (let i = startIdx; i <= endIdx; i++) {
    const date = weekDates[i];
    const dayNum = date.getDay();
    const dayClasses = state.classes.filter(c => c.day_of_week === dayNum);
    const enrollments = state.enrollments.filter(e => e.student_id === state.currentUser.id);
    const studentClasses = state.classes.filter(c => 
      enrollments.some(e => e.class_id === c.id)
    );
    
    const classesToShow = state.currentUser.role === 'aluno' ? studentClasses.filter(c => c.day_of_week === dayNum) : dayClasses;
    
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    cell.innerHTML = `
      <div class="date">${date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })}</div>
      ${classesToShow.map(c => `
        <div class="class-item" onclick="showClassDetails(${c.id})">
          <div class="class-name">${c.name}</div>
          <div class="class-time">${c.time_start} - ${c.time_end} · ${c.room}</div>
        </div>
      `).join('')}
    `;
    container.appendChild(cell);
  }
}

function renderAssignmentsList() {
  const container = document.getElementById('assignments-list');
  if (!container) return;
  
  let assignments = state.assignments;
  
  if (state.currentUser.role === 'aluno') {
    const enrollments = state.enrollments.filter(e => e.student_id === state.currentUser.id);
    const classIds = enrollments.map(e => e.class_id);
    assignments = assignments.filter(a => classIds.includes(a.class_id));
  }
  
  container.innerHTML = assignments.slice(0, 5).map(a => {
    const isUrgent = utils.isDueSoon(a.due_date);
    return `
      <div class="assignment-item">
        <div class="details">
          <h3>${a.title}</h3>
          <p>${a.description}</p>
        </div>
        <div class="due-date ${isUrgent ? 'urgent' : ''}">
          ${utils.formatDateShort(a.due_date)}
        </div>
      </div>
    `;
  }).join('');
}

function renderEventsList() {
  const container = document.getElementById('events-list');
  if (!container) return;
  
  container.innerHTML = state.events.slice(0, 3).map(e => `
    <div class="event-item">
      <div class="event-title">${e.title}</div>
      <div class="event-date">${utils.formatDate(e.date)} · ${e.time_start}-${e.time_end}</div>
    </div>
  `).join('');
}

// Assignment management
function openAssignmentModal(id = null) {
  const modal = document.getElementById('assignment-modal');
  if (modal) {
    modal.classList.add('active');
    if (id) {
      const assignment = state.assignments.find(a => a.id === id);
      if (assignment) {
        document.getElementById('assignment-title').value = assignment.title;
        document.getElementById('assignment-desc').value = assignment.description;
        document.getElementById('assignment-due').value = assignment.due_date;
      }
    }
  }
}

function closeAssignmentModal() {
  const modal = document.getElementById('assignment-modal');
  if (modal) {
    modal.classList.remove('active');
    document.getElementById('assignment-form').reset();
  }
}

function saveAssignment() {
  const title = document.getElementById('assignment-title').value;
  const desc = document.getElementById('assignment-desc').value;
  const due = document.getElementById('assignment-due').value;
  const classId = document.getElementById('assignment-class').value;
  
  if (title && due && classId) {
    const newAssignment = {
      id: Date.now(),
      title,
      description: desc,
      due_date: due,
      class_id: parseInt(classId),
      teacher_id: state.currentUser.id,
      created_at: new Date().toISOString().split('T')[0]
    };
    state.assignments.push(newAssignment);
    closeAssignmentModal();
    renderAssignmentsList();
  }
}

// Event management
function openEventModal(id = null) {
  const modal = document.getElementById('event-modal');
  if (modal) {
    modal.classList.add('active');
    if (id) {
      const event = state.events.find(e => e.id === id);
      if (event) {
        document.getElementById('event-title').value = event.title;
        document.getElementById('event-desc').value = event.description;
        document.getElementById('event-date').value = event.date;
        document.getElementById('event-time-start').value = event.time_start;
        document.getElementById('event-time-end').value = event.time_end;
        document.getElementById('event-location').value = event.location;
      }
    }
  }
}

function closeEventModal() {
  const modal = document.getElementById('event-modal');
  if (modal) {
    modal.classList.remove('active');
    document.getElementById('event-form').reset();
  }
}

function saveEvent() {
  const title = document.getElementById('event-title').value;
  const desc = document.getElementById('event-desc').value;
  const date = document.getElementById('event-date').value;
  const timeStart = document.getElementById('event-time-start').value;
  const timeEnd = document.getElementById('event-time-end').value;
  const location = document.getElementById('event-location').value;
  
  if (title && date && timeStart && timeEnd) {
    const newEvent = {
      id: Date.now(),
      title,
      description: desc,
      date,
      time_start: timeStart,
      time_end: timeEnd,
      location,
      class_id: null,
      is_global: true
    };
    state.events.push(newEvent);
    closeEventModal();
    renderEventsList();
  }
}

function showClassDetails(id) {
  const classItem = state.classes.find(c => c.id === id);
  if (classItem) {
    alert(`Aula: ${classItem.name}\nSala: ${classItem.room}\nHorário: ${classItem.time_start} - ${classItem.time_end}\n\n${classItem.description}`);
  }
}

// Admin functions
function renderAdmin() {
  if (!requireRole('admin')) return;
  
  renderUsersTable();
  renderClassesTable();
}

function renderUsersTable() {
  const tbody = document.querySelector('#users-table tbody');
  if (!tbody) return;
  
  tbody.innerHTML = mockUsers.map(u => `
    <tr>
      <td>${u.id}</td>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td><span style="text-transform: capitalize;">${u.role}</span></td>
      <td>
        <button class="btn btn-danger" onclick="deleteUser(${u.id})">Excluir</button>
      </td>
    </tr>
  `).join('');
}

function renderClassesTable() {
  const tbody = document.querySelector('#classes-table tbody');
  if (!tbody) return;
  
  tbody.innerHTML = state.classes.map(c => `
    <tr>
      <td>${c.name}</td>
      <td>${utils.getDayOfWeekName(c.day_of_week)}</td>
      <td>${c.time_start} - ${c.time_end}</td>
      <td>${c.room}</td>
      <td>
        <button class="btn btn-danger" onclick="deleteClass(${c.id})">Excluir</button>
      </td>
    </tr>
  `).join('');
}

function deleteUser(id) {
  if (confirm('Excluir este usuário?')) {
    const idx = mockUsers.findIndex(u => u.id === id);
    if (idx > -1) mockUsers.splice(idx, 1);
    renderUsersTable();
  }
}

function deleteClass(id) {
  if (confirm('Excluir esta aula?')) {
    const idx = state.classes.findIndex(c => c.id === id);
    if (idx > -1) state.classes.splice(idx, 1);
    renderClassesTable();
  }
}

function addUser() {
  const name = document.getElementById('user-name').value;
  const email = document.getElementById('user-email').value;
  const role = document.getElementById('user-role').value;
  const password = Math.random().toString(36).slice(-8);
  
  if (name && email && role) {
    const newUser = {
      id: mockUsers.length + 1,
      name,
      email,
      password,
      role
    };
    mockUsers.push(newUser);
    document.getElementById('add-user-modal').classList.remove('active');
    document.getElementById('add-user-form').reset();
    renderUsersTable();
  }
}

function openAddUserModal() {
  const modal = document.getElementById('add-user-modal');
  if (modal) modal.classList.add('active');
}

function closeAddUserModal() {
  const modal = document.getElementById('add-user-modal');
  if (modal) {
    modal.classList.remove('active');
    document.getElementById('add-user-form').reset();
  }
}

// Render assignments page
function renderAssignments() {
  if (!requireAuth()) return;
  
  renderHeader();
  populateClassSelect();
  renderAssignmentsFullList();
}

function renderAssignmentsFullList() {
  const container = document.getElementById('assignments-container');
  if (!container) return;
  
  let assignments = state.assignments;
  
  if (state.currentUser.role === 'aluno') {
    const enrollments = state.enrollments.filter(e => e.student_id === state.currentUser.id);
    const classIds = enrollments.map(e => e.class_id);
    assignments = assignments.filter(a => classIds.includes(a.class_id));
  }
  
  container.innerHTML = assignments.map(a => {
    const className = state.classes.find(c => c.id === a.class_id)?.name || 'Sem aula';
    const isUrgent = utils.isDueSoon(a.due_date);
    return `
      <div class="assignment-item">
        <div class="details">
          <h3>${a.title}</h3>
          <p>${a.description}</p>
          <p style="color: var(--text-secondary); font-size: 0.8rem;">Aula: ${className}</p>
        </div>
        <div class="due-date ${isUrgent ? 'urgent' : ''}">
          ${utils.formatDateShort(a.due_date)}
        </div>
      </div>
    `;
  }).join('');
}

// Render events page
function renderEvents() {
  if (!requireAuth()) return;
  
  renderHeader();
  renderEventsFullList();
}

function renderEventsFullList() {
  const container = document.getElementById('events-container');
  if (!container) return;
  
  container.innerHTML = state.events.map(e => `
    <div class="event-item">
      <div class="event-title">${e.title}</div>
      <div class="event-date">${utils.formatDate(e.date)} · ${e.time_start}-${e.time_end} · ${e.location}</div>
      <div style="color: var(--text-secondary); margin-top: 0.3rem; font-size: 0.85rem;">${e.description}</div>
    </div>
  `).join('');
}

function populateClassSelect() {
  const select = document.getElementById('assignment-class');
  if (!select) return;
  
  let classes = state.classes;
  if (state.currentUser.role === 'aluno') {
    const enrollments = state.enrollments.filter(e => e.student_id === state.currentUser.id);
    const classIds = enrollments.map(e => e.class_id);
    classes = state.classes.filter(c => classIds.includes(c.id));
  }
  
  select.innerHTML = '<option value="">Selecione uma aula</option>' + 
    classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}
