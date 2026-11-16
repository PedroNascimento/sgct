"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { CalendarClock, MapPin, Phone, UsersRound, WalletCards } from "lucide-react";
import { formatCurrency, formatDate } from "@/components/ui/format";
import { MaskedCpf, CpfVisibilityToggle } from "@/components/admin/masked-cpf";
import type { Caravan } from "@/domain/types/caravan";
import {
  CHART_COLORS,
  type RevenueBar,
  type StatusSlice,
  type TimelinePoint,
  type WardBar,
} from "@/components/dashboard/chart-data";

const chartsLoading = () => (
  <div className="sgct-card p-6 text-center text-sm text-[#53575b]">Carregando gráfico...</div>
);

const OccupancyChart = dynamic(
  () => import("@/components/dashboard/caravan-dashboard-charts").then((m) => m.OccupancyChart),
  { ssr: false, loading: chartsLoading }
);
const StatusDonutChart = dynamic(
  () => import("@/components/dashboard/caravan-dashboard-charts").then((m) => m.StatusDonutChart),
  { ssr: false, loading: chartsLoading }
);
const WardBarChart = dynamic(
  () => import("@/components/dashboard/caravan-dashboard-charts").then((m) => m.WardBarChart),
  { ssr: false, loading: chartsLoading }
);
const TimelineChart = dynamic(
  () => import("@/components/dashboard/caravan-dashboard-charts").then((m) => m.TimelineChart),
  { ssr: false, loading: chartsLoading }
);
const RevenueChart = dynamic(
  () => import("@/components/dashboard/caravan-dashboard-charts").then((m) => m.RevenueChart),
  { ssr: false, loading: chartsLoading }
);

export interface ReservationDetail {
  id: string;
  caravan_id: string;
  seat_number: number | null;
  status: string;
  payment_amount: number;
  category: string;
  created_at: string;
  profiles: {
    full_name: string;
    cpf: string | null;
    phone: string | null;
  };
  wards: {
    name: string;
  };
}

interface Props {
  initialCaravans: Caravan[];
  initialReservations: ReservationDetail[];
}

const WAITLIST = ["lista_espera", "waitlist", "aguardando_vaga"];
const CONFIRMED = ["confirmado", "presente"];

const caravanStatusLabels: Record<string, { label: string; color: string }> = {
  registered: { label: "Cadastrada", color: "border-brand-200 bg-brand-50 text-brand-800" },
  draft: { label: "Cadastrada", color: "border-brand-200 bg-brand-50 text-brand-800" },
  open: { label: "Inscrições abertas", color: "border-success-200 bg-success-50 text-success-700" },
  quorum_pending: { label: "Aguardando quórum", color: "border-warning-200 bg-warning-50 text-warning-700" },
  confirmed: { label: "Confirmada", color: "border-brand-200 bg-brand-50 text-brand-700" },
  cancelled: { label: "Cancelada", color: "border-danger-200 bg-danger-50 text-danger-700" },
  completed: { label: "Realizada", color: "border-[#d0d3d3] bg-[#eff0f0] text-[#3a3d40]" },
};

function PaymentChip({ status }: { status: string }) {
  if (CONFIRMED.includes(status))
    return <span className="sgct-chip border-success-200 bg-success-50 font-semibold text-success-700">Confirmado</span>;
  if (status === "pago_ala")
    return <span className="sgct-chip border-brand-200 bg-brand-50 font-semibold text-brand-800">Pago na Ala (validar)</span>;
  if (status === "pendente")
    return <span className="sgct-chip border-warning-200 bg-warning-50 font-semibold text-warning-700">Falta pagar</span>;
  if (WAITLIST.includes(status))
    return <span className="sgct-chip border-brand-200 bg-brand-50 font-semibold text-brand-800">Lista de espera</span>;
  return <span className="sgct-chip border-[#d0d3d3] bg-[#eff0f0] font-semibold text-[#3a3d40]">{status}</span>;
}

function KpiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint: string;
  tone: "neutral" | "success" | "brand" | "warning" | "waitlist";
}) {
  const tones = {
    neutral: "border-[#e0e2e2] bg-white text-[#212225]",
    success: "border-success-200 bg-success-50/50 text-success-700",
    brand: "border-brand-200 bg-brand-50/50 text-brand-900",
    warning: "border-warning-200 bg-warning-50/50 text-warning-700",
    waitlist: "border-[#d5dbf5] bg-[#f3f5fd] text-[#3d4aa0]",
  } as const;
  return (
    <div className={`min-w-0 rounded-2xl border p-4 shadow-xs ${tones[tone]}`}>
      <span className="block text-xs font-bold uppercase tracking-wider opacity-80">{label}</span>
      <p className="mt-1.5 truncate text-2xl font-black tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs opacity-80">{hint}</p>
    </div>
  );
}

export function CaravanDashboardClient({ initialCaravans, initialReservations }: Props) {
  const [selectedCaravanId, setSelectedCaravanId] = useState<string>(initialCaravans[0]?.id || "");
  const [revealedCpfIds, setRevealedCpfIds] = useState<Set<string>>(new Set());

  const caravan = initialCaravans.find((c) => c.id === selectedCaravanId) || initialCaravans[0];

  const reservations = useMemo(
    () => initialReservations.filter((r) => r.caravan_id === caravan?.id),
    [initialReservations, caravan?.id]
  );

  const metrics = useMemo(() => {
    const confirmados = reservations.filter((r) => CONFIRMED.includes(r.status));
    const pagoAla = reservations.filter((r) => r.status === "pago_ala");
    const pendentes = reservations.filter((r) => r.status === "pendente");
    const espera = reservations.filter((r) => WAITLIST.includes(r.status));
    const sum = (list: ReservationDetail[]) => list.reduce((s, r) => s + Number(r.payment_amount || 0), 0);
    const occupied = confirmados.length + pagoAla.length + pendentes.length;

    const statusData: StatusSlice[] = [
      { name: "Confirmados", value: confirmados.length, color: CHART_COLORS.success },
      { name: "Pago na Ala", value: pagoAla.length, color: CHART_COLORS.brand },
      { name: "Falta pagar", value: pendentes.length, color: CHART_COLORS.warning },
      { name: "Lista de espera", value: espera.length, color: CHART_COLORS.waitlist },
    ];
    const others = reservations.length - (occupied + espera.length);
    if (others > 0) statusData.push({ name: "Outras situações", value: others, color: CHART_COLORS.neutral });

    const wardMap = new Map<string, WardBar>();
    for (const r of reservations) {
      const ward = r.wards?.name ?? "Sem Ala";
      const row = wardMap.get(ward) ?? { ward, confirmados: 0, pagoAla: 0, pendentes: 0, espera: 0 };
      if (CONFIRMED.includes(r.status)) row.confirmados++;
      else if (r.status === "pago_ala") row.pagoAla++;
      else if (r.status === "pendente") row.pendentes++;
      else if (WAITLIST.includes(r.status)) row.espera++;
      wardMap.set(ward, row);
    }
    const wardData = [...wardMap.values()].sort(
      (a, b) =>
        b.confirmados + b.pagoAla + b.pendentes + b.espera - (a.confirmados + a.pagoAla + a.pendentes + a.espera)
    );

    const perDay = new Map<string, number>();
    for (const r of reservations) {
      const key = (r.created_at ?? "").slice(0, 10);
      if (key) perDay.set(key, (perDay.get(key) ?? 0) + 1);
    }
    const timeline: TimelinePoint[] = [...perDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .reduce<TimelinePoint[]>((points, [key, count]) => {
        const previous = points.length > 0 ? points[points.length - 1].acumulado : 0;
        points.push({ date: formatDate(key).slice(0, 5), inscricoes: count, acumulado: previous + count });
        return points;
      }, []);

    const confirmedAmount = sum(confirmados);
    const validatingAmount = sum(pagoAla);
    const pendingAmount = sum(pendentes);
    const revenue: RevenueBar[] = [
      { name: "Confirmado", valor: confirmedAmount, color: CHART_COLORS.success },
      { name: "Pago na Ala", valor: validatingAmount, color: CHART_COLORS.brand },
      { name: "A receber", valor: pendingAmount, color: CHART_COLORS.warning },
    ];

    return {
      confirmados,
      pagoAla,
      pendentes,
      espera,
      occupied,
      statusData,
      wardData,
      timeline,
      revenue,
      confirmedAmount,
      validatingAmount,
      pendingAmount,
    };
  }, [reservations]);

  if (!caravan) {
    return (
      <div className="sgct-card p-12 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <CalendarClock className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="text-base font-bold text-[#212225]">Nenhuma caravana com inscrições abertas</h2>
        <p className="mt-1 text-sm text-[#53575b]">
          O Dashboard exibe apenas viagens ativas com status <strong>Inscrições abertas</strong>. Acesse a tela de <strong>Caravanas</strong> para abrir as inscrições da viagem desejada.
        </p>
      </div>
    );
  }

  const isAllCpfsRevealed = reservations.length > 0 && reservations.every((r) => revealedCpfIds.has(r.id));
  const toggleCpf = (id: string) =>
    setRevealedCpfIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAllCpfs = () =>
    setRevealedCpfIds(isAllCpfsRevealed ? new Set() : new Set(reservations.map((r) => r.id)));

  const status = caravanStatusLabels[caravan.status];
  const expected = metrics.confirmedAmount + metrics.validatingAmount + metrics.pendingAmount;

  return (
    <div className="space-y-6">
      {/* Seletor e resumo da caravana */}
      <section className="rounded-2xl border border-[#e0e2e2] bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-bold text-[#212225]">
                {caravan.title || `Caravana de ${formatDate(caravan.departure_date)}`}
              </h2>
              {status && <span className={`sgct-chip py-0.5 px-2.5 text-xs ${status.color}`}>{status.label}</span>}
              <span className="sgct-chip border-[#d0d3d3] bg-[#f4f6f6] py-0.5 px-2.5 text-xs text-[#3a3d40]">
                {caravan.overnight ? "Com pernoite" : "Sem pernoite"}
              </span>
            </div>
            <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#53575b]">
              <div>
                <dt className="inline text-[#707478]">Saída: </dt>
                <dd className="inline font-semibold">{formatDate(caravan.departure_date)}</dd>
              </div>
              <div>
                <dt className="inline text-[#707478]">Retorno: </dt>
                <dd className="inline font-semibold">{caravan.return_date ? formatDate(caravan.return_date) : "mesmo dia"}</dd>
              </div>
              <div>
                <dt className="inline text-[#707478]">Inscrição até: </dt>
                <dd className="inline font-semibold">{formatDate(caravan.registration_deadline)}</dd>
              </div>
              <div>
                <dt className="inline text-[#707478]">Verificação de quórum: </dt>
                <dd className="inline font-semibold">{formatDate(caravan.quorum_check_date)}</dd>
              </div>
            </dl>
          </div>

          <div className="w-full shrink-0 lg:w-80">
            <label htmlFor="dashboard-caravan-select" className="mb-1 block text-xs font-semibold text-[#53575b]">
              Caravana
            </label>
            <select
              id="dashboard-caravan-select"
              value={caravan.id}
              onChange={(e) => {
                setSelectedCaravanId(e.target.value);
                setRevealedCpfIds(new Set());
              }}
              className="sgct-select w-full cursor-pointer rounded-xl border-brand-300 bg-brand-50/50 py-2.5 pl-3.5 pr-10 text-sm font-bold text-brand-900"
            >
              {initialCaravans.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title ? `${c.title} (${formatDate(c.departure_date)})` : `Caravana de ${formatDate(c.departure_date)}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Reservas" value={metrics.occupied} hint={`de ${caravan.seat_limit} assentos`} tone="neutral" />
        <KpiCard label="Confirmados" value={metrics.confirmados.length} hint="Validados pela Estaca" tone="success" />
        <KpiCard label="Pago na Ala" value={metrics.pagoAla.length} hint="Aguardando validação" tone="brand" />
        <KpiCard label="Falta pagar" value={metrics.pendentes.length} hint="Aguardando a Ala" tone="warning" />
        <KpiCard
          label="Fila de espera"
          value={metrics.espera.length}
          hint={`Limite de ${caravan.waitlist_limit} vagas`}
          tone="waitlist"
        />
        <KpiCard
          label="Arrecadado"
          value={formatCurrency(metrics.confirmedAmount)}
          hint={`Previsto: ${formatCurrency(expected)}`}
          tone="success"
        />
      </div>

      {/* Gráficos (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        <div className="h-full">
          <OccupancyChart occupied={metrics.occupied} seatLimit={caravan.seat_limit} minQuorum={caravan.min_quorum} />
        </div>
        <div className="h-full">
          <StatusDonutChart data={metrics.statusData} />
        </div>
        <div className="h-full">
          <WardBarChart data={metrics.wardData} />
        </div>
        <div className="h-full">
          <RevenueChart data={metrics.revenue} />
        </div>
        <div className="lg:col-span-2 h-full">
          <TimelineChart data={metrics.timeline} />
        </div>
      </div>

      {/* Passageiros */}
      <section className="sgct-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e0e2e2] px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-[#212225]">Passageiros inscritos ({reservations.length})</h3>
            <p className="text-sm text-[#53575b]">Listagem organizada por assento e ordem de inscrição.</p>
          </div>
          {reservations.length > 0 && (
            <CpfVisibilityToggle allRevealed={isAllCpfsRevealed} onToggleAll={toggleAllCpfs} />
          )}
        </div>

        {reservations.length === 0 ? (
          <div className="bg-[#fafafa] p-10 text-center text-sm text-[#53575b]">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <UsersRound className="h-6 w-6" aria-hidden="true" />
            </div>
            <h4 className="text-base font-bold text-[#212225]">Nenhum membro inscrito nesta caravana ainda</h4>
            <p className="mx-auto mt-1 max-w-md text-xs text-[#707478]">
              Assim que os membros realizarem as reservas, a lista de passageiros e os gráficos serão atualizados
              automaticamente.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile */}
            <div className="divide-y divide-[#e0e2e2] md:hidden">
              {reservations.map((res, idx) => (
                <article key={res.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-base font-bold text-[#212225]">{res.profiles?.full_name}</p>
                      <div className="mt-0.5">
                        <MaskedCpf
                          cpf={res.profiles?.cpf}
                          isRevealed={revealedCpfIds.has(res.id)}
                          onToggle={() => toggleCpf(res.id)}
                          memberName={res.profiles?.full_name}
                        />
                      </div>
                      <p className="mt-1 flex items-center gap-2 text-sm text-[#53575b]">
                        <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {res.wards?.name}
                      </p>
                    </div>
                    {res.seat_number ? (
                      <span
                        className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 px-2 font-bold text-brand-900"
                        aria-label={`Assento ${res.seat_number}`}
                      >
                        {res.seat_number}
                      </span>
                    ) : (
                      <span className="sgct-chip shrink-0 border-brand-200 bg-brand-50 text-brand-700">Fila #{idx + 1}</span>
                    )}
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-[#f7f8f8] p-3 text-sm">
                    <div>
                      <dt className="flex items-center gap-1.5 text-xs text-[#53575b]">
                        <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                        Contato
                      </dt>
                      <dd className="mt-0.5 break-all font-semibold">{res.profiles?.phone || "Não informado"}</dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1.5 text-xs text-[#53575b]">
                        <WalletCards className="h-3.5 w-3.5" aria-hidden="true" />
                        Valor
                      </dt>
                      <dd className="mt-0.5 font-semibold text-brand-900">{formatCurrency(Number(res.payment_amount))}</dd>
                      <dd className="text-xs text-[#53575b]">{res.category === "officiant" ? "Oficiante" : "Padrão"}</dd>
                    </div>
                  </dl>
                  <PaymentChip status={res.status} />
                </article>
              ))}
            </div>

            {/* Desktop */}
            <div className="max-md:hidden">
              <table className="w-full divide-y divide-[#e0e2e2] text-sm">
                <thead className="bg-[#f7f8f8] text-xs text-[#3a3d40]">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Assento</th>
                    <th className="px-4 py-3 text-left font-medium">Passageiro</th>
                    <th className="px-4 py-3 text-left font-medium">Ala</th>
                    <th className="px-4 py-3 text-left font-medium">Contato</th>
                    <th className="px-4 py-3 text-left font-medium">Valor / Categoria</th>
                    <th className="px-4 py-3 text-left font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e2e2] bg-white">
                  {reservations.map((res, idx) => (
                    <tr key={res.id} className="hover:bg-brand-50/40">
                      <td className="px-4 py-3">
                        {res.seat_number ? (
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-100 text-sm font-bold text-brand-900">
                            {res.seat_number}
                          </span>
                        ) : (
                          <span className="sgct-chip border-brand-200 bg-brand-50 text-brand-700">Fila #{idx + 1}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-[#212225]">{res.profiles?.full_name}</p>
                        <div className="mt-0.5">
                          <MaskedCpf
                            cpf={res.profiles?.cpf}
                            isRevealed={revealedCpfIds.has(res.id)}
                            onToggle={() => toggleCpf(res.id)}
                            memberName={res.profiles?.full_name}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#3a3d40]">{res.wards?.name}</td>
                      <td className="px-4 py-3 text-[#53575b]">{res.profiles?.phone || "Não informado"}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-brand-900">{formatCurrency(Number(res.payment_amount))}</span>
                        <span className="block text-[11px] text-[#707478]">
                          {res.category === "officiant" ? "Oficiante" : "Padrão"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <PaymentChip status={res.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
