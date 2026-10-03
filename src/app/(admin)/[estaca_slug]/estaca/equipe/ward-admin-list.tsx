"use client";

import { useState, useTransition, useMemo } from "react";
import { Search, X, Users, Shield, UserCheck } from "lucide-react";
import {
  type EstacaMemberItem,
  demoteWardAdminAction,
  toggleWardMemberStatusAction,
} from "../../actions";
import { useFeedbackModal } from "@/components/ui/feedback-modal";

interface Props {
  members: EstacaMemberItem[];
}

export function WardAdminList({ members }: Props) {
  const [isPending, startTransition] = useTransition();
  const { feedbackModal, showConfirm, showError, showSuccess } = useFeedbackModal();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "member">("all");

  const handleDemote = (member: EstacaMemberItem) => {
    showConfirm({
      title: "Revogar Acesso de Admin",
      message: (
        <span>
          Deseja revogar a permissão de Admin de Ala de{" "}
          <strong className="text-[#212225]">{member.full_name}</strong>?
          <br className="mb-2" />
          O membro retornará ao perfil Padrão e não poderá mais gerenciar reservas da Ala.
        </span>
      ),
      confirmLabel: "Sim, Revogar Acesso",
      confirmVariant: "danger",
      onConfirm: async () => {
        const res = await demoteWardAdminAction(member.id);
        if (res && !res.success) {
          showError({
            title: "Erro ao revogar permissão",
            message: res.error || "Não foi possível revogar o acesso.",
          });
        } else {
          showSuccess({
            title: "Acesso Revogado",
            message: `A permissão de Admin de Ala de ${member.full_name} foi revogada com sucesso.`,
          });
        }
      },
    });
  };

  const handleToggleStatus = (member: EstacaMemberItem) => {
    const actionName = member.is_active ? "desativar" : "ativar";
    showConfirm({
      title: member.is_active ? "Desativar Membro" : "Ativar Membro",
      message: (
        <span>
          Deseja realmente {actionName} o cadastro de{" "}
          <strong className="text-[#212225]">{member.full_name}</strong>?
          {member.is_active && (
            <>
              <br className="mb-2" />
              O membro não conseguirá fazer login ou se inscrever em caravanas enquanto estiver desativado.
            </>
          )}
        </span>
      ),
      confirmLabel: member.is_active ? "Sim, Desativar" : "Sim, Ativar",
      confirmVariant: member.is_active ? "warning" : "primary",
      onConfirm: async () => {
        const res = await toggleWardMemberStatusAction(member.id, !member.is_active);
        if (res && !res.success) {
          showError({
            title: "Erro ao alterar status",
            message: res.error || "Não foi possível alterar o status do membro.",
          });
        } else {
          showSuccess({
            title: "Status Atualizado",
            message: `O cadastro de ${member.full_name} foi ${member.is_active ? "desativado" : "ativado"} com sucesso.`,
          });
        }
      },
    });
  };

  // Contagens
  const totalCount = members.length;
  const adminCount = useMemo(
    () => members.filter((m) => m.role === "admin_ala").length,
    [members]
  );
  const memberCount = useMemo(
    () => members.filter((m) => m.role === "member").length,
    [members]
  );

  // Filtragem reativa
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // 1. Filtro por papel
      if (roleFilter === "admin" && member.role !== "admin_ala") return false;
      if (roleFilter === "member" && member.role !== "member") return false;

      // 2. Filtro por busca de texto (nome, email ou ala)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = member.full_name.toLowerCase().includes(query);
        const matchesEmail = (member.email || "").toLowerCase().includes(query);
        const matchesWard = (member.ward_name || "").toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesWard) return false;
      }

      return true;
    });
  }, [members, roleFilter, searchQuery]);

  return (
    <section className="sgct-card overflow-hidden">
      {/* Header do Card */}
      <div className="border-b border-[#e0e2e2] px-5 py-5 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#212225] flex items-center gap-2">
              <span>Perfis e Usuários Cadastrados</span>
              <span className="inline-flex items-center justify-center rounded-full bg-brand-100 text-brand-800 text-xs font-bold px-2.5 py-0.5">
                {filteredMembers.length}{filteredMembers.length !== totalCount ? ` de ${totalCount}` : ""}
              </span>
            </h2>
            <p className="text-sm text-[#53575b] mt-1">
              Visualize os Administradores de Ala e membros da Estaca, com filtros rápidos e busca em tempo real.
            </p>
          </div>
        </div>

        {/* Barra de Filtros e Pesquisa */}
        <div className="mt-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-4 border-t border-[#f0f2f2]">
          {/* Campo de Busca Reativo */}
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7b8084] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digite o nome, e-mail ou Ala para filtrar..."
              className="sgct-input pl-10 pr-9 py-2 text-sm w-full bg-[#fcfdfd]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b8084] hover:text-[#212225] p-0.5 rounded-full hover:bg-[#e0e2e2]/60 transition-colors"
                title="Limpar pesquisa"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtros de Papel (Todos, Admins de Ala, Membros Comuns) */}
          <div className="flex items-center gap-1.5 p-1 bg-[#f4f5f5] rounded-xl self-start md:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setRoleFilter("all")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                roleFilter === "all"
                  ? "bg-white text-brand-900 shadow-sm"
                  : "text-[#53575b] hover:text-[#212225] hover:bg-white/60"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Todos</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                roleFilter === "all" ? "bg-brand-50 text-brand-700" : "bg-[#e5e7e8] text-[#53575b]"
              }`}>
                {totalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRoleFilter("admin")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                roleFilter === "admin"
                  ? "bg-white text-brand-900 shadow-sm"
                  : "text-[#53575b] hover:text-[#212225] hover:bg-white/60"
              }`}
            >
              <Shield className="h-3.5 w-3.5 text-brand-600" />
              <span>Somente Admins</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                roleFilter === "admin" ? "bg-brand-50 text-brand-700" : "bg-[#e5e7e8] text-[#53575b]"
              }`}>
                {adminCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRoleFilter("member")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                roleFilter === "member"
                  ? "bg-white text-brand-900 shadow-sm"
                  : "text-[#53575b] hover:text-[#212225] hover:bg-white/60"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5 text-[#53575b]" />
              <span>Padrão</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                roleFilter === "member" ? "bg-brand-50 text-brand-700" : "bg-[#e5e7e8] text-[#53575b]"
              }`}>
                {memberCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo de Membros */}
      {members.length === 0 ? (
        <div className="p-12 text-center text-base text-[#53575b]">
          Nenhum membro ou administrador encontrado.
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-base font-semibold text-[#212225]">
            Nenhum cadastro encontrado com os filtros aplicados
          </p>
          <p className="text-sm text-[#53575b] mt-1">
            Tente pesquisar por outro nome ou selecione outro filtro de papel.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setRoleFilter("all");
            }}
            className="mt-4 sgct-button-secondary text-xs"
          >
            Limpar busca e filtros
          </button>
        </div>
      ) : (
        <>
          {/* VISUALIZAÇÃO MOBILE (Cards empilhados e confortáveis) */}
          <div className="block md:hidden divide-y divide-[#e0e2e2] bg-white">
            {filteredMembers.map((member) => {
              const isAdmin = member.role === "admin_ala";
              return (
                <div key={member.id} className="p-4 space-y-3 hover:bg-brand-50/20 transition-colors">
                  <div>
                    <p className="font-bold text-[#212225] text-base truncate">{member.full_name}</p>
                    <p className="text-xs text-[#53575b] break-all mt-0.5">{member.email || "E-mail não disponível"}</p>
                  </div>

                  {/* Grid 3x1 com as 3 tags alinhadas */}
                  <div className="grid grid-cols-3 gap-2 items-center pt-0.5">
                    <span
                      className="sgct-chip justify-center text-center truncate border-[#d0d3d3] bg-[#f0f2f2] text-[#404346] text-xs font-medium px-2 py-1"
                      title={member.ward_name ?? "Ala não vinculada"}
                    >
                      <span className="truncate">{member.ward_name ?? "Sem Ala"}</span>
                    </span>

                    <span
                      className={`sgct-chip justify-center text-center truncate text-xs px-2 py-1 ${
                        isAdmin
                          ? "border-brand-300 bg-brand-50 text-brand-800 font-semibold"
                          : "border-[#d0d3d3] bg-[#eff0f0] text-[#53575b]"
                      }`}
                    >
                      <span className="truncate">{isAdmin ? "Admin Ala" : "Padrão"}</span>
                    </span>

                    <span
                      className={`sgct-chip justify-center text-center text-xs px-2 py-1 ${
                        member.is_active
                          ? "border-success-200 bg-success-50 text-success-700"
                          : "border-danger-200 bg-danger-50 text-danger-700"
                      }`}
                    >
                      {member.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  <div className="pt-2 flex items-center gap-2 border-t border-[#f0f2f2]">
                    {isAdmin && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDemote(member)}
                        className="flex-1 inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold border border-[#d0d3d3] bg-white text-[#3a3d40] hover:bg-brand-50 transition-colors disabled:opacity-50"
                      >
                        Alterar para Padrão
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleToggleStatus(member)}
                      className={`flex-1 inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold border transition-colors ${
                        member.is_active
                          ? "border-danger-200 bg-danger-50 text-danger-700 hover:bg-danger-100"
                          : "border-success-200 bg-success-50 text-success-700 hover:bg-success-100"
                      } disabled:opacity-50`}
                    >
                      {member.is_active ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* VISUALIZAÇÃO DESKTOP / TABLET (Tabela com min-width garantido) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-[700px] w-full divide-y divide-[#e0e2e2] text-sm">
              <thead className="bg-[#f7f8f8] text-[#3a3d40]">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left font-semibold">Nome / E-mail</th>
                  <th scope="col" className="px-6 py-3.5 text-left font-semibold">Ala</th>
                  <th scope="col" className="px-6 py-3.5 text-left font-semibold">Perfil</th>
                  <th scope="col" className="px-6 py-3.5 text-left font-semibold">Status</th>
                  <th scope="col" className="px-6 py-3.5 text-right font-semibold whitespace-nowrap">Ações de Permissão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e2e2] bg-white">
                {filteredMembers.map((member) => {
                  const isAdmin = member.role === "admin_ala";
                  return (
                    <tr key={member.id} className="hover:bg-brand-50/40 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-[#212225]">{member.full_name}</p>
                        <p className="text-xs text-[#53575b]">{member.email || "E-mail não disponível"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-[#212225]">
                          {member.ward_name ?? "Ala não vinculada"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`sgct-chip whitespace-nowrap ${
                            isAdmin
                              ? "border-brand-300 bg-brand-50 text-brand-800 font-semibold"
                              : "border-[#d0d3d3] bg-[#eff0f0] text-[#53575b]"
                          }`}
                        >
                          {isAdmin ? "Admin Ala" : "Padrão"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`sgct-chip whitespace-nowrap ${
                            member.is_active
                              ? "border-success-200 bg-success-50 text-success-700"
                              : "border-danger-200 bg-danger-50 text-danger-700"
                          }`}
                        >
                          {member.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          {/* Ação para Admin de Ala: Rebaixar para Perfil Padrão */}
                          {isAdmin && (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleDemote(member)}
                              title="Revogar cargo de Admin de Ala e voltar para Perfil Padrão"
                              className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold border border-[#d0d3d3] bg-white text-[#3a3d40] hover:bg-brand-50 transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              Alterar para Padrão
                            </button>
                          )}

                          {/* Botão de Ativar/Desativar */}
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleToggleStatus(member)}
                            className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold border whitespace-nowrap transition-colors ${
                              member.is_active
                                ? "border-danger-200 bg-danger-50 text-danger-700 hover:bg-danger-100"
                                : "border-success-200 bg-success-50 text-success-700 hover:bg-success-100"
                            } disabled:opacity-50`}
                          >
                            {member.is_active ? "Desativar" : "Ativar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {/* Modal de confirmações e avisos */}
      {feedbackModal}
    </section>
  );
}
