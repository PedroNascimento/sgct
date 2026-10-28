"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Search,
  X,
  ExternalLink,
  Power,
  PowerOff,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toggleStakeStatusAction } from "../actions";
import { useFeedbackModal } from "@/components/ui/feedback-modal";
import { ListPagination } from "@/components/ui/list-pagination";

interface StakeItem {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

export function StakeList({ stakes }: { stakes: StakeItem[] }) {
  const [isPending, startTransition] = useTransition();
  const [pendingStakeId, setPendingStakeId] = useState<string | null>(null);
  const { feedbackModal, showConfirm, showError, showSuccess } = useFeedbackModal();

  // Estados de Filtros e Busca
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Contagens
  const totalCount = stakes.length;
  const activeCount = useMemo(
    () => stakes.filter((s) => s.is_active).length,
    [stakes]
  );
  const inactiveCount = useMemo(
    () => stakes.filter((s) => !s.is_active).length,
    [stakes]
  );

  // Filtragem reativa
  const filteredStakes = useMemo(() => {
    return stakes.filter((stake) => {
      // 1. Filtro por status
      if (statusFilter === "active" && !stake.is_active) return false;
      if (statusFilter === "inactive" && stake.is_active) return false;

      // 2. Filtro por busca de texto (nome ou slug)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = stake.name.toLowerCase().includes(query);
        const matchesSlug = stake.slug.toLowerCase().includes(query);
        if (!matchesName && !matchesSlug) return false;
      }

      return true;
    });
  }, [stakes, statusFilter, searchQuery]);

  // Total de páginas e corte da paginação
  const totalPages = Math.max(1, Math.ceil(filteredStakes.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedStakes = filteredStakes.slice(startIndex, startIndex + pageSize);

  const handleToggle = (stake: StakeItem) => {
    const isCurrentlyActive = stake.is_active;
    const actionText = isCurrentlyActive ? "desativar" : "ativar";

    showConfirm({
      title: isCurrentlyActive ? "Desativar Estaca" : "Ativar Estaca",
      message: (
        <span>
          Deseja realmente {actionText} a Estaca{" "}
          <strong className="text-[#212225]">{stake.name}</strong>?
          {isCurrentlyActive && (
            <span className="block mt-2 text-xs text-[#53575b]">
              Membros e administradores vinculados a essa Estaca não conseguirão acessar as páginas operacionais enquanto ela permanecer inativa.
            </span>
          )}
        </span>
      ),
      confirmLabel: isCurrentlyActive ? "Sim, Desativar" : "Sim, Ativar",
      confirmVariant: isCurrentlyActive ? "warning" : "primary",
      onConfirm: async () => {
        setPendingStakeId(stake.id);
        startTransition(async () => {
          try {
            const res = await toggleStakeStatusAction(stake.id, !isCurrentlyActive);
            if (res && !res.success) {
              showError({
                title: "Erro ao alterar status",
                message: res.error || "Não foi possível alterar o status da Estaca.",
              });
            } else {
              showSuccess({
                title: "Status Atualizado",
                message: `A Estaca ${stake.name} foi ${isCurrentlyActive ? "desativada" : "ativada"} com sucesso.`,
              });
            }
          } catch (err: unknown) {
            showError({
              title: "Erro inesperado",
              message: err instanceof Error ? err.message : "Ocorreu uma falha na comunicação.",
            });
          } finally {
            setPendingStakeId(null);
          }
        });
      },
    });
  };

  return (
    <>
      {feedbackModal}

      <section className="sgct-card platform-collection overflow-hidden w-full max-w-full min-w-0">
        {/* Header do Card */}
        <div className="border-b border-[#e0e2e2] p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#212225] flex items-center gap-2">
                <span>Estacas Cadastradas</span>
                <span className="inline-flex items-center justify-center rounded-full bg-brand-100 text-brand-800 text-xs font-bold px-2.5 py-0.5">
                  {filteredStakes.length}
                  {filteredStakes.length !== totalCount ? ` de ${totalCount}` : ""}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-[#53575b] mt-1">
                Visualize, pesquise e gerencie as instâncias regionais ativas e inativas na plataforma.
              </p>
            </div>
          </div>

          {/* Barra de Filtros e Pesquisa */}
          <div className="platform-list-toolbar mt-5 border-t border-[#f0f2f2] pt-4">
            {/* Campo de Busca Reativo */}
            <div className="platform-list-search relative w-full min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7b8084] pointer-events-none" />
              <input
                type="search"
                aria-label="Buscar Estacas"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Filtrar por nome ou slug..."
                className="sgct-input pl-10 pr-9 py-2 text-sm w-full bg-[#fcfdfd]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b8084] hover:text-[#212225] p-1 rounded-full hover:bg-[#e0e2e2]/60 transition-colors"
                  title="Limpar pesquisa"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filtros de Status (Todas, Ativas, Inativas) */}
            <div className="platform-filters" role="group" aria-label="Filtros da lista">
              <button
                type="button"
                aria-pressed={statusFilter === "all"}
                onClick={() => {
                  setStatusFilter("all");
                  setCurrentPage(1);
                }}
                className={`flex items-center justify-center gap-1 min-[400px]:gap-1.5 px-1 min-[400px]:px-2.5 sm:px-3 min-h-[48px] sm:min-h-0 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === "all"
                    ? "bg-white text-brand-900 shadow-sm"
                    : "text-[#53575b] hover:text-[#212225] hover:bg-white/60"
                }`}
              >
                <Building2 className="hidden min-[400px]:block h-3.5 w-3.5 shrink-0" />
                <span>Todas</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    statusFilter === "all"
                      ? "bg-brand-50 text-brand-700"
                      : "bg-[#e5e7e8] text-[#53575b]"
                  }`}
                >
                  {totalCount}
                </span>
              </button>

              <button
                type="button"
                aria-pressed={statusFilter === "active"}
                onClick={() => {
                  setStatusFilter("active");
                  setCurrentPage(1);
                }}
                className={`flex items-center justify-center gap-1 min-[400px]:gap-1.5 px-1 min-[400px]:px-2.5 sm:px-3 min-h-[48px] sm:min-h-0 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === "active"
                    ? "bg-white text-brand-900 shadow-sm"
                    : "text-[#53575b] hover:text-[#212225] hover:bg-white/60"
                }`}
              >
                <CheckCircle2 className="hidden min-[400px]:block h-3.5 w-3.5 text-success-600 shrink-0" />
                <span>Ativas</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    statusFilter === "active"
                      ? "bg-success-100 text-success-800"
                      : "bg-[#e5e7e8] text-[#53575b]"
                  }`}
                >
                  {activeCount}
                </span>
              </button>

              <button
                type="button"
                aria-pressed={statusFilter === "inactive"}
                onClick={() => {
                  setStatusFilter("inactive");
                  setCurrentPage(1);
                }}
                className={`flex items-center justify-center gap-1 min-[400px]:gap-1.5 px-1 min-[400px]:px-2.5 sm:px-3 min-h-[48px] sm:min-h-0 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === "inactive"
                    ? "bg-white text-brand-900 shadow-sm"
                    : "text-[#53575b] hover:text-[#212225] hover:bg-white/60"
                }`}
              >
                <AlertCircle className="hidden min-[400px]:block h-3.5 w-3.5 text-danger-600 shrink-0" />
                <span>Inativas</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    statusFilter === "inactive"
                      ? "bg-danger-100 text-danger-800"
                      : "bg-[#e5e7e8] text-[#53575b]"
                  }`}
                >
                  {inactiveCount}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Conteúdo da Lista */}
        {stakes.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-base text-[#53575b]">
            Nenhuma Estaca cadastrada ainda. Utilize o formulário para cadastrar a primeira.
          </div>
        ) : filteredStakes.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <p className="text-base font-semibold text-[#212225]">
              Nenhuma estaca encontrada com os filtros aplicados
            </p>
            <p className="text-sm text-[#53575b] mt-1">
              Tente pesquisar por outro termo ou selecione outro filtro de status.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              className="mt-4 sgct-button-secondary text-xs"
            >
              Limpar busca e filtros
            </button>
          </div>
        ) : (
          <>
            {/* VISUALIZAÇÃO MOBILE (Cards confortáveis com alvo touch de 48px e zero overflow horizontal) */}
            <div className="platform-list-cards divide-y divide-[#e0e2e2] bg-white">
              {paginatedStakes.map((stake) => {
                const isItemPending = isPending && pendingStakeId === stake.id;
                return (
                  <div
                    key={stake.id}
                    className="p-4 space-y-3 hover:bg-brand-50/20 transition-colors"
                  >
                    <div className="platform-record-header">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#212225] text-base leading-snug break-words">
                          {stake.name}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs text-[#53575b] bg-[#f4f5f5] px-2 py-0.5 rounded border border-[#e0e2e2] break-all">
                            /{stake.slug}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 ${
                          stake.is_active
                            ? "border-success-200 bg-success-50 text-success-700"
                            : "border-danger-200 bg-danger-50 text-danger-700"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            stake.is_active ? "bg-success-600" : "bg-danger-600"
                          }`}
                        />
                        {stake.is_active ? "Ativa" : "Inativa"}
                      </span>
                    </div>

                    <div className="platform-actions platform-actions--compact pt-3 border-t border-[#f0f2f2]">
                      <a
                        href={`/${stake.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 min-h-[48px] rounded-lg border border-[#d0d3d3] bg-white px-2.5 py-2 text-xs sm:text-sm font-semibold text-[#3a3d40] hover:bg-brand-50 hover:text-brand-900 transition-colors shadow-2xs whitespace-nowrap w-full"
                      >
                        <ExternalLink className="h-4 w-4 text-[#53575b] shrink-0" />
                        <span>Abrir página</span>
                      </a>

                      <button
                        type="button"
                        disabled={isItemPending}
                        onClick={() => handleToggle(stake)}
                        className={`inline-flex items-center justify-center gap-1.5 min-h-[48px] rounded-lg px-2.5 py-2 text-xs sm:text-sm font-semibold border transition-colors shadow-2xs whitespace-nowrap w-full ${
                          stake.is_active
                            ? "border-danger-200 bg-danger-50 text-danger-700 hover:bg-danger-100"
                            : "border-success-200 bg-success-50 text-success-700 hover:bg-success-100"
                        } disabled:opacity-50`}
                      >
                        {isItemPending ? (
                          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        ) : stake.is_active ? (
                          <PowerOff className="h-4 w-4 shrink-0" />
                        ) : (
                          <Power className="h-4 w-4 shrink-0" />
                        )}
                        <span>{stake.is_active ? "Desativar" : "Ativar"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VISUALIZAÇÃO DESKTOP / TABLET (Tabela com ajuste fluido, sem barra de rolagem horizontal) */}
            <div className="platform-list-table">
              <table className="w-full table-fixed divide-y divide-[#e0e2e2] text-sm">
                <colgroup>
                  <col className="w-[34%] min-w-0" />
                  <col className="w-[22%] min-w-0" />
                  <col className="w-[16%] min-w-0" />
                  <col className="w-[28%] min-w-0" />
                </colgroup>
                <thead className="bg-[#f7f8f8] text-[#3a3d40]">
                  <tr>
                    <th scope="col" className="px-3 py-3 text-left font-semibold text-xs tracking-wider uppercase text-[#53575b] truncate">
                      Nome da Estaca
                    </th>
                    <th scope="col" className="px-2 py-3 text-left font-semibold text-xs tracking-wider uppercase text-[#53575b] truncate">
                      Slug
                    </th>
                    <th scope="col" className="px-2 py-3 text-left font-semibold text-xs tracking-wider uppercase text-[#53575b] truncate">
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 text-right font-semibold text-xs tracking-wider uppercase text-[#53575b] whitespace-nowrap"
                    >
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e2e2] bg-white">
                  {paginatedStakes.map((stake) => {
                    const isItemPending = isPending && pendingStakeId === stake.id;
                    return (
                      <tr
                        key={stake.id}
                        className="hover:bg-brand-50/40 transition-colors"
                      >
                        <td className="px-3 py-3 font-semibold text-[#212225] min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700 shrink-0">
                              <Building2 className="h-3.5 w-3.5" />
                            </div>
                            <span className="truncate min-w-0 flex-1 font-semibold text-sm" title={stake.name}>
                              {stake.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-3 min-w-0">
                          <code className="inline-block font-mono text-[11px] sm:text-xs bg-[#f4f5f5] text-[#404346] px-2 py-0.5 rounded border border-[#e0e2e2] truncate max-w-full" title={`/${stake.slug}`}>
                            /{stake.slug}
                          </code>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
                              stake.is_active
                                ? "border-success-200 bg-success-50 text-success-700"
                                : "border-danger-200 bg-danger-50 text-danger-700"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                stake.is_active ? "bg-success-600" : "bg-danger-600"
                              }`}
                            />
                            <span>{stake.is_active ? "Ativa" : "Inativa"}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap min-w-0">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={`/${stake.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 min-h-[48px] px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-lg border border-[#d0d3d3] bg-white text-[#3a3d40] hover:bg-brand-50 hover:text-brand-900 hover:border-brand-300 transition-colors shadow-2xs whitespace-nowrap shrink-0"
                              title={`Abrir página pública da Estaca ${stake.name}`}
                              aria-label={`Abrir página pública da Estaca ${stake.name}`}
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-[#53575b] shrink-0" />
                              <span>Abrir página</span>
                            </a>
                            <button
                              type="button"
                              disabled={isItemPending}
                              onClick={() => handleToggle(stake)}
                              className={`inline-flex items-center gap-1 min-h-[48px] px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors shadow-2xs whitespace-nowrap shrink-0 ${
                                stake.is_active
                                  ? "border-danger-200 bg-danger-50/80 text-danger-700 hover:bg-danger-100 hover:border-danger-300"
                                  : "border-success-200 bg-success-50/80 text-success-700 hover:bg-success-100 hover:border-success-300"
                              } disabled:opacity-50`}
                              title={stake.is_active ? `Desativar ${stake.name}` : `Ativar ${stake.name}`}
                              aria-label={stake.is_active ? `Desativar Estaca ${stake.name}` : `Ativar Estaca ${stake.name}`}
                            >
                              {isItemPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                              ) : stake.is_active ? (
                                <PowerOff className="h-3.5 w-3.5 shrink-0" />
                              ) : (
                                <Power className="h-3.5 w-3.5 shrink-0" />
                              )}
                              <span>{stake.is_active ? "Desativar" : "Ativar"}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ListPagination
            page={safeCurrentPage}
            pageSize={pageSize}
            total={filteredStakes.length}
            itemLabel="estacas"
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        </>
        )}
      </section>
    </>
  );
}
