"use client";

import { useState, useActionState } from "react";
import type { Caravan } from "@/domain/types/caravan";
import {
  createCaravanAction,
  updateCaravanStatusAction,
  type AdminActionState,
} from "../../actions";
import { formatCurrency, formatDate } from "@/components/ui/format";

interface Props {
  stakeSlug: string;
  initialCaravans: Caravan[];
}

const initialState: AdminActionState = {
  success: false,
};

interface BoardingPointDraft {
  name: string;
  boardingTime: string;
}

export function CalendarioAdminClient({ stakeSlug: _stakeSlug, initialCaravans }: Props) {
  const [createState, createAction, isCreatePending] = useActionState(
    createCaravanAction,
    initialState
  );

  const [updateState, updateAction, isUpdatePending] = useActionState(
    updateCaravanStatusAction,
    initialState
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

  return (
    <div className="space-y-8">
      {/* Mensagens de feedback */}
      {createState?.error && (
        <div role="alert" className="sgct-alert-danger">
          {createState.error}
        </div>
      )}
      {createState?.success && createState?.message && (
        <div role="status" className="sgct-alert-success">
          {createState.message}
        </div>
      )}
      {updateState?.error && (
        <div role="alert" className="sgct-alert-danger">
          {updateState.error}
        </div>
      )}
      {updateState?.success && updateState?.message && (
        <div role="status" className="sgct-alert-success">
          {updateState.message}
        </div>
      )}

      {/* Formulário de Criação de Caravana */}
      <section className="sgct-card p-5 sm:p-7">
        <h2 className="text-xl font-bold text-[#212225]">
          Cadastrar nova caravana
        </h2>
        <p className="mb-7 mt-2 text-base text-[#53575b]">
          Preencha as datas, limites e pontos de embarque para abrir as inscrições.
        </p>

        <form action={createAction} className="space-y-6">
          {/* Datas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          {/* Preços */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="sgct-label">
                Valor Categoria Padrão (Adulto / Jovem) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-base text-[#53575b]">
                  R$
                </span>
                <input
                  type="number"
                  name="priceStandard"
                  required
                  step="0.01"
                  min="0"
                  defaultValue="130.00"
                  className="sgct-input pl-10"
                />
              </div>
            </div>
            <div>
              <label className="sgct-label">
                Valor Oficiante do Templo *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-base text-[#53575b]">
                  R$
                </span>
                <input
                  type="number"
                  name="priceOfficiant"
                  required
                  step="0.01"
                  min="0"
                  defaultValue="117.00"
                  className="sgct-input pl-10"
                />
              </div>
            </div>
          </div>

          {/* Vagas e Prazos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="sgct-label">
                Limite de Assentos
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
                    className="sgct-input sm:w-[13rem]"
                  />
                  {boardingPoints.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBoardingPoint(index)}
                      className="inline-flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-semibold text-danger-700 hover:bg-danger-50"
                    >
                      Remover
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Campo oculto com a lista serializada em JSON */}
            <input
              type="hidden"
              name="boardingPointsJson"
              value={JSON.stringify(boardingPoints)}
            />
          </div>

          <button
            type="submit"
            disabled={isCreatePending}
            className="sgct-button-primary w-full sm:w-auto"
          >
            {isCreatePending ? "Cadastrando caravana..." : "Cadastrar Caravana"}
          </button>
        </form>
      </section>

      {/* Listagem de Caravanas Existentes */}
      <section className="sgct-card p-5 sm:p-7">
        <h2 className="mb-5 text-xl font-bold text-[#212225]">
          Caravanas cadastradas
        </h2>

        {initialCaravans.length === 0 ? (
          <p className="py-8 text-center text-base text-[#53575b]">
            Nenhuma caravana cadastrada ainda.
          </p>
        ) : (
          <>
          <div className="space-y-3 md:hidden">
            {initialCaravans.map((caravan) => (
              <article key={caravan.id} className="rounded-xl border border-[#d0d3d3] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-[#212225]">{formatDate(caravan.departure_date)}</h3>
                    <p className="mt-1 text-sm text-[#53575b]">Retorno: {caravan.return_date ? formatDate(caravan.return_date) : "mesmo dia"}</p>
                  </div>
                  <span className={`sgct-chip ${statusLabels[caravan.status]?.color}`}>{statusLabels[caravan.status]?.label}</span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-[#53575b]">Contribuição</dt><dd className="font-semibold text-[#212225]">{formatCurrency(caravan.price_standard)}</dd></div>
                  <div><dt className="text-[#53575b]">Capacidade</dt><dd className="font-semibold text-[#212225]">{caravan.seat_limit} assentos</dd></div>
                  <div><dt className="text-[#53575b]">Inscrições até</dt><dd className="font-semibold text-[#212225]">{formatDate(caravan.registration_deadline)}</dd></div>
                  <div><dt className="text-[#53575b]">Fila de espera</dt><dd className="font-semibold text-[#212225]">{caravan.waitlist_limit} vagas</dd></div>
                </dl>
                {caravan.status !== "cancelled" && caravan.status !== "completed" && (
                  <form action={updateAction} className="mt-4 border-t border-[#e0e2e2] pt-3">
                    <input type="hidden" name="caravanId" value={caravan.id} />
                    <input type="hidden" name="status" value="cancelled" />
                    <button type="submit" disabled={isUpdatePending} className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-danger-700 hover:bg-danger-50" onClick={(e) => { if (!confirm("Tem certeza que deseja cancelar esta caravana?")) e.preventDefault(); }}>Cancelar caravana</button>
                  </form>
                )}
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Saída / Retorno</th>
                  <th className="py-3 px-4">Preços (Padrão / Oficiante)</th>
                  <th className="py-3 px-4">Capacidade</th>
                  <th className="py-3 px-4">Prazos</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {initialCaravans.map((caravan) => (
                  <tr key={caravan.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">
                        {formatDate(caravan.departure_date)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Retorno: {caravan.return_date ? formatDate(caravan.return_date) : "mesmo dia"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>{formatCurrency(caravan.price_standard)}</div>
                      <div className="text-xs text-gray-500">
                        Oficiante: {formatCurrency(caravan.price_officiant)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>{caravan.seat_limit} assentos</div>
                      <div className="text-xs text-gray-500">
                        Espera: {caravan.waitlist_limit}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs">
                        Inscrição até: {formatDate(caravan.registration_deadline)}
                      </div>
                      <div className="text-xs text-gray-500">
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
                      {caravan.status !== "cancelled" && caravan.status !== "completed" && (
                        <form action={updateAction} className="inline-block">
                          <input type="hidden" name="caravanId" value={caravan.id} />
                          <input type="hidden" name="status" value="cancelled" />
                          <button
                            type="submit"
                            disabled={isUpdatePending}
                            className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-danger-700 hover:bg-danger-50"
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
          </>
        )}
      </section>
    </div>
  );
}
