#!/usr/bin/env tsx
/**
 * Script de dados de teste/demonstração para desenvolvimento local.
 * Popula Alas, Admin da Estaca e uma Caravana de exemplo na Estaca Natal.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Credenciais ausentes no .env.local.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("\n🌱 Populando dados de demonstração da Estaca Natal...");

  // 1. Obter a Estaca Natal
  const { data: stake, error: stakeError } = await supabase
    .from("stakes")
    .select("id, name, slug")
    .eq("slug", "natal")
    .single();

  if (stakeError || !stake) {
    console.error("❌ Estaca 'natal' não encontrada. Execute o seed:super-admin primeiro.");
    process.exit(1);
  }

  console.log(`🏛️  Estaca identificada: ${stake.name} (${stake.id})`);

  // 2. Criar Alas da Estaca Natal
  const wards = [
    "Ala Tirol",
    "Ala Candelária",
    "Ala Ponta Negra",
    "Ala Potengi",
    "Ala Parnamirim",
    "Ala Neópolis",
  ];

  for (const wardName of wards) {
    const { error } = await supabase
      .from("wards")
      .upsert({ stake_id: stake.id, name: wardName }, { onConflict: "stake_id,name" });
    if (error) console.error(`Erro ao criar ala ${wardName}:`, error.message);
  }
  console.log(`✅ ${wards.length} Alas cadastradas/atualizadas.`);

  // 3. Criar Admin da Estaca Natal (admin@natal.org)
  const adminEmail = "admin@natal.org";
  const adminPass = "senha123456";

  // Verificar se o usuário já existe
  const { data: listUsers } = await supabase.auth.admin.listUsers();
  const existingUser = listUsers.users.find((u) => u.email === adminEmail);

  let adminUserId = existingUser?.id;

  if (!existingUser) {
    const { data: authAdmin, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPass,
      email_confirm: true,
      user_metadata: { full_name: "Líder de Caravana Estaca Natal" },
      app_metadata: {
        role: "admin_estaca",
        stake_id: stake.id,
      },
    });

    if (authError || !authAdmin.user) {
      console.error("❌ Erro ao criar Auth Admin:", authError?.message);
      process.exit(1);
    }
    adminUserId = authAdmin.user.id;
  }

  // Upsert profile do Admin Estaca
  await supabase.from("profiles").upsert({
    id: adminUserId,
    stake_id: stake.id,
    full_name: "Líder de Caravana Estaca Natal",
    birth_date: "1980-05-15",
    role: "admin_estaca",
    is_active: true,
  });

  console.log(`✅ Admin da Estaca pronto: ${adminEmail} (senha: ${adminPass})`);

  // 4. Criar Caravana de Exemplo (para exibir no calendário público)
  const departureDate = "2026-11-20";
  const returnDate = "2026-11-23";

  // Verificar se já existe caravana nesta data
  const { data: existingCaravan } = await supabase
    .from("caravans")
    .select("id")
    .eq("stake_id", stake.id)
    .eq("departure_date", departureDate)
    .maybeSingle();

  let caravanId = existingCaravan?.id;

  if (!existingCaravan) {
    const { data: newCaravan, error: caravanError } = await supabase
      .from("caravans")
      .insert({
        stake_id: stake.id,
        departure_date: departureDate,
        return_date: returnDate,
        price_standard: 130.0,
        price_officiant: 117.0,
        seat_limit: 50,
        waitlist_limit: 5,
        registration_deadline: "2026-11-15",
        min_quorum: 48,
        quorum_check_date: "2026-11-17",
        status: "open",
        created_by: adminUserId,
      })
      .select("id")
      .single();

    if (caravanError || !newCaravan) {
      console.error("❌ Erro ao criar caravana:", caravanError?.message);
      process.exit(1);
    }
    caravanId = newCaravan.id;

    // Pontos de embarque
    await supabase.from("boarding_points").insert([
      {
        caravan_id: caravanId,
        stake_id: stake.id,
        name: "Capela Tirol (Sede da Estaca)",
        boarding_time: "2026-11-20T20:00:00-03:00",
      },
      {
        caravan_id: caravanId,
        stake_id: stake.id,
        name: "Capela Parnamirim",
        boarding_time: "2026-11-20T20:45:00-03:00",
      },
    ]);
  }

  console.log(`✅ Caravana de demonstração pronta (ID: ${caravanId}) para saída em ${departureDate}.`);

  console.log(`
══════════════════════════════════════════════════════════
✨ DADOS DE DEMONSTRAÇÃO PRONTOS PARA TESTES VISUAIS!

Rotas públicas disponíveis:
  • Início da Estaca:       http://localhost:3000/natal
  • Calendário Público:     http://localhost:3000/natal/calendario
  • Cadastro com Alas:      http://localhost:3000/natal/cadastro
  • Login:                  http://localhost:3000/natal/auth/login

Painel Administrativo da Estaca:
  • Gestão de Caravanas:    http://localhost:3000/natal/estaca/calendario
  • Credenciais Admin:      admin@natal.org / senha123456

Painel Super Admin:
  • Gestão de Estacas:      http://localhost:3000/estacas
  • Gestão de Admins:       http://localhost:3000/admins
  • Credenciais Super Admin: superadmin@teste.org / senha123456
══════════════════════════════════════════════════════════
`);
}

main().catch((err) => {
  console.error("❌ Erro no seed dev:", err);
  process.exit(1);
});
