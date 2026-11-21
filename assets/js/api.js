// SchoolFlow — ponte entre o frontend vanilla e a API REST.
// Mantém o localStorage como cache/fallback: se o backend estiver indisponível,
// a aplicação continua funcionando exatamente como antes.
(function () {
  'use strict';

  function readSetting(key, fallback) {
    try {
      var value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  var BASE = readSetting(
    'schoolflow.api.base',
    window.SCHOOLFLOW_API_BASE ||
      ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://localhost:3000/api'
        : location.origin + '/api')
  ).replace(/\/$/, '');

  var ENABLED = readSetting('schoolflow.api.enabled', 'true') !== 'false';
  var ONLINE = false;
  var snapshot = null;
  var bootstrapPromise = null;
  var syncTimer = null;

  function request(path, options) {
    options = options || {};
    var init = {
      method: options.method || 'GET',
      credentials: 'include'
    };
    // Só declara JSON quando há corpo. Um POST sem body com Content-Type
    // application/json é rejeitado pelo Fastify com HTTP 400.
    if (options.body !== undefined) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(options.body);
    }

    return fetch(BASE + path, init).then(function (response) {
      if (response.status === 401) {
        var error = new Error('Sessão expirada.');
        error.status = 401;
        throw error;
      }
      if (!response.ok) {
        return response.text().then(function (text) {
          var message = text;
          try {
            var parsed = JSON.parse(text);
            message = parsed.message || parsed.error || text;
          } catch (error) { /* mantém o texto bruto */ }
          var failure = new Error(message || 'Falha na requisição.');
          failure.status = response.status;
          throw failure;
        });
      }
      return response.status === 204 ? null : response.json();
    });
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function mapUser(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      stage: user.stage || '',
      grade: user.grade || '',
      subject: user.subject || '',
      avatarTone: user.avatarTone,
      onboardingDone: Boolean(user.onboardingDone),
      password: ''
    };
  }

  function toLocalUser(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      stage: user.stage || '',
      grade: user.grade || '',
      subject: user.subject || '',
      avatarTone: user.avatarTone || 'indigo',
      onboardingDone: Boolean(user.onboardingDone)
    };
  }

  function mapClass(item) {
    return {
      id: item.id,
      name: item.name,
      description: item.description || '',
      stage: item.stage,
      day_of_week: item.dayOfWeek,
      time_start: item.timeStart,
      time_end: item.timeEnd,
      room: item.room,
      color: item.color,
      teacher_id: item.teacherId
    };
  }

  function mapAssignment(item) {
    return {
      id: item.id,
      title: item.title,
      description: item.description || '',
      due_date: item.dueDate.slice(0, 10),
      class_id: item.classId,
      teacher_id: item.teacherId,
      created_at: item.createdAt.slice(0, 10),
      status: item.status,
      priority: item.priority
    };
  }

  function mapEvent(item) {
    return {
      id: item.id,
      title: item.title,
      description: item.description || '',
      date: item.date.slice(0, 10),
      time_start: item.timeStart,
      time_end: item.timeEnd,
      location: item.location,
      category: item.category,
      class_id: item.classId,
      is_global: item.isGlobal,
      attendees: (item.rsvps || []).map(function (rsvp) { return rsvp.userId; })
    };
  }

  function isoToday() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function snapshotState() {
    return {
      users: clone(state.users),
      classes: clone(state.classes),
      assignments: clone(state.assignments),
      events: clone(state.events),
      enrollments: clone(state.enrollments),
      focusLog: clone(state.focusLog),
      focusSessions: clone(state.focusSessions || {}),
      readNotifications: clone(state.readNotifications)
    };
  }

  function indexById(items) {
    var map = {};
    items.forEach(function (item) { map[item.id] = item; });
    return map;
  }

  function fetchCollection(path) {
    return request(path).then(function (body) { return body.items; });
  }

  /** Restaura a identidade exclusivamente a partir do cookie httpOnly. */
  function restoreIdentity() {
    if (!ENABLED) return Promise.resolve(null);
    return request('/auth/me')
      .then(function (body) {
        var user = toLocalUser(body.user);
        ONLINE = true;
        return user;
      })
      .catch(function () {
        ONLINE = false;
        return null;
      });
  }

  function bootstrap() {
    if (!ENABLED) return Promise.resolve(false);
    if (bootstrapPromise) return bootstrapPromise;

    bootstrapPromise = (function () {
      var viewer = state.currentUser;
      if (!viewer || viewer.role === 'convidado') {
        ONLINE = false;
        return Promise.resolve(false);
      }

      return request('/health')
        .then(function () {
          return Promise.all([
            fetchCollection('/users?limit=100'),
            fetchCollection('/classes?limit=100'),
            fetchCollection('/assignments?limit=100'),
            fetchCollection('/events?limit=100'),
            fetchCollection('/enrollments?limit=100'),
            request('/focus'),
            request('/notifications')
          ]).then(function (results) {
            var users = results[0].map(mapUser);
            var classes = results[1].map(mapClass);
            var assignments = results[2].map(mapAssignment);
            var events = results[3].map(mapEvent);

            state.users = users;
            state.classes = classes;
            state.assignments = assignments;
            state.events = events;
            state.enrollments = results[4].map(function (row, index) {
              return {
                id: -(index + 1),
                student_id: row.studentId,
                class_id: row.classId
              };
            });

            var focusLog = {};
            var focusSessions = {};
            results[5].records.forEach(function (record) {
              focusLog[record.date] = record.minutes;
              focusSessions[record.date] = record.sessions;
            });
            state.focusLog = focusLog;
            state.focusSessions = focusSessions;
            state.readNotifications = results[6].items
              .filter(function (item) { return item.read; })
              .map(function (item) { return item.id; });

            state.currentUser = toLocalUser(viewer);

            ONLINE = true;
            snapshot = snapshotState();
            if (typeof window.SchoolFlowLocalSave === 'function') window.SchoolFlowLocalSave();
            return true;
          });
        })
        .catch(function () {
          // Sem backend: mantém integralmente o modo localStorage.
          ONLINE = false;
          snapshot = null;
          return false;
        });
    })();

    return bootstrapPromise;
  }

  function userPayload(user) {
    return {
      name: user.name,
      email: user.email,
      role: user.role,
      stage: user.stage || undefined,
      grade: user.grade || undefined,
      subject: user.subject || undefined,
      password: user.password || undefined
    };
  }

  function classPayload(item) {
    return {
      name: item.name,
      description: item.description || null,
      stage: item.stage,
      dayOfWeek: Number(item.day_of_week),
      timeStart: item.time_start,
      timeEnd: item.time_end,
      room: item.room,
      color: item.color,
      teacherId: Number(item.teacher_id)
    };
  }

  function assignmentPayload(item, viewer) {
    var payload = {
      title: item.title,
      description: item.description || null,
      dueDate: item.due_date,
      classId: Number(item.class_id),
      priority: item.priority,
      status: item.status
    };
    if (viewer.role === 'admin' && item.teacher_id !== viewer.id) {
      payload.teacherId = Number(item.teacher_id);
    }
    return payload;
  }

  function eventPayload(item) {
    return {
      title: item.title,
      description: item.description || null,
      date: item.date,
      timeStart: item.time_start,
      timeEnd: item.time_end,
      location: item.location,
      category: item.category,
      classId: item.class_id || null
    };
  }

  function replaceId(localItem, created, localIdKey) {
    if (created && created.id && created.id !== localItem[localIdKey]) {
      localItem[localIdKey] = created.id;
    }
  }

  function isAdmin() {
    return state.currentUser && state.currentUser.role === 'admin';
  }

  function sync() {
    if (!ONLINE || !snapshot) return Promise.resolve(false);

    var viewer = state.currentUser;
    var chain = Promise.resolve();

    // Usuários
    var oldUsers = indexById(snapshot.users);
    state.users.forEach(function (user) {
      var before = oldUsers[user.id];
      if (!before) {
        var payload = userPayload(user);
        var isSelfSignup = !isAdmin();
        if (isSelfSignup) {
          payload.confirmPassword = user.password;
          chain = chain.then(function () {
            return request('/auth/register', { method: 'POST', body: payload })
              .then(function (body) { replaceId(user, body.user, 'id'); })
              .catch(function (error) { console.warn('SchoolFlow API: falha ao criar conta', error); });
          });
        } else {
          chain = chain.then(function () {
            return request('/users', { method: 'POST', body: payload })
              .then(function (body) { replaceId(user, body.user, 'id'); })
              .catch(function (error) { console.warn('SchoolFlow API: falha ao criar usuário', error); });
          });
        }
      } else if (JSON.stringify(before) !== JSON.stringify(user) && isAdmin()) {
        chain = chain.then(function () {
          return request('/users/' + user.id, { method: 'PATCH', body: userPayload(user) })
            .catch(function (error) { console.warn('SchoolFlow API: falha ao editar usuário', error); });
        });
      }
    });
    if (isAdmin()) {
      var currentUserIds = state.users.map(function (user) { return user.id; });
      snapshot.users.forEach(function (user) {
        if (currentUserIds.indexOf(user.id) === -1 && user.id !== viewer.id) {
          chain = chain.then(function () {
            return request('/users/' + user.id, { method: 'DELETE' })
              .catch(function (error) { console.warn('SchoolFlow API: falha ao excluir usuário', error); });
          });
        }
      });
    }

    // Turmas
    var oldClasses = indexById(snapshot.classes);
    state.classes.forEach(function (item) {
      var before = oldClasses[item.id];
      if (!before) {
        chain = chain.then(function () {
          return request('/classes', { method: 'POST', body: classPayload(item) })
            .then(function (body) { replaceId(item, body.class, 'id'); })
            .catch(function (error) { console.warn('SchoolFlow API: falha ao criar turma', error); });
        });
      } else if (JSON.stringify(before) !== JSON.stringify(item) && isAdmin()) {
        chain = chain.then(function () {
          return request('/classes/' + item.id, { method: 'PATCH', body: classPayload(item) })
            .catch(function (error) { console.warn('SchoolFlow API: falha ao editar turma', error); });
        });
      }
    });
    if (isAdmin()) {
      var currentClassIds = state.classes.map(function (item) { return item.id; });
      snapshot.classes.forEach(function (item) {
        if (currentClassIds.indexOf(item.id) === -1) {
          chain = chain.then(function () {
            return request('/classes/' + item.id, { method: 'DELETE' })
              .catch(function (error) { console.warn('SchoolFlow API: falha ao excluir turma', error); });
          });
        }
      });
    }

    // Trabalhos
    var oldAssignments = indexById(snapshot.assignments);
    state.assignments.forEach(function (item) {
      var before = oldAssignments[item.id];
      if (!before) {
        chain = chain.then(function () {
          return request('/assignments', { method: 'POST', body: assignmentPayload(item, viewer) })
            .then(function (body) { replaceId(item, body.assignment, 'id'); })
            .catch(function (error) { console.warn('SchoolFlow API: falha ao criar trabalho', error); });
        });
      } else if (JSON.stringify(before) !== JSON.stringify(item)) {
        chain = chain.then(function () {
          return request('/assignments/' + item.id, { method: 'PATCH', body: assignmentPayload(item, viewer) })
            .catch(function (error) { console.warn('SchoolFlow API: falha ao editar trabalho', error); });
        });
      }
    });
    var currentAssignmentIds = state.assignments.map(function (item) { return item.id; });
    snapshot.assignments.forEach(function (item) {
      if (currentAssignmentIds.indexOf(item.id) === -1) {
        chain = chain.then(function () {
          return request('/assignments/' + item.id, { method: 'DELETE' })
            .catch(function (error) { console.warn('SchoolFlow API: falha ao excluir trabalho', error); });
        });
      }
    });

    // Eventos e confirmações de presença
    var oldEvents = indexById(snapshot.events);
    state.events.forEach(function (item) {
      var before = oldEvents[item.id];
      if (!before) {
        chain = chain.then(function () {
          return request('/events', { method: 'POST', body: eventPayload(item) })
            .then(function (body) { replaceId(item, body.event, 'id'); })
            .catch(function (error) { console.warn('SchoolFlow API: falha ao criar evento', error); });
        });
      } else if (JSON.stringify(before) !== JSON.stringify(item)) {
        chain = chain.then(function () {
          return request('/events/' + item.id, { method: 'PATCH', body: eventPayload(item) })
            .catch(function (error) { console.warn('SchoolFlow API: falha ao editar evento', error); });
        });
      }
      var oldAttendees = before ? (before.attendees || []) : [];
      var newAttendees = item.attendees || [];
      newAttendees.forEach(function (userId) {
        if (oldAttendees.indexOf(userId) === -1 && userId === viewer.id) {
          chain = chain.then(function () {
            return request('/events/' + item.id + '/rsvp', { method: 'POST' })
              .catch(function (error) { console.warn('SchoolFlow API: falha ao confirmar presença', error); });
          });
        }
      });
      oldAttendees.forEach(function (userId) {
        if (newAttendees.indexOf(userId) === -1 && userId === viewer.id) {
          chain = chain.then(function () {
            return request('/events/' + item.id + '/rsvp', { method: 'DELETE' })
              .catch(function (error) { console.warn('SchoolFlow API: falha ao remover presença', error); });
          });
        }
      });
    });
    var currentEventIds = state.events.map(function (item) { return item.id; });
    snapshot.events.forEach(function (item) {
      if (currentEventIds.indexOf(item.id) === -1) {
        chain = chain.then(function () {
          return request('/events/' + item.id, { method: 'DELETE' })
            .catch(function (error) { console.warn('SchoolFlow API: falha ao excluir evento', error); });
        });
      }
    });

    // Matrículas (chave composta)
    function enrollmentKey(row) { return row.student_id + ':' + row.class_id; }
    var oldEnrollments = {};
    snapshot.enrollments.forEach(function (row) { oldEnrollments[enrollmentKey(row)] = row; });
    var currentEnrollments = {};
    state.enrollments.forEach(function (row) {
      var key = enrollmentKey(row);
      currentEnrollments[key] = row;
      if (!oldEnrollments[key] && isAdmin()) {
        chain = chain.then(function () {
          return request('/enrollments', {
            method: 'POST',
            body: { studentId: Number(row.student_id), classId: Number(row.class_id) }
          }).catch(function (error) { console.warn('SchoolFlow API: falha ao matricular', error); });
        });
      }
    });
    Object.keys(oldEnrollments).forEach(function (key) {
      if (!currentEnrollments[key] && isAdmin()) {
        var row = oldEnrollments[key];
        chain = chain.then(function () {
          return request('/enrollments/' + row.student_id + '/' + row.class_id, { method: 'DELETE' })
            .catch(function (error) { console.warn('SchoolFlow API: falha ao desmatricular', error); });
        });
      }
    });

    // Foco
    var dates = {};
    Object.keys(state.focusLog || {}).forEach(function (date) { dates[date] = true; });
    Object.keys(snapshot.focusLog || {}).forEach(function (date) { dates[date] = true; });
    Object.keys(dates).forEach(function (date) {
      var minutesDelta = (state.focusLog[date] || 0) - (snapshot.focusLog[date] || 0);
      var sessionsDelta = (state.focusSessions && state.focusSessions[date] || 0) -
        (snapshot.focusSessions && snapshot.focusSessions[date] || 0);
      if (minutesDelta <= 0) return;
      chain = chain.then(function () {
        return request('/focus', {
          method: 'POST',
          body: { date: date, minutes: minutesDelta, sessions: Math.max(1, sessionsDelta) }
        }).catch(function (error) { console.warn('SchoolFlow API: falha ao registrar foco', error); });
      });
    });

    // Notificações lidas
    var newKeys = state.readNotifications.filter(function (key) {
      return snapshot.readNotifications.indexOf(key) === -1;
    });
    if (newKeys.length) {
      chain = chain.then(function () {
        return request('/notifications/read', { method: 'PATCH', body: { keys: newKeys } })
          .catch(function (error) { console.warn('SchoolFlow API: falha ao marcar notificações', error); });
      });
    }

    return chain.then(function () {
      snapshot = snapshotState();
      return true;
    });
  }

  function scheduleSync() {
    if (!ONLINE || !snapshot) return;
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(function () {
      syncTimer = null;
      sync().catch(function (error) { console.warn('SchoolFlow API: falha na sincronização', error); });
    }, 350);
  }

  window.SchoolFlowAPI = {
    base: BASE,
    isOnline: function () { return ONLINE; },
    request: request,
    toLocalUser: toLocalUser,
    restoreIdentity: restoreIdentity,
    bootstrap: bootstrap,
    scheduleSync: scheduleSync,
    sync: sync,
    me: function () {
      if (!ENABLED) return Promise.resolve(null);
      return request('/auth/me').catch(function () { return null; });
    },
    login: function (email, password) {
      return request('/auth/login', { method: 'POST', body: { email: email, password: password } });
    },
    register: function (data) {
      return request('/auth/register', {
        method: 'POST',
        body: {
          name: data.name,
          email: data.email,
          password: data.password,
          confirmPassword: data.confirm || data.password,
          stage: data.stage,
          grade: data.grade
        }
      });
    },
    logout: function () {
      return request('/auth/logout', { method: 'POST' }).catch(function () { return null; });
    }
  };
})();
