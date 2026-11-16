"use client";

import { useState, useActionState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Caravan } from "@/domain/types/caravan";
import {
  createCaravanAction,
  updateCaravanStatusAction,
  editCaravanAction,
  type AdminActionState,
} from "../../actions";
import { formatCurrency, formatDate } from "@/components/ui/format";
import { Ban, CalendarClock, Pencil, UsersRound, WalletCards, X } from "lucide-react";
import { useFeedbackModal } from "@/components/ui/feedback-modal";
import { CaravanPricingFields } from "@/components/caravan/caravan-pricing-fields";

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

const emptySubscribe = () => () => {};

export function CalendarioAdminClient({
  stakeSlug: _stakeSlug,
  initialCaravans,
}: Props) {
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

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

  // Hook de Modal de Feedback (Confirmações, Alertas e Erros)
  const { feedbackModal, showConfirm } = useFeedbackModal();

  // Fechar modal de edição após sucesso na Server Action
  const [prevEditState, setPrevEditState] = useState(editState);
  if (editState !== prevEditState) {
    setPrevEditState(editState);
    if (editState?.success) {
      setEditingCaravan(null);
    }
  }

  const handleCancelCaravan = (caravan: Caravan) => {
    showConfirm({
      title: "Cancelar Caravana",
      message: (
        <span>
          Tem certeza que deseja cancelar a caravana com saída em{" "}
          <strong className="text-[#212225]">{formatDate(caravan.departure_date)}</strong>?
          <br className="mb-2" />
          Esta ação encerrará as inscrições e marcará a viagem como cancelada.
        </span>
      ),
      confirmLabel: "Sim, Cancelar Caravana",
      cancelLabel: "Voltar",
      confirmVariant: "danger",
      onConfirm: async () => {
        const formData = new FormData();
        formData.append("caravanId", caravan.id);
        formData.append("status", "cancelled");
        await updateAction(formData);
      },
    });
  };

  // Fechar modal com tecla Escape e travar scroll do body
  useEffect(() => {
    if (editingCaravan) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && editingCaravan) {
        setEditingCaravan(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [editingCaravan]);

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
    registered: { label: "Cadastrada", color: "border-brand-200 bg-brand-50 text-brand-800" },
    draft: { label: "Cadastrada", color: "border-brand-200 bg-brand-50 text-brand-800" },
    open: { label: "Inscrições abertas", color: "border-success-200 bg-success-50 text-success-700" },
    quorum_pending: { label: "Aguardando quórum", color: "border-warning-200 bg-warning-50 text-warning-700" },
    confirmed: { label: "Confirmada", color: "border-brand-200 bg-brand-50 text-brand-700" },
    cancelled: { label: "Cancelada", color: "border-danger-200 bg-danger-50 text-danger-700" },
    completed: { label: "Realizada", color: "border-[#d0d3d3] bg-[#eff0f0] text-[#3a3d40]" },
  };

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

      {/* MODAL DE EDIÇÃO DE CARAVANA */}
      {editingCaravan && isMounted && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-edit-caravan-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingCaravan(null);
            }
          }}
        >
          <div className="relative w-full max-w-4xl rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-[#e0e2e2] my-auto max-h-[92vh] overflow-y-auto overflow-x-hidden">
            {/* Header do Modal */}
            <div className="flex items-start justify-between border-b border-[#e0e2e2] pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-200">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-800">
                    Edição de Viagem
                  </span>
                  <h3 id="modal-edit-caravan-title" className="text-xl font-bold text-[#212225]">
                    Editar {editingCaravan.title || `Caravana de ${formatDate(editingCaravan.departure_date)}`}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCaravan(null)}
                aria-label="Fechar modal de edição"
                className="rounded-lg p-2 text-[#707478] hover:bg-[#eff0f0] hover:text-[#212225] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mensagem de Erro, se houver */}
            {editState?.error && (
              <div className="mb-6 rounded-xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
                <p className="font-semibold">Erro ao salvar caravana:</p>
                <p>{editState.error}</p>
              </div>
            )}

            <form action={editAction} className="space-y-4 [&_.sgct-input]:min-h-11 [&_.sgct-input]:py-2 [&_.sgct-input]:text-sm [&_.sgct-select]:min-h-11 [&_.sgct-select]:w-full [&_.sgct-select]:text-sm [&_.sgct-label]:mb-1 [&_.sgct-label]:text-xs">
              <input type="hidden" name="caravanId" value={editingCaravan.id} />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 [&>div]:min-w-0">
                <div className="sm:col-span-2 lg:col-span-4">
                  <label className="sgct-label">Título da Caravana</label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={editingCaravan.title || ""}
                    placeholder="Ex: Caravana de Jovens (opcional)"
                    maxLength={100}
                    className="sgct-input"
                  />
                  <p className="mt-1 text-xs text-[#707478]">
                    Opcional. Se não for preenchido, a viagem será identificada como &ldquo;Caravana de {formatDate(editingCaravan.departure_date)}&rdquo;.
                  </p>
                </div>

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

                <CaravanPricingFields
                  key={editingCaravan.id}
                  defaultOvernight={editingCaravan.overnight ?? true}
                  defaultTicket={editingCaravan.price_ticket}
                  defaultLodging={editingCaravan.price_lodging}
                />

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
                    <option value="registered">Cadastrada</option>
                    <option value="open">Inscrições abertas</option>
                    <option value="quorum_pending">Aguardando quórum</option>
                    <option value="confirmed">Confirmada</option>
                    <option value="completed">Realizada</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-[#e0e2e2]">
                <button
                  type="button"
                  onClick={() => setEditingCaravan(null)}
                  className="sgct-button-secondary w-full sm:w-auto"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isEditPending}
                  className="sgct-button-primary w-full sm:w-auto"
                >
                  {isEditPending ? "Salvando alterações..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
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
          <input
            type="hidden"
            name="boardingPointsJson"
            value={JSON.stringify(boardingPoints)}
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="sgct-label">
                Título da Caravana
              </label>
              <input
                type="text"
                name="title"
                placeholder="Ex: Caravana de Jovens (opcional)"
                maxLength={100}
                className="sgct-input"
              />
              <p className="mt-1 text-xs text-[#707478]">
                Opcional. Se não for informado, a viagem será identificada como &ldquo;Caravana de [data]&rdquo;.
              </p>
            </div>

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
            <CaravanPricingFields />

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
            className="sgct-button-primary w-full sm:w-auto"
          >
            {isCreatePending ? "Cadastrando caravana..." : "Cadastrar Caravana"}
          </button>
        </form>
      </section>

      {/* Listagem de Caravanas Existentes com Botão de Edição */}
      <section className="sgct-card overflow-hidden">
        <div className="border-b border-[#e0e2e2] px-6 py-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#212225]">
              Caravanas Cadastradas
            </h2>
            <p className="text-sm text-[#53575b]">
              Histórico e programação de viagens ao Templo da Estaca.
            </p>
          </div>
          <span className="text-sm font-bold text-brand-900 bg-brand-50 px-3.5 py-1.5 rounded-full border border-brand-200">
            {initialCaravans.length} cadastrada(s)
          </span>
        </div>

        {initialCaravans.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 mb-3">
              <CalendarClock className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-[#212225]">Nenhuma caravana cadastrada</h3>
            <p className="mt-1 text-sm text-[#53575b]">
              Cadastre a primeira caravana no formulário acima para abrir inscrições.
            </p>
          </div>
        ) : (
          <>
          {/* Visualização Mobile (Cards) */}
          <div className="divide-y divide-[#e0e2e2] md:hidden">
            {initialCaravans.map((caravan) => (
              <article key={caravan.id} className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 border border-brand-100 text-brand-800">
                      <CalendarClock className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-brand-800">
                        {caravan.title ? "Viagem" : "Saída"}
                      </p>
                      <h3 className="text-lg font-bold text-[#212225]">{caravan.title || formatDate(caravan.departure_date)}</h3>
                      <p className="text-xs text-[#53575b]">Saída: {formatDate(caravan.departure_date)} · Retorno: {caravan.return_date ? formatDate(caravan.return_date) : "mesmo dia"}</p>
                    </div>
                  </div>
                  <span className={`sgct-chip shrink-0 ${statusLabels[caravan.status]?.color ?? "border-[#d0d3d3] bg-[#eff0f0] text-[#3a3d40]"}`}>
                    {statusLabels[caravan.status]?.label ?? caravan.status}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-3 rounded-xl bg-[#f7f8f8] p-3.5 text-xs">
                  <div>
                    <dt className="flex items-center gap-1.5 text-[#53575b] font-medium">
                      <WalletCards className="h-3.5 w-3.5 text-[#707478]" aria-hidden="true" /> Preços
                    </dt>
                    <dd className="mt-1 font-bold text-brand-900">{formatCurrency(caravan.price_standard)}</dd>
                    <dd className="text-[#53575b]">Oficiante: {formatCurrency(caravan.price_officiant)}</dd>
                <dd className="text-xs text-[#707478]">{caravan.overnight ? "Com pernoite" : "Sem pernoite"}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-[#53575b] font-medium">
                      <UsersRound className="h-3.5 w-3.5 text-[#707478]" aria-hidden="true" /> Capacidade
                    </dt>
                    <dd className="mt-1 font-bold text-[#212225]">{caravan.seat_limit} assentos</dd>
                    <dd className="text-[#53575b]">Espera: {caravan.waitlist_limit} vagas</dd>
                  </div>
                  <div className="col-span-2 pt-2.5 border-t border-[#e0e2e2]">
                    <dt className="flex items-center gap-1.5 text-[#53575b] font-medium">
                      <CalendarClock className="h-3.5 w-3.5 text-[#707478]" aria-hidden="true" /> Prazos
                    </dt>
                    <dd className="mt-1 text-[#212225]">
                      Inscrições até: <span className="font-semibold">{formatDate(caravan.registration_deadline)}</span>
                    </dd>
                    <dd className="text-[#53575b] mt-0.5">
                      Verificação de quórum: <span className="font-medium">{formatDate(caravan.quorum_check_date)}</span>
                    </dd>
                  </div>
                </dl>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingCaravan(caravan)}
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-900 hover:bg-brand-100 transition-colors shadow-2xs"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Editar
                  </button>
                  {caravan.status !== "cancelled" && caravan.status !== "completed" ? (
                    <button
                      type="button"
                      disabled={isUpdatePending}
                      onClick={() => handleCancelCaravan(caravan)}
                      className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-danger-200 bg-danger-50 px-3 py-2 text-xs font-bold text-danger-700 hover:bg-danger-100 transition-colors shadow-2xs disabled:opacity-50"
                    >
                      <Ban className="h-4 w-4" aria-hidden="true" />
                      Cancelar
                    </button>
                  ) : <div />}
                </div>
              </article>
            ))}
          </div>

          {/* Visualização Desktop (Tabela) */}
          <div className="max-md:hidden overflow-x-auto">
            <table className="w-full divide-y divide-[#e0e2e2] text-xs sm:text-sm">
              <thead className="bg-[#f7f8f8] text-[#3a3d40] text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-3.5 py-3 text-left whitespace-nowrap">Caravana / Saída</th>
                  <th className="px-3 py-3 text-left whitespace-nowrap">Valores</th>
                  <th className="px-3 py-3 text-left whitespace-nowrap">Capacidade</th>
                  <th className="px-3 py-3 text-left whitespace-nowrap">Prazos</th>
                  <th className="px-3 py-3 text-left whitespace-nowrap">Status</th>
                  <th className="px-3.5 py-3 text-right whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e2e2] bg-white">
                {initialCaravans.map((caravan) => (
                  <tr key={caravan.id} className="hover:bg-brand-50/40 transition-colors">
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 border border-brand-100 text-brand-800">
                          <CalendarClock className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 max-w-[200px] lg:max-w-[260px]">
                          <div className="font-bold text-[#212225] text-sm truncate" title={caravan.title || formatDate(caravan.departure_date)}>
                            {caravan.title || formatDate(caravan.departure_date)}
                          </div>
                          <div className="text-xs text-[#53575b] mt-0.5 whitespace-nowrap">
                            Saída: {formatDate(caravan.departure_date)} · Retorno: {caravan.return_date ? formatDate(caravan.return_date) : "mesmo dia"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="font-bold text-brand-900 text-sm">
                        {formatCurrency(caravan.price_standard)}
                      </div>
                      <div className="text-xs text-[#53575b] mt-0.5 flex items-center gap-1">
                        <span>Oficiante:</span>
                        <span className="font-semibold text-[#3a3d40]">{formatCurrency(caravan.price_officiant)}</span>
                      </div>
                      <div className="text-xs text-[#707478] mt-0.5">{caravan.overnight ? "Com pernoite" : "Sem pernoite"}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-semibold text-[#212225]">
                        <UsersRound className="h-3.5 w-3.5 text-[#707478]" aria-hidden="true" />
                        <span>{caravan.seat_limit} assentos</span>
                      </div>
                      <div className="text-xs text-[#53575b] mt-0.5">
                        Espera: <span className="font-medium">{caravan.waitlist_limit} vagas</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-xs text-[#212225]">
                        <span className="text-[#707478]">Inscrição:</span>{" "}
                        <span className="font-medium">{formatDate(caravan.registration_deadline)}</span>
                      </div>
                      <div className="text-xs text-[#53575b] mt-0.5">
                        <span className="text-[#707478]">Quórum:</span>{" "}
                        <span className="font-medium">{formatDate(caravan.quorum_check_date)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span
                        className={`sgct-chip whitespace-nowrap shrink-0 text-xs py-0.5 px-2.5 ${
                          statusLabels[caravan.status]?.color ?? "border-[#d0d3d3] bg-[#eff0f0] text-[#3a3d40]"
                        }`}
                      >
                        {statusLabels[caravan.status]?.label ?? caravan.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setEditingCaravan(caravan)}
                          className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-900 hover:bg-brand-100 transition-colors shadow-2xs"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Editar</span>
                        </button>

                        {caravan.status !== "cancelled" && caravan.status !== "completed" && (
                          <button
                            type="button"
                            disabled={isUpdatePending}
                            onClick={() => handleCancelCaravan(caravan)}
                            className="inline-flex items-center gap-1 rounded-lg border border-danger-200 bg-danger-50 px-2.5 py-1 text-xs font-bold text-danger-700 hover:bg-danger-100 transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
                          >
                            <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Cancelar</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>

      {/* Modal de confirmação e alertas de ação */}
      {feedbackModal}
    </div>
  );
}
