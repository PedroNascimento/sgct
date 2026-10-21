const { execFileSync } = require("node:child_process");
const { appendFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { randomBytes } = require("node:crypto");
const { assertLocalTestEnvironment } = require("./test-environment.cjs");

if (process.env.CI !== "true" || !process.env.GITHUB_ENV) {
  throw new Error("Este script somente exporta configurações para um runner GitHub Actions descartável.");
}
const status = JSON.parse(execFileSync(process.execPath, [resolve(__dirname, "../node_modules/supabase/dist/supabase.js"), "status", "--output", "json"], { encoding: "utf8" }));
const env = {
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_DEFAULT_STAKE: "ci-fixture",
  QR_TOKEN_SECRET: randomBytes(32).toString("hex"),
  CRON_SECRET: randomBytes(32).toString("hex"),
};
assertLocalTestEnvironment(env);
for (const [key, value] of Object.entries(env)) {
  if (typeof value !== "string" || /[\r\n]/.test(value)) throw new Error("Configuração CI inválida.");
  if (/KEY|SECRET/.test(key)) console.log(`::add-mask::${value}`);
  appendFileSync(process.env.GITHUB_ENV, `${key}=${value}\n`);
}
console.log("Ambiente de teste CI: Supabase loopback validado; credenciais locais mascaradas.");
