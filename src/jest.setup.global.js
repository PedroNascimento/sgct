/**
 * Setup global do Jest — carrega variáveis de ambiente do .env.local
 * antes de qualquer teste rodar (necessário para testes RLS).
 */
const { config } = require("dotenv");
const { resolve } = require("path");

config({ path: resolve(__dirname, "..", ".env.local") });
