// Configuração pública do cliente da API SchoolFlow.
// Não contém segredos: apenas a URL do Web Service (a sessão vive em cookie httpOnly).
(function () {
  'use strict';

  var isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  window.SCHOOLFLOW_API_BASE = isLocal
    ? 'http://localhost:3000/api'
    : 'https://schoolflow-gkil.onrender.com/api';
})();
