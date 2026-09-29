"use client";

import { useState } from "react";
import { ReservationsChart } from "@/components/ui/reservations-chart";
import { formatCurrency, formatDate } from "@/components/ui/format";
import { confirmWardPaymentAction } from "@/app/(admin)/[estaca_slug]/actions";
import { MaskedCpf, CpfVisibilityToggle } from "@/components/admin/masked-cpf";

interface ReservationItem {
  id: string;
  user_id: string;
  seat_number: number | null;
  category: string;
  payment_amount: number;
  status: string;
  created_at: string;
  profiles: {
    full_name: string;
    cpf: string | null;
    phone: string | null;
  };
  caravan_id: string;
  caravans: {
    id: string;
    departure_date: string;
    status: string;
  };
}

interface CaravanOption {
  id: string;
  departure_date: string;
  status: string;
}

interface Props {
  currentUserId: string;
  reservations: ReservationItem[];
  caravans: CaravanOption[];
  wardName: string;
}

export function AlaReservasClient({
  currentUserId,
  reservations,
  caravans,
  wardName,
}: Props) {
  const [selectedCaravanId, setSelectedCaravanId] = useState<string>(
    caravans[0]?.id || "all"
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [revealedCpfIds, setRevealedCpfIds] = useState<Set<string>>(new Set());

  // Filtrar por caravana selecionada
  const filteredByCaravan =
    selectedCaravanId === "all"
      ? reservations
      : reservations.filter((r) => r.caravan_id === selectedCaravanId);

  // Métricas do Dashboard
  const pendentes = filteredByCaravan.filter((r) => r.status === "pendente");
  const pagosAla = filteredByCaravan.filter((r) => r.status === "pago_ala");
  const confirmados = filteredByCaravan.filter((r) => r.status === "confirmado");
  const waitlist = filteredByCaravan.filter(
    (r) => r.status === "lista_espera" || r.status === "waitlist" || r.status === "aguardando_vaga"
  );
  const totalInscritos = filteredByCaravan.length;

  // Filtrar por status se selecionado na aba
  const displayedReservations = filteredByCaravan.filter((r) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "pendente") return r.status === "pendente";
    if (statusFilter === "pago_ala") return r.status === "pago_ala";
    if (statusFilter === "confirmado") return r.status === "confirmado";
    if (statusFilter === "waitlist")
      return r.status === "lista_espera" || r.status === "waitlist" || r.status === "aguardando_vaga";
    return true;
  });

  const isAllCpfsRevealed =
    displayedReservations.length > 0 &&
    displayedReservations.every((r) => revealedCpfIds.has(r.id));

  const toggleCpfVisibility = (id: string) => {
    setRevealedCpfIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllCpfsVisibility = () => {
    if (isAllCpfsRevealed) {
      setRevealedCpfIds(new Set());
    } else {
      setRevealedCpfIds(new Set(displayedReservations.map((r) => r.id)));
    }
  };

  const handleConfirmPayment = async (reservationId: string) => {
    try {
      setIsSubmitting(reservationId);
      const res = await confirmWardPaymentAction(reservationId);
      if (!res.success) {
        alert(res.error || "Erro ao confirmar pagamento.");
      }
    } catch {
      alert("Falha na comunicação ao confirmar pagamento.");
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Topo / Seletor de Caravana */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-[#e0e2e2] shadow-xs">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#53575b]">
            Caravana Selecionada
          </h2>
          <p className="text-sm text-[#707478]">
            Consulte as inscrições dos membros da sua Ala por viagem.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {caravans.length > 1 && (
            <button
              type="button"
              onClick={() => setSelectedCaravanId("all")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                selectedCaravanId === "all"
                  ? "bg-brand-900 text-white"
                  : "bg-[#eff0f0] text-[#3a3d40] hover:bg-brand-50"
              }`}
            >
              Todas as Viagens
            </button>
          )}

          {caravans.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCaravanId(c.id)}
              className={`rounded-lg px-3.5 py-2 text-sm font-bold transition-all ${
                selectedCaravanId === c.id
                  ? "bg-brand-900 text-white shadow-xs"
                  : "bg-white border border-[#d0d3d3] text-[#3a3d40] hover:bg-brand-50"
              }`}
            >
              Viagem de {formatDate(c.departure_date)}
            </button>
          ))}
        </div>
      </div>

      <ReservationsChart reservations={filteredByCaravan} />

      {/* Cards de Métricas (Dashboard da Ala) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Card 1: Aguardando Pagamento */}
        <button type="button" aria-pressed={statusFilter === "pendente"}
          onClick={() => setStatusFilter("pendente")}
          className={`text-left cursor-pointer rounded-2xl border p-5 transition-all ${
            statusFilter === "pendente"
              ? "border-warning-500 bg-warning-50/70 ring-2 ring-warning-400"
              : "border-[#e0e2e2] bg-white hover:border-warning-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-warning-700">
              Aguardando Pgto
            </span>

          </div>
          <p className="mt-3 text-3xl font-black text-[#212225]">{pendentes.length}</p>
          <p className="mt-1 text-sm text-[#53575b]">Aguardam comprovação na Ala</p>
        </button>

        {/* Card 2: Pago Ala */}
        <button type="button" aria-pressed={statusFilter === "pago_ala"}
          onClick={() => setStatusFilter("pago_ala")}
          className={`text-left cursor-pointer rounded-2xl border p-5 transition-all ${
            statusFilter === "pago_ala"
              ? "border-brand-500 bg-brand-50/70 ring-2 ring-brand-400"
              : "border-[#e0e2e2] bg-white hover:border-brand-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-brand-800">
              Pago na Ala
            </span>

          </div>
          <p className="mt-3 text-3xl font-black text-[#212225]">{pagosAla.length}</p>
          <p className="mt-1 text-sm text-[#53575b]">Aguardando repasse da Estaca</p>
        </button>

        {/* Card 3: Confirmados */}
        <button type="button" aria-pressed={statusFilter === "confirmado"}
          onClick={() => setStatusFilter("confirmado")}
          className={`text-left cursor-pointer rounded-2xl border p-5 transition-all ${
            statusFilter === "confirmado"
              ? "border-success-500 bg-success-50/70 ring-2 ring-success-400"
              : "border-[#e0e2e2] bg-white hover:border-success-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-success-700">
              Confirmados
            </span>

          </div>
          <p className="mt-3 text-3xl font-black text-[#212225]">{confirmados.length}</p>
          <p className="mt-1 text-sm text-[#53575b]">Assentos garantidos</p>
        </button>

        {/* Card 4: Fila de Espera */}
        <button type="button" aria-pressed={statusFilter === "waitlist"}
          onClick={() => setStatusFilter("waitlist")}
          className={`text-left cursor-pointer rounded-2xl border p-5 transition-all ${
            statusFilter === "waitlist"
              ? "border-brand-500 bg-brand-50/70 ring-2 ring-brand-400"
              : "border-[#e0e2e2] bg-white hover:border-brand-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-brand-800">
              Fila de Espera
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">
              ⏳
            </span>
          </div>
          <p className="mt-3 text-3xl font-black text-[#212225]">{waitlist.length}</p>
          <p className="mt-1 text-sm text-[#53575b]">Excedentes aguardando vaga</p>
        </button>
      </div>

      {/* Filtros de Abas */}
      <div className="flex items-center gap-2 border-b border-[#e0e2e2] pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
            statusFilter === "all"
              ? "bg-[#212225] text-white"
              : "bg-white text-[#53575b] hover:bg-[#eff0f0]"
          }`}
        >
          Todos os Membros ({totalInscritos})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("pendente")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
            statusFilter === "pendente"
              ? "bg-warning-700 text-white"
              : "bg-white text-[#53575b] hover:bg-warning-50"
          }`}
        >
          Aguardando Pagamento ({pendentes.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("pago_ala")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
            statusFilter === "pago_ala"
              ? "bg-brand-700 text-white"
              : "bg-white text-[#53575b] hover:bg-brand-50"
          }`}
        >
          Pago na Ala ({pagosAla.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("confirmado")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
            statusFilter === "confirmado"
              ? "bg-success-700 text-white"
              : "bg-white text-[#53575b] hover:bg-success-50"
          }`}
        >
          Confirmados ({confirmados.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("waitlist")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
            statusFilter === "waitlist"
              ? "bg-brand-700 text-white"
              : "bg-white text-[#53575b] hover:bg-brand-50"
          }`}
        >
          Lista de Espera ({waitlist.length})
        </button>
      </div>

      {/* Lista de Membros */}
      <section className="sgct-card overflow-hidden">
        <div className="border-b border-[#e0e2e2] px-5 py-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#212225]">
              Membros Inscritos da {wardName}
            </h2>
            <p className="text-sm text-[#53575b]">
              Listagem ordenada por posição de inscrição e assento.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {displayedReservations.length > 0 && (
              <CpfVisibilityToggle
                allRevealed={isAllCpfsRevealed}
                onToggleAll={toggleAllCpfsVisibility}
              />
            )}
            <span className="text-sm font-bold text-brand-900 bg-brand-50 px-3 py-1.5 rounded-full border border-brand-200">
              {displayedReservations.length} encontrado(s)
            </span>
          </div>
        </div>

        {displayedReservations.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-lg font-bold text-[#212225]">Nenhum registro encontrado</h3>
            <p className="mt-2 text-sm text-[#53575b]">
              Não há membros com o status selecionado nesta caravana.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#e0e2e2] text-sm">
              <thead className="bg-[#f7f8f8] text-[#3a3d40]">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Assento / Posição</th>
                  <th className="px-5 py-3 text-left font-medium">Membro</th>
                  <th className="px-5 py-3 text-left font-medium">Contato</th>
                  <th className="px-5 py-3 text-left font-medium">Categoria / Valor</th>
                  <th className="px-5 py-3 text-left font-medium">Status da Reserva</th>
                  <th className="px-5 py-3 text-right font-medium">Ação na Ala</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e2e2] bg-white">
                {displayedReservations.map((res, index) => {
                  const isOwnReservation = res.user_id === currentUserId;
                  const isPendente = res.status === "pendente";

                  return (
                    <tr key={res.id} className="hover:bg-brand-50/40">
                      {/* Posição / Assento */}
                      <td className="px-5 py-4">
                        {res.seat_number ? (
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-100 font-bold text-brand-900 text-sm">
                              {res.seat_number}
                            </span>
                            <span className="text-sm text-[#707478]">Poltrona</span>
                          </div>
                        ) : (
                          <span className="sgct-chip border-brand-200 bg-brand-50 text-brand-700">
                            Fila #{index + 1}
                          </span>
                        )}
                      </td>

                      {/* Nome do Membro */}
                      <td className="px-5 py-4">
                        <p className="font-bold text-[#212225]">{res.profiles?.full_name}</p>
                        <div className="mt-0.5">
                          <MaskedCpf
                            cpf={res.profiles?.cpf}
                            isRevealed={revealedCpfIds.has(res.id)}
                            onToggle={() => toggleCpfVisibility(res.id)}
                            memberName={res.profiles?.full_name}
                          />
                        </div>
                        {isOwnReservation && (
                          <span className="inline-block mt-1 text-[11px] font-semibold text-warning-700 bg-warning-50 px-2 py-0.5 rounded border border-warning-200">
                            Sua Reserva (Admin)
                          </span>
                        )}
                      </td>

                      {/* Contato / WhatsApp */}
                      <td className="px-5 py-4">
                        {res.profiles?.phone ? (
                          <a
                            href={`https://wa.me/55${res.profiles.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-success-700 font-medium hover:underline"
                          >
                            <span>💬</span> {res.profiles.phone}
                          </a>
                        ) : (
                          <span className="text-sm text-[#707478]">—</span>
                        )}
                      </td>

                      {/* Categoria / Valor */}
                      <td className="px-5 py-4">
                        <p className="font-bold text-brand-900">
                          {formatCurrency(Number(res.payment_amount))}
                        </p>
                        <span className="text-sm text-[#53575b]">
                          {res.category === "officiant" ? "Oficiante" : "Padrão"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {res.status === "pendente" && (
                          <span className="sgct-chip border-warning-200 bg-warning-50 text-warning-700 font-semibold">
                             Aguardando Pgto
                          </span>
                        )}
                        {res.status === "pago_ala" && (
                          <span className="sgct-chip border-brand-200 bg-brand-50 text-brand-800 font-semibold">
                             Pago na Ala
                          </span>
                        )}
                        {res.status === "confirmado" && (
                          <span className="sgct-chip border-success-200 bg-success-50 text-success-700 font-semibold">
                             Confirmado
                          </span>
                        )}
                        {(res.status === "waitlist" || res.status === "aguardando_vaga") && (
                          <span className="sgct-chip border-brand-200 bg-brand-50 text-brand-800 font-semibold">
                            ⏳ Lista de Espera
                          </span>
                        )}
                      </td>

                      {/* Ação */}
                      <td className="px-5 py-4 text-right">
                        {isPendente ? (
                          isOwnReservation ? (
                            <span className="inline-block text-[11px] font-medium text-warning-700 bg-warning-50 px-2.5 py-1.5 rounded-lg border border-warning-200">
                              Autoaprovação bloqueada
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={isSubmitting === res.id}
                              onClick={() => handleConfirmPayment(res.id)}
                              className="inline-flex min-h-9 items-center rounded-lg bg-success-700 px-3.5 py-1.5 text-sm font-bold text-white shadow-xs hover:bg-success-700 transition-colors disabled:opacity-50"
                            >
                              {isSubmitting === res.id ? "Confirmando..." : "Confirmar Pgto"}
                            </button>
                          )
                        ) : (
                          <span className="text-sm text-[#707478]">
                            {res.status === "pago_ala"
                              ? "Aguardando Estaca"
                              : res.status === "confirmado"
                              ? "Vaga garantida"
                              : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
