#!/usr/bin/env tsx
/**
 * Script de bootstrap — cria o super_admin e a primeira Stake de uma instância nova.
 *
 * Uso:
 *   npm run seed:super-admin -- --email="seu@email.com" --senha="senha-forte"
 *
 * Requisitos:
 * - NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local
 * - Migration 000 já aplicada no banco (npx supabase db reset)
 *
 * NUNCA usa a anon key — usa a service_role para bypassar RLS no bootstrap.
 * Artigo V da Constituição: service_role só em scripts de seed/Edge Functions.
 * Artigo IX: configuração 100% via variáveis de ambiente, sem hardcoded.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Carregar .env.local
config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_STAKE_SLUG = process.env.NEXT_PUBLIC_DEFAULT_STAKE ?? "natal";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "❌ NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.\n" +
    "   Certifique-se de que o .env.local está configurado."
  );
  process.exit(1);
}

// Parsear argumentos --email e --senha da linha de comando
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};
  for (const arg of args) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    if (key && value) parsed[key] = value;
  }
  return parsed;
}

async function main() {
  const args = parseArgs();
  const email = args["email"];
  const senha = args["senha"];

  if (!email || !senha) {
    console.error("❌ Uso: npm run seed:super-admin -- --email=... --senha=...");
    process.exit(1);
  }

  if (senha.length < 8) {
    console.error("❌ A senha deve ter no mínimo 8 caracteres.");
    process.exit(1);
  }

  console.log("\n🚀 SGCT — Bootstrap de Instância Nova");
  console.log("══════════════════════════════════════");

  const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── 1. Criar usuário super_admin no Auth ──────────────────────────────────
  console.log(`\n📧 Criando usuário super_admin: ${email}`);

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { full_name: "Super Admin" },
  });

  if (authError) {
    console.error(`❌ Erro ao criar usuário: ${authError.message}`);
    process.exit(1);
  }

  const userId = authData.user!.id;
  console.log(`   ✅ Usuário criado (id: ${userId})`);

  // ── 2. Criar profile super_admin (stake_id = null — Artigo II.f) ──────────
  console.log(`\n👤 Criando profile super_admin...`);

  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    stake_id: null, // super_admin intencionalmente sem Estaca (Artigo II.f)
    full_name: "Super Admin",
    birth_date: "1990-01-01", // data placeholder — pode ser atualizada depois
    role: "super_admin",
    is_active: true,
  });

  if (profileError) {
    console.error(`❌ Erro ao criar profile: ${profileError.message}`);
    // Tentar limpar o usuário Auth criado
    await supabase.auth.admin.deleteUser(userId);
    process.exit(1);
  }

  console.log(`   ✅ Profile super_admin criado`);

  // ── 3. Criar a primeira Stake ─────────────────────────────────────────────
  const stakeName = `Estaca ${DEFAULT_STAKE_SLUG.charAt(0).toUpperCase() + DEFAULT_STAKE_SLUG.slice(1)}`;
  console.log(`\n🏛️  Criando Estaca padrão: "${stakeName}" (slug: ${DEFAULT_STAKE_SLUG})`);

  const { data: stakeData, error: stakeError } = await supabase
    .from("stakes")
    .insert({
      name: stakeName,
      slug: DEFAULT_STAKE_SLUG,
      is_active: true,
    })
    .select("id")
    .single();

  if (stakeError) {
    if (stakeError.code === "23505") {
      console.log(
        `   ⚠️  Estaca com slug "${DEFAULT_STAKE_SLUG}" já existe — pulando criação.`
      );
    } else {
      console.error(`❌ Erro ao criar Estaca: ${stakeError.message}`);
      process.exit(1);
    }
  } else {
    console.log(`   ✅ Estaca criada (id: ${stakeData?.id})`);
  }

  // ── 4. Instruções finais ──────────────────────────────────────────────────
  console.log(`
══════════════════════════════════════
✅ Bootstrap concluído com sucesso!

Próximos passos:
  1. Acesse a aplicação em http://localhost:3000
  2. Faça login com: ${email}
  3. Acesse /super-admin/estacas para cadastrar suas Estacas
  4. Acesse /super-admin/admins para cadastrar o primeiro admin_estaca
     de cada Estaca (esse admin gerencia tudo depois, sem depender de você)

IMPORTANTE: Após o primeiro login, considere alterar sua senha.
══════════════════════════════════════
`);
}

main().catch((err) => {
  console.error("❌ Erro inesperado:", err);
  process.exit(1);
});
