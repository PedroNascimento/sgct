import { createClient } from "npm:@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json" };

// A15 / D32: Operações administrativas legadas (create_ward_admin, create_bootstrap_admin)
// foram removidas da Edge Function pública, mantendo apenas fluxos de cadastro direto auditados.
type Operation =
  | "register_member"
  | "register_minor"
  | "register_guest";

type Payload = Record<string, unknown> & { operation?: Operation };

function fail(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), { status, headers: jsonHeaders });
}

function requiredString(payload: Payload, key: string, min = 1): string {
  const value = payload[key];
  if (typeof value !== "string" || value.trim().length < min) {
    throw new Error(`Campo inválido: ${key}.`);
  }
  return value.trim();
}

function validateCommon(payload: Payload) {
  const email = requiredString(payload, "email");
  const password = requiredString(payload, "password", 8);
  const fullName = requiredString(payload, "fullName", 3);
  const birthDate = requiredString(payload, "birthDate");
  const sexo = typeof payload.sexo === "string" ? payload.sexo : null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) throw new Error("Data de nascimento inválida.");
  if (sexo !== "masculino" && sexo !== "feminino") throw new Error("Sexo inválido.");

  return { email, password, fullName, birthDate, sexo };
}

function ageAtToday(birthDate: string): number {
  const birth = new Date(`${birthDate}T00:00:00Z`);
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const month = today.getUTCMonth() - birth.getUTCMonth();
  if (month < 0 || (month === 0 && today.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return fail("Método não permitido.", 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceKey || !anonKey) return fail("Serviço indisponível.", 503);

  try {
    const payload = (await req.json()) as Payload;
    const operation = payload.operation;
    if (!operation || !["register_member", "register_minor", "register_guest"].includes(operation)) {
      return fail("Operação inválida.");
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const common = validateCommon(payload);
    const age = ageAtToday(common.birthDate);

    let role: "member" | "guest";
    let stakeId: string;
    let wardId: string | null = null;
    let guardianId: string | null = null;
    let homeStakeName: string | null = null;
    let homeWardName: string | null = null;

    const cpf = requiredString(payload, "cpf").replace(/\D/g, "");
    if (!/^\d{11}$/.test(cpf)) throw new Error("CPF deve conter exatamente 11 dígitos.");
    const phone = requiredString(payload, "phone").replace(/\D/g, "");
    if (!/^\d{10,11}$/.test(phone)) {
      throw new Error("WhatsApp deve conter 10 ou 11 dígitos, incluindo o DDD.");
    }

    if (operation === "register_member" || operation === "register_minor") {
      wardId = requiredString(payload, "wardId");
      const { data: ward } = await admin
        .from("wards")
        .select("id, stake_id")
        .eq("id", wardId)
        .single();
      if (!ward) throw new Error("Ala informada não foi encontrada.");
      stakeId = ward.stake_id;

      const stakeSlug = requiredString(payload, "stakeSlug");
      const { data: stake } = await admin
        .from("stakes")
        .select("id")
        .eq("slug", stakeSlug)
        .eq("is_active", true)
        .single();
      if (!stake || stake.id !== stakeId) throw new Error("A Ala selecionada não pertence a esta Estaca.");

      role = "member";

      if (operation === "register_member") {
        // A15: Menores de 18 anos não podem ser registrados via rota comum de membro
        if (age < 18) {
          throw new Error(
            "Membros menores de 18 anos devem utilizar o fluxo de cadastro de menor (register_minor) com consentimento dos pais."
          );
        }
      } else {
        // register_minor: jovens de 12 a 17 anos com consentimento explícito
        if (age < 12 || age >= 18) {
          throw new Error("Cadastro de menor disponível apenas para jovens de 12 a 17 anos.");
        }
        if (payload.parentalConsent !== true) {
          throw new Error("O consentimento explícito do responsável é obrigatório.");
        }
        guardianId = typeof payload.guardianId === "string" && payload.guardianId ? payload.guardianId : null;
        if (guardianId) {
          const { data: guardian } = await admin.from("profiles").select("id").eq("id", guardianId).single();
          if (!guardian) throw new Error("Responsável informado não foi encontrado.");
        }
      }
    } else if (operation === "register_guest") {
      // A15: Convidados devem ter 18 anos ou mais
      if (age < 18) {
        throw new Error("Cadastro de convidado está disponível apenas para maiores de 18 anos.");
      }

      const stakeSlug = requiredString(payload, "stakeSlug");
      const { data: stake } = await admin
        .from("stakes")
        .select("id")
        .eq("slug", stakeSlug)
        .eq("is_active", true)
        .single();
      if (!stake) throw new Error("Estaca anfitriã não encontrada.");
      stakeId = stake.id;
      role = "guest";
      homeStakeName = requiredString(payload, "homeStakeName", 2);
      homeWardName = requiredString(payload, "homeWardName", 2);
    } else {
      return fail("Operação inválida.");
    }

    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email: common.email,
      password: common.password,
      email_confirm: true,
      user_metadata: { full_name: common.fullName },
      app_metadata: { role, stake_id: stakeId, ward_id: wardId },
    });
    if (authError || !created.user) throw new Error(authError?.message ?? "Falha ao criar usuário.");

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .insert({
        id: created.user.id,
        stake_id: stakeId,
        ward_id: wardId,
        full_name: common.fullName,
        birth_date: common.birthDate,
        sexo: common.sexo,
        cpf,
        phone,
        role,
        home_stake_name: homeStakeName,
        home_ward_name: homeWardName,
        guardian_id: guardianId,
        is_active: true,
      })
      .select("id, full_name, role")
      .single();

    if (profileError || !profile) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw new Error(profileError?.message ?? "Falha ao criar perfil.");
    }

    return new Response(JSON.stringify({ profile }), { status: 201, headers: jsonHeaders });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro inesperado.");
  }
});
