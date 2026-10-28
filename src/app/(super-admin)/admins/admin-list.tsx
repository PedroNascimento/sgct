"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Search,
  X,
  Users,
  Shield,
  UserCheck,
  Building2,
  Power,
  PowerOff,
  Loader2,
} from "lucide-react";
import { AdminEstacaItem, toggleAdminStatusAction, updateAdminRoleAction } from "../actions";
import { useFeedbackModal } from "@/components/ui/feedback-modal";
import { ListPagination } from "@/components/ui/list-pagination";

export function AdminList({ admins }: { admins: AdminEstacaItem[] }) {
  const [isPending, startTransition] = useTransition();
  const [pendingAdminId, setPendingAdminId] = useState<string | null>(null);
  const { feedbackModal, showConfirm, showError, showSuccess } = useFeedbackModal();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "member">("all");

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleToggleStatus = (admin: AdminEstacaItem) => {
    const actionName = admin.is_active ? "desativar" : "ativar";
    showConfirm({
      title: admin.is_active ? "Desativar Administrador" : "Ativar Administrador",
      message: (
        <span>
          Deseja realmente {actionName} o acesso de{" "}
          <strong className="text-[#212225]">{admin.full_name}</strong>?
        </span>
      ),
      confirmLabel: admin.is_active ? "Sim, Desativar" : "Sim, Ativar",
      confirmVariant: admin.is_active ? "warning" : "primary",
      onConfirm: async () => {
        setPendingAdminId(admin.id);
        startTransition(async () => {
          try {
            const res = await toggleAdminStatusAction(admin.id, !admin.is_active);
            if (res && !res.success) {
              showError({
                title: "Erro ao alterar status",
                message: res.error || "Não foi possível alterar o status do administrador.",
              });
            } else {
              showSuccess({
                title: "Status Atualizado",
                message: `O acesso de ${admin.full_name} foi ${admin.is_active ? "desativado" : "ativado"} com sucesso.`,
              });
            }
          } finally {
            setPendingAdminId(null);
          }
        });
      },
    });
  };

  const handleToggleRole = (admin: AdminEstacaItem) => {
    const isDemote = admin.role === "admin_estaca";
    const nextRole = isDemote ? "member" : "admin_estaca";
    showConfirm({
      title: isDemote ? "Revogar Permissão de Admin" : "Promover a Admin de Estaca",
      message: (
        <span>
          {isDemote ? (
            <>
              Deseja revogar a permissão de Admin de Estaca de{" "}
              <strong className="text-[#212225]">{admin.full_name}</strong>?
              <br className="mb-2" />
              O usuário retornará ao perfil Padrão e perderá o acesso ao painel da Estaca.
            </>
          ) : (
            <>
              Deseja promover <strong className="text-[#212225]">{admin.full_name}</strong> a Admin de Estaca?
            </>
          )}
        </span>
      ),
      confirmLabel: isDemote ? "Sim, Revogar" : "Sim, Promover",
      confirmVariant: isDemote ? "danger" : "primary",
      onConfirm: async () => {
        setPendingAdminId(admin.id);
        startTransition(async () => {
          try {
            const res = await updateAdminRoleAction(admin.id, nextRole);
            if (res && !res.success) {
              showError({
                title: "Erro ao alterar perfil",
                message: res.error || "Não foi possível alterar o perfil do administrador.",
              });
            } else {
              showSuccess({
                title: "Perfil Atualizado",
                message: `O perfil de ${admin.full_name} foi alterado com sucesso.`,
              });
            }
          } finally {
            setPendingAdminId(null);
          }
        });
      },
    });
  };

  // Contagens para os botões de filtro
  const totalCount = admins.length;
  const adminCount = useMemo(
    () => admins.filter((a) => a.role === "admin_estaca").length,
    [admins]
  );
  const memberCount = useMemo(
    () => admins.filter((a) => a.role === "member").length,
    [admins]
  );

  // Filtragem reativa por texto e papel
  const filteredAdmins = useMemo(() => {
    return admins.filter((admin) => {
      // 1. Filtro por papel
      if (roleFilter === "admin" && admin.role !== "admin_estaca") return false;
      if (roleFilter === "member" && admin.role !== "member") return false;

      // 2. Filtro por busca de texto (nome, email ou estaca)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = admin.full_name.toLowerCase().includes(query);
        const matchesEmail = (admin.email || "").toLowerCase().includes(query);
        const matchesStake = (admin.stake_name || "").toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesStake) return false;
      }

      return true;
    });
  }, [admins, roleFilter, searchQuery]);

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredAdmins.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedAdmins = filteredAdmins.slice(startIndex, startIndex + pageSize);

  return (
    <section className="sgct-card platform-collection overflow-hidden w-full max-w-full min-w-0">
      {/* Header do Card */}
      <div className="border-b border-[#e0e2e2] p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#212225] flex items-center gap-2">
              <span>Administradores Cadastrados</span>
              <span className="inline-flex items-center justify-center rounded-full bg-brand-100 text-brand-800 text-xs font-bold px-2.5 py-0.5">
                {filteredAdmins.length}
                {filteredAdmins.length !== totalCount ? ` de ${totalCount}` : ""}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-[#53575b] mt-1">
              Consulte os administradores e gerencie suas permissões de acesso.
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
              aria-label="Buscar administradores"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Digite o nome ou e-mail para filtrar..."
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

          {/* Filtros de Papel (Todos, Somente Admins, Padrão) */}
          <div className="platform-filters" role="group" aria-label="Filtros da lista">
            <button
              type="button"
              aria-pressed={roleFilter === "all"}
              onClick={() => {
                setRoleFilter("all");
                setCurrentPage(1);
              }}
              className={`flex items-center justify-center gap-1 min-[400px]:gap-1.5 px-1 min-[400px]:px-2.5 sm:px-3 min-h-[48px] sm:min-h-0 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                roleFilter === "all"
                  ? "bg-white text-brand-900 shadow-sm"
                  : "text-[#53575b] hover:text-[#212225] hover:bg-white/60"
              }`}
            >
              <Users className="hidden min-[400px]:block h-3.5 w-3.5 shrink-0" />
              <span>Todos</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  roleFilter === "all" ? "bg-brand-50 text-brand-700" : "bg-[#e5e7e8] text-[#53575b]"
                }`}
              >
                {totalCount}
              </span>
            </button>

            <button
              type="button"
              aria-pressed={roleFilter === "admin"}
              onClick={() => {
                setRoleFilter("admin");
                setCurrentPage(1);
              }}
              className={`flex items-center justify-center gap-1 min-[400px]:gap-1.5 px-1 min-[400px]:px-2.5 sm:px-3 min-h-[48px] sm:min-h-0 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                roleFilter === "admin"
                  ? "bg-white text-brand-900 shadow-sm"
                  : "text-[#53575b] hover:text-[#212225] hover:bg-white/60"
              }`}
            >
              <Shield className="hidden min-[400px]:block h-3.5 w-3.5 text-brand-600 shrink-0" />
              <span>Somente Admins</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  roleFilter === "admin" ? "bg-brand-50 text-brand-700" : "bg-[#e5e7e8] text-[#53575b]"
                }`}
              >
                {adminCount}
              </span>
            </button>

            <button
              type="button"
              aria-pressed={roleFilter === "member"}
              onClick={() => {
                setRoleFilter("member");
                setCurrentPage(1);
              }}
              className={`flex items-center justify-center gap-1 min-[400px]:gap-1.5 px-1 min-[400px]:px-2.5 sm:px-3 min-h-[48px] sm:min-h-0 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                roleFilter === "member"
                  ? "bg-white text-brand-900 shadow-sm"
                  : "text-[#53575b] hover:text-[#212225] hover:bg-white/60"
              }`}
            >
              <UserCheck className="hidden min-[400px]:block h-3.5 w-3.5 text-[#53575b] shrink-0" />
              <span>Padrão</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  roleFilter === "member" ? "bg-brand-50 text-brand-700" : "bg-[#e5e7e8] text-[#53575b]"
                }`}
              >
                {memberCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo de Usuários */}
      {admins.length === 0 ? (
        <div className="p-8 sm:p-12 text-center text-base text-[#53575b]">
          Nenhum administrador encontrado. Promova um membro já cadastrado pelo formulário acima.
        </div>
      ) : filteredAdmins.length === 0 ? (
        <div className="p-8 sm:p-12 text-center">
          <p className="text-base font-semibold text-[#212225]">
            Nenhum cadastro encontrado com os filtros aplicados
          </p>
          <p className="text-sm text-[#53575b] mt-1">
            Tente pesquisar por outro termo ou selecione outro filtro de papel.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setRoleFilter("all");
              setCurrentPage(1);
            }}
            className="mt-4 sgct-button-secondary text-xs"
          >
            Limpar busca e filtros
          </button>
        </div>
      ) : (
        <>
          {/* VISUALIZAÇÃO MOBILE (Cards empilhados com alvos de toque acessíveis e layout flexível) */}
          <div className="platform-list-cards divide-y divide-[#e0e2e2] bg-white">
            {paginatedAdmins.map((admin) => {
              const isAdmin = admin.role === "admin_estaca";
              const isItemPending = isPending && pendingAdminId === admin.id;

              return (
                <div key={admin.id} className="p-4 space-y-3 hover:bg-brand-50/20 transition-colors">
                  <div>
                    <p className="font-bold text-[#212225] text-base leading-snug break-words">{admin.full_name}</p>
                    <p className="text-xs text-[#53575b] break-all mt-0.5">{admin.email || "E-mail não disponível"}</p>
                  </div>

                  {/* Chips de Informação Fluidos */}
                  <div className="platform-record-meta pt-0.5">
                    <span
                      className="inline-flex items-center gap-1 rounded-md border border-[#d0d3d3] bg-[#f0f2f2] text-[#404346] text-xs font-medium px-2 py-0.5"
                      title={admin.stake_name}
                    >
                      <Building2 className="h-3 w-3 text-brand-600 shrink-0" />
                      <span className="truncate max-w-[150px]">{admin.stake_name}</span>
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full text-xs font-semibold px-2.5 py-0.5 border ${
                        isAdmin
                          ? "border-brand-300 bg-brand-50 text-brand-800"
                          : "border-[#d0d3d3] bg-[#eff0f0] text-[#53575b]"
                      }`}
                    >
                      {isAdmin ? (
                        <>
                          <Shield className="h-3 w-3 text-brand-600 shrink-0" />
                          <span>Admin Estaca</span>
                        </>
                      ) : (
                        <span>Padrão</span>
                      )}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full text-xs font-semibold px-2 py-0.5 border ${
                        admin.is_active
                          ? "border-success-200 bg-success-50 text-success-700"
                          : "border-danger-200 bg-danger-50 text-danger-700"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          admin.is_active ? "bg-success-600" : "bg-danger-600"
                        }`}
                      />
                      <span>{admin.is_active ? "Ativo" : "Inativo"}</span>
                    </span>
                  </div>

                  {/* Botões de Ação Mobile Empilhados / Flexíveis (mínimo 44px de toque) */}
                  <div className="platform-actions pt-3 border-t border-[#f0f2f2]">
                    <button
                      type="button"
                      disabled={isItemPending}
                      onClick={() => handleToggleRole(admin)}
                      className={`inline-flex items-center justify-center gap-1.5 min-h-[48px] rounded-lg px-3 py-2 text-xs font-semibold border transition-colors shadow-2xs w-full ${
                        isAdmin
                          ? "border-[#d0d3d3] bg-white text-[#3a3d40] hover:bg-brand-50"
                          : "border-brand-600 bg-brand-50 text-brand-800 hover:bg-brand-100"
                      } disabled:opacity-50`}
                    >
                      {isItemPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                      ) : isAdmin ? (
                        <UserCheck className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <Shield className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span>{isAdmin ? "Alterar para Padrão" : "Promover a Admin"}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isItemPending}
                      onClick={() => handleToggleStatus(admin)}
                      className={`inline-flex items-center justify-center gap-1.5 min-h-[48px] rounded-lg px-3 py-2 text-xs font-semibold border transition-colors shadow-2xs w-full ${
                        admin.is_active
                          ? "border-danger-200 bg-danger-50 text-danger-700 hover:bg-danger-100"
                          : "border-success-200 bg-success-50 text-success-700 hover:bg-success-100"
                      } disabled:opacity-50`}
                    >
                      {isItemPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                      ) : admin.is_active ? (
                        <PowerOff className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <Power className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span>{admin.is_active ? "Desativar" : "Ativar"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* VISUALIZAÇÃO DESKTOP / TABLET (Tabela fluida sem barra de rolagem horizontal desnecessária) */}
          <div className="platform-list-table">
            <table className="w-full table-fixed divide-y divide-[#e0e2e2] text-sm">
              <colgroup>
                <col className="w-[32%] min-w-0" />
                <col className="w-[18%] min-w-0" />
                <col className="w-[14%] min-w-0" />
                <col className="w-[12%] min-w-0" />
                <col className="w-[24%] min-w-0" />
              </colgroup>
              <thead className="bg-[#f7f8f8] text-[#3a3d40]">
                <tr>
                  <th scope="col" className="px-3 py-3 text-left font-semibold text-xs tracking-wider uppercase text-[#53575b] truncate">
                    Nome / E-mail
                  </th>
                  <th scope="col" className="px-2 py-3 text-left font-semibold text-xs tracking-wider uppercase text-[#53575b] truncate">
                    Estaca
                  </th>
                  <th scope="col" className="px-2 py-3 text-left font-semibold text-xs tracking-wider uppercase text-[#53575b] truncate">
                    Perfil
                  </th>
                  <th scope="col" className="px-2 py-3 text-left font-semibold text-xs tracking-wider uppercase text-[#53575b] truncate">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold text-xs tracking-wider uppercase text-[#53575b] whitespace-nowrap">
                    Ações de Permissão
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e2e2] bg-white">
                {paginatedAdmins.map((admin) => {
                  const isAdmin = admin.role === "admin_estaca";
                  const isItemPending = isPending && pendingAdminId === admin.id;

                  return (
                    <tr key={admin.id} className="hover:bg-brand-50/40 transition-colors">
                      <td className="px-3 py-3 min-w-0">
                        <p className="font-bold text-[#212225] truncate" title={admin.full_name}>
                          {admin.full_name}
                        </p>
                        <p className="text-xs text-[#53575b] truncate" title={admin.email || ""}>
                          {admin.email || "E-mail não disponível"}
                        </p>
                      </td>
                      <td className="px-2 py-3 min-w-0">
                        <span className="font-medium text-[#212225] truncate block" title={admin.stake_name}>
                          {admin.stake_name}
                        </span>
                        {admin.stake_slug && (
                          <p className="font-mono text-xs text-[#53575b] truncate">/{admin.stake_slug}</p>
                        )}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                            isAdmin
                              ? "border-brand-300 bg-brand-50 text-brand-800"
                              : "border-[#d0d3d3] bg-[#eff0f0] text-[#53575b]"
                          }`}
                        >
                          {isAdmin ? "Admin da Estaca" : "Padrão"}
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                            admin.is_active
                              ? "border-success-200 bg-success-50 text-success-700"
                              : "border-danger-200 bg-danger-50 text-danger-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              admin.is_active ? "bg-success-600" : "bg-danger-600"
                            }`}
                          />
                          <span>{admin.is_active ? "Ativo" : "Inativo"}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap min-w-0">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão de Alternância de Papel */}
                          <button
                            type="button"
                            disabled={isItemPending}
                            onClick={() => handleToggleRole(admin)}
                            title={isAdmin ? "Rebaixar para perfil padrão" : "Promover a Admin de Estaca"}
                            className={`inline-flex items-center gap-1 min-h-[48px] px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-lg border whitespace-nowrap transition-colors shadow-2xs shrink-0 ${
                              isAdmin
                                ? "border-[#d0d3d3] bg-white text-[#3a3d40] hover:bg-brand-50"
                                : "border-brand-600 bg-brand-50 text-brand-800 hover:bg-brand-100"
                            } disabled:opacity-50`}
                          >
                            {isItemPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                            ) : isAdmin ? (
                              <UserCheck className="h-3.5 w-3.5 shrink-0" />
                            ) : (
                              <Shield className="h-3.5 w-3.5 shrink-0" />
                            )}
                            <span>{isAdmin ? "Alterar para Padrão" : "Promover a Admin"}</span>
                          </button>

                          {/* Botão de Ativar/Desativar */}
                          <button
                            type="button"
                            disabled={isItemPending}
                            onClick={() => handleToggleStatus(admin)}
                            className={`inline-flex items-center gap-1 min-h-[48px] px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-lg border whitespace-nowrap transition-colors shadow-2xs shrink-0 ${
                              admin.is_active
                                ? "border-danger-200 bg-danger-50 text-danger-700 hover:bg-danger-100"
                                : "border-success-200 bg-success-50 text-success-700 hover:bg-success-100"
                            } disabled:opacity-50`}
                          >
                            {isItemPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                            ) : admin.is_active ? (
                              <PowerOff className="h-3.5 w-3.5 shrink-0" />
                            ) : (
                              <Power className="h-3.5 w-3.5 shrink-0" />
                            )}
                            <span>{admin.is_active ? "Desativar" : "Ativar"}</span>
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
            total={filteredAdmins.length}
            itemLabel="administradores"
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        </>
      )}
      {/* Modal de confirmações e alertas */}
      {feedbackModal}
    </section>
  );
}
