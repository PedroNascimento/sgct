"use client";

import { useState, useActionState } from "react";
import type { Caravan } from "@/domain/types/caravan";
import {
  createCaravanAction,
  updateCaravanStatusAction,
  type AdminActionState,
} from "../../actions";

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
    open: { label: "Inscrições Abertas", color: "bg-green-100 text-green-800" },
    quorum_pending: { label: "Aguardando Quórum", color: "bg-amber-100 text-amber-800" },
    confirmed: { label: "Confirmada", color: "bg-blue-100 text-blue-800" },
    cancelled: { label: "Cancelada", color: "bg-red-100 text-red-800" },
    completed: { label: "Realizada", color: "bg-gray-100 text-gray-800" },
  };

  return (
    <div className="space-y-8">
      {/* Mensagens de feedback */}
      {createState?.error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {createState.error}
        </div>
      )}
      {createState?.success && createState?.message && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
          {createState.message}
        </div>
      )}
      {updateState?.error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {updateState.error}
        </div>
      )}
      {updateState?.success && updateState?.message && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
          {updateState.message}
        </div>
      )}

      {/* Formulário de Criação de Caravana */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          Cadastrar Nova Caravana ao Templo
        </h2>
        <p className="text-xs text-gray-500 mb-6">
          Preencha as datas, limites e pontos de embarque para abrir as inscrições.
        </p>

        <form action={createAction} className="space-y-6">
          {/* Datas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Data de Saída / Embarque *
              </label>
              <input
                type="date"
                name="departureDate"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Data de Retorno
              </label>
              <input
                type="date"
                name="returnDate"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Preços */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Valor Categoria Padrão (Adulto / Jovem) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-sm">
                  R$
                </span>
                <input
                  type="number"
                  name="priceStandard"
                  required
                  step="0.01"
                  min="0"
                  defaultValue="130.00"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Valor Oficiante do Templo *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-sm">
                  R$
                </span>
                <input
                  type="number"
                  name="priceOfficiant"
                  required
                  step="0.01"
                  min="0"
                  defaultValue="117.00"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Vagas e Prazos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Limite de Assentos
              </label>
              <input
                type="number"
                name="seatLimit"
                defaultValue={50}
                min={1}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Vagas na Fila de Espera
              </label>
              <input
                type="number"
                name="waitlistLimit"
                defaultValue={5}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Prazo Inscrição (Domingo) *
              </label>
              <input
                type="date"
                name="registrationDeadline"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Verificação Quórum (Terça) *
              </label>
              <input
                type="date"
                name="quorumCheckDate"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Pontos de Embarque Dinâmicos */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Pontos de Embarque
              </label>
              <button
                type="button"
                onClick={addBoardingPoint}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                + Adicionar Ponto
              </button>
            </div>

            <div className="space-y-3">
              {boardingPoints.map((bp, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Nome do local (ex: Capela Tirol)"
                    value={bp.name}
                    onChange={(e) => updateBoardingPoint(index, "name", e.target.value)}
                    required
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <input
                    type="datetime-local"
                    value={bp.boardingTime}
                    onChange={(e) =>
                      updateBoardingPoint(index, "boardingTime", e.target.value)
                    }
                    required
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  {boardingPoints.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBoardingPoint(index)}
                      className="px-2 py-1 text-red-600 hover:text-red-800 text-sm"
                    >
                      ✕
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
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md shadow-sm transition disabled:opacity-50"
          >
            {isCreatePending ? "Cadastrando caravana..." : "Cadastrar Caravana"}
          </button>
        </form>
      </div>

      {/* Listagem de Caravanas Existentes */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Caravanas Cadastradas na Estaca
        </h2>

        {initialCaravans.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            Nenhuma caravana cadastrada ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
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
                        {caravan.departure_date}
                      </div>
                      <div className="text-xs text-gray-500">
                        Retorno: {caravan.return_date ?? "Mesmo dia"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>R$ {caravan.price_standard.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">
                        Ofic: R$ {caravan.price_officiant.toFixed(2)}
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
                        Inscrição até: {caravan.registration_deadline}
                      </div>
                      <div className="text-xs text-gray-500">
                        Quórum: {caravan.quorum_check_date}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusLabels[caravan.status]?.color ?? "bg-gray-100 text-gray-800"
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
                            className="text-xs text-red-600 hover:text-red-800 font-semibold"
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
      </div>
    </div>
  );
}
