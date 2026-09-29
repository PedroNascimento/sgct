import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseStakeRepository } from "@/infrastructure/supabase/supabase-stake-repository";
import { resolveStakeFromSlug } from "@/use-cases/tenant/resolve-stake-from-slug";
import { PublicHeader } from "@/components/ui/public-header";
import { ArrowRightIcon, CalendarIcon, CheckIcon, UserIcon } from "@/components/ui/icons";

interface Props {
  params: Promise<{ estaca_slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { estaca_slug } = await params;
  return {
    title: `SGCT — Caravanas ao Templo`,
    description: `Plataforma de gestão de caravanas ao Templo de Recife.`,
  };
}

/**
 * Landing page pública de uma Estaca.
 * O middleware garante que o slug é válido antes de chegar aqui.
 */
export default async function EstacaPublicPage({ params }: Props) {
  const { estaca_slug } = await params;
  const supabase = await createSupabaseServerClient();
  const stake = await resolveStakeFromSlug(
    estaca_slug,
    new SupabaseStakeRepository(supabase)
  );

  if (!stake) notFound();
  const { data: authData } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(authData.user);

  return (
    <div className="sgct-page">
      <PublicHeader stakeSlug={estaca_slug} stakeName={stake.name} />
      <main id="conteudo-principal">
        <section className="relative overflow-hidden border-b border-[#e0e2e2] bg-white">
          <div className="absolute inset-y-0 right-0 hidden w-[42%] bg-gradient-to-br from-brand-50 via-brand-100 to-brand-200 lg:block" />
          <div className="sgct-container relative grid min-h-[calc(100vh-4.5rem)] items-center gap-12 py-12 lg:grid-cols-[1.1fr_.9fr] lg:py-20">
            <div className="max-w-2xl">
              <p className="sgct-eyebrow">{stake.name}</p>
              <h1 className="mt-4 text-[clamp(2.25rem,6vw,4.5rem)] font-bold leading-[1.03] tracking-[-0.045em] text-[#212225]">
                Sua jornada ao templo começa com tranquilidade.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#53575b] sm:text-xl">
                Consulte as próximas caravanas, escolha seu assento e acompanhe cada etapa da sua reserva em um só lugar.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={`/${estaca_slug}/calendario`} className="sgct-button-primary w-full sm:w-auto">
                  Ver próximas caravanas
                  <ArrowRightIcon className="h-5 w-5" />
                </Link>
                <Link href={isAuthenticated ? `/${estaca_slug}/minhas-reservas` : `/${estaca_slug}/cadastro`} className="sgct-button-secondary w-full sm:w-auto">
                  {isAuthenticated ? "Acompanhar minhas reservas" : "Criar minha conta"}
                </Link>
              </div>

              {!isAuthenticated && (
                <Link
                  href={`/${estaca_slug}/auth/login`}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-brand-700 underline decoration-brand-200 decoration-2 hover:text-brand-900"
                >
                  <UserIcon className="h-5 w-5" />
                  Já tenho conta
                </Link>
              )}
            </div>

            <div className="relative mx-auto w-full max-w-lg">
              <div className="absolute -inset-5 rounded-[2rem] bg-brand-100/60 blur-2xl" />
              <div className="sgct-panel relative overflow-hidden p-6 sm:p-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-sm">
                  <CalendarIcon className="h-7 w-7" />
                </div>
                <h2 className="mt-6 text-2xl font-bold tracking-[-0.02em] text-[#212225]">
                  Tudo claro, do início ao embarque
                </h2>
                <ul className="mt-6 space-y-5" aria-label="Benefícios do sistema">
                  {[
                    "Datas, valores e embarques reunidos",
                    "Escolha visual do assento no ônibus",
                    "Acompanhamento do pagamento e da confirmação",
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-base text-[#3a3d40]">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-50 text-success-700">
                        <CheckIcon className="h-4 w-4" />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm leading-relaxed text-brand-900">
                  Escolher um assento cria a reserva. A confirmação da viagem acontece depois da validação do pagamento.
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
