import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseProfileRepository } from "@/infrastructure/supabase/supabase-profile-repository";
import { updateOwnProfileAction } from "./actions";
import { PublicHeader } from "@/components/ui/public-header";
import { ArrowLeftIcon, BusIcon, InfoIcon } from "@/components/ui/icons";

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
    <div className="sgct-page">
      <PublicHeader stakeSlug={estaca_slug} />
    <main id="conteudo-principal" className="py-8 sm:py-12">
      <div className="sgct-narrow max-w-xl">
        <Link href={`/${estaca_slug}`} className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900">
          <ArrowLeftIcon className="h-5 w-5" />
          Voltar para o início
        </Link>
        <p className="sgct-eyebrow">Perfil do passageiro</p>
        <h1 className="sgct-title mt-3">Minha conta</h1>
        <p className="sgct-subtitle">
          Mantenha os dados usados nas reservas e no seguro de passageiros atualizados.
        </p>

        <Link href={`/${estaca_slug}/minhas-reservas`} className="sgct-button-secondary mt-6 w-full sm:w-auto">
          <BusIcon className="h-5 w-5" />
          Acompanhar minhas reservas
        </Link>

        <div className="sgct-alert-info mt-7 flex gap-3">
          <InfoIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <p>CPF e telefone são necessários para o seguro e a lista de passageiros da viagem.</p>
        </div>

        <form action={updateOwnProfileAction} className="sgct-card mt-6 space-y-5 p-5 sm:p-8">
          <div>
            <label htmlFor="fullName" className="sgct-label">Nome completo</label>
            <input id="fullName" name="fullName" required autoComplete="name" defaultValue={profile.full_name} className="sgct-input" />
          </div>
          <div>
            <label htmlFor="cpf" className="sgct-label">CPF</label>
            <input id="cpf" name="cpf" required inputMode="numeric" autoComplete="off" defaultValue={profile.cpf ?? ""} className="sgct-input" aria-describedby="cpf-help" />
            <p id="cpf-help" className="mt-1.5 text-sm text-[#53575b]">Digite somente os 11 números.</p>
          </div>
          <div>
            <label htmlFor="phone" className="sgct-label">Telefone</label>
            <input id="phone" name="phone" required inputMode="tel" autoComplete="tel" defaultValue={profile.phone ?? ""} className="sgct-input" />
          </div>
          <div>
            <label htmlFor="sexo" className="sgct-label">Sexo</label>
            <select id="sexo" name="sexo" required defaultValue={profile.sexo ?? ""} className="sgct-input">
              <option value="" disabled>Selecione</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
            </select>
          </div>
          <button type="submit" className="sgct-button-primary w-full">
            Salvar meus dados
          </button>
        </form>
      </div>
    </main>
    </div>
  );
}
