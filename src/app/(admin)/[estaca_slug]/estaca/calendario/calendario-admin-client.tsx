"use client";

import { useState, useActionState } from "react";
import type { Caravan } from "@/domain/types/caravan";
import {
  createCaravanAction,
  updateCaravanStatusAction,
  editCaravanAction,
  type AdminActionState,
} from "../../actions";
import { formatCurrency, formatDate } from "@/components/ui/format";

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
  stakeSlug: string;
  initialCaravans: Caravan[];
  initialReservations: ReservationDetail[];
}

const initialState: AdminActionState = {
  success: false,
};

interface BoardingPointDraft {
  name: string;
  boardingTime: string;
}

export function CalendarioAdminClient({
  stakeSlug: _stakeSlug,
  initialCaravans,
  initialReservations,
}: Props) {
  const [createState, createAction, isCreatePending] = useActionState(
    createCaravanAction,
    initialState
  );

  const [updateState, updateAction, isUpdatePending] = useActionState(
    updateCaravanStatusAction,
    initialState
  );

  const [editState, editAction, isEditPending] = useActionState(
    editCaravanAction,
    initialState
  );

  // Caravana em edição
  const [editingCaravan, setEditingCaravan] = useState<Caravan | null>(null);

  // Caravana selecionada para o Dashboard de inscritos
  const [selectedCaravanId, setSelectedCaravanId] = useState<string>(
    initialCaravans[0]?.id || ""
  );

  const [boardingPoints, setBoardingPoints] = useState<BoardingPointDraft[]>([
    { name: "Capela Principal", boardingTime: "" },
  ]);

  const addBoardingPoint = () => {
    setBoardingPoints([...boardingPoints, { name: "", boardingTime: "" }]);
  };

  const removeBoardingPoint = (index: number) => {
    if (boardingPoints.length > 1) {
      setBoardingPoints(boardingPoints.filter((_, i) => i !== index));
    }
  };

  const updateBoardingPoint = (
    index: number,
    field: "name" | "boardingTime",
    value: string
  ) => {
    const updated = [...boardingPoints];
    updated[index][field] = value;
    setBoardingPoints(updated);
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    open: { label: "Inscrições abertas", color: "border-success-200 bg-success-50 text-success-700" },
    quorum_pending: { label: "Aguardando quórum", color: "border-warning-200 bg-warning-50 text-warning-700" },
    confirmed: { label: "Confirmada", color: "border-brand-200 bg-brand-50 text-brand-700" },
    cancelled: { label: "Cancelada", color: "border-danger-200 bg-danger-50 text-danger-700" },
    completed: { label: "Realizada", color: "border-[#d0d3d3] bg-[#eff0f0] text-[#3a3d40]" },
  };

  // Filtrar reservas pela caravana selecionada
  const caravanReservations = initialReservations.filter(
    (r) => r.caravan_id === selectedCaravanId
  );

  // Métricas do Dashboard da Estaca
  const pagos = caravanReservations.filter(
    (r) => r.status === "confirmado" || r.status === "pago_ala"
  );
  const pendentes = caravanReservations.filter((r) => r.status === "pendente");
  const waitlist = caravanReservations.filter(
    (r) => r.status === "waitlist" || r.status === "aguardando_vaga"
  );
  const totalInscritos = caravanReservations.length;

  return (
    <div className="space-y-10">
      {/* Mensagens de feedback */}
      {(createState?.error || updateState?.error || editState?.error) && (
        <div role="alert" className="sgct-alert-danger">
          {createState?.error || updateState?.error || editState?.error}
        </div>
      )}
      {(createState?.success || updateState?.success || editState?.success) && (
        <div role="status" className="sgct-alert-success">
          {createState?.message || updateState?.message || editState?.message}
        </div>
      )}

      {/* DASHBOARD DE INSCRITOS NA CARAVANA */}
      {initialCaravans.length > 0 && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-[#e0e2e2] shadow-xs">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-800">
                Dashboard de Inscrições
              </p>
              <h2 className="text-xl font-bold text-[#212225] mt-0.5">
                Status dos Passageiros por Viagem
              </h2>
            </div>

            {/* Seletor de Caravana */}
            <div className="flex items-center gap-2 overflow-x-auto">
              {initialCaravans.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCaravanId(c.id)}
                  className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                    selectedCaravanId === c.id
                      ? "bg-brand-900 text-white shadow-sm"
                      : "bg-[#eff0f0] text-[#3a3d40] hover:bg-brand-50"
                  }`}
                >
                  🚌 {formatDate(c.departure_date)}
                </button>
              ))}
            </div>
          </div>

          {/* Cards de Métricas */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#e0e2e2] bg-white p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-[#53575b]">
                Total de Inscritos
              </span>
              <p className="mt-2 text-3xl font-black text-[#212225]">{totalInscritos}</p>
              <p className="mt-1 text-xs text-[#707478]">Passageiros na viagem</p>
            </div>

            <div className="rounded-2xl border border-success-200 bg-success-50/50 p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-success-800">
                Já Pagou
              </span>
              <p className="mt-2 text-3xl font-black text-success-900">{pagos.length}</p>
              <p className="mt-1 text-xs text-success-700">Confirmados ou repassados pela Ala</p>
            </div>

            <div className="rounded-2xl border border-warning-200 bg-warning-50/50 p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-warning-800">
                Falta Pagar
              </span>
              <p className="mt-2 text-3xl font-black text-warning-900">{pendentes.length}</p>
              <p className="mt-1 text-xs text-warning-700">Aguardando comprovação na Ala</p>
            </div>

            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                Fila de Espera
              </span>
              <p className="mt-2 text-3xl font-black text-indigo-900">{waitlist.length}</p>
              <p className="mt-1 text-xs text-indigo-700">Aguardando vaga excedente</p>
            </div>
          </div>

          {/* Tabela de Inscritos na Caravana */}
          <div className="sgct-card overflow-hidden">
            <div className="border-b border-[#e0e2e2] px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#212225]">
                  Passageiros Inscritos ({caravanReservations.length})
                </h3>
                <p className="text-xs text-[#53575b]">
                  Listagem organizada por poltrona/ordem de inscrição.
                </p>
              </div>
            </div>

            {caravanReservations.length === 0 ? (
              <div className="p-10 text-center text-sm text-[#53575b]">
                Nenhum membro inscrito nesta caravana ainda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#e0e2e2] text-sm">
                  <thead className="bg-[#f7f8f8] text-[#3a3d40]">
                    <tr>
                      <th className="px-5 py-3 text-left font-medium">Assento</th>
                      <th className="px-5 py-3 text-left font-medium">Passageiro</th>
                      <th className="px-5 py-3 text-left font-medium">Ala</th>
                      <th className="px-5 py-3 text-left font-medium">Contato</th>
                      <th className="px-5 py-3 text-left font-medium">Valor / Categoria</th>
                      <th className="px-5 py-3 text-left font-medium">Status Pagamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e2e2] bg-white">
                    {caravanReservations.map((res, idx) => (
                      <tr key={res.id} className="hover:bg-brand-50/40">
                        <td className="px-5 py-3.5">
                          {res.seat_number ? (
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-100 font-bold text-brand-900 text-xs">
                              {res.seat_number}
                            </span>
                          ) : (
                            <span className="sgct-chip border-indigo-200 bg-indigo-50 text-indigo-700">
                              Fila #{idx + 1}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-[#212225]">
                          {res.profiles?.full_name}
                        </td>
                        <td className="px-5 py-3.5 text-[#3a3d40]">
                          {res.wards?.name}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[#53575b]">
                          {res.profiles?.phone || "Não informado"}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-brand-900">
                            {formatCurrency(Number(res.payment_amount))}
                          </span>
                          <span className="block text-[11px] text-[#707478]">
                            {res.category === "officiant" ? "Oficiante" : "Padrão"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {res.status === "confirmado" && (
                            <span className="sgct-chip border-success-200 bg-success-50 text-success-800 font-semibold">
                              🟢 Confirmado
                            </span>
                          )}
                          {res.status === "pago_ala" && (
                            <span className="sgct-chip border-brand-200 bg-brand-50 text-brand-800 font-semibold">
                              🔵 Pago na Ala (Validar)
                            </span>
                          )}
                          {res.status === "pendente" && (
                            <span className="sgct-chip border-warning-200 bg-warning-50 text-warning-800 font-semibold">
                              🟡 Falta Pagar
                            </span>
                          )}
                          {(res.status === "waitlist" || res.status === "aguardando_vaga") && (
                            <span className="sgct-chip border-indigo-200 bg-indigo-50 text-indigo-800 font-semibold">
                              ⏳ Lista de Espera
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* MODAL / FORMULÁRIO DE EDIÇÃO DE CARAVANA */}
      {editingCaravan && (
        <section className="rounded-2xl border-2 border-brand-500 bg-white p-6 shadow-lg space-y-6">
          <div className="flex items-center justify-between border-b border-[#e0e2e2] pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-800">
                Edição de Viagem
              </span>
              <h3 className="text-xl font-bold text-[#212225] mt-0.5">
                Editar Caravana de {formatDate(editingCaravan.departure_date)}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setEditingCaravan(null)}
              className="rounded-lg p-2 text-[#707478] hover:bg-[#eff0f0] transition-colors"
            >
              ✕ Fechar
            </button>
          </div>

          <form action={editAction} className="space-y-6">
            <input type="hidden" name="caravanId" value={editingCaravan.id} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="sgct-label">Data de Saída *</label>
                <input
                  type="date"
                  name="departureDate"
                  defaultValue={editingCaravan.departure_date}
                  required
                  className="sgct-input"
                />
              </div>

              <div>
                <label className="sgct-label">Data de Retorno</label>
                <input
                  type="date"
                  name="returnDate"
                  defaultValue={editingCaravan.return_date || ""}
                  className="sgct-input"
                />
              </div>

              <div>
                <label className="sgct-label">Preço Padrão (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  name="priceStandard"
                  defaultValue={editingCaravan.price_standard}
                  required
                  className="sgct-input"
                />
              </div>

              <div>
                <label className="sgct-label">Preço Oficiante (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  name="priceOfficiant"
                  defaultValue={editingCaravan.price_officiant}
                  required
                  className="sgct-input"
                />
              </div>

              <div>
                <label className="sgct-label">Limite de Assentos *</label>
                <input
                  type="number"
                  name="seatLimit"
                  defaultValue={editingCaravan.seat_limit}
                  min={1}
                  required
                  className="sgct-input"
                />
              </div>

              <div>
                <label className="sgct-label">Vagas na Fila de Espera</label>
                <input
                  type="number"
                  name="waitlistLimit"
                  defaultValue={editingCaravan.waitlist_limit}
                  min={0}
                  className="sgct-input"
                />
              </div>

              <div>
                <label className="sgct-label">Prazo de Inscrição *</label>
                <input
                  type="date"
                  name="registrationDeadline"
                  defaultValue={editingCaravan.registration_deadline}
                  required
                  className="sgct-input"
                />
              </div>

              <div>
                <label className="sgct-label">Verificação de Quórum *</label>
                <input
                  type="date"
                  name="quorumCheckDate"
                  defaultValue={editingCaravan.quorum_check_date}
                  required
                  className="sgct-input"
                />
              </div>

              <div>
                <label className="sgct-label">Quórum Mínimo *</label>
                <input
                  type="number"
                  name="minQuorum"
                  defaultValue={editingCaravan.min_quorum}
                  min={1}
                  required
                  className="sgct-input"
                />
              </div>

              <div>
                <label className="sgct-label">Status da Caravana *</label>
                <select
                  name="status"
                  defaultValue={editingCaravan.status}
                  className="sgct-select"
                >
                  <option value="open">Inscrições abertas (open)</option>
                  <option value="quorum_pending">Aguardando quórum (quorum_pending)</option>
                  <option value="confirmed">Confirmada (confirmed)</option>
                  <option value="completed">Realizada (completed)</option>
                  <option value="cancelled">Cancelada (cancelled)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#e0e2e2]">
              <button
                type="button"
                onClick={() => setEditingCaravan(null)}
                className="sgct-button-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isEditPending}
                className="sgct-button bg-brand-900 text-white hover:bg-brand-950"
              >
                {isEditPending ? "Salvando alterações..." : "Salvar Alterações"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Formulário de Cadastro de Nova Caravana */}
      <section className="sgct-card p-5 sm:p-7">
        <h2 className="mb-2 text-xl font-bold text-[#212225]">
          Cadastrar nova caravana
        </h2>
        <p className="mb-6 text-sm text-[#53575b]">
          Preencha as datas, limites e pontos de embarque para abrir as inscrições.
        </p>

        <form action={createAction} className="space-y-6">
          <input
            type="hidden"
            name="boardingPoints"
            value={JSON.stringify(boardingPoints)}
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="sgct-label">
                Data de Saída / Embarque *
              </label>
              <input
                type="date"
                name="departureDate"
                required
                className="sgct-input"
              />
            </div>

            <div>
              <label className="sgct-label">
                Data de Retorno
              </label>
              <input
                type="date"
                name="returnDate"
                className="sgct-input"
              />
            </div>

            <div>
              <label className="sgct-label">
                Valor Categoria Padrão (Adulto / Jovem) *
              </label>
              <input
                type="number"
                step="0.01"
                name="priceStandard"
                defaultValue="130.00"
                required
                className="sgct-input"
              />
            </div>

            <div>
              <label className="sgct-label">
                Valor Oficiante do Templo *
              </label>
              <input
                type="number"
                step="0.01"
                name="priceOfficiant"
                defaultValue="117.00"
                required
                className="sgct-input"
              />
            </div>

            <div>
              <label className="sgct-label">
                Limite de Assentos *
              </label>
              <input
                type="number"
                name="seatLimit"
                defaultValue={50}
                min={1}
                className="sgct-input"
              />
            </div>

            <div>
              <label className="sgct-label">
                Vagas na Fila de Espera
              </label>
              <input
                type="number"
                name="waitlistLimit"
                defaultValue={5}
                min={0}
                className="sgct-input"
              />
            </div>

            <div>
              <label className="sgct-label">
                Prazo Inscrição (Domingo) *
              </label>
              <input
                type="date"
                name="registrationDeadline"
                required
                className="sgct-input"
              />
            </div>

            <div>
              <label className="sgct-label">
                Verificação Quórum (Terça) *
              </label>
              <input
                type="date"
                name="quorumCheckDate"
                required
                className="sgct-input"
              />
            </div>
          </div>

          {/* Pontos de Embarque Dinâmicos */}
          <div className="border-t border-[#e0e2e2] pt-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-base font-bold text-[#212225]">
                Pontos de Embarque
              </p>
              <button
                type="button"
                onClick={addBoardingPoint}
                className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
              >
                + Adicionar Ponto
              </button>
            </div>

            <div className="space-y-3">
              {boardingPoints.map((bp, index) => (
                <div key={index} className="grid gap-2 rounded-xl bg-[#f7f8f8] p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <input
                    type="text"
                    placeholder="Nome do local (ex: Capela Tirol)"
                    value={bp.name}
                    onChange={(e) => updateBoardingPoint(index, "name", e.target.value)}
                    required
                    className="sgct-input"
                  />
                  <input
                    type="datetime-local"
                    value={bp.boardingTime}
                    onChange={(e) =>
                      updateBoardingPoint(index, "boardingTime", e.target.value)
                    }
                    required
                    className="sgct-input sm:w-64"
                  />
                  {boardingPoints.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBoardingPoint(index)}
                      className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-danger-700 hover:bg-danger-50"
                    >
                      Remover
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreatePending}
            className="sgct-button w-full sm:w-auto"
          >
            {isCreatePending ? "Cadastrando caravana..." : "Cadastrar Caravana"}
          </button>
        </form>
      </section>

      {/* Listagem de Caravanas Existentes com Botão de Edição */}
      <section className="sgct-card p-5 sm:p-7">
        <h2 className="mb-5 text-xl font-bold text-[#212225]">
          Caravanas Cadastradas ({initialCaravans.length})
        </h2>

        {initialCaravans.length === 0 ? (
          <p className="py-8 text-center text-base text-[#53575b]">
            Nenhuma caravana cadastrada ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f7f8f8] border-b border-[#e0e2e2] text-xs font-semibold text-[#53575b] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Saída / Retorno</th>
                  <th className="py-3 px-4">Preços (Padrão / Oficiante)</th>
                  <th className="py-3 px-4">Capacidade</th>
                  <th className="py-3 px-4">Prazos</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e2e2] bg-white">
                {initialCaravans.map((caravan) => (
                  <tr key={caravan.id} className="hover:bg-brand-50/40">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#212225]">
                        {formatDate(caravan.departure_date)}
                      </div>
                      <div className="text-xs text-[#53575b]">
                        Retorno: {caravan.return_date ? formatDate(caravan.return_date) : "mesmo dia"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-brand-900">
                        {formatCurrency(caravan.price_standard)}
                      </div>
                      <div className="text-xs text-[#53575b]">
                        Oficiante: {formatCurrency(caravan.price_officiant)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>{caravan.seat_limit} assentos</div>
                      <div className="text-xs text-[#53575b]">
                        Espera: {caravan.waitlist_limit}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs">
                        Inscrição até: {formatDate(caravan.registration_deadline)}
                      </div>
                      <div className="text-xs text-[#53575b]">
                        Quórum: {formatDate(caravan.quorum_check_date)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`sgct-chip ${
                          statusLabels[caravan.status]?.color ?? "border-[#d0d3d3] bg-[#eff0f0] text-[#3a3d40]"
                        }`}
                      >
                        {statusLabels[caravan.status]?.label ?? caravan.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => setEditingCaravan(caravan)}
                        className="inline-flex items-center rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-900 hover:bg-brand-100 transition-colors"
                      >
                        ✏️ Editar
                      </button>

                      {caravan.status !== "cancelled" && caravan.status !== "completed" && (
                        <form action={updateAction} className="inline-block">
                          <input type="hidden" name="caravanId" value={caravan.id} />
                          <input type="hidden" name="status" value="cancelled" />
                          <button
                            type="submit"
                            disabled={isUpdatePending}
                            className="inline-flex items-center rounded-lg border border-danger-200 bg-danger-50 px-3 py-1.5 text-xs font-bold text-danger-700 hover:bg-danger-100 transition-colors"
                            onClick={(e) => {
                              if (!confirm("Tem certeza que deseja cancelar esta caravana?")) {
                                e.preventDefault();
                              }
                            }}
                          >
                            Cancelar
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
