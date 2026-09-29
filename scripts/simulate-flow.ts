#!/usr/bin/env tsx
/**
 * Script de Simulação e Carga de Dados de Teste Completo (SGCT)
 *
 * Cria os usuários de todos os níveis na Estaca Natal:
 * 1. Super Admin:           superadmin@teste.org / senha123456
 * 2. Admin da Estaca Natal: admin@natal.org / senha123456
 * 3. Admin da Ala:          admin.candelaria@natal.org / senha123456
 * 4. Membro Padrão:         membro@natal.org / senha123456
 *
 * E popula a Caravana com reservas em cada estágio do fluxo:
 * - Reserva A (Membro Padrão): Status 'pendente' (para o Admin da Ala aprovar em /natal/ala/reservas)
 * - Reserva B (Segundo Membro): Status 'pago_ala' (para o Admin da Estaca validar em /natal/estaca/validacao-semanal)
 * - Reserva C (Terceiro Membro): Status 'confirmado' (com vaga confirmada no assento)
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY ausente no .env.local.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_PASS = "senha123456";

async function getOrCreateUser(email: string, role: string, metadata: Record<string, unknown>) {
  const { data: listUsers } = await supabase.auth.admin.listUsers();
  const existing = listUsers.users.find((u) => u.email === email);

  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, {
      password: DEFAULT_PASS,
      email_confirm: true,
      app_metadata: { role, ...metadata },
    });
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEFAULT_PASS,
    email_confirm: true,
    app_metadata: { role, ...metadata },
  });

  if (error || !data.user) {
    throw new Error(`Erro ao criar ${email}: ${error?.message}`);
  }
  return data.user.id;
}

async function main() {
  console.log("\n🚀 Inicializando Simulação Completa de Usuários e Reservas...\n");

  // 1. Obter ou Criar Estaca Natal
  let { data: stake } = await supabase
    .from("stakes")
    .select("id, name, slug")
    .eq("slug", "natal")
    .maybeSingle();

  if (!stake) {
    const { data: newStake, error: stakeErr } = await supabase
      .from("stakes")
      .insert({
        name: "Estaca Natal",
        slug: "natal",
        is_active: true,
      })
      .select("id, name, slug")
      .single();
    if (stakeErr || !newStake) throw new Error("Falha ao criar Estaca Natal.");
    stake = newStake;
  }
  console.log(`🏛️  Estaca: ${stake.name} (${stake.slug})`);

  // 2. Garantir Alas
  const wardNames = ["Ala Candelária", "Ala Neópolis", "Ala Tirol", "Ala Ponta Negra"];
  const wardsMap: Record<string, string> = {};

  for (const wName of wardNames) {
    const { data: ward } = await supabase
      .from("wards")
      .upsert({ stake_id: stake.id, name: wName }, { onConflict: "stake_id,name" })
      .select("id, name")
      .single();
    if (ward) wardsMap[wName] = ward.id;
  }
  const candelariaWardId = wardsMap["Ala Candelária"];
  console.log(`🏠 Alas cadastradas (Ala principal: Candelária = ${candelariaWardId})`);

  // 3. Super Admin
  const saId = await getOrCreateUser("superadmin@teste.org", "super_admin", {});
  await supabase.from("profiles").upsert({
    id: saId,
    full_name: "Super Administrador",
    role: "super_admin",
    birth_date: "1980-01-01",
    is_active: true,
  });
  console.log(`👑 Super Admin: superadmin@teste.org (senha: ${DEFAULT_PASS})`);

  // 4. Admin Estaca
  const adminEstacaId = await getOrCreateUser("admin@natal.org", "admin_estaca", {
    stake_id: stake.id,
  });
  await supabase.from("profiles").upsert({
    id: adminEstacaId,
    stake_id: stake.id,
    full_name: "Líder de Caravana Estaca Natal",
    role: "admin_estaca",
    birth_date: "1980-05-15",
    is_active: true,
  });
  console.log(`👔 Admin Estaca: admin@natal.org (senha: ${DEFAULT_PASS})`);

  // 5. Admin Ala Candelária
  const adminAlaId = await getOrCreateUser("admin.candelaria@natal.org", "admin_ala", {
    stake_id: stake.id,
    ward_id: candelariaWardId,
  });
  await supabase.from("profiles").upsert({
    id: adminAlaId,
    stake_id: stake.id,
    ward_id: candelariaWardId,
    full_name: "Líder da Ala Candelária",
    role: "admin_ala",
    birth_date: "1985-03-20",
    cpf: "111.222.333-44",
    phone: "84988887777",
    sexo: "masculino",
    is_active: true,
  });
  console.log(`📋 Admin Ala: admin.candelaria@natal.org (senha: ${DEFAULT_PASS})`);

  // 6. Membros
  // Membro 1: Reserva Pendente
  const membro1Id = await getOrCreateUser("membro@natal.org", "member", {
    stake_id: stake.id,
    ward_id: candelariaWardId,
  });
  await supabase.from("profiles").upsert({
    id: membro1Id,
    stake_id: stake.id,
    ward_id: candelariaWardId,
    full_name: "Carlos Membro Pendente",
    role: "member",
    birth_date: "1994-08-12",
    cpf: "222.333.444-55",
    phone: "84999990001",
    sexo: "masculino",
    is_active: true,
  });

  // Membro 2: Reserva Pago Ala
  const membro2Id = await getOrCreateUser("membro2@natal.org", "member", {
    stake_id: stake.id,
    ward_id: candelariaWardId,
  });
  await supabase.from("profiles").upsert({
    id: membro2Id,
    stake_id: stake.id,
    ward_id: candelariaWardId,
    full_name: "Mariana Pago Ala",
    role: "member",
    birth_date: "1992-04-18",
    cpf: "333.444.555-66",
    phone: "84999990002",
    sexo: "feminino",
    is_active: true,
  });

  // Membro 3: Reserva Confirmada
  const membro3Id = await getOrCreateUser("membro3@natal.org", "member", {
    stake_id: stake.id,
    ward_id: candelariaWardId,
  });
  await supabase.from("profiles").upsert({
    id: membro3Id,
    stake_id: stake.id,
    ward_id: candelariaWardId,
    full_name: "João Confirmado Estaca",
    role: "member",
    birth_date: "1988-11-25",
    cpf: "444.555.666-77",
    phone: "84999990003",
    sexo: "masculino",
    is_active: true,
  });
  console.log(`👥 Membros de teste criados (membro@natal.org, membro2@natal.org, membro3@natal.org)`);

  // 7. Caravana de Exemplo
  const departureDate = "2026-11-20";
  let { data: caravan } = await supabase
    .from("caravans")
    .select("id")
    .eq("stake_id", stake.id)
    .eq("departure_date", departureDate)
    .maybeSingle();

  if (!caravan) {
    const { data: newCaravan, error: cErr } = await supabase
      .from("caravans")
      .insert({
        stake_id: stake.id,
        departure_date: departureDate,
        return_date: "2026-11-23",
        price_standard: 150.0,
        price_officiant: 135.0,
        seat_limit: 44,
        waitlist_limit: 10,
        registration_deadline: "2026-11-15",
        min_quorum: 40,
        quorum_check_date: "2026-11-17",
        status: "open",
        created_by: adminEstacaId,
      })
      .select("id")
      .single();
    if (cErr || !newCaravan) throw new Error("Erro ao criar caravana.");
    caravan = newCaravan;

    await supabase.from("boarding_points").insert([
      {
        caravan_id: caravan.id,
        stake_id: stake.id,
        name: "Capela Candelária",
        boarding_time: "2026-11-20T20:00:00-03:00",
      },
    ]);
  }
  console.log(`🚌 Caravana aberta (ID: ${caravan.id})`);

  // 8. Criar Reservas nos Três Estágios
  // Reserva 1: Pendente (Assento 10)
  await supabase.from("reservations").upsert({
    caravan_id: caravan.id,
    user_id: membro1Id,
    seat_number: 10,
    category: "standard",
    payment_amount: 150.0,
    status: "pendente",
    stake_id: stake.id,
    ward_id: candelariaWardId,
  }, { onConflict: "caravan_id,seat_number" });

  // Reserva 2: Pago Ala (Assento 11)
  await supabase.from("reservations").upsert({
    caravan_id: caravan.id,
    user_id: membro2Id,
    seat_number: 11,
    category: "standard",
    payment_amount: 150.0,
    status: "pago_ala",
    stake_id: stake.id,
    ward_id: candelariaWardId,
  }, { onConflict: "caravan_id,seat_number" });

  // Reserva 3: Confirmada (Assento 12)
  await supabase.from("reservations").upsert({
    caravan_id: caravan.id,
    user_id: membro3Id,
    seat_number: 12,
    category: "standard",
    payment_amount: 150.0,
    status: "confirmado",
    confirmed_at: new Date().toISOString(),
    stake_id: stake.id,
    ward_id: candelariaWardId,
  }, { onConflict: "caravan_id,seat_number" });

  console.log(`✅ 3 Reservas criadas:
   • Assento 10: Pendente (visível para Admin da Ala aprovar)
   • Assento 11: Pago na Ala (visível para Admin da Estaca validar)
   • Assento 12: Confirmado (já validado)`);

  console.log(`
══════════════════════════════════════════════════════════════════════
✨ SIMULAÇÃO PRONTA PARA TESTE VISUAL E INTERAÇÃO NO NAVEGADOR
══════════════════════════════════════════════════════════════════════

🔑 CREDENCIAIS CRIADAS (Todas as senhas são: ${DEFAULT_PASS})

1. Super Admin:
   • Login: superadmin@teste.org / ${DEFAULT_PASS}
   • URL de Acesso: http://localhost:3000/super-admin/login
   • Painel: http://localhost:3000/estacas

2. Admin da Estaca Natal:
   • Login: admin@natal.org / ${DEFAULT_PASS}
   • URL de Acesso: http://localhost:3000/natal/auth/login
   • Painel de Caravanas: http://localhost:3000/natal/estaca/calendario
   • Validação Semanal (Aprovação Estaca): http://localhost:3000/natal/estaca/validacao-semanal
   • Gestão de Equipe (Criar Admin de Ala): http://localhost:3000/natal/estaca/equipe

3. Admin da Ala Candelária:
   • Login: admin.candelaria@natal.org / ${DEFAULT_PASS}
   • URL de Acesso: http://localhost:3000/natal/auth/login
   • Pagamentos da Ala (Aprovação Ala): http://localhost:3000/natal/ala/reservas

4. Membro Padrão:
   • Login: membro@natal.org / ${DEFAULT_PASS}
   • URL de Acesso: http://localhost:3000/natal/auth/login
   • Fazer Reserva: http://localhost:3000/natal/caravana/${caravan.id}/reserva
   • Minhas Reservas: http://localhost:3000/natal/caravana/minhas-reservas
══════════════════════════════════════════════════════════════════════
`);
}

main().catch((err) => {
  console.error("❌ Erro na simulação:", err);
  process.exit(1);
});
