"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import {
  Building2,
  Plus,
  Search,
  X,
  Edit2,
  Users,
  Shield,
  Loader2,
  AlertCircle,
  Trash2,
  Power,
  PowerOff,
  CheckCircle2,
} from "lucide-react";
import type { WardWithStats } from "@/domain/types/ward";
import {
  createWardAction,
  updateWardAction,
  toggleWardStatusAction,
  deleteWardAction,
  type AdminActionState,
} from "../../actions";
import { useFeedbackModal } from "@/components/ui/feedback-modal";
import { formatDate } from "@/components/ui/format";

interface Props {
  initialWards: WardWithStats[];
  stakeName: string;
}

export function WardsManager({ initialWards, stakeName }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWard, setEditingWard] = useState<WardWithStats | null>(null);

  // Estados de formulário
  const [createName, setCreateName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const { feedbackModal, showConfirm, showError, showSuccess } = useFeedbackModal();

  const createInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const handleOpenCreate = () => {
    setCreateError(null);
    setCreateName("");
    setIsCreateOpen(true);
    setTimeout(() => createInputRef.current?.focus(), 50);
  };

  const handleOpenEdit = (ward: WardWithStats) => {
    setEditError(null);
    setEditingWard(ward);
    setEditName(ward.name);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  // Métricas
  const totalWards = initialWards.length;
  const activeWardsCount = useMemo(
    () => initialWards.filter((w) => w.is_active !== false).length,
    [initialWards]
  );
  const inactiveWardsCount = totalWards - activeWardsCount;
  const totalMembers = useMemo(
    () => initialWards.reduce((acc, w) => acc + (w.member_count ?? 0), 0),
    [initialWards]
  );
  const totalAdmins = useMemo(
    () => initialWards.reduce((acc, w) => acc + (w.admin_count ?? 0), 0),
    [initialWards]
  );

  // Filtragem combinada (busca + status)
  const filteredWards = useMemo(() => {
    return initialWards.filter((w) => {
      // Filtro de status
      if (statusFilter === "active" && w.is_active === false) return false;
      if (statusFilter === "inactive" && w.is_active !== false) return false;

      // Filtro de busca textual
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      return w.name.toLowerCase().includes(query);
    });
  }, [initialWards, searchQuery, statusFilter]);

  // Handler de Criação
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = createName.trim();
    if (trimmed.length < 2) {
      setCreateError("O nome da Ala deve ter no mínimo 2 caracteres.");
      return;
    }

    setCreateError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("name", trimmed);

      const res: AdminActionState = await createWardAction({ success: false }, formData);

      if (!res.success) {
        setCreateError(res.error || "Erro ao cadastrar Ala.");
      } else {
        setIsCreateOpen(false);
        setCreateName("");
        showSuccess({
          title: "Ala Cadastrada",
          message: res.message || `Ala "${trimmed}" cadastrada com sucesso!`,
        });
      }
    });
  };

  // Handler de Edição
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWard) return;

    const trimmed = editName.trim();
    if (trimmed.length < 2) {
      setEditError("O nome da Ala deve ter no mínimo 2 caracteres.");
      return;
    }

    setEditError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("wardId", editingWard.id);
      formData.append("name", trimmed);

      const res: AdminActionState = await updateWardAction({ success: false }, formData);

      if (!res.success) {
        setEditError(res.error || "Erro ao atualizar Ala.");
      } else {
        setEditingWard(null);
        showSuccess({
          title: "Ala Atualizada",
          message: res.message || `Ala "${trimmed}" atualizada com sucesso!`,
        });
      }
    });
  };

  // Handler de Inativação / Reativação
  const handleToggleStatus = (ward: WardWithStats) => {
    const isCurrentlyActive = ward.is_active !== false;

    if (isCurrentlyActive) {
      showConfirm({
        title: "Inativar Ala",
        message: (
          <span>
            Deseja inativar a <strong>{ward.name}</strong>?
            <br className="mb-2" />
            A unidade deixará de aparecer para novos membros durante o cadastro público.
            Os membros já cadastrados continuarão vinculados a ela normalmente.
          </span>
        ),
        confirmLabel: "Sim, Inativar Ala",
        confirmVariant: "warning",
        onConfirm: async () => {
          const res = await toggleWardStatusAction(ward.id, false);
          if (!res.success) {
            showError({
              title: "Erro ao inativar",
              message: res.error || "Não foi possível inativar a Ala.",
            });
          } else {
            showSuccess({
              title: "Ala Inativada",
              message: res.message || `A Ala ${ward.name} foi inativada.`,
            });
          }
        },
      });
    } else {
      showConfirm({
        title: "Reativar Ala",
        message: (
          <span>
            Deseja reativar a <strong>{ward.name}</strong>?
            <br className="mb-2" />
            Ela voltará a ficar disponível para seleção no formulário de novos cadastros de membros da Estaca.
          </span>
        ),
        confirmLabel: "Sim, Reativar Ala",
        confirmVariant: "primary",
        onConfirm: async () => {
          const res = await toggleWardStatusAction(ward.id, true);
          if (!res.success) {
            showError({
              title: "Erro ao reativar",
              message: res.error || "Não foi possível reativar a Ala.",
            });
          } else {
            showSuccess({
              title: "Ala Reativada",
              message: res.message || `A Ala ${ward.name} foi reativada com sucesso.`,
            });
          }
        },
      });
    }
  };

  // Handler de Exclusão
  const handleDelete = (ward: WardWithStats) => {
    const membersCount = ward.member_count ?? 0;
    const adminsCount = ward.admin_count ?? 0;

    if (membersCount > 0 || adminsCount > 0) {
      showError({
        title: "Não é Possível Excluir",
        message: (
          <span>
            A <strong>{ward.name}</strong> possui{" "}
            <strong>{membersCount} membro(s)</strong>{" "}
            {adminsCount > 0 && `e ${adminsCount} líder(es)`} vinculado(s).
            <br className="mb-2" />
            Para preservar a consistência das inscrições e do histórico, uma Ala com membros não pode ser excluída do banco.
            <br className="mb-2" />
            Caso deseje ocultá-la para novos cadastros, utilize a opção de <strong>Inativar</strong>.
          </span>
        ),
      });
      return;
    }

    showConfirm({
      title: "Excluir Ala Definitivamente",
      message: (
        <span>
          Tem certeza que deseja excluir a <strong>{ward.name}</strong>?
          <br className="mb-2" />
          <span className="font-semibold text-danger-700">
            Esta ação é permanente e não poderá ser desfeita.
          </span>
        </span>
      ),
      confirmLabel: "Sim, Excluir Ala",
      confirmVariant: "danger",
      onConfirm: async () => {
        const res = await deleteWardAction(ward.id);
        if (!res.success) {
          showError({
            title: "Erro ao excluir",
            message: res.error || "Não foi possível excluir a Ala.",
          });
        } else {
          showSuccess({
            title: "Ala Excluída",
            message: res.message || "Ala removida com sucesso.",
          });
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sgct-card flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-800">
            <Building2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#53575b]">
              Alas e Ramos
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#212225]">{totalWards}</span>
              <span className="text-xs text-[#707478]">
                ({activeWardsCount} ativas{inactiveWardsCount > 0 && `, ${inactiveWardsCount} inativas`})
              </span>
            </div>
          </div>
        </div>

        <div className="sgct-card flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <Shield className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#53575b]">
              Lideranças (Admins)
            </p>
            <p className="text-2xl font-bold text-[#212225]">{totalAdmins}</p>
          </div>
        </div>

        <div className="sgct-card flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Users className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#53575b]">
              Membros Totais
            </p>
            <p className="text-2xl font-bold text-[#212225]">{totalMembers}</p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Ações */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center max-w-2xl">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <Search
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#707478]"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Buscar Ala por nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sgct-input pl-10 pr-9 text-sm w-full"
              aria-label="Filtrar Alas por nome"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#707478] hover:text-[#212225]"
                aria-label="Limpar filtro de busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtro de Status (Todas / Ativas / Inativas) */}
          <div className="flex items-center rounded-xl border border-[#e0e2e2] bg-[#f8faf9] p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                statusFilter === "all"
                  ? "bg-white font-bold text-brand-900 shadow-xs"
                  : "text-[#53575b] hover:text-[#212225]"
              }`}
            >
              Todas ({totalWards})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                statusFilter === "active"
                  ? "bg-white font-bold text-brand-900 shadow-xs"
                  : "text-[#53575b] hover:text-[#212225]"
              }`}
            >
              Ativas ({activeWardsCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("inactive")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                statusFilter === "inactive"
                  ? "bg-white font-bold text-brand-900 shadow-xs"
                  : "text-[#53575b] hover:text-[#212225]"
              }`}
            >
              Inativas ({inactiveWardsCount})
            </button>
          </div>
        </div>

        {/* Botão Cadastrar Nova Ala */}
        <button
          type="button"
          onClick={handleOpenCreate}
          className="sgct-btn-primary flex items-center justify-center gap-2 whitespace-nowrap shadow-sm"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Cadastrar Nova Ala</span>
        </button>
      </div>

      {/* Tabela de Alas */}
      <div className="sgct-card overflow-hidden">
        {filteredWards.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <Building2 className="h-8 w-8" aria-hidden="true" />
            </div>
            {initialWards.length === 0 ? (
              <>
                <h3 className="mt-4 text-base font-bold text-[#212225]">
                  Nenhuma Ala cadastrada nesta Estaca
                </h3>
                <p className="mt-1 max-w-md text-sm text-[#53575b]">
                  Cadastre as Alas da {stakeName} para que membros possam se registrar e selecionar sua unidade de origem.
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="sgct-btn-primary mt-6 inline-flex items-center gap-2 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Cadastrar Primeira Ala</span>
                </button>
              </>
            ) : (
              <>
                <h3 className="mt-4 text-base font-bold text-[#212225]">
                  Nenhuma Ala encontrada
                </h3>
                <p className="mt-1 text-sm text-[#53575b]">
                  {searchQuery
                    ? `Nenhum resultado corresponde à busca "${searchQuery}".`
                    : "Nenhuma Ala corresponde ao filtro selecionado."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  className="sgct-btn-secondary mt-4 text-sm"
                >
                  Limpar filtros
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse" aria-label="Lista de Alas da Estaca">
              <thead>
                <tr className="border-b border-[#e0e2e2] bg-[#f8faf9] text-xs font-bold uppercase tracking-wider text-[#53575b]">
                  <th scope="col" className="px-6 py-3.5">
                    Nome da Ala
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Admins de Ala
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Membros Cadastrados
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Data de Cadastro
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2f2]">
                {filteredWards.map((ward) => {
                  const isActive = ward.is_active !== false;
                  return (
                    <tr
                      key={ward.id}
                      className={`hover:bg-brand-50/40 transition-colors ${
                        !isActive ? "bg-stone-50/60 opacity-80" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold ${
                              isActive
                                ? "bg-brand-100/70 text-brand-800"
                                : "bg-stone-200 text-stone-600"
                            }`}
                          >
                            <Building2 className="h-4 w-4" aria-hidden="true" />
                          </div>
                          <div>
                            <p className="font-bold text-[#212225] flex items-center gap-2">
                              <span>{ward.name}</span>
                              {!isActive && (
                                <span className="rounded-md bg-stone-200 px-1.5 py-0.5 text-[10px] font-semibold text-stone-700 uppercase">
                                  Inativa
                                </span>
                              )}
                            </p>
                            <span className="text-xs text-[#707478]">
                              ID: {ward.id.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Ativa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700 border border-stone-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
                            Inativa
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {ward.admin_count && ward.admin_count > 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 border border-blue-200">
                            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                            {ward.admin_count} {ward.admin_count === 1 ? "admin" : "admins"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 border border-amber-200">
                            Sem admin
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#3a3d40]">
                          <Users className="h-4 w-4 text-[#707478]" aria-hidden="true" />
                          {ward.member_count ?? 0} {ward.member_count === 1 ? "membro" : "membros"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-[#707478]">
                        {ward.created_at ? formatDate(ward.created_at) : "—"}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* Botão Editar */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(ward)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#e0e2e2] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#212225] hover:bg-brand-50 hover:border-brand-300 hover:text-brand-900 transition-colors shadow-2xs"
                            aria-label={`Editar Ala ${ward.name}`}
                            title="Editar nome da Ala"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-brand-700" aria-hidden="true" />
                            <span className="hidden sm:inline">Editar</span>
                          </button>

                          {/* Botão Inativar / Reativar */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(ward)}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors shadow-2xs ${
                              isActive
                                ? "border-amber-200 bg-white text-amber-800 hover:bg-amber-50 hover:border-amber-300"
                                : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50 hover:border-emerald-300"
                            }`}
                            aria-label={isActive ? `Inativar Ala ${ward.name}` : `Reativar Ala ${ward.name}`}
                            title={isActive ? "Inativar Ala" : "Reativar Ala"}
                          >
                            {isActive ? (
                              <>
                                <PowerOff className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
                                <span className="hidden sm:inline">Inativar</span>
                              </>
                            ) : (
                              <>
                                <Power className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                                <span className="hidden sm:inline">Reativar</span>
                              </>
                            )}
                          </button>

                          {/* Botão Excluir */}
                          <button
                            type="button"
                            onClick={() => handleDelete(ward)}
                            className="inline-flex items-center gap-1 rounded-lg border border-danger-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-danger-700 hover:bg-danger-50 hover:border-danger-300 transition-colors shadow-2xs"
                            aria-label={`Excluir Ala ${ward.name}`}
                            title="Excluir Ala definitivamente"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-danger-600" aria-hidden="true" />
                            <span className="hidden sm:inline">Excluir</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Cadastrar Nova Ala */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-ward-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[#e0e2e2] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f2f2]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-800">
                  <Building2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 id="create-ward-title" className="text-base font-bold text-[#212225]">
                    Cadastrar Nova Ala
                  </h3>
                  <p className="text-xs text-[#707478]">Estaca {stakeName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isPending && setIsCreateOpen(false)}
                disabled={isPending}
                className="rounded-lg p-1 text-[#707478] hover:bg-[#f0f2f2] hover:text-[#212225] transition-colors"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="createWardName" className="sgct-label">
                  Nome da Ala ou Ramo <span className="text-danger-600">*</span>
                </label>
                <input
                  ref={createInputRef}
                  id="createWardName"
                  type="text"
                  required
                  placeholder="ex: Ala Candelária ou Ramo Macaíba"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  disabled={isPending}
                  className="sgct-input mt-1.5 w-full text-sm"
                  maxLength={100}
                />
                <p className="mt-1 text-[11px] text-[#707478]">
                  O nome deve ser único dentro da sua Estaca.
                </p>
              </div>

              {createError && (
                <div role="alert" className="sgct-alert-danger flex items-center gap-2 text-xs py-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#f0f2f2]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isPending}
                  className="sgct-btn-secondary text-sm px-4 py-2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !createName.trim()}
                  className="sgct-btn-primary flex items-center gap-2 text-sm px-4 py-2"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{isPending ? "Cadastrando..." : "Cadastrar Ala"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Ala */}
      {editingWard && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-ward-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[#e0e2e2] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f2f2]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-800">
                  <Edit2 className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 id="edit-ward-title" className="text-base font-bold text-[#212225]">
                    Editar Nome da Ala
                  </h3>
                  <p className="text-xs text-[#707478]">Estaca {stakeName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isPending && setEditingWard(null)}
                disabled={isPending}
                className="rounded-lg p-1 text-[#707478] hover:bg-[#f0f2f2] hover:text-[#212225] transition-colors"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="editWardName" className="sgct-label">
                  Nome da Ala ou Ramo <span className="text-danger-600">*</span>
                </label>
                <input
                  ref={editInputRef}
                  id="editWardName"
                  type="text"
                  required
                  placeholder="ex: Ala Candelária"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={isPending}
                  className="sgct-input mt-1.5 w-full text-sm"
                  maxLength={100}
                />
                <p className="mt-1 text-[11px] text-[#707478]">
                  Ao atualizar o nome, todos os membros e relatórios vinculados a esta Ala refletirão a alteração.
                </p>
              </div>

              {editError && (
                <div role="alert" className="sgct-alert-danger flex items-center gap-2 text-xs py-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#f0f2f2]">
                <button
                  type="button"
                  onClick={() => setEditingWard(null)}
                  disabled={isPending}
                  className="sgct-btn-secondary text-sm px-4 py-2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !editName.trim() || editName.trim() === editingWard.name}
                  className="sgct-btn-primary flex items-center gap-2 text-sm px-4 py-2"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{isPending ? "Salvando..." : "Salvar Alterações"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de feedback global (sucesso/erro/confirmação) */}
      {feedbackModal}
    </div>
  );
}
