// Configuração pública do cliente da API SchoolFlow.
// Não contém segredos: apenas o caminho da API (a sessão vive em cookie httpOnly).
(function () {
  'use strict';

  var isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  // Em produção a API é servida por um rewrite na MESMA origem do Static Site:
  // /api/* -> https://schoolflow-gkil.onrender.com/api/*
  // Assim o cookie é first-party e não depende de cookies de terceiros.
  window.SCHOOLFLOW_API_BASE = isLocal ? 'http://localhost:3000/api' : '/api';
})();
