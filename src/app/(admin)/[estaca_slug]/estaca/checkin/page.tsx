import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseStakeRepository } from "@/infrastructure/supabase/supabase-stake-repository";
import { SupabaseCaravanRepository } from "@/infrastructure/supabase/supabase-caravan-repository";
import { resolveStakeFromSlug } from "@/use-cases/tenant/resolve-stake-from-slug";
import nextDynamic from "next/dynamic";
import { formatDate } from "@/components/ui/format";

const QrCodeScanner = nextDynamic(
  () => import("@/components/checkin/qr-code-scanner").then((mod) => mod.QrCodeScanner),
  {
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
        <p className="text-sm text-gray-500">Carregando leitor de QR Code...</p>
      </div>
    ),
  }
);

interface Props {
  params: Promise<{ estaca_slug: string }>;
  searchParams: Promise<{ caravan_id?: string }>;
}

export const dynamic = "force-dynamic";

export default async function CheckInPage({ params, searchParams }: Props) {
  const { estaca_slug } = await params;
  const { caravan_id } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${estaca_slug}/auth/login`);

  const stake = await resolveStakeFromSlug(
    estaca_slug,
    new SupabaseStakeRepository(supabase)
  );
  if (!stake) notFound();

  const role = user.app_metadata.role;
  if (role !== "admin_estaca" && role !== "super_admin") {
    redirect(`/${estaca_slug}`);
  }

  const caravanRepo = new SupabaseCaravanRepository(supabase);
  const caravans = await caravanRepo.findByStakeId(stake.id);

  // Seleciona caravanas confirmadas ou em andamento
  const activeCaravans = caravans.filter(
    (c) => c.status === "confirmed" || c.status === "open"
  );

  const selectedCaravan =
    activeCaravans.find((c) => c.id === caravan_id) || activeCaravans[0] || caravans[0];

  return (
    <div className="space-y-8">
      <div>
        <p className="sgct-eyebrow">Operação de Embarque e Presença</p>
        <h1 className="sgct-title mt-2">Check-in de Passageiros</h1>
        <p className="sgct-subtitle">
          Leitura de QR Code para confirmação física de presença no ônibus (ida e retorno).
        </p>
      </div>

      {caravans.length === 0 ? (
        <div className="sgct-panel p-8 text-center text-[#53575b]">
          Nenhuma caravana cadastrada nesta Estaca.
        </div>
      ) : (
        <div className="space-y-6">
          {activeCaravans.length > 1 && (
            <div className="rounded-xl border border-[#e0e2e2] bg-white p-4">
              <label htmlFor="select-caravan" className="sgct-label">
                Selecionar Caravana
              </label>
              <select
                id="select-caravan"
                defaultValue={selectedCaravan.id}
                className="sgct-input max-w-md"
                onChange={(e) => {
                  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                  window.location.href = `/${estaca_slug}/estaca/checkin?caravan_id=${e.target.value}`;
                }}
              >
                {activeCaravans.map((c) => (
                  <option key={c.id} value={c.id}>
                    Caravana de {formatDate(c.departure_date)} ({c.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedCaravan && (
            <div className="sgct-panel p-6 sm:p-8">
              <div className="mb-6 flex flex-col gap-1 border-b border-[#e0e2e2] pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-700">
                  Caravana Ativa
                </span>
                <h2 className="text-xl font-bold text-[#212225]">
                  Viagem de {formatDate(selectedCaravan.departure_date)}
                </h2>
                {selectedCaravan.return_date && (
                  <p className="text-sm text-[#53575b]">
                    Retorno previsto para {formatDate(selectedCaravan.return_date)}
                  </p>
                )}
              </div>

              <QrCodeScanner caravanId={selectedCaravan.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
