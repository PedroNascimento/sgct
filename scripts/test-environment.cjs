const { resolve } = require("node:path");

function assertLocalTestEnvironment(env = process.env) {
  let url;
  try {
    url = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  } catch {
    throw new Error("Testes de banco bloqueados: configure NEXT_PUBLIC_SUPABASE_URL com o Supabase local.");
  }
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (!loopback || !["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("Testes de banco bloqueados: somente uma origem loopback local é permitida. Não use banco remoto.");
  }
  for (const key of ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (typeof env[key] !== "string" || !env[key].trim()) {
      throw new Error(`Testes de banco bloqueados: ${key} local ausente.`);
    }
  }
  return url.origin;
}

function loadTestEnvironment() {
  // CI exports take precedence; never overwrite them with a developer's .env.local.
  require("dotenv").config({ path: resolve(__dirname, "..", ".env.local"), quiet: true });
}

module.exports = { assertLocalTestEnvironment, loadTestEnvironment };
