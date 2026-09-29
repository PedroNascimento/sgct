import { createClient } from "npm:@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json" };

type Operation =
  | "register_member"
  | "register_minor"
  | "register_guest"
  | "create_ward_admin"
  | "create_bootstrap_admin";

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

function validateCommon(payload: Payload, requireSexo = true) {
  const email = requiredString(payload, "email");
  const password = requiredString(payload, "password", 8);
  const fullName = requiredString(payload, "fullName", 3);
  const birthDate = requiredString(payload, "birthDate");
  const sexo = typeof payload.sexo === "string" ? payload.sexo : null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) throw new Error("Data de nascimento inválida.");
  if (requireSexo && sexo !== "masculino" && sexo !== "feminino") throw new Error("Sexo inválido.");
  if (sexo !== null && sexo !== "masculino" && sexo !== "feminino") throw new Error("Sexo inválido.");

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
    if (!operation) return fail("Operação inválida.");

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let actor: { id: string; role: string; stake_id: string } | null = null;
    if (operation === "create_ward_admin" || operation === "create_bootstrap_admin") {
      const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
      if (!token) return fail("Não autenticado.", 401);

      const caller = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: userData, error: userError } = await caller.auth.getUser(token);
      if (userError || !userData.user) return fail("Não autenticado.", 401);

      const { data: profile } = await admin
        .from("profiles")
        .select("id, role, stake_id, is_active")
        .eq("id", userData.user.id)
        .single();
      if (!profile?.is_active) return fail("Acesso negado.", 403);
      actor = profile;
    }

    const common = validateCommon(payload, operation !== "create_bootstrap_admin");
    let role: "member" | "guest" | "admin_ala" | "admin_estaca";
    let stakeId: string;
    let wardId: string | null = null;
    let guardianId: string | null = null;
    let homeStakeName: string | null = null;
    let homeWardName: string | null = null;
    let cpf: string | null = null;

    if (operation === "register_member" || operation === "register_minor" || operation === "register_guest") {
      cpf = requiredString(payload, "cpf").replace(/\D/g, "");
      if (!/^\d{11}$/.test(cpf)) throw new Error("CPF deve conter exatamente 11 dígitos.");
    }

    if (operation === "register_member" || operation === "register_minor" || operation === "create_ward_admin") {
      wardId = requiredString(payload, "wardId");
      const { data: ward } = await admin
        .from("wards")
        .select("id, stake_id")
        .eq("id", wardId)
        .single();
      if (!ward) throw new Error("Ala informada não foi encontrada.");
      stakeId = ward.stake_id;

      if (operation === "create_ward_admin") {
        if (actor?.role !== "admin_estaca" || actor.stake_id !== stakeId) {
          return fail("A Ala informada não pertence à sua Estaca.", 403);
        }
        role = "admin_ala";
      } else {
        const stakeSlug = requiredString(payload, "stakeSlug");
        const { data: stake } = await admin
          .from("stakes")
          .select("id")
          .eq("slug", stakeSlug)
          .eq("is_active", true)
          .single();
        if (!stake || stake.id !== stakeId) throw new Error("A Ala selecionada não pertence a esta Estaca.");
        role = "member";

        if (operation === "register_minor") {
          const age = ageAtToday(common.birthDate);
          if (age < 12 || age >= 18) throw new Error("Cadastro próprio disponível apenas para jovens de 12 a 17 anos.");
          if (payload.parentalConsent !== true) throw new Error("O consentimento explícito do responsável é obrigatório.");
          guardianId = typeof payload.guardianId === "string" && payload.guardianId ? payload.guardianId : null;
          if (guardianId) {
            const { data: guardian } = await admin.from("profiles").select("id").eq("id", guardianId).single();
            if (!guardian) throw new Error("Responsável informado não foi encontrado.");
          }
        }
      }
    } else if (operation === "register_guest") {
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
    } else if (operation === "create_bootstrap_admin") {
      if (actor?.role !== "super_admin") return fail("Acesso negado.", 403);
      stakeId = requiredString(payload, "stakeId");
      const { data: stake } = await admin.from("stakes").select("id").eq("id", stakeId).single();
      if (!stake) throw new Error("Estaca não encontrada.");
      role = "admin_estaca";
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
        phone: null,
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
