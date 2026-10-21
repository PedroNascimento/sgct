/**
 * Setup global do Jest — carrega variáveis de ambiente do .env.local
 * antes de qualquer teste rodar (necessário para testes RLS).
 */
const { loadTestEnvironment } = require("../scripts/test-environment.cjs");
loadTestEnvironment();
