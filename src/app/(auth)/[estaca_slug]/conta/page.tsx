import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseProfileRepository } from "@/infrastructure/supabase/supabase-profile-repository";
import { updateOwnProfileAction } from "./actions";

interface Props {
  params: Promise<{ estaca_slug: string }>;
}

export default async function ContaPage({ params }: Props) {
  const { estaca_slug } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${estaca_slug}/auth/login`);

  const profile = await new SupabaseProfileRepository(supabase).findById(user.id);
  if (!profile) redirect(`/${estaca_slug}/auth/login`);

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link href={`/${estaca_slug}`} className="text-sm font-medium text-blue-700">
          ← Voltar
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Minha Conta</h1>
        <p className="mt-1 text-sm text-slate-600">
          Mantenha os dados usados nas reservas e no seguro de passageiros atualizados.
        </p>

        <form action={updateOwnProfileAction} className="mt-8 space-y-5">
          <label className="block text-sm font-medium text-slate-700">
            Nome completo
            <input name="fullName" required defaultValue={profile.full_name} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            CPF
            <input name="cpf" required inputMode="numeric" defaultValue={profile.cpf ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Telefone
            <input name="phone" required inputMode="tel" defaultValue={profile.phone ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Sexo
            <select name="sexo" required defaultValue={profile.sexo ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
              <option value="" disabled>Selecione</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
            </select>
          </label>
          <button type="submit" className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700">
            Salvar cadastro
          </button>
        </form>
      </div>
    </main>
  );
}
